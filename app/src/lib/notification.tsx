import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (message: string, type: Notification['type']) => void;
  removeNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let _addNotification: ((message: string, type: Notification['type']) => void) | null = null;

export function setGlobalNotificationFn(fn: typeof _addNotification) {
  _addNotification = fn;
}

export function showToast(message: string, type: Notification['type'] = 'success') {
  _addNotification?.(message, type);
}

let globalId = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: Notification['type']) => {
    const id = ++globalId;
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    setGlobalNotificationFn(addNotification);
    return () => setGlobalNotificationFn(null);
  }, [addNotification]);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.map(n => (
          <div
            key={n.id}
            onClick={() => removeNotification(n.id)}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              background: n.type === 'error' ? '#B04040' : n.type === 'success' ? '#3D7A4F' : n.type === 'warning' ? '#C9A24A' : '#3A6ABF',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              maxWidth: 350,
            }}
          >
            {n.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
