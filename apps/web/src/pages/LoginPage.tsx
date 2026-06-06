import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '@facturation/ui';
import { LogIn } from 'lucide-react';
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
  // En dev, on autorise un mot de passe vide (raccourci de connexion local).
  if (!password && !import.meta.env.DEV) {
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
    <main className="min-h-screen grid place-items-center bg-canvas p-4">
      <div className="w-full max-w-sm">
        <Card padded>
          <div className="space-y-6">
            <div className="text-center">
              <img
                src="/lussier_facturation_monogram.svg"
                alt="Lussier Facturation"
                className="mx-auto mb-3 h-14 w-14"
              />
              <h1 className="text-2xl font-bold text-brand">Lussier Facturation</h1>
              <p className="mt-1 text-sm text-muted">Connectez-vous à votre compte</p>
            </div>

            {globalError && (
              <div
                role="alert"
                className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
              >
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

              {import.meta.env.DEV && (
                <p className="text-xs text-muted">
                  Dev : laissez le mot de passe vide pour vous connecter.
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {loading ? 'Connexion…' : 'Se connecter'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </main>
  );
}
