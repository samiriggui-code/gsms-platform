import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Camera,
  Check,
  KeyRound,
  LogOut,
  Monitor,
  Shield,
  Smartphone,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  UserAvatar,
  readStoredAvatar,
  writeStoredAvatar,
} from "@/components/UserAvatar";
import { api, type MeResponse } from "@/lib/api";
import { permissionsForRole, roleLabel } from "@/lib/roles";

type SessionRow = {
  id: string;
  device: string;
  kind: "desktop" | "mobile";
  location: string;
  lastActive: string;
  current: boolean;
};

export function ProfilPage() {
  const { t } = useTranslation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => readStoredAvatar());
  const [revokedIds, setRevokedIds] = useState<Set<string>>(() => new Set());
  const [twoFa, setTwoFa] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const allSessions = useMemo<SessionRow[]>(
    () => [
      {
        id: "s1",
        device: "Chrome · Windows",
        kind: "desktop",
        location: "Paris, FR",
        lastActive: t("profile.now"),
        current: true,
      },
      {
        id: "s2",
        device: "Safari · iPhone",
        kind: "mobile",
        location: "Lyon, FR",
        lastActive: t("profile.daysAgo", { count: 2 }),
        current: false,
      },
    ],
    [t],
  );

  const sessions = useMemo(
    () => allSessions.filter((s) => !revokedIds.has(s.id)),
    [allSessions, revokedIds],
  );

  useEffect(() => {
    void api
      .me()
      .then(setMe)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("common.error")));
  }, [t]);

  const onPickAvatar = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      setAvatarUrl(dataUrl);
      writeStoredAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const onPasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwdMsg(t("profile.passwordStub"));
    e.currentTarget.reset();
  };

  const revokeSession = (id: string) => {
    setRevokedIds((prev) => new Set(prev).add(id));
  };

  if (error) return <p className="text-red-500">{error}</p>;
  if (!me) {
    return <p className="text-[hsl(var(--muted-foreground))]">{t("common.loading")}</p>;
  }

  const perms = permissionsForRole(me.role);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(ev) => onPickAvatar(ev.target.files?.[0] ?? null)}
      />

      <section className="rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card))] p-6">
        <h2 className="text-sm font-semibold">{t("profile.identity")}</h2>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative shrink-0"
            title={t("profile.changePhoto")}
          >
            <UserAvatar name={me.user.name} src={avatarUrl} size="lg" />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{me.user.name}</p>
            <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
              {me.user.email}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border)/0.8)] px-2.5 py-1.5 text-[11px] font-medium"
              >
                <Camera className="h-3.5 w-3.5" />
                {t("profile.changePhoto")}
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarUrl(null);
                    writeStoredAvatar(null);
                  }}
                  className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  {t("profile.removePhoto")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <dl className="mt-6 space-y-3 text-sm">
          <Field label={t("profile.org")} value={me.organization.name} />
          <Field label={t("profile.role")} value={roleLabel(me.role)} />
          <Field
            label={t("profile.activeSite")}
            value={me.workspace?.label ?? me.workspace?.name ?? "—"}
          />
        </dl>
      </section>

      <section className="rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card))] p-6">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[hsl(var(--primary))]" />
          <h2 className="text-sm font-semibold">{t("profile.permissions")}</h2>
        </div>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          {t("profile.permissionsHint", { role: roleLabel(me.role) })}
        </p>
        <ul className="mt-4 space-y-2">
          {perms.map((p) => (
            <li
              key={p.id}
              className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--border)/0.55)] px-3 py-2.5 text-xs"
            >
              {p.granted ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground)/0.55)]" />
              )}
              <span className={p.granted ? undefined : "text-[hsl(var(--muted-foreground))]"}>
                {p.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card))] p-6">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-[hsl(var(--primary))]" />
          <h2 className="text-sm font-semibold">{t("profile.sessions")}</h2>
        </div>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          {t("profile.sessionsHint")}
        </p>
        <ul className="mt-4 divide-y divide-[hsl(var(--border)/0.6)] rounded-xl border border-[hsl(var(--border)/0.6)]">
          {sessions.map((s) => {
            const Icon = s.kind === "mobile" ? Smartphone : Monitor;
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--surface-subtle))]">
                    <Icon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {s.device}
                      {s.current ? (
                        <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          {t("profile.thisDevice")}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                      {s.location} · {s.lastActive}
                    </p>
                  </div>
                </div>
                {!s.current ? (
                  <button
                    type="button"
                    onClick={() => revokeSession(s.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border)/0.8)] px-2.5 py-1.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))] hover:border-red-500/40 hover:text-red-500"
                  >
                    <LogOut className="h-3 w-3" />
                    {t("profile.revoke")}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card))] p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[hsl(var(--primary))]" />
          <h2 className="text-sm font-semibold">{t("profile.security")}</h2>
        </div>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          {t("profile.securityHint")}
        </p>

        <form onSubmit={onPasswordSubmit} className="mt-4 space-y-3">
          <label className="block text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">{t("profile.currentPassword")}</span>
            <input
              type="password"
              name="current"
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--background))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.35)]"
            />
          </label>
          <label className="block text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">{t("profile.newPassword")}</span>
            <input
              type="password"
              name="next"
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--background))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.35)]"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-[hsl(var(--foreground))] px-3 py-2 text-xs font-semibold text-[hsl(var(--background))]"
          >
            {t("profile.updatePassword")}
          </button>
          {pwdMsg ? (
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{pwdMsg}</p>
          ) : null}
        </form>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border)/0.6)] px-4 py-3">
          <div>
            <p className="text-sm font-medium">{t("profile.twoFa")}</p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
              {t("profile.twoFaHint")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={twoFa}
            onClick={() => setTwoFa((v) => !v)}
            className={
              twoFa
                ? "relative h-6 w-11 rounded-full bg-emerald-500 transition"
                : "relative h-6 w-11 rounded-full bg-[hsl(var(--muted-foreground)/0.35)] transition"
            }
          >
            <span
              className={
                twoFa
                  ? "absolute left-6 top-0.5 h-5 w-5 rounded-full bg-white shadow transition"
                  : "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition"
              }
            />
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[hsl(var(--border)/0.5)] pb-3">
      <dt className="text-[hsl(var(--muted-foreground))]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
