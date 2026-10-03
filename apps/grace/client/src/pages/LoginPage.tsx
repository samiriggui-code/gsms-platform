import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  CalendarClock,
  ClipboardCheck,
  Eye,
  EyeOff,
  FileText,
  Lock,
} from 'lucide-react';
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

const PANEL_ITEMS = [
  { icon: ClipboardCheck, label: 'Vos audits et leur avancement' },
  { icon: FileText, label: 'Vos preuves et rapports, au même endroit' },
  { icon: CalendarClock, label: 'Vos échéances CSMP suivies' },
] as const;

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
      product="Grace"
      eyebrow="Espace audit"
      titleLead="Votre sûreté,"
      titleEmph="évaluée au quotidien."
      body="Retrouvez vos missions d’audit, vos constats et preuves terrain, vos documents et vos prochaines échéances."
      items={[...PANEL_ITEMS]}
      controls={<HeaderControls />}
    >
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[22px]/[1.2] font-[650] tracking-[-0.03em] text-n-900">
            Connexion
          </h1>
          <p className="text-[13.5px]/[1.55] text-n-500">
            Accédez à votre espace GSMS Grace.
          </p>
        </div>

        {isDev && (
          <div className="rounded-[10px] border border-a-200 bg-a-50 px-3.5 py-2.5 text-[13px] text-n-700">
            <div className="mb-1 font-medium text-a-800">{t('auth.devCredentials')}</div>
            <div className="font-mono text-[11px] text-n-800">
              {DEV_ADMIN.email}
              <span className="text-n-400"> / </span>
              {DEV_ADMIN.password}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-[10px] border border-bad/20 bg-bad-bg px-3.5 py-2.5 text-[13px] text-bad"
          >
            {error}
          </div>
        )}

        <Field
          label="E-mail"
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
          placeholder="vous@organisation.fr"
        />

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-n-800">Mot de passe</span>
          <div className="relative">
            <input
              type={passwordVisible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="h-11 w-full rounded-[12px] border border-border bg-n-75 px-3 pr-10 text-[13.5px] text-n-900 outline-none transition focus:border-a-400 focus:ring-2 focus:ring-a-100"
            />
            <button
              type="button"
              className="absolute right-1 top-0 flex size-11 items-center justify-center text-n-400 hover:text-n-700"
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
          className="h-11 w-full"
          leading={<Lock className="h-3.5 w-3.5" />}
        >
          {loading ? t('common.loading') : 'Se connecter'}
        </Btn2>

        <p className="text-center text-[12.5px] text-n-500">
          Pas encore client ?{' '}
          <a
            href="https://gsms-security.com/contact"
            className="font-medium text-n-900 underline-offset-4 hover:underline"
          >
            Contactez-nous
          </a>
          {' · '}
          <Link to="/register" className="font-medium text-a-600 hover:text-a-700">
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
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-n-800">{props.label}</span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        required
        className="h-11 w-full rounded-[12px] border border-border bg-n-75 px-3 text-[13.5px] text-n-900 outline-none transition focus:border-a-400 focus:ring-2 focus:ring-a-100"
      />
    </label>
  );
}
