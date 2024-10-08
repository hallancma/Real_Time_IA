import Fastify from 'fastify';
import WebSocket from 'ws';
import fs from 'fs';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import fetch from 'node-fetch';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

// Recuperar a chave da API OpenAI das variáveis de ambiente
const { OPENAI_API_KEY } = process.env;

if (!OPENAI_API_KEY) {
    console.error('Chave da API OpenAI não encontrada. Por favor, defina-a no arquivo .env.');
    process.exit(1);
}

// Inicialização do Fastify
const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

// Constantes
const MENSAGEM_SISTEMA = 'Você é uma recepcionista virtual de uma oficina do carro novo. Sua função é interagir educadamente com o cliente, solicitando o nome, o serviço/reparo a ser realizado, e o dia e horário em que ele deseja agendar o serviço. Pergunte uma coisa de cada vez, mantendo a conversa amigável e profissional. Não peça informações de contato ou verifique disponibilidade, presumindo que sempre há vagas. Faça perguntas de acompanhamento quando necessário, para garantir que todos os detalhes sejam obtidos de forma natural';
const VOZ = 'alloy';
const PORTA = process.env.PORT || 5050;
const URL_WEBHOOK = "https://bora-programar-n8n.bx6eie.easypanel.host/webhook/real_time_open_ia";

// Gerenciamento de sessão
const sessoes = new Map();

// Lista de tipos de eventos para registrar no console
const TIPOS_EVENTO_LOG = [
    'response.content.done',
    'rate_limits.updated',
    'response.done',
    'input_audio_buffer.committed',
    'input_audio_buffer.speech_stopped',
    'input_audio_buffer.speech_started',
    'session.created',
    'response.text.done',
    'conversation.item.input_audio_transcription.completed'
];

// Rota Raiz
fastify.get('/', async (request, reply) => {
    reply.send({ message: 'Servidor Twilio Media Stream está funcionando!' });
});

// Rota para o Twilio lidar com chamadas
fastify.all('/incoming-call', async (request, reply) => {
    console.log('Chamada recebida');

    const respostaTwiml = `<?xml version="1.0" encoding="UTF-8"?>
                          <Response>
                              <Say>Olá, você ligou para o Centro Automotivo do Bart. Como podemos ajudar?</Say>
                              <Connect>
                                  <Stream url="wss://${request.headers.host}/media-stream" />
                              </Connect>
                          </Response>`;

    reply.type('text/xml').send(respostaTwiml);
});

// Rota WebSocket para media-stream
fastify.register(async (fastify) => {
    fastify.get('/media-stream', { websocket: true }, (connection, req) => {
        console.log('Cliente conectado');

        const sessionId = req.headers['x-twilio-call-sid'] || `session_${Date.now()}`;
        let sessao = sessoes.get(sessionId) || { transcript: '', streamSid: null };
        sessoes.set(sessionId, sessao);

        const openAiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "OpenAI-Beta": "realtime=v1"
            }
        });

        const enviarAtualizacaoSessao = () => {
            const atualizacaoSessao = {
                type: 'session.update',
                session: {
                    turn_detection: { type: 'server_vad' },
                    input_audio_format: 'g711_ulaw',
                    output_audio_format: 'g711_ulaw',
                    voice: VOZ,
                    instructions: MENSAGEM_SISTEMA,
                    modalities: ["text", "audio"],
                    temperature: 0.8,
                    input_audio_transcription: {
                        "model": "whisper-1"
                    }
                }
            };

            console.log('Enviando atualização de sessão:', JSON.stringify(atualizacaoSessao));
            openAiWs.send(JSON.stringify(atualizacaoSessao));
        };

        // Evento de conexão aberta no WebSocket OpenAI
        openAiWs.on('open', () => {
            console.log('Conectado à API Realtime da OpenAI');
            setTimeout(enviarAtualizacaoSessao, 250);
        });

        // Escutar mensagens do WebSocket OpenAI
        openAiWs.on('message', (data) => {
            try {
                const response = JSON.parse(data);

                if (TIPOS_EVENTO_LOG.includes(response.type)) {
                    console.log(`Evento recebido: ${response.type}`, response);
                }

                // Tratamento da transcrição da mensagem do usuário
                if (response.type === 'conversation.item.input_audio_transcription.completed') {
                    const mensagemUsuario = response.transcript.trim();
                    sessao.transcript += `Usuário: ${mensagemUsuario}\n`;
                    console.log(`Usuário (${sessionId}): ${mensagemUsuario}`);
                }

                // Tratamento da mensagem do agente
                if (response.type === 'response.done') {
                    const mensagemAgente = response.response.output[0]?.content?.find(content => content.transcript)?.transcript || 'Mensagem do agente não encontrada';
                    sessao.transcript += `Agente: ${mensagemAgente}\n`;
                    console.log(`Agente (${sessionId}): ${mensagemAgente}`);
                }

                if (response.type === 'session.updated') {
                    console.log('Sessão atualizada com sucesso:', response);
                }

                if (response.type === 'response.audio.delta' && response.delta) {
                    const audioDelta = {
                        event: 'media',
                        streamSid: sessao.streamSid,
                        media: { payload: Buffer.from(response.delta, 'base64').toString('base64') }
                    };
                    connection.send(JSON.stringify(audioDelta));
                }
            } catch (error) {
                console.error('Erro ao processar mensagem da OpenAI:', error, 'Mensagem bruta:', data);
            }
        });

        // Lidar com mensagens recebidas do Twilio
        connection.on('message', (message) => {
            try {
                const data = JSON.parse(message);

                switch (data.event) {
                    case 'media':
                        if (openAiWs.readyState === WebSocket.OPEN) {
                            const audioAppend = {
                                type: 'input_audio_buffer.append',
                                audio: data.media.payload
                            };

                            openAiWs.send(JSON.stringify(audioAppend));
                        }
                        break;
                    case 'start':
                        sessao.streamSid = data.start.streamSid;
                        console.log('Stream de entrada iniciada', sessao.streamSid);
                        break;
                    default:
                        console.log('Evento não relacionado a mídia recebido:', data.event);
                        break;
                }
            } catch (error) {
                console.error('Erro ao analisar mensagem:', error, 'Mensagem:', message);
            }
        });

        // Lidar com fechamento da conexão e registrar transcrição
        connection.on('close', async () => {
            if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
            console.log(`Cliente desconectado (${sessionId}).`);
            console.log('Transcrição completa:');
            console.log(sessao.transcript);

            await processarTranscricaoEEnviar(sessao.transcript, sessionId);

            // Limpar a sessão
            sessoes.delete(sessionId);
        });

        // Lidar com fechamento do WebSocket e erros
        openAiWs.on('close', () => {
            console.log('Desconectado da API Realtime da OpenAI');
        });

        openAiWs.on('error', (error) => {
            console.error('Erro no WebSocket da OpenAI:', error);
        });
    });
});

