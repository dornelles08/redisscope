# Arquitetura — RedisScope

## Visão
Aplicação web self-hosted para gerenciar instâncias Redis externas. Um repo, dois projetos independentes, integrados por REST + Docker Compose.

## Estrutura
```
redisscope/
├── frontend/  # React + Vite — independente
├── backend/   # Fastify + TS — independente
├── docs/
├── docker-compose.yml  docker-compose.dev.yml
└── .env.example
```

## Backend (`backend/src`)
- `modules/{auth,connections,keys,commands,monitoring,server-info,health}` — controllers finos, services com regra, schemas Zod
- `infrastructure/redis` — ciclo de vida ioredis centralizado; `infrastructure/encryption` — AES-GCM; `infrastructure/auth` — JWT HS256
- `common/errors|hooks|utils` — `AppError`, error handler (nunca vaza stack), auth hook, SSRF
- Persistência: JSON atômico (`ConnectionsRepository`, temp + rename) em volume Docker

## Frontend (`frontend/src`)
- `components/{ui,layout,common}`, `features/*` (páginas), `services/endpoints` (HTTP), `hooks`, `types/api.ts`
- TanStack Query para server state; token JWT em `sessionStorage`; tema em `localStorage`

## Decisões
- Sem monorepo/workspaces; raiz sem `package.json`
- Sem banco externo na v1 (JSON suficiente e leve)
- Sem dependência JWT extra (HS256 manual com `node:crypto` — leve e auditável)
- Gráficos futuros com SVG custom (evita Recharts pesado)

## Fluxo
Navegador → Nginx (`:80`) → estáticos + proxy `/api` → backend (`:3000`) → ioredis → Redis externo.
