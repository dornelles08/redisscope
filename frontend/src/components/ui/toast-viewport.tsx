import { useEffect, useState } from 'react';
import { subscribeToasts, type ToastItem } from './toast';
import { cn } from '@/lib/utils';

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts(setItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <div data-testid="toast-viewport" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-lg',
            t.type === 'success' && 'border-green-200 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200',
            t.type === 'error' && 'border-red-200 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200',
            t.type === 'info' && 'border-slate-200 bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100',
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
