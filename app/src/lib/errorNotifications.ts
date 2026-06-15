import { useCallback } from 'react';
import { useNotifications } from './notification';

export function useErrorNotification() {
  const { addNotification } = useNotifications();

  const showError = useCallback((message: string) => addNotification(message, 'error'), [addNotification]);
  const showSuccess = useCallback((message: string) => addNotification(message, 'success'), [addNotification]);
  const showWarning = useCallback((message: string) => addNotification(message, 'warning'), [addNotification]);
  const showInfo = useCallback((message: string) => addNotification(message, 'info'), [addNotification]);

  return { showError, showSuccess, showWarning, showInfo };
}
