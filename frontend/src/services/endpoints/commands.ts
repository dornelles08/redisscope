import { apiFetch } from '@/services/api-client';
import type { CommandResult } from '@/features/commands/console-utils';

export const commandsApi = {
  execute: (id: string, command: string, confirm?: boolean) =>
    apiFetch<CommandResult>(`/api/connections/${encodeURIComponent(id)}/commands`, {
      method: 'POST',
      body: { command, confirm },
    }),
};
