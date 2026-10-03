import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch, getApiBase } from '../../lib/apiClient';
import { ThemeToggle } from '../shell/ThemeToggle';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { AuthBrandedLayout } from './AuthBrandedLayout';

const PANEL_ITEMS = [
  { icon: ClipboardList, label: 'Vos CAPA et leur avancement' },
  { icon: FileText, label: 'Vos preuves et rapports, au même endroit' },
  { icon: CalendarClock, label: 'Vos échéances réglementaires suivies' },
] as const;

const authSchema = z
  .object({
    mode: z.enum(['login', 'register']),
    name: z.string(),
    email: z.string().min(1, 'auth.emailRequired').email('auth.emailInvalid'),
    password: z.string().min(8, 'auth.passwordMin'),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.mode !== 'register') return;
    if (data.name.trim().length === 0) {
      ctx.addIssue({ code: 'custom', message: 'auth.nameRequired', path: ['name'] });
    }
    if (data.confirmPassword.length < 8) {
      ctx.addIssue({ code: 'custom', message: 'auth.passwordMin', path: ['confirmPassword'] });
    } else if (data.confirmPassword !== data.password) {
      ctx.addIssue({
        code: 'custom',
        message: 'auth.confirmPasswordMismatch',
        path: ['confirmPassword'],
      });
    }
  });

type AuthValues = z.infer<typeof authSchema>;

/** Prefill login only in Vite DEV — set VITE_DEV_LOGIN_* in `.env.local`. */
function devLoginDefaults(): Pick<AuthValues, 'email' | 'password'> {
  if (!import.meta.env.DEV) return { email: '', password: '' };
  return {
    email: String(import.meta.env.VITE_DEV_LOGIN_EMAIL ?? ''),
    password: String(import.meta.env.VITE_DEV_LOGIN_PASSWORD ?? ''),
  };
}

export function LoginPage() {
  const { t } = useTranslation();
  const { login, register: registerAccount } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(true);
  const [ssoExchanging, setSsoExchanging] = useState(false);

  const devCreds = devLoginDefaults();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      mode: 'login',
      name: '',
      email: devCreds.email,
      password: devCreds.password,
      confirmPassword: '',
    },
  });

  useEffect(() => {
    fetch(`${getApiBase()}/auth/sso/config`)
      .then((res) => res.json())
      .then((data: { enabled: boolean }) => {
        setSsoEnabled(data.enabled);
      })
      .catch(() => {
        setSsoEnabled(false);
      })
      .finally(() => {
        setSsoLoading(false);
      });
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('sso_token=')) return;

    const token = hash.split('sso_token=')[1]?.split('&')[0];
    if (!token) return;

    window.history.replaceState(null, '', window.location.pathname);

    setSsoExchanging(true);
    apiFetch<{
      user: { id: string; email: string; name: string; role: string; orgId: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/sso/token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        localStorage.setItem('qatrial:token', res.accessToken);
        localStorage.setItem('qatrial:refresh-token', res.refreshToken);
        window.location.reload();
      })
      .catch((err) => {
        setError(err.message || t('auth.ssoFailed'));
        setSsoExchanging(false);
      });
  }, [t]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoError = params.get('sso_error');
    if (ssoError) {
      setError(decodeURIComponent(ssoError));
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(values.email, values.password);
      } else {
        await registerAccount(values.email, values.password, values.name);
      }
    } catch (err: unknown) {
      setError(
        mode === 'login'
          ? t('auth.loginError')
          : (err instanceof Error ? err.message : null) || t('auth.registerError'),
      );
    } finally {
      setLoading(false);
    }
  });

  const handleSsoLogin = () => {
    window.location.href = `${getApiBase()}/auth/sso/login`;
  };

  const toggleMode = () => {
    const next = mode === 'login' ? 'register' : 'login';
    setMode(next);
    setError(null);
    const filled = next === 'login' ? devLoginDefaults() : { email: '', password: '' };
    reset({
      mode: next,
      name: '',
      email: filled.email,
      password: filled.password,
      confirmPassword: '',
    });
  };

  if (ssoExchanging) {
    return (
      <AuthBrandedLayout
        product="QAtrial"
        eyebrow="Connexion SSO"
        titleLead="Authentification"
        titleEmph="en cours."
        body="Finalisation de l’authentification sécurisée…"
        items={[...PANEL_ITEMS]}
        controls={<ThemeToggle />}
      >
        <div className="py-10 text-center">
          <Loader2 className="mx-auto mb-3 size-8 animate-spin text-accent" />
          <p className="text-sm text-text-secondary">{t('auth.ssoCompleting')}</p>
        </div>
      </AuthBrandedLayout>
    );
  }

  return (
    <AuthBrandedLayout
      product="QAtrial"
      eyebrow="Espace qualité"
      titleLead="Votre conformité,"
      titleEmph="suivie au quotidien."
      body="Retrouvez vos CAPA, votre audit trail, vos preuves réglementaires et vos prochaines échéances."
      items={[...PANEL_ITEMS]}
      controls={<ThemeToggle />}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[22px]/[1.2] font-[650] tracking-[-0.03em] text-text-primary">
            {mode === 'login' ? 'Connexion' : t('auth.register')}
          </h1>
          <p className="text-[13.5px]/[1.55] text-text-tertiary">
            {mode === 'login'
              ? 'Accédez à votre espace GSMS QAtrial.'
              : t('auth.register')}
          </p>
          {import.meta.env.DEV && mode === 'login' && Boolean(devCreds.email) && (
            <p className="pt-1 text-[11px] text-accent">
              Dev : identifiants préremplis (VITE_DEV_LOGIN_*)
            </p>
          )}
        </div>

        {!ssoLoading && ssoEnabled && mode === 'login' && (
          <>
            <Button type="button" variant="secondary" className="w-full" onClick={handleSsoLogin}>
              <Shield className="size-3.5 text-accent" />
              {t('sso.signInWithSso')}
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
                {t('sso.orEmail')}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
          {mode === 'register' && (
            <div>
              <Label htmlFor="auth-name">{t('auth.name')}</Label>
              <Input id="auth-name" type="text" placeholder="Jane Doe" {...register('name')} />
              {errors.name && (
                <p className="mt-1 text-[11.5px] text-danger">{t(errors.name.message as string)}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="auth-email">{t('auth.email')}</Label>
            <Input
              id="auth-email"
              type="email"
              placeholder="vous@organisation.fr"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-[11.5px] text-danger">{t(errors.email.message as string)}</p>
            )}
          </div>

          <div>
            <Label htmlFor="auth-password">{t('auth.password')}</Label>
            <div className="relative">
              <Input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-0 flex size-9 items-center justify-center text-text-tertiary transition-colors hover:text-text-secondary"
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-[11.5px] text-danger">{t(errors.password.message as string)}</p>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <Label htmlFor="auth-confirm">{t('auth.confirmPassword')}</Label>
              <Input
                id="auth-confirm"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-[11.5px] text-danger">
                  {t(errors.confirmPassword.message as string)}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-r2 border border-danger/20 bg-danger-subtle px-3 py-2 text-[12px] text-danger">
              {error}
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            className="h-11 w-full bg-[#111721] text-white hover:bg-[#111721]/90"
          >
            {mode === 'login' ? 'Se connecter' : t('auth.register')}
          </Button>
        </form>

        <p className="text-center text-[12.5px] text-text-tertiary">
          <button
            type="button"
            onClick={toggleMode}
            className="font-medium text-text-primary underline-offset-4 hover:underline"
          >
            {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
          </button>
        </p>
      </div>
    </AuthBrandedLayout>
  );
}
