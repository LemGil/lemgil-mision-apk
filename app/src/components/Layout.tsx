import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastContainer } from './Toast';
import { SyncIndicator } from './SyncIndicator';

interface LayoutProps {
  title: string;
  breadcrumb?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}

export function Layout({ title, breadcrumb, right, children }: LayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={title} breadcrumb={breadcrumb} right={right} />
        <div className="page-content">{children}</div>
      </div>
      <SyncIndicator />
      <ToastContainer />
    </div>
  );
}
