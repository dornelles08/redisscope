# RedisScope — Backend
Fastify + TypeScript + ioredis + Zod + Pino. Projeto independente — **não** usar workspaces.

## Tecnologias
- Node.js >=20, TypeScript strict
- Fastify (+ helmet, cors, rate-limit, swagger)
- ioredis (Fase 2), Zod (validação), Pino (logs)

## Instalação
```bash
cd backend
npm install
```

## Desenvolvimento
```bash
cp ../.env.example .env
npm run dev     # tsx watch em http://localhost:3000
```
- Health: `GET /health`
- Docs OpenAPI (dev): `http://localhost:3000/docs`

## Testes
```bash
npm test            # vitest run
npm run test:watch
npm run test:coverage
```

## Build
```bash
npm run build
npm start           # node dist/server.js
```

## Variáveis (ver `../.env.example`)
- `PORT`, `HOST`, `CORS_ORIGIN`
- `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SECRET` (mín. 32 chars), `AUTH_TOKEN_EXPIRY_SECONDS`
- `ENCRYPTION_KEY` (32 bytes hex = 64 chars) — gera com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `DATA_DIR`, `DATA_FILE` (persistência JSON)
- `ALLOWED_HOSTS` (SSRF — vazio = permite redes privadas)
- `LOG_LEVEL`

## API (Fase 1)
- `GET /health` — público
- `POST /api/auth/login` — público (rate-limited)
- `GET /api/auth/me` — Bearer
- `POST /api/auth/logout` — Bearer
- `GET /api/status` — Bearer
- `GET /api/connections` — Bearer (CRUD completo na Fase 2; nesta fase apenas listagem em memória/JSON)
- `GET/POST/PUT/DELETE /api/connections...`

Contratos completos em `../docs/api.md` e `/docs` (OpenAPI em dev).
