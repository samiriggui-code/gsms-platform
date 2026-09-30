/**
 * Personal account page — peer of MySurveysPage (self-service, not admin settings).
 * Route: /profile under protected shell.
 */

import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { Topbar } from '../components/shell/Topbar';
import { Avatar } from '../components/hifi/Avatar';
import { Btn2 } from '../components/hifi/Btn2';
import { Card } from '../components/hifi/Card';
import { api, extractError } from '../lib/api';
import { useAuthAvatarUrl } from '../lib/useAuthAvatarUrl';
import { useAuthStore, type Role } from '../stores/auth';
import { useT } from '../i18n';

type MePayload = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  hasAvatar: boolean;
  organization: { id: string; name: string; slug: string };
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const i = result.indexOf(',');
      resolve(i >= 0 ? result.slice(i + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

export function ProfilePage() {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<MePayload | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [avatarBust, setAvatarBust] = useState(0);

  const avatarUrl = useAuthAvatarUrl(me?.hasAvatar, avatarBust);

  function applyMe(data: MePayload) {
    setMe(data);
    setFirstName(data.firstName);
    setLastName(data.lastName);
    useAuthStore.setState({
      user: {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        hasAvatar: data.hasAvatar,
      },
      organization: data.organization,
    });
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get('auth/me').json<MePayload>();
        if (cancelled) return;
        applyMe(data);
      } catch (err) {
        if (!cancelled) setError(await extractError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const data = await api
        .patch('auth/me', {
          json: { firstName: firstName.trim(), lastName: lastName.trim() },
        })
        .json<MePayload>();
      applyMe(data);
      setSaved(true);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('page.profile.avatarInvalid'));
      return;
    }
    setAvatarBusy(true);
    setError(null);
    try {
      const contentBase64 = await fileToBase64(file);
      const data = await api
        .put('auth/me/avatar', {
          json: {
            fileName: file.name,
            mimeType: file.type,
            contentBase64,
          },
        })
        .json<MePayload>();
      applyMe(data);
      setAvatarBust((n) => n + 1);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setError(null);
    try {
      const data = await api.delete('auth/me/avatar').json<MePayload>();
      applyMe(data);
      setAvatarBust((n) => n + 1);
    } catch (err) {
      setError(await extractError(err));
    } finally {
      setAvatarBusy(false);
    }
  }

  const fullName = me ? `${me.firstName} ${me.lastName}`.trim() : '';
  const dirty =
    !!me &&
    (firstName.trim() !== me.firstName || lastName.trim() !== me.lastName);

  return (
    <>
      <Topbar
        breadcrumbs={<span>{t('page.profile.crumbs')}</span>}
        title={t('page.profile.title')}
        subtitle={t('page.profile.subtitle')}
      />

      <div className="p-6 space-y-4 w-full">
        {error && (
          <div className="text-[12px] text-bad bg-bad-bg border border-bad/20 rounded-r2 px-3 py-2">
            {error}
          </div>
        )}
        {saved && !dirty && (
          <div className="text-[12px] text-ok bg-ok-bg border border-ok/20 rounded-r2 px-3 py-2">
            {t('page.profile.saved')}
          </div>
        )}

        {loading || !me ? (
          <div className="text-[12.5px] text-n-500">{t('common.loading')}</div>
        ) : (
          <Card className="p-0 overflow-hidden w-full">
            <div className="grid lg:grid-cols-[240px_1fr] min-h-[420px]">
              <aside className="border-b lg:border-b-0 lg:border-r border-border bg-n-50/50 p-6 flex flex-col items-center gap-4">
                <Avatar name={fullName || me.email} src={avatarUrl} size="xl" />
                <div className="text-center min-w-0 w-full">
                  <div className="text-[14px] font-semibold text-n-900 truncate">
                    {fullName || me.email}
                  </div>
                  <div className="text-[12px] text-n-500 truncate">{me.email}</div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    void onAvatarFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <div className="flex flex-col gap-2 w-full">
                  <Btn2
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={avatarBusy}
                    leading={<Camera className="w-3.5 h-3.5" />}
                    onClick={() => fileRef.current?.click()}
                  >
                    {avatarBusy
                      ? t('common.loading')
                      : t('page.profile.changeAvatar')}
                  </Btn2>
                  {me.hasAvatar && (
                    <Btn2
                      type="button"
                      variant="ghost"
                      className="w-full"
                      disabled={avatarBusy}
                      leading={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => void removeAvatar()}
                    >
                      {t('page.profile.removeAvatar')}
                    </Btn2>
                  )}
                </div>
                <p className="text-[11px] text-n-500 text-center">
                  {t('page.profile.avatarHint')}
                </p>
              </aside>

              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-[13px] font-semibold text-n-900">
                    {t('page.profile.sectionIdentity')}
                  </h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[10px] font-mono uppercase text-n-500 tracking-[0.4px]">
                        {t('page.profile.firstName')}
                      </span>
                      <input
                        className="mt-1 w-full h-9 rounded-r2 border border-n-150 bg-white px-3 text-[12.5px]"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-mono uppercase text-n-500 tracking-[0.4px]">
                        {t('page.profile.lastName')}
                      </span>
                      <input
                        className="mt-1 w-full h-9 rounded-r2 border border-n-150 bg-white px-3 text-[12.5px]"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <h2 className="text-[13px] font-semibold text-n-900">
                    {t('page.profile.sectionAccount')}
                  </h2>
                  <div className="mt-3 overflow-hidden rounded-r2 border border-border">
                    <table className="w-full text-left">
                      <tbody className="text-[12.5px]">
                        <ProfileRow label={t('page.profile.email')}>
                          {me.email}
                        </ProfileRow>
                        <ProfileRow label={t('page.profile.role')}>
                          <span className="font-mono text-[11px] tracking-[0.3px]">
                            {me.role}
                          </span>
                        </ProfileRow>
                        <ProfileRow label={t('page.profile.organization')}>
                          {me.organization.name}
                        </ProfileRow>
                        <ProfileRow label={t('page.profile.orgSlug')} last>
                          <span className="font-mono text-[11px]">
                            {me.organization.slug}
                          </span>
                        </ProfileRow>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[11.5px] text-n-500">
                    {t('page.profile.emailHint')}
                  </p>
                </div>

                <div className="flex justify-end">
                  <Btn2
                    type="button"
                    disabled={!dirty || saving || !firstName.trim() || !lastName.trim()}
                    onClick={() => void save()}
                  >
                    {saving ? t('common.loading') : t('common.save')}
                  </Btn2>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function ProfileRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <tr className={last ? '' : 'border-b border-border'}>
      <th className="w-[200px] px-4 py-3 text-[10px] font-mono uppercase text-n-500 tracking-[0.4px] font-medium bg-n-50/80 align-middle">
        {label}
      </th>
      <td className="px-4 py-3 text-n-800 align-middle">{children}</td>
    </tr>
  );
}

export default ProfilePage;
