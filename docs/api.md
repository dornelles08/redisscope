# API — RedisScope

Base: `/api` (dev: proxy Vite `:5173`; prod: proxy Nginx `:8080`). OpenAPI em `/docs` (dev).

Auth: `Authorization: Bearer <JWT>` em tudo exceto `/health` e `/api/auth/login`.
Erros: `{ "error": { "code": "...", "message": "..." } }` — nunca stack traces nem detalhes de rede.

## Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | `{username,password}` → `{token,expiresAt,user}` (rate-limited) |
| GET | `/api/auth/me` | Usuário atual |
| POST | `/api/auth/logout` | Descarta token (client-side) |

## Health
| GET | `/health` | `{status,version,uptime}` — público, usado em healthchecks |
| GET | `/api/status` | `{ok,version}` — autenticado |

## Connections
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/connections` | Lista pública (sem senhas) |
| GET | `/api/connections/:id` | Detalhe público |
| POST | `/api/connections` | Cria; `password` é criptografada (AES-GCM) |
| PUT | `/api/connections/:id` | Atualiza; senha **vazia/omitida preserva** a credencial |
| DELETE | `/api/connections/:id` | `204` — também fecha o cliente Redis persistente |
| POST | `/api/connections/:id/test` | Teste efêmero (PING) → `{ok,latencyMs?,error?}` |
| POST | `/api/connections/:id/connect` | Conecta (cliente persistente reutilizável) → `Status` |
| POST | `/api/connections/:id/disconnect` | Fecha cliente persistente → `Status` |
| GET | `/api/connections/:id/status` | Estado + latência (PING vivo) → `Status` |

`Connection`: `{id,name,host,port,username?,hasPassword,database,tls,createdAt,updatedAt}`
`Status`: `{connectionId,status: 'connected'|'disconnected'|'connecting'|'error',latencyMs?,error?}`

## Keys (SCAN — nunca KEYS * automático)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/connections/:id/keys?cursor&count&match&type` | Lista via SCAN → `{keys:[{key,type,ttl}],cursor,done}` |
| POST | `/api/connections/:id/keys` | Cria por tipo (ver `CreateKeyPayload`) → detalhe |
| GET | `/api/connections/:id/keys/:key?cursor&count&start&stop&from&to&order` | Detalhe paginado por tipo |
| PUT | `/api/connections/:id/keys/:key` | Atualiza STRING (`{value,ttlSeconds?}`) |
| DELETE | `/api/connections/:id/keys/:key` | Exclui → `{deleted}` |
| POST | `/api/connections/:id/keys/:key/rename` | `{newKey}` |
| POST | `/api/connections/:id/keys/:key/duplicate` | `{newKey}` (COPY + fallback manual) |
| GET | `/api/connections/:id/keys/:key/ttl` | `{key,ttl}` (`-1`=sem, `-2`=expirado) |
| PUT | `/api/connections/:id/keys/:key/ttl` | `{ttlSeconds}` |
| DELETE | `/api/connections/:id/keys/:key/ttl` | Remove TTL (persist) |
| POST | `/api/connections/:id/keys/:key/hash` | `{fields}` — adiciona/atualiza |
| DELETE | `/api/connections/:id/keys/:key/hash` | `{fields:[...]}` |
| POST | `/api/connections/:id/keys/:key/list` | `{side,values}` (LPUSH/RPUSH) |
| PUT | `/api/connections/:id/keys/:key/list/:index` | `{value}` (LSET) |
| DELETE | `/api/connections/:id/keys/:key/list/:index` | Remove por índice |
| POST | `/api/connections/:id/keys/:key/set` | `{members}` (SADD) |
| DELETE | `/api/connections/:id/keys/:key/set` | `{members}` (SREM) |
| POST | `/api/connections/:id/keys/:key/zset` | `{members:[{member,score}]}` (ZADD) |
| DELETE | `/api/connections/:id/keys/:key/zset` | `{members:[...]}` (ZREM) |
| POST | `/api/connections/:id/keys/:key/stream` | `{fields,id?}` (XADD) |

`CreateKeyPayload`: união por `type`: `string:{key,type,value,ttlSeconds?}`, `hash:{key,type,fields,ttlSeconds?}`, `list:{key,type,values,ttlSeconds?}`, `set:{key,type,members,ttlSeconds?}`, `zset:{key,type,members:[{member,score}],ttlSeconds?}`, `stream:{key,type,fields,ttlSeconds?}`

## Monitoring / Server Info (Fase 4)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/connections/:id/info` | INFO parseado → `{generatedAt,sections}` |
| GET | `/api/connections/:id/monitoring` | Resumo → `MonitoringSummary` |
| GET | `/api/connections/:id/stats` | Alias de `/monitoring` |

`MonitoringSummary`: `{version,mode,uptimeSeconds,memoryUsedBytes,memoryUsedHuman,maxMemoryBytes,maxMemoryHuman,memoryFragmentationRatio,keysCount,connectedClients,databasesUsed,opsPerSecond,totalCommands,hits,misses,hitRate,expiredKeys,evictedKeys}`

## Commands (Fase 5)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/connections/:id/commands` | `{command,confirm?}` → `{command,args,result,latencyMs,truncated}` |

- `command` é a linha crua (ex.: `SCAN 0 MATCH usuario:* COUNT 100`) — tokenizada no backend com aspas
- Bloqueados (403): `SHUTDOWN`, `CONFIG`, `DEBUG`, `MODULE`, `SCRIPT`, `CLIENT`
- Bloqueantes (403): `KEYS` (use SCAN), `BLPOP/BRPOP/BLMOVE/BZPOP*/XREAD/XREADGROUP/SUBSCRIBE…`
- Com confirmação (400 sem `confirm:true`): `FLUSHDB`, `FLUSHALL`
- Timeout `REDIS_COMMAND_TIMEOUT_MS` (5000ms), resposta truncada em 100 KB / 1000 itens

Atualizar este documento e o OpenAPI ao mudar contratos.
