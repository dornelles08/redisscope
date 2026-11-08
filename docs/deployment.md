# Implantação — RedisScope

## Produção (Docker Compose)
```bash
cp .env.example .env
# Edite .env: AUTH_USERNAME, AUTH_PASSWORD, AUTH_SECRET (32+), ENCRYPTION_KEY (64 hex)
docker compose up -d --build
# App: http://localhost:8080  |  Backend interno: backend:3000
docker compose ps && docker compose logs -f
```

Serviços:
- `backend`: build multi-stage Node 22, usuário `appuser`, healthcheck `/health`, volume `redisscope_data:/app/data`
- `frontend`: Nginx serve `dist/` e proxia `/api/` e `/health` → `backend:3000`
- Redis **não** é iniciado pelo Compose — aponte para instâncias externas

## Rede Docker externa (ex.: Redis em outra stack)
No `docker-compose.yml`:
```yaml
networks:
  redisscope_internal:
    driver: bridge
  redis_net:
    external: true
    name: nome-da-sua-rede
```
E em `backend`/`frontend`: `networks: [redisscope_internal, redis_net]`. Descubra com `docker network ls`.

## Dev
`docker-compose.dev.yml` ou `npm run dev` direto (ver `docs/development.md`).

## Atualização / backup
- `docker compose pull` (se usar imagens) ou `docker compose up -d --build`
- Backup do volume: `docker run --rm -v redisscope_data:/data -v "$PWD":/host alpine tar czf /host/redisscope-backup.tgz -C /data .`
- `ENCRYPTION_KEY` estável é obrigatório para recuperar senhas salvas
