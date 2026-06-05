import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/Confirm';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { IssuerPage } from './pages/IssuerPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceFormPage } from './pages/InvoiceFormPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { applyTheme, resolveInitialTheme } from './lib/theme';
import './index.css';

// Applique le thème avant le rendu pour éviter un flash.
applyTheme(resolveInitialTheme());

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Élément racine #root introuvable.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
        <Routes>
          {/* Route publique */}
          <Route path="/login" element={<LoginPage />} />

          {/* Routes protégées sous la coquille d'application */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/new" element={<InvoiceFormPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
            <Route
              path="/issuer"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <IssuerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <UsersPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
