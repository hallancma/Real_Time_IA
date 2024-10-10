# Assistente de Voz com OpenAI Realtime API

Este projeto implementa um agente de chamadas recebidas com IA para a uma oficina de exemplo chamada carro novo, uma empresa automotiva fictícia. Utiliza a nova API em tempo real da OpenAI e integra-se com o Twilio para gerenciar chamadas telefônicas.

## Funcionalidades

- Gerencia chamadas recebidas usando os serviços de voz do Twilio
- Utiliza a API em tempo real da OpenAI para processamento de linguagem natural
- Transcreve a fala do usuário e gera respostas de IA em tempo real
- Extrai detalhes do cliente (nome, disponibilidade e observações) da conversa
- Envia as informações extraídas para um webhook para processamento posterior

## Tecnologias Utilizadas

- Node.js
- Fastify (framework web)
- WebSocket (para comunicação em tempo real)
- OpenAI GPT-4 Realtime API
- Twilio (para serviços de telefonia)
- dotenv (para gerenciamento de variáveis de ambiente)

## Configuração

1. Clone o repositório:
   ```bash
   git clone https://github.com/hallancma/Real_Time_IA
   cd Real_Time_IA

2. Clone o repositório:
npm install


3. Configure as variáveis de ambiente: Crie um arquivo .env no diretório raiz e adicione o seguinte:
OPENAI_API_KEY=sua_chave_api_openai

4. Substitua sua_chave_api_openai pela sua chave real da OpenAI.

Atualize a URL do webhook: Abra o arquivo index.js e localize a constante WEBHOOK_URL. Substitua a URL existente pela sua própria URL de webhook:

const WEBHOOK_URL = "https://sua-url-webhook.com";

5. Inicie o servidor:

Uso
Com o servidor em execução, ele gerenciará chamadas recebidas do Twilio. O agente de IA interagirá com os chamadores, transcreverá suas falas, gerará respostas apropriadas e extrairá informações relevantes da conversa.

Nota
Este projeto é uma demonstração e deve ser adaptado para uso em produção, incluindo tratamento adequado de erros, medidas de segurança e conformidade com as regulamentações aplicáveis.

Contribuição
Contribuições são bem-vindas! Sinta-se à vontade para enviar um Pull Request.
