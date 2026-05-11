'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Map as MapIcon,
  Layers,
} from 'lucide-react';

export type ActiveRoute = 'home' | 'atlas' | 'classification';

interface SideNavProps {
  active: ActiveRoute;
}

interface NavItem {
  route: ActiveRoute;
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const ITEMS: NavItem[] = [
  { route: 'home', href: '/', label: 'Início', icon: LayoutDashboard },
  { route: 'atlas', href: '/atlas', label: 'Mapa de análise', icon: MapIcon },
  { route: 'classification', href: '/classification', label: 'Classificação', icon: Layers },
];

/**
 * Nav lateral compartilhada entre Home, Atlas e Classificação.
 * Apenas botões de NAVEGAÇÃO entre rotas — toggles internos de cada
 * tela (Analytics/Pesquisa, métodos de classificação, etc.) ficam
 * dentro do próprio painel da rota.
 */
export function SideNav({ active }: SideNavProps) {
  return (
    <aside className="flex w-14 shrink-0 flex-col items-center border-r border-moss-100 bg-cream py-6">
      {ITEMS.map((item) => {
        const isActive = active === item.route;
        const Icon = item.icon;
        const className = `rounded-sm p-2.5 transition-colors ${
          isActive
            ? 'bg-moss-900 text-cream'
            : 'text-smoke hover:bg-moss-50 hover:text-moss-900'
        }`;

        if (isActive) {
          return (
            <button key={item.route} aria-label={item.label} aria-current="page" className={className}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>
          );
        }
        return (
          <Link key={item.route} href={item.href} aria-label={item.label}>
            <button className={className}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>
          </Link>
        );
      })}

      <div className="flex-1" />
    </aside>
  );
}
