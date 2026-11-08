# AGENTS.md — Frontend

Projeto Vite **independente**. Não adicionar dependências na raiz, não usar workspaces, não importar código do backend.

## Regras
- Comunicação **exclusivamente** por HTTP REST (`services/api-client.ts` + `services/endpoints/`).
- Componentes não fazem requisições diretas; use TanStack Query.
- Estado local quando suficiente; Zustand apenas se houver necessidade real.
- Feedback visual consistente: skeletons, empty states, toasts (`components/ui/toast`), modais e `ConfirmDialog` para destrutivas. Nunca `alert/confirm` nativos.
- Portuguese (Brasil) na UI; tipos em `src/types/api.ts` espelhando `docs/api.md`.
- Testes obrigatórios: `npm test` + `npm run lint` + `npm run build`.
