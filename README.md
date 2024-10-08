# Assistente de Voz com OpenAI Realtime API

Este projeto implementa um agente de chamadas recebidas com IA para a Bart's Automotive, uma empresa automotiva fict�cia. Utiliza a nova API em tempo real da OpenAI e integra-se com o Twilio para gerenciar chamadas telef�nicas.

## Instru��es em V�deo

https://youtu.be/AZ0WziqO_QA?si=HORqrwjrbKnsuRZY

## Funcionalidades

- Gerencia chamadas recebidas usando os servi�os de voz do Twilio
- Utiliza a API em tempo real da OpenAI para processamento de linguagem natural
- Transcreve a fala do usu�rio e gera respostas de IA em tempo real
- Extrai detalhes do cliente (nome, disponibilidade e observa��es) da conversa
- Envia as informa��es extra�das para um webhook para processamento posterior

## Tecnologias Utilizadas

- Node.js
- Fastify (framework web)
- WebSocket (para comunica��o em tempo real)
- OpenAI GPT-4 Realtime API
- Twilio (para servi�os de telefonia)
- dotenv (para gerenciamento de vari�veis de ambiente)

## Configura��o

1. Clone o reposit�rio:
   ```bash
   git clone https://github.com/Barty-Bart/openai-realtime-api-voice-assistant.git
   cd openai-realtime-api-voice-assistant

2. Clone o reposit�rio:
npm install


3. Configure as vari�veis de ambiente: Crie um arquivo .env no diret�rio raiz e adicione o seguinte:
OPENAI_API_KEY=sua_chave_api_openai

4. Substitua sua_chave_api_openai pela sua chave real da OpenAI.

Atualize a URL do webhook: Abra o arquivo index.js e localize a constante WEBHOOK_URL. Substitua a URL existente pela sua pr�pria URL de webhook:

const WEBHOOK_URL = "https://sua-url-webhook.com";

5. Inicie o servidor:

Uso
Com o servidor em execu��o, ele gerenciar� chamadas recebidas do Twilio. O agente de IA interagir� com os chamadores, transcrever� suas falas, gerar� respostas apropriadas e extrair� informa��es relevantes da conversa.

Nota
Este projeto � uma demonstra��o e deve ser adaptado para uso em produ��o, incluindo tratamento adequado de erros, medidas de seguran�a e conformidade com as regulamenta��es aplic�veis.

Contribui��o
Contribui��es s�o bem-vindas! Sinta-se � vontade para enviar um Pull Request.