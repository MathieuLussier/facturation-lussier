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
 * Protège une route :
 * - Redirige vers /login si non authentifié.
 * - Affiche une page d'accès refusé si le rôle requis n'est pas satisfait.
 * - Affiche un écran de chargement pendant le silent refresh.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Chargement…</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-red-600">Accès refusé</h1>
        <p className="text-gray-600">Vous n&apos;avez pas les droits nécessaires pour cette page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