fastify.listen({ port: PORTA }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Servidor escutando na porta ${PORTA}`);
});

// Função para fazer chamada de completação da API ChatGPT com saídas estruturadas
async function fazerChamadaChatGPT(transcript) {
    console.log('Iniciando chamada à API ChatGPT...');
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4o-2024-08-06",
                messages: [
                    { "role": "system", "content": "Extraia detalhes do cliente: nome, disponibilidade e anotações especiais da transcrição." },
                    { "role": "user", "content": transcript }
                ],
                response_format: {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "extracao_detalhes_cliente",
                        "schema": {
                            "type": "object",
                            "properties": {
                                "nomeCliente": { "type": "string" },
                                "disponibilidadeCliente": { "type": "string" },
                                "anotacoesEspeciais": { "type": "string" }
                            },
                            "required": ["nomeCliente", "disponibilidadeCliente", "anotacoesEspeciais"]
                        }
                    }
                }
            })
        });

        console.log('Status da resposta da API ChatGPT:', response.status);
        const data = await response.json();
        console.log('Resposta completa da API ChatGPT:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('Erro ao fazer chamada de completação ao ChatGPT:', error);
        throw error;
    }
}

// Função para enviar dados ao webhook Make.com
async function enviarParaWebhook(payload) {
    console.log('Enviando dados para o webhook:', JSON.stringify(payload, null, 2));
    try {
        const response = await fetch(URL_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('Status da resposta do webhook:', response.status);
        if (response.ok) {
            console.log('Dados enviados com sucesso ao webhook.');
        } else {
            console.error('Falha ao enviar dados ao webhook:', response.statusText);
        }
    } catch (error) {
        console.error('Erro ao enviar dados ao webhook:', error);
    }
}

// Função principal para extrair e enviar detalhes do cliente
async function processarTranscricaoEEnviar(transcript, sessionId = null) {
    console.log(`Iniciando processamento da transcrição para a sessão ${sessionId}...`);
    try {
        // Fazer a chamada de completação do ChatGPT
        const resultado = await fazerChamadaChatGPT(transcript);

        console.log('Resultado bruto do ChatGPT:', JSON.stringify(resultado, null, 2));

        if (resultado.choices && resultado.choices[0] && resultado.choices[0].message && resultado.choices[0].message.content) {
            try {
                const conteudoAnalisado = JSON.parse(resultado.choices[0].message.content);
                console.log('Conteúdo analisado:', JSON.stringify(conteudoAnalisado, null, 2));

                if (conteudoAnalisado) {
                    // Enviar o conteúdo analisado diretamente ao webhook
                    await enviarParaWebhook(conteudoAnalisado);
                    console.log('Detalhes do cliente extraídos e enviados:', conteudoAnalisado);
                } else {
                    console.error('Estrutura JSON inesperada na resposta do ChatGPT');
                }
            } catch (parseError) {
                console.error('Erro ao analisar JSON da resposta do ChatGPT:', parseError);
            }
        } else {
            console.error('Estrutura de resposta inesperada da API ChatGPT');
        }

    } catch (error) {
        console.error('Erro em processarTranscricaoEEnviar:', error);
    }
}