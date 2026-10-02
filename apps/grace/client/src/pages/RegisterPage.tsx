import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Building2, CalendarClock, FileText, UserPlus } from 'lucide-react';
import { AuthBrandedLayout } from '../components/auth/AuthBrandedLayout';
import { Btn2 } from '../components/hifi/Btn2';
import { HeaderControls } from '../components/shell/HeaderControls';
import { useAuthStore } from '../stores/auth';
import { useT } from '../i18n';

const PANEL_ITEMS = [
  { icon: Building2, label: 'Votre organisation et ses sites' },
  { icon: FileText, label: 'Vos preuves et rapports, au même endroit' },
  { icon: CalendarClock, label: 'Vos échéances CSMP suivies' },
] as const;

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
      product="Grace"
      eyebrow="Premier démarrage"
      titleLead="Votre organisation,"
      titleEmph="prête à auditer."
      body="Créez l’administrateur et l’organisation — une seule fois. Ensuite, les accès passent par la connexion."
      items={[...PANEL_ITEMS]}
      controls={<HeaderControls />}
    >
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[22px]/[1.2] font-[650] tracking-[-0.03em] text-n-900">
            {t('auth.registerTitle')}
          </h1>
          <p className="text-[13.5px]/[1.55] text-n-500">{t('auth.registerHint')}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-[10px] border border-bad/20 bg-bad-bg px-3.5 py-2.5 text-[13px] text-bad"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('auth.firstName')} value={firstName} onChange={setFirstName} autoComplete="given-name" />
          <Field label={t('auth.lastName')} value={lastName} onChange={setLastName} autoComplete="family-name" />
        </div>
        <Field label="E-mail" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <Field
          label="Mot de passe"
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
          className="h-11 w-full"
          leading={<UserPlus className="h-3.5 w-3.5" />}
        >
          {loading ? t('auth.settingUp') : t('auth.bootstrap')}
        </Btn2>

        <p className="text-center text-[12.5px] text-n-500">
          {t('auth.alreadyAccount')}{' '}
          <Link to="/login" className="font-medium text-n-900 underline-offset-4 hover:underline">
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
