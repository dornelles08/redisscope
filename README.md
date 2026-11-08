# RedisScope

Ferramenta **web, self-hosted e leve** para gerenciar, inspecionar e monitorar instâncias Redis externas — direto do navegador, sem instalar cliente Redis no computador. Alternativa simples às ferramentas tradicionais de gerenciamento Redis.

## Funcionalidades (v1)
- Múltiplas conexões Redis (standalone) com teste/conexão/desconexão e latência
- Key Browser com SCAN (cursor), pesquisa por padrão, filtro por tipo e paginação
- Visualização e CRUD de STRING, HASH, LIST, SET, SORTED SET e STREAM
- TTL (consultar/definir/remover), Renomear, Duplicar e operações destrutivas com confirmação
- Console Redis com histórico, formatação, timeout e proteções contra comandos destrutivos
- Dashboard e monitoramento (INFO: memória, clientes, comandos, OPS) com atualização configurável
- Informações do servidor por seções (Server, Clients, Memory, Keyspace, etc.)
- Login e senha completos com JWT, proteção SSRF e credenciais criptografadas

## Arquitetura
- **Um repo Git, dois projetos independentes** (sem monorepo/workspaces):
  - `frontend/` — React + TypeScript + Vite + Tailwind + TanStack Query + Lucide
  - `backend/` — Fastify + TypeScript + ioredis + Zod + Pino + OpenAPI
- Comunicação apenas por **API REST** (OpenAPI em `/docs` em dev). A raiz não é projeto Node.
- Persistência em JSON atômico (volume Docker), sem banco externo. Redis nunca é iniciado pelo Compose — conecte a instâncias existentes.

```
redisscope/
├── frontend/  backend/  docs/
├── docker-compose.yml  docker-compose.dev.yml
└── .env.example  AGENTS.md  README.md
```

## Requisitos
- **Docker** (produção) ou **Node.js ≥20 + npm** (desenvolvimento)
- Uma instância Redis acessível (ex.: `redis:6379` em rede Docker, ou host/IP da LAN)

## Executar com Docker
```bash
cp .env.example .env
# Edite .env — defina AUTH_SECRET (32+ chars) e ENCRYPTION_KEY (64 hex)
# Gere: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
docker compose up -d --build
# Acesse http://localhost:8080 (ou $FRONTEND_PORT)
# Login: usuário/senha definidos em AUTH_USERNAME / AUTH_PASSWORD
docker compose logs -f
```

Conectar a uma rede Docker externa existente (opcional): ajuste `networks` no Compose para `external: true` com o nome da rede do seu Redis. Ver `docs/deployment.md`.

## Executar localmente (dev, sem Docker)
```bash
# Terminal 1
cd backend && cp ../.env.example .env && npm install && npm run dev   # :3000

# Terminal 2
cd frontend && npm install && npm run dev                              # :5173 (proxy /api → :3000)
```
Acesse http://localhost:5173.

## Configuração
Ver `.env.example` e `docs/security.md`. Resumo: `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SECRET`, `ENCRYPTION_KEY`, `ALLOWED_HOSTS` (SSRF), `CORS_ORIGIN`, `DATA_DIR`.

## Segurança
Nunca exponha a aplicação sem autenticação. Senhas Redis são criptografadas (AES-256-GCM); o frontend nunca recupera senhas; backend valida SSRF, comandos, rate limit e body size. Ver `docs/security.md`.

## Documentação
- `docs/architecture.md` — estrutura e decisões
- `docs/api.md` — contratos REST
- `docs/security.md` — ameaças e controles
- `docs/development.md` — fluxo de dev e testes
- `docs/deployment.md` — Docker e produção
