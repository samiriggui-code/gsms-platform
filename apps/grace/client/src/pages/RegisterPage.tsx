import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import { AuthBrandedLayout } from '../components/auth/AuthBrandedLayout';
import { Btn2 } from '../components/hifi/Btn2';
import { HeaderControls } from '../components/shell/HeaderControls';
import { useAuthStore } from '../stores/auth';
import { useT } from '../i18n';

export function RegisterPage() {
  const t = useT();
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        organizationName,
        organizationSlug,
      });
      navigate({ to: '/' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bootstrap failed';
      if (/already bootstrapped/i.test(message)) {
        setError(t('auth.alreadyBootstrapped'));
        return;
      }
      setError(message);
    }
  }

  return (
    <AuthBrandedLayout
      brandName={t('app.name')}
      mark="G"
      controls={<HeaderControls />}
      panelTitle="Premier démarrage"
      panelBody={
        <>
          Créez l’administrateur et l’organisation — une seule fois.
          <br />
          Ensuite, les accès passent par la{' '}
          <span className="font-semibold text-foreground">connexion</span>.
        </>
      }
    >
      <form onSubmit={onSubmit} className="block w-full space-y-4">
        <div className="space-y-1 pb-1 text-center">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-n-900">
            {t('auth.registerTitle')}
          </h1>
          <p className="text-[12px] text-n-500">{t('auth.registerHint')}</p>
        </div>

        {error && (
          <div className="rounded-r2 border border-bad/20 bg-bad-bg px-3 py-2 text-[12px] text-bad">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('auth.firstName')} value={firstName} onChange={setFirstName} autoComplete="given-name" />
          <Field label={t('auth.lastName')} value={lastName} onChange={setLastName} autoComplete="family-name" />
        </div>
        <Field label={t('auth.email')} value={email} onChange={setEmail} type="email" autoComplete="email" />
        <Field
          label={t('auth.password')}
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="new-password"
        />
        <Field
          label={t('auth.orgName')}
          value={organizationName}
          onChange={setOrganizationName}
          placeholder="Acme Corp"
        />
        <Field
          label={t('auth.orgSlug')}
          value={organizationSlug}
          onChange={(v) => setOrganizationSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="acme-corp"
        />

        <Btn2
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full"
          leading={<UserPlus className="h-3.5 w-3.5" />}
        >
          {loading ? t('auth.settingUp') : t('auth.bootstrap')}
        </Btn2>

        <p className="text-center text-[12px] text-n-500">
          {t('auth.alreadyAccount')}{' '}
          <Link to="/login" className="font-semibold text-a-600 hover:text-a-700">
            {t('auth.signIn')}
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
