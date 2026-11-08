# Segurança — RedisScope

## Modelo de ameaças
RedisScope pode acessar instâncias com dados importantes e, se exposto, pode servir de proxy SSRF. Controles abaixo são obrigatórios.

## Autenticação (v1)
- Login/senha completo (`AUTH_USERNAME`/`AUTH_PASSWORD`) → JWT HS256 (`AUTH_SECRET`, ≥32 chars), expiração `AUTH_TOKEN_EXPIRY_SECONDS`
- Rotas `/api/*` protegidas por hook Bearer; `/health` e `/api/auth/login` públicas; rate limit no login (10/min)
- Proteja em produção: senha forte, `AUTH_SECRET` aleatório, HTTPS reverso (Caddy/Nginx/Traefik). Não exponha sem autenticação.

## Credenciais Redis
- AES-256-GCM com `ENCRYPTION_KEY` (32 bytes hex). Persistidas em JSON no volume, nunca em texto puro, nunca retornadas ao frontend
- Editar conexão: campo de senha vazio = mantém credencial existente; frontend exibe apenas `hasPassword`
- Token JWT apenas em `sessionStorage` (nunca `localStorage` com senhas)

## SSRF
- Toda conexão valida `isHostAllowed(host, ALLOWED_HOSTS)`: com allowlist, apenas hosts listados; sem allowlist, bloqueia loopback/metadata (`127.0.0.1`, `169.254.169.254`, `::1`) mas permite redes privadas (homelab)
- Em ambientes expostos, defina `ALLOWED_HOSTS` explícita

## Superfície HTTP
- Helmet, CORS restritivo (`CORS_ORIGIN`), rate limit global, body 1MB, timeouts Redis, erros sem stack, logs Pino com redação

## Console Redis
- Denylist no backend: `SHUTDOWN`, `CONFIG`, `DEBUG`, `MODULE`, `SCRIPT`, `CLIENT` (403)
- Bloqueantes (403): `KEYS` (use SCAN), `BLPOP/BRPOP/BLMOVE/BZPOP*/XREAD/XREADGROUP/SUBSCRIBE…`
- Com confirmação explícita: `FLUSHDB`, `FLUSHALL` (400 sem `confirm:true`; frontend mostra `ConfirmDialog`)
- Tokenização com aspas e validação de argumentos no servidor — a UI nunca contorna o backend
- Timeout (`REDIS_COMMAND_TIMEOUT_MS`) e truncamento de respostas grandes (100 KB / 1000 itens)

## Operação
- `.env` nunca versionado; `ENCRYPTION_KEY` estável (perder a chave = perder senhas); backup do volume `redisscope_data`
