export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let counter = 0;
const listeners = new Set<(toasts: ToastItem[]) => void>();
let toasts: ToastItem[] = [];

function emit() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function pushToast(message: string, type: ToastItem['type'] = 'info'): void {
  const id = ++counter;
  toasts = [...toasts, { id, message, type }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 4000);
}

export function subscribeToasts(fn: (t: ToastItem[]) => void): () => void {
  listeners.add(fn);
  fn(toasts);
  return () => listeners.delete(fn);
}
