import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '@facturation/core';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Rôle requis pour accéder à la route (ex: 'ADMIN'). */
  requiredRole?: Role;
}

/**
 * Protège une route : redirige vers /login si non authentifié,
 * affiche un accès refusé si le rôle requis n'est pas satisfait,
 * et un écran de chargement pendant le silent refresh.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-muted">
        <p className="text-sm">Chargement…</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-danger">Accès refusé</h1>
          <p className="mt-2 text-sm text-muted">
            Vous n&apos;avez pas les droits nécessaires pour cette page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
