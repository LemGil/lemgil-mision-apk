import type { ReactNode } from 'react';

interface TopbarProps {
  title: string;
  breadcrumb?: ReactNode;
  right?: ReactNode;
}

export function Topbar({ title, breadcrumb, right }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">
        {breadcrumb && <div className="topbar-breadcrumb">{breadcrumb}</div>}
        <div className="status-dot">
          <div className="dot" /> Sistema activo
        </div>
        {right}
      </div>
    </div>
  );
}
