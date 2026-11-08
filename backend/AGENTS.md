# AGENTS.md — Backend

Projeto Node.js **independente**. Não adicionar dependências na raiz, não usar workspaces, não importar código do frontend.

## Estrutura
```
src/
├── config/env.ts          # Validação de env com Zod
├── common/errors|hooks|utils/
├── infrastructure/redis|encryption|auth|logging/
├── modules/auth|connections|keys|commands|monitoring|server-info|health/
├── app.ts                 # Composição Fastify
└── server.ts              # Bootstrap
```

## Regras
- Controllers **não** contêm regra de negócio — apenas HTTP + validação Zod.
- Services concentram regras; infraestrutura Redis centralizada.
- Validar **todas** entradas com Zod; nunca retornar stack traces nem credenciais.
- Logs Pino com redação de segredos (`infrastructure/logging/logger.ts`).
- Persistência em JSON atômica via `ConnectionsRepository` (volume Docker `/app/data`).
- Senhas Redis: sempre AES-256-GCM (`ENCRYPTION_KEY`); nunca logar, nunca retornar ao frontend.
- SSRF: toda conexão Redis valida `isHostAllowed(host, ALLOWED_HOSTS)` antes de conectar.
- Comandos Redis: validados no backend (denylist FLUSHDB/SHUTDOWN/etc) — Fase 5.
- Testes obrigatórios: `npm test` + `npm run lint` + `npm run build` antes de considerar concluído.
