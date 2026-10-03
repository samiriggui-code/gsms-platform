/** Retour du portail GSMS après « Se connecter avec GSMS » : ouvre la session, puis affiche la page visée. */
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';

const ERRORS: Record<string, string> = {
  access_denied: 'Accès refusé par GSMS : votre compte n’a pas accès à DocuLens.',
};

export function GsmsCallbackPage() {
  const { loginWithGsms } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return; // StrictMode : un seul échange (le code ne sert qu'une fois)
    done.current = true;
    const fail = (message: string) => navigate('/login', { replace: true, state: { ssoError: message } });
    const error = params.get('error');
    const code = params.get('code');
    const state = params.get('state');
    if (error) {
      fail(ERRORS[error] ?? params.get('error_description') ?? 'Connexion refusée par GSMS.');
      return;
    }
    if (!code || !state) {
      fail('Réponse du portail GSMS incomplète. Recommencez.');
      return;
    }
    loginWithGsms(code, state)
      .then((next) => navigate(next, { replace: true }))
      .catch((err: Error) => fail(err.message?.includes('expiré') ? err.message : 'La connexion GSMS a échoué. Recommencez.'));
  }, [loginWithGsms, navigate, params]);

  return (
    <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        Connexion avec GSMS…
      </div>
    </div>
  );
}
