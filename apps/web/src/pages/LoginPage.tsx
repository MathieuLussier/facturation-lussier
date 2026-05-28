import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '@facturation/ui';
import { ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

/** Valide les champs du formulaire côté client. */
function validateForm(email: string, password: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!email.trim()) {
    errors.email = 'L\'adresse e-mail est requise.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Adresse e-mail invalide.';
  }
  if (!password) {
    errors.password = 'Le mot de passe est requis.';
  }
  return errors;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setGlobalError('');

    const errors = validateForm(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await login(email, password);
      void navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setGlobalError('Trop de tentatives, réessayez plus tard.');
        } else if (err.status === 401) {
          setGlobalError('Identifiants incorrects. Vérifiez votre e-mail et mot de passe.');
        } else {
          setGlobalError(err.message);
        }
      } else {
        setGlobalError('Une erreur inattendue est survenue.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand">Facturation Lussier</h1>
          <p className="mt-1 text-sm text-gray-500">Connectez-vous à votre compte</p>
        </div>

        {globalError && (
          <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {globalError}
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e); }} noValidate className="space-y-4">
          <Input
            id="email"
            label="Adresse e-mail"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            disabled={loading}
          />

          <Input
            id="password"
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            disabled={loading}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </div>
    </main>
  );
}
