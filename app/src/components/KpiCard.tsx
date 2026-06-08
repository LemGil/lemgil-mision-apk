import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: string;
  accent: string;
  sub?: string;
  change?: string;
  changeDir?: 'up' | 'down';
  extra?: ReactNode;
}

export function KpiCard({ label, value, icon, accent, sub, change, changeDir, extra }: KpiCardProps) {
  return (
    <div className="kpi" style={{ '--accent': accent } as React.CSSProperties}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <div className="kpi-label" style={{ flex: 1 }}>{label}</div>
        {extra && <div>{extra}</div>}
      </div>
      <div className="kpi-value">{value}</div>
      {change && <div className={`kpi-change ${changeDir}`}>{change}</div>}
      {sub && !change && <div className="kpi-sub">{sub}</div>}
      <div className="kpi-icon">{icon}</div>
    </div>
  );
}
