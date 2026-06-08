import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Globe, BookOpen, Heart, Briefcase, Radio, CircleDollarSign, FileBarChart, Menu, X, HandCoins, Users } from 'lucide-react';
import { useState } from 'react';
import type { ComponentType } from 'react';

interface NavItem {
  section?: string;
  to?: string;
  label?: string;
  icon?: ComponentType<{ size?: number }>;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { section: 'Principal' },
  { to: '/', label: 'Panel', icon: LayoutDashboard },
  { section: 'Ministerio' },
  { to: '/mision', label: 'Misión Bíblica', icon: Globe, badge: 3 },
  { to: '/academia', label: 'Academia', icon: BookOpen },
  { to: '/manos-abiertas', label: 'Manos Abiertas', icon: Heart },
  { to: '/negocios', label: 'Negocios Adonay', icon: Briefcase },
  { section: 'Operaciones' },
  { to: '/comunicacion', label: 'Comunicación', icon: Radio },
  { to: '/dadores', label: 'Red de Colaboradores', icon: CircleDollarSign },
  { to: '/bien-comun', label: 'Bien Común', icon: HandCoins },
  { to: '/miembros', label: 'Miembros', icon: Users },
  { to: '/reportes', label: 'Reportes', icon: FileBarChart, badge: 2 },
];

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="mobile-toggle" onClick={() => setOpen(!open)}>
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      <div className={`overlay-bg ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-n">LEMGIL</div>
          <div className="logo-s">Ministerio Apostólico</div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, i) =>
            item.section ? (
              <div key={i} className="nav-section">{item.section}</div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to!}
                className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                {item.icon && <item.icon size={16} />}
                {item.label}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </NavLink>
            ),
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="avatar">LG</div>
            <div>
              <div className="user-name">LemGil</div>
              <div className="user-role">Apóstol</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
