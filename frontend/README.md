# RedisScope — Frontend
React + TypeScript + Vite + Tailwind + TanStack Query + Lucide. Projeto **independente** — sem workspaces, sem imports do backend.

## Tecnologias
- React 19, TypeScript strict, Vite 8
- Tailwind CSS (paleta teal #0F766E / Redis #DC382D), Inter + JetBrains Mono
- TanStack Query (server state), Lucide React (ícones)
- Light / Dark (persistido em localStorage)

## Instalação
```bash
cd frontend
npm install
```

## Desenvolvimento
```bash
npm run dev   # http://localhost:5173 — proxy /api → localhost:3000
```

## Testes / Lint / Build
```bash
npm test            # vitest run
npm run lint
npm run build       # tsc -b && vite build → dist/
```

## Estrutura
```
src/
├── components/{ui,layout,common,redis}/
├── features/{connections,keys,commands,monitoring,settings,auth,dashboard}/
├── services/{api-client.ts, endpoints/}/
├── hooks/  types/  lib/  styles/
├── App.tsx (rotas)  main.tsx
```

## Regras
- Componentes **não** fazem `fetch` direto — use `services/endpoints` + TanStack Query.
- Feedback consistente: loading/skeletons, empty states, toasts, modais, confirmações (nunca `alert/confirm` nativos).
- Senhas: nunca em localStorage — token JWT em `sessionStorage` apenas.
- Contratos: tipos locais em `src/types/api.ts` espelhando `docs/api.md`.
