/**
 * Connexion à DocuLens quand il est branché sur le GSMS Core : même compte que le portail GSMS.
 * « Se connecter avec GSMS » passe par le portail (un clic si la session du portail est ouverte) ;
 * le formulaire accepte aussi l'e-mail et le mot de passe GSMS. Pas de compte de démonstration.
 */
import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, FileCheck2, Loader2, ShieldCheck } from 'lucide-react';

import { gsmsPortalUrl, startGsmsSignIn } from '../api/core';
import { useAuth } from '../auth/useAuth';
import { Logo } from '../components/brand/Logo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ThemeToggle } from '../components/ui/theme-toggle';

export function GsmsLoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: { pathname?: string }; ssoError?: string } | undefined;
  const target = state?.from?.pathname ?? '/app';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(state?.ssoError ?? null);
  const [pending, setPending] = useState<'gsms' | 'form' | null>(null);

  if (user) return <Navigate to={target} replace />;

  const signInWithGsms = async () => {
    setError(null);
    setPending('gsms');
    try {
      await startGsmsSignIn(target);
    } catch {
      setPending(null);
      setError('Impossible de joindre le portail GSMS. Réessayez dans un instant.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending('form');
    try {
      await login(email, password);
      navigate(target, { replace: true });
    } catch {
      setError('E-mail ou mot de passe incorrect, ou compte non autorisé.');
      setPending(null);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr,0.95fr]">
      <div className="relative hidden overflow-hidden border-r border-border bg-foreground p-12 text-background lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_25%_20%,hsl(var(--docu-primary)/.55),transparent_34%),radial-gradient(circle_at_90%_90%,hsl(var(--docu-primary)/.3),transparent_30%)]" />
        <div className="relative"><Logo className="[&_span]:text-background [&_span_span]:text-background/50" /></div>
        <div className="relative my-auto max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/[0.06] px-3 py-1.5 text-xs text-background/70">
            <ShieldCheck className="h-3.5 w-3.5" /> Outil interne de l’équipe GSMS
          </span>
          <h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.03] tracking-[-0.055em] xl:text-6xl">
            Les pièces de vos prestations, analysées.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-background/60">
            Dépôt, analyse et recherche dans les documents des clients, avec la page ou la cellule d’origine de
            chaque information.
          </p>
        </div>
        <div className="relative flex items-center gap-3 border-t border-background/10 pt-6 text-xs text-background/50">
          <FileCheck2 className="h-4 w-4" /> Documents chiffrés dans le coffre-fort GSMS.
        </div>
      </div>

      <div className="flex min-h-screen flex-col px-5 py-5 sm:px-10 lg:px-16 xl:px-24">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="my-auto w-full max-w-md self-center py-12">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Accès GSMS</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Connexion</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Avec votre compte GSMS, le même que sur le portail, GRACE, QAtrial et le CRM.
            </p>
          </div>

          <Button type="button" className="h-11 w-full rounded-xl" onClick={signInWithGsms} disabled={pending !== null}>
            {pending === 'gsms' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Se connecter avec GSMS
          </Button>

          {error ? (
            <div role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
              {error}
            </div>
          ) : null}

          <div className="my-7 flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
            <span className="h-px flex-1 bg-border" /> ou avec votre e-mail GSMS <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-semibold" htmlFor="email">E-mail</label>
              <Input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="prenom.nom@gsms-security.com" className="h-11 rounded-xl bg-background" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-semibold" htmlFor="password">Mot de passe</label>
                <a href={`${gsmsPortalUrl()}/login`} className="text-xs font-medium text-primary">Mot de passe oublié ?</a>
              </div>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl bg-background pr-10" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="outline" className="h-11 w-full rounded-xl" disabled={pending !== null}>
              {pending === 'form' ? 'Connexion…' : 'Se connecter'} {pending !== 'form' ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </Button>
          </form>
          <p className="mt-7 text-center text-[11px] leading-5 text-muted-foreground">
            Mot de passe oublié : un administrateur GSMS vous envoie un nouveau lien depuis Paramètres → Équipe.
          </p>
        </div>
      </div>
    </div>
  );
}
