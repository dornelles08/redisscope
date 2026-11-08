# Desenvolvimento — RedisScope

## Pré-requisitos
Node.js ≥20, npm. Docker opcional (produção/homelab).

## Dev sem Docker
```bash
cp .env.example .env  # ajuste segredos

# Backend (:3000)
cd backend && npm install && npm run dev      # tsx watch

# Frontend (:5173, proxy /api → :3000)
cd frontend && npm install && npm run dev
```

## Testes e qualidade
```bash
cd backend  && npm test && npm run lint && npm run build
cd frontend && npm test && npm run lint && npm run build
```
- Vitest em ambos; `tsc` strict; ESLint. Não considerar pronto com erros.
- OpenAPI em dev: `http://localhost:3000/docs`

## Convenções
- Código em inglês, UI/docs em pt-BR; arquivos kebab-case
- Cada fase: relatório com arquivos, decisões e testes (ver AGENTS.md)

## Redis para testes
Use sua instância existente ou: `docker run -p 6379:6379 redis:7-alpine`. Ex.: host `192.168.1.100`, porta `6379` (ajuste à sua LAN).
