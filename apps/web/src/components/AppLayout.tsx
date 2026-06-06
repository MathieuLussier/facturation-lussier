import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@facturation/ui';
import {
  Building2,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const BASE_NAV: NavItem[] = [
  { to: '/', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/invoices', label: 'Factures', icon: FileText },
  { to: '/produits', label: 'Produits', icon: Package },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/issuer', label: 'Entreprise', icon: Building2 },
  { to: '/users', label: 'Utilisateurs', icon: UsersRound },
];

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  return [
    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-fg',
  ].join(' ');
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = [...BASE_NAV, ...(user?.role === 'ADMIN' ? ADMIN_NAV : [])];

  const handleLogout = async (): Promise<void> => {
    await logout();
    void navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-canvas text-fg">
      {/* Barre latérale (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface sm:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/lussier_facturation_monogram.svg" alt="" className="h-9 w-9" />
          <div className="leading-tight">
            <p className="font-semibold">Lussier</p>
            <p className="text-xs text-muted">Facturation</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClasses}>
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <p className="truncate text-sm font-medium">{user?.name ?? user?.email}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 w-full"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Déconnexion
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* En-tête (mobile : marque + nav condensée ; partout : bascule de thème) */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur sm:px-8 sm:justify-end">
          <div className="flex items-center gap-3 sm:hidden">
            <span className="font-semibold">Lussier</span>
            <nav className="flex gap-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    [
                      'grid h-9 w-9 place-items-center rounded-md',
                      isActive ? 'bg-brand-soft text-brand' : 'text-muted',
                    ].join(' ')
                  }
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/invoices/new"
              className="hidden items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-fg transition-colors hover:opacity-90 sm:inline-flex"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              Facture
            </Link>
            <Link
              to="/clients?new=1"
              className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-surface-2 sm:inline-flex"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Client
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-4xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
