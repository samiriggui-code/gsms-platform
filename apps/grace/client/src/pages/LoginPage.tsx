import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Btn2 } from '../components/hifi/Btn2';
import { AuthBrandedLayout } from '../components/auth/AuthBrandedLayout';
import { HeaderControls } from '../components/shell/HeaderControls';
import { useAuthStore } from '../stores/auth';
import { useT } from '../i18n';

/** Seed admin — prefilled on login only in Vite DEV. */
const DEV_ADMIN = {
  email: 'admin@nordica.demo',
  password: 'Demo123!',
} as const;

const isDev = import.meta.env.DEV;

export function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);

  const [email, setEmail] = useState(isDev ? DEV_ADMIN.email : '');
  const [password, setPassword] = useState(isDev ? DEV_ADMIN.password : '');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password });
      navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    }
  }

  return (
    <AuthBrandedLayout
      brandName={t('app.name')}
      mark="G"
      controls={<HeaderControls />}
      panelTitle="Accès sécurisé à GSMS Engine"
      panelBody={
        <>
          Audit de sûreté physique, évaluations CSMP et preuves terrain —
          <br />
          <span className="font-semibold text-foreground">un même espace</span> pour
          collecter, scoriser et signer.
        </>
      }
    >
      <form onSubmit={onSubmit} className="block w-full space-y-5">
        <div className="space-y-1 pb-1 text-center">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-n-900">
            {t('auth.signIn')}
          </h1>
          <p className="text-[12.5px] text-n-500">{t('auth.signInHint')}</p>
        </div>

        {isDev && (
          <div className="rounded-r2 border border-a-200 bg-a-50 px-3 py-2 text-[11.5px] text-n-700">
            <div className="mb-1 font-medium text-a-800">{t('auth.devCredentials')}</div>
            <div className="font-mono text-[11px] text-n-800">
              {DEV_ADMIN.email}
              <span className="text-n-400"> / </span>
              {DEV_ADMIN.password}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-r2 border border-bad/20 bg-bad-bg px-3 py-2 text-[12px] text-bad">
            {error}
          </div>
        )}

        <Field
          label={t('auth.email')}
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
          placeholder="vous@organisation.fr"
        />

        <label className="block">
          <div className="mb-1 text-[10px] font-mono uppercase tracking-[0.4px] text-n-500">
            {t('auth.password')}
          </div>
          <div className="relative">
            <input
              type={passwordVisible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="h-9 w-full rounded-r2 border border-border bg-card px-2.5 pr-10 text-[12.5px] text-n-900 outline-none transition focus:border-a-400 focus:ring-2 focus:ring-a-100"
            />
            <button
              type="button"
              className="absolute right-1 top-0 flex size-9 items-center justify-center text-n-400 hover:text-n-700"
              onClick={() => setPasswordVisible((v) => !v)}
              aria-label={passwordVisible ? 'Hide' : 'Show'}
            >
              {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        <Btn2
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full"
          leading={<Lock className="h-3.5 w-3.5" />}
        >
          {loading ? t('common.loading') : t('auth.signIn')}
        </Btn2>

        <p className="text-center text-[12px] text-n-500">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-a-600 hover:text-a-700">
            {t('auth.bootstrap')}
          </Link>
        </p>
      </form>
    </AuthBrandedLayout>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-mono uppercase tracking-[0.4px] text-n-500">
        {props.label}
      </div>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        required
        className="h-9 w-full rounded-r2 border border-border bg-card px-2.5 text-[12.5px] text-n-900 outline-none transition focus:border-a-400 focus:ring-2 focus:ring-a-100"
      />
    </label>
  );
}
