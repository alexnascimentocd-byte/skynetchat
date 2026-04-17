# SKYNETchat — Chat de IA em Português

Chat de IA com modelos grátis e pagos, interface em PT-BR, streaming em tempo real.

## Iniciar

```bash
# Servidor local
node server.cjs

# Ou com npm
npm start
```

Acesse: http://localhost:3000

## Provedores

### Grátis (sem API key)
| Provedor | Modelo | Como usar |
|----------|--------|-----------|
| Gemini Proxy | gemini-2.5-flash | Selecione no modelo, sem key |
| Puter Proxy | gemini-2.5-flash | Selecione no modelo, sem key |
| OpenRouter Free | Gemma 3 1B / Llama 3.3 8B | Selecione no modelo, sem key |

### Pagos (precisa de API key)
| Provedor | Modelos | Key |
|----------|---------|-----|
| OpenAI | GPT-4o, GPT-4o mini | OPENAI_API_KEY |
| Anthropic | Claude 3.5 Sonnet | ANTHROPIC_API_KEY |
| Google | Gemini 2.0 Flash | GOOGLE_API_KEY |
| OpenRouter | Todos os 300+ modelos | OPENROUTER_API_KEY |

## Features

- Chat com streaming (respostas aparecem em tempo real)
- Geração de imagens (DALL-E 3)
- Múltiplos modelos de IA
- Conversas persistentes (localStorage)
- Exportar/importar conversas (JSON)
- Tema escuro/claro
- Sidebar com histórico
- Sugestões de prompts

## Estrutura

```
skynetchat/
├── index.html          ← Landing page
├── server.cjs          ← Servidor HTTP
├── pages/
│   ├── chat.html       ← Chat principal
│   ├── settings.html   ← Configurações
│   ├── login.html      ← Login
│   └── signup.html     ← Cadastro
├── js/
│   ├── chat.js         ← Lógica do chat + streaming
│   ├── auth.js         ← Autenticação
│   └── landing.js      ← Landing page
├── styles/
│   ├── main.css        ← Reset + variáveis
│   ├── chat.css        ← Estilos do chat
│   └── landing.css     ← Estilos da landing
└── invoke-nvidia-api.js ← API wrapper legacy
```

## Proxies Gemini

Para usar os modelos grátis Gemini, os proxies precisam estar rodando:
- Porta 8081: Gemini 2.5 Flash
- Porta 8082: Puter (Gemini 2.5 Flash)

Se os proxies não estiverem rodando, use OpenRouter Free como alternativa.

## v1.0.0
- Streaming em tempo real
- Provedores grátis (Gemini proxy, OpenRouter free)
- Interface completa em PT-BR
- Tema escuro/claro
- Export/import de conversas
