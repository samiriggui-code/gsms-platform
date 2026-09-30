/**
 * Page Profil — layout type Metronic demo1 user detail
 * (cover + avatar + onglets Aperçu / Avatar / Session).
 * Réf. visuelle : keenthemes.com/.../user-management/users/:id
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, LogOut, Mail, Shield, Trash2 } from 'lucide-react';
import { Avatar, Btn2, Card, Pill } from '../hifi';
import { useAuth } from '../../hooks/useAuth';
import { useAppMode } from '../../hooks/useAppMode';
import { PRESET_AVATARS } from '../../lib/media';
import { fileToAvatarDataUrl, useUserPrefsStore } from '../../store/useUserPrefsStore';
import { cn } from '../../lib/cn';

const COVER_SRC = '/media/images/2600x1200/bg-14.png';

type ProfileTab = 'overview' | 'avatar' | 'session';

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: 'Aperçu' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'session', label: 'Session' },
];

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-hifi-label font-mono uppercase text-n-500">{label}</p>
      <p className="mt-0.5 truncate text-[13px] text-text-primary">{value || '—'}</p>
    </div>
  );
}

export function SettingsProfilePage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { apiUrl } = useAppMode();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const avatarSrc = useUserPrefsStore((s) =>
    user?.id ? s.avatars[user.id] ?? null : null,
  );
  const setAvatar = useUserPrefsStore((s) => s.setAvatar);

  const onPickFile = async (file: File | undefined) => {
    if (!file || !user?.id) return;
    setUploadError(null);
    setUploading(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatar(user.id, dataUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Échec du chargement');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <Card className="p-6 text-[13px] text-text-tertiary">
        Connectez-vous pour afficher votre profil.
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {/* Hero Metronic-style */}
      <Card className="overflow-hidden p-0">
        <div className="relative h-28 bg-n-100 sm:h-36">
          <img
            src={COVER_SRC}
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
        </div>

        <div className="relative px-4 pb-4 sm:px-5">
          <div className="-mt-10 flex flex-col gap-3 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-3">
              <div className="rounded-full bg-card p-1 shadow-sh1 ring-1 ring-border">
                <Avatar name={user.name} src={avatarSrc} size="xl" />
              </div>
              <div className="min-w-0 pb-1">
                <h3 className="truncate text-[16px] font-semibold tracking-tight text-text-primary">
                  {user.name}
                </h3>
                <p className="flex items-center gap-1 truncate text-[12.5px] text-text-secondary">
                  <Mail className="size-3.5 shrink-0" />
                  {user.email}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Pill variant="info">{user.role}</Pill>
                  <Pill variant="outline">Org {user.orgId}</Pill>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pb-1">
              <Btn2
                variant="secondary"
                leading={<Camera className="size-3.5" />}
                onClick={() => setTab('avatar')}
              >
                Changer l’avatar
              </Btn2>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-t border-border px-2 sm:px-3">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2.5 text-[12.5px] font-medium transition-colors',
                tab === item.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {tab === 'overview' ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="p-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-n-500">
              Identité
            </p>
            <div className="space-y-3">
              <Field label="Nom affiché" value={user.name} />
              <Field label="Email" value={user.email} />
              <Field label="Identifiant" value={user.id} />
            </div>
          </Card>
          <Card className="p-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-n-500">
              Organisation
            </p>
            <div className="space-y-3">
              <Field label="Rôle" value={user.role} />
              <Field label="Organisation" value={user.orgId} />
              <div>
                <p className="text-hifi-label font-mono uppercase text-n-500">Langue / thème</p>
                <p className="mt-0.5 text-[12.5px] text-text-tertiary">
                  Réglables depuis le header (drapeau + soleil/lune).
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'avatar' ? (
        <Card className="space-y-4 p-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Avatar name={user.name} src={avatarSrc} size="xl" />
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => void onPickFile(e.target.files?.[0])}
              />
              <div className="flex flex-wrap gap-1.5">
                <Btn2
                  variant="secondary"
                  leading={<Camera className="size-3.5" />}
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? '…' : 'Charger une photo'}
                </Btn2>
                {avatarSrc ? (
                  <Btn2
                    variant="ghost"
                    leading={<Trash2 className="size-3.5" />}
                    onClick={() => setAvatar(user.id, null)}
                  >
                    Retirer
                  </Btn2>
                ) : null}
              </div>
              {uploadError ? (
                <p className="text-[11px] text-bad">{uploadError}</p>
              ) : (
                <p className="text-[11px] text-text-tertiary">
                  JPG / PNG · ou choisissez un avatar du pack media
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-n-500">
              Pack media
            </p>
            <div className="grid max-h-52 grid-cols-6 gap-1.5 overflow-y-auto sm:grid-cols-8 md:grid-cols-10">
              {PRESET_AVATARS.map((src) => {
                const selected = avatarSrc === src;
                return (
                  <button
                    key={src}
                    type="button"
                    title="Choisir cet avatar"
                    onClick={() => setAvatar(user.id, src)}
                    className={cn(
                      'aspect-square overflow-hidden rounded-full ring-2 transition-shadow',
                      selected ? 'ring-accent shadow-sm' : 'ring-transparent hover:ring-border',
                    )}
                  >
                    <img src={src} alt="" className="size-full object-cover" draggable={false} />
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      ) : null}

      {tab === 'session' ? (
        <Card className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-r2 bg-accent-subtle text-accent">
              <Shield className="size-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-[13px] font-medium text-text-primary">Session API</p>
              <p className="break-all text-[12px] text-text-secondary">
                {t('auth.serverModeHint', { url: apiUrl ?? '—' })}
              </p>
            </div>
          </div>
          <Btn2 variant="danger" leading={<LogOut className="size-3.5" />} onClick={() => logout()}>
            {t('auth.logout')}
          </Btn2>
        </Card>
      ) : null}
    </div>
  );
}
