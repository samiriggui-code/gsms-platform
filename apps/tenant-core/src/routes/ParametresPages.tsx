import { useEffect, useState } from "react";
import { Bell, Building2, Mail, MapPin, UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/UserAvatar";
import { api, type MeResponse } from "@/lib/api";
import { roleLabel } from "@/lib/roles";

type MemberRow = {
  id: string;
  role: string;
  user: { id: string; email: string; name: string };
};

type NotifPrefs = {
  emailPieces: boolean;
  emailFinance: boolean;
  emailEchanges: boolean;
  pushBrowser: boolean;
};

const NOTIF_KEY = "gsms.portal.notifPrefs";

const DEFAULT_NOTIFS: NotifPrefs = {
  emailPieces: true,
  emailFinance: true,
  emailEchanges: true,
  pushBrowser: false,
};

function readNotifs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return DEFAULT_NOTIFS;
    return { ...DEFAULT_NOTIFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) };
  } catch {
    return DEFAULT_NOTIFS;
  }
}

function writeNotifs(prefs: NotifPrefs) {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function useOrgSettings() {
  const { t } = useTranslation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([api.me(), api.members()])
      .then(([meRes, membersRes]) => {
        setMe(meRes);
        setMembers(membersRes.members);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("common.error")));
  }, [t]);

  return { me, members, error };
}

export function ParametresSitesPage() {
  const { t } = useTranslation();
  const { me, error } = useOrgSettings();
  if (error) return <p className="text-red-500">{error}</p>;
  if (!me) return <p className="text-muted-foreground">{t("common.loading")}</p>;

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("settingsPages.sitesTitle")}</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("settingsPages.sitesDesc", { org: me.organization.name })}
      </p>
      <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60">
        {me.workspaces.map((ws) => {
          const active = me.workspace?.id === ws.id;
          return (
            <li
              key={ws.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-subtle">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{ws.label ?? ws.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{ws.name}</p>
                </div>
              </div>
              {active ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {t("settingsPages.activeSite")}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ParametresEquipePage() {
  const { t } = useTranslation();
  const { me, members, error } = useOrgSettings();
  const [inviteHint, setInviteHint] = useState<string | null>(null);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!me || !members) return <p className="text-muted-foreground">{t("common.loading")}</p>;

  const canInvite = me.role === "owner" || me.role === "admin";

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("settingsPages.teamTitle")}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("settingsPages.teamDesc", { org: me.organization.name })}
          </p>
        </div>
        <button
          type="button"
          disabled={!canInvite}
          title={
            canInvite ? t("settingsPages.inviteTitle") : t("settingsPages.inviteAdminOnly")
          }
          onClick={() =>
            setInviteHint(
              canInvite ? t("settingsPages.inviteStub") : t("settingsPages.inviteAdminOnly"),
            )
          }
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {t("settingsPages.invite")}
        </button>
      </div>
      {inviteHint ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{inviteHint}</p>
      ) : null}
      <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div className="flex items-center gap-3">
              <UserAvatar name={m.user.name} size="sm" />
              <div>
                <p className="font-medium">{m.user.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.user.email}</p>
              </div>
            </div>
            <span className="rounded-full border border-border/70 bg-surface-subtle px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {roleLabel(m.role)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ParametresNotificationsPage() {
  const { t } = useTranslation();
  const [notifs, setNotifs] = useState<NotifPrefs>(() => readNotifs());

  const setNotif = (key: keyof NotifPrefs, value: boolean) => {
    setNotifs((prev) => {
      const next = { ...prev, [key]: value };
      writeNotifs(next);
      return next;
    });
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-6">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("settingsPages.notifTitle")}</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("settingsPages.notifDesc")}</p>
      <ul className="mt-4 space-y-2">
        <NotifRow
          icon={Mail}
          label={t("settingsPages.pieces")}
          hint={t("settingsPages.piecesHint")}
          checked={notifs.emailPieces}
          onChange={(v) => setNotif("emailPieces", v)}
        />
        <NotifRow
          icon={Mail}
          label={t("settingsPages.finance")}
          hint={t("settingsPages.financeHint")}
          checked={notifs.emailFinance}
          onChange={(v) => setNotif("emailFinance", v)}
        />
        <NotifRow
          icon={Mail}
          label={t("settingsPages.echanges")}
          hint={t("settingsPages.echangesHint")}
          checked={notifs.emailEchanges}
          onChange={(v) => setNotif("emailEchanges", v)}
        />
        <NotifRow
          icon={Bell}
          label={t("settingsPages.browser")}
          hint={t("settingsPages.browserHint")}
          checked={notifs.pushBrowser}
          onChange={(v) => setNotif("pushBrowser", v)}
        />
      </ul>
    </section>
  );
}

function NotifRow({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border/55 px-4 py-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={
          checked
            ? "relative h-6 w-11 shrink-0 rounded-full bg-emerald-500 transition"
            : "relative h-6 w-11 shrink-0 rounded-full bg-muted-foreground/35 transition"
        }
      >
        <span
          className={
            checked
              ? "absolute left-6 top-0.5 h-5 w-5 rounded-full bg-white shadow transition"
              : "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition"
          }
        />
      </button>
    </li>
  );
}
