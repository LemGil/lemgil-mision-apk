import { useToast } from '../hooks/useToast';
import type { ToastItem } from '../hooks/useToast';

export function ToastContainer() {
  const { toasts, remove } = useToast();
  // Expose globally for imperative usage
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onRemove={() => remove(t.id)} />
      ))}
    </div>
  );
}

function Toast({ item, onRemove }: { item: ToastItem; onRemove: () => void }) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  return (
    <div className={`toast ${item.type}`} onClick={onRemove}>
      <span>{icons[item.type]}</span> {item.message}
    </div>
  );
}
