import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastContainer } from './Toast';
import { SyncIndicator } from './SyncIndicator';
import { forcePushAllLocal } from '../lib/sync';
import { useErrorNotification } from '../lib/errorNotifications';

interface LayoutProps {
  title: string;
  breadcrumb?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}

export function Layout({ title, breadcrumb, right, children }: LayoutProps) {
  const { showError, showSuccess } = useErrorNotification();

  const handleForceSync = async () => {
    if (confirm('¿Desea forzar la sincronización de todos los datos locales a la nube? Esto actualizará los registros existentes en Supabase.')) {
      try {
        await forcePushAllLocal();
        showSuccess('Sincronización total completada.');
      } catch (e) {
        showError('Error al sincronizar: ' + e);
      }
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={title} breadcrumb={breadcrumb} right={right} />
        <div className="page-content">{children}</div>
      </div>
      <div style={{ position: 'fixed', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <button className="btn btn-secondary btn-sm" onClick={handleForceSync} style={{ fontSize: 10, padding: '4px 8px', opacity: 0.6 }}>
          🔄 Forzar Sync Total
        </button>
        <SyncIndicator />
      </div>
      <ToastContainer />
    </div>
  );
}
