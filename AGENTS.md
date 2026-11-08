# AGENTS.md — RedisScope

Instruções gerais para agentes de programação (OpenCode e ferramentas compatíveis).
Documentos específicos: `frontend/AGENTS.md` e `backend/AGENTS.md`.

## 1. Visão geral
RedisScope é uma ferramenta web self-hosted para gerenciar, inspecionar e monitorar instâncias Redis externas pelo navegador — sem instalar cliente Redis no computador do usuário. Escopo v1: conexões múltiplas, Key Browser (SCAN), CRUD de chaves, TTL, console com proteções, monitoramento e informações do servidor.

## 2. Arquitetura do repositório
- **Um único repo Git** (`redisscope`), **dois projetos Node independentes**: `frontend/` e `backend/`.
- A **raiz NÃO é projeto Node**: sem `package.json`, sem `npm init`, sem workspaces (`pnpm/npm/yarn workspaces`, Turborepo, Nx).
- Comunicação **apenas por API HTTP REST** documentada em OpenAPI (`backend` expõe em `/docs` em dev). Nunca importar código entre projetos. Sem pacote `shared` na v1.
- **Docker Compose na raiz** integra os projetos. Redis **nunca** é iniciado pelo Compose — a aplicação conecta a instâncias externas.

## 3. Regras de organização
- Seguir a estrutura em `docs/architecture.md`; ajustes locais documentados.
- Cada projeto com seu próprio `package.json`, `package-lock.json`, TypeScript (strict), ESLint, Vitest e `Dockerfile`.
- Não centralizar dependências na raiz nem criar mecanismos de instalação conjunta.

## 4. Padrões de código
- TypeScript strict em ambos; nunca `any` indiscriminado.
- Separação rigorosa: backend (controllers → services → infraestrutura Redis); frontend (`components`/`features`/`services`/`hooks`).
- Nomenclatura e idioma: código em inglês (identificadores), UI e docs em português (Brasil).
- Simplicidade: sem overengineering, impor tipos antes de abstrações.

## 5. Convenções de nomenclatura
- Arquivos: kebab-case (`connections.service.ts`, `keys-page.tsx`).
- Componentes React: PascalCase; hooks: `useXxx`; services: `xxxApi` (`connectionsApi`).
- Endpoints: `/api/connections/:id/keys/:key` (ver `docs/api.md`).

## 6. Segurança (obrigatório)
- Login/senha completo na v1 (cookie/tokem JWT + Bearer);.rate limiting no login; não expor app sem autenticação.
- Credenciais Redis: AES-256-GCM com `ENCRYPTION_KEY`; nunca em texto puro, nunca retornadas ao frontend (edite com campo vazio = preserva).
- SSRF: validar destino com `ALLOWED_HOSTS` (ver `docs/security.md`); CORS restritivo, Helmet, body 1MB, timeouts, logs com redação.
- Console Redis: denylist no backend (FLUSHDB/FLUSHALL/SHUTDOWN/CONFIG/DEBUG/MODULE/SCRIPT…) — a UI nunca contorna o backend.

## 7. Testes obrigatórios
- Cada projeto: Vitest, TypeScript strict, build verde, lint limpo.
- Backend: services, schemas, segurança, persistência, erros (sem stack ao cliente). Frontend: componentes, formulários, serviços HTTP, estados loading/erro.
- Nunca considerar funcionalidade concluída com erros; executar testes no projeto afetado e validar integração quando mudar contratos.

## 8. Documentação
- Manter `docs/{architecture,api,security,development,deployment}.md` + READMEs sincronizados.
- Toda mudança de contrato exige atualização de `docs/api.md` e OpenAPI.

## 9. Docker
- Dockerfile multi-stage por projeto (usuario não-root quando possível), Compose com healthchecks (ver `docs/deployment.md`).
- Frontend em produção via Nginx servindo estáticos + proxy `/api` → `backend:3000`; backend sem exposição direta.

## 10. Restrições arquiteturais
- SCAN, nunca `KEYS *` automático; paginação por cursor; não carregar estruturas inteiras grandes.
- Redis standalone na v1; arquitetura preparada para Sentinel/Cluster futuro (não implementar agora).
- Sem banco externo na v1 (persistência JSON atômica em volume).
