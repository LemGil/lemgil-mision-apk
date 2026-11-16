import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Church, BookOpen, Heart, Briefcase, Radio, CircleDollarSign, FileBarChart, Menu, X, HandCoins, Users, ContactRound, UsersRound, Megaphone, HeartHandshake, PiggyBank } from 'lucide-react';
import { useState } from 'react';
import type { ComponentType } from 'react';

interface NavItem {
  section?: string;
  to?: string;
  label?: string;
  icon?: ComponentType<{ size?: number }>;
  /**
   * Pestaña de la página a la que este ítem entra (?tab=…). Dos ítems
   * pueden compartir ruta (Congregados/Grupos/Evangelismos viven en
   * /mision; Miembros/Ministerios en /miembros): el resaltado activo se
   * calcula por ruta + pestaña, porque NavLink solo mira la ruta.
   */
  tabKey?: string;
}

// Menú agrupado de LemGil (2026-11-15, construido 2026-11-16):
// Secretaría · Misión · Iglesia · Finanzas. Cada módulo conserva su
// página; el menú solo agrupa y entra directo a la pestaña pedida.
const NAV_ITEMS: NavItem[] = [
  { section: 'Secretaría' },
  { to: '/', label: 'Panel', icon: LayoutDashboard },
  { to: '/personas', label: 'Personas', icon: ContactRound },
  { to: '/reportes', label: 'Informe', icon: FileBarChart },
  { to: '/comunicacion', label: 'Comunicación', icon: Radio },
  { section: 'Misión' },
  { to: '/mision?tab=congregados', label: 'Congregados', icon: Church, tabKey: 'congregados' },
  { to: '/mision?tab=grupos', label: 'Grupos', icon: UsersRound, tabKey: 'grupos' },
  { to: '/mision?tab=evangelismo', label: 'Evangelismos', icon: Megaphone, tabKey: 'evangelismo' },
  { to: '/manos-abiertas', label: 'Manos Abiertas', icon: Heart },
  { section: 'Iglesia' },
  { to: '/miembros?tab=directorio', label: 'Miembros', icon: Users, tabKey: 'directorio' },
  { to: '/miembros?tab=ministerios', label: 'Ministerios', icon: HeartHandshake, tabKey: 'ministerios' },
  { to: '/bien-comun?tab=diezmadores', label: 'Diezmadores', icon: PiggyBank, tabKey: 'diezmadores' },
  { to: '/academia', label: 'Academia', icon: BookOpen },
  { section: 'Finanzas' },
  { to: '/dadores', label: 'Red de Colaboradores', icon: CircleDollarSign },
  { to: '/bien-comun?tab=registros', label: 'Bien Común', icon: HandCoins, tabKey: 'registros' },
  { to: '/negocios', label: 'Negocios Adonay', icon: Briefcase },
];

/** Pestaña por omisión de cada página con pestañas (sin ?tab= en la URL). */
const TAB_POR_OMISION: Record<string, string> = {
  '/mision': 'congregados',
  '/miembros': 'directorio',
  '/bien-comun': 'registros',
};

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();
  const tabEnUrl = new URLSearchParams(search).get('tab');
  const tabEfectiva = tabEnUrl ?? TAB_POR_OMISION[pathname] ?? null;

  const claseItem = (item: NavItem) => {
    if (!item.tabKey) return undefined; // NavLink decide por la ruta
    const rutaItem = item.to!.split('?')[0];
    return `nav-item ${pathname === rutaItem && tabEfectiva === item.tabKey ? 'active' : ''}`;
  };

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
                className={claseItem(item) ?? (({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`)}
                onClick={() => setOpen(false)}
              >
                {item.icon && <item.icon size={16} />}
                {item.label}
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
