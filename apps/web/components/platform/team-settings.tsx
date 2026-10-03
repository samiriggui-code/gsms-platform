"use client";

import { AppWindow, Copy, KeyRound, Link2, Loader2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, Fragment, type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

// --- types (miroir de /api/v1/admin/team, /admin/roles, /admin/sso/clients) ------------------------------

export type AppRole = { value: string; label: string; description: string };
export type RolesData = {
  roles: { value: string; label: string; description: string; apps: Record<string, string | null> }[];
  apps: { key: string; name: string; description: string; sso: boolean; roles: AppRole[] }[];
};
export type MemberApp = { app: string; enabled: boolean; role: string | null; default_role: string | null; overridden: boolean };
export type TeamMember = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  status: "actif" | "invite" | "desactive";
  invitation_expires_at: string | null;
  last_login_at: string | null;
  apps: MemberApp[];
};
export type TeamData = { me: string; my_role: string; members: TeamMember[] };
export type SsoClients = {
  issuer: string;
  clients: {
    app: string;
    name: string;
    configured: boolean;
    suggested_redirect_uris: string[];
    client: { client_id: string; redirect_uris: string[]; secret_rotated_at: string; last_used_at: string | null } | null;
  }[];
};

type LinkResult = { activation_url: string; expires_at: string; email: { sent: boolean; error: string | null; reference: string } | null };

async function api<T>(path: string, method: "GET" | "POST" | "PUT" | "PATCH", body?: unknown) {
  const res = await fetch(`/api/core/admin/${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, data, error: data?.error };
}

const PRIVILEGED = new Set(["owner", "admin"]);
const STATUS: Record<TeamMember["status"], { label: string; tone: "success" | "warning" | "neutral" }> = {
  actif: { label: "Actif", tone: "success" },
  invite: { label: "Invitation envoyée", tone: "warning" },
  desactive: { label: "Désactivé", tone: "neutral" },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function Section({ icon: Icon, title, description, action, children }: { icon: typeof Users; title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-border bg-surface-subtle">
            <Icon className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <p className="text-[13px] text-muted-foreground">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Notice({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div
      role={ok ? "status" : "alert"}
      className={cn(
        "rounded-[10px] border px-3.5 py-2.5 text-[13px]/[1.5]",
        ok ? "border-success/25 bg-success/10 text-foreground" : "border-destructive/30 bg-destructive/[0.06] text-destructive",
      )}
    >
      {children}
    </div>
  );
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-[12px]" onFocus={(e) => e.currentTarget.select()} />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Copier : ${label}`}
          onClick={async () => {
            await navigator.clipboard.writeText(value).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <Copy className="size-4" aria-hidden />
        </Button>
      </div>
      {copied ? <span className="text-[12px] text-success">Copié.</span> : null}
    </div>
  );
}

function LinkNotice({ result, who }: { result: LinkResult; who: string }) {
  const sent = result.email?.sent;
  return (
    <Notice ok={Boolean(sent) || !result.email}>
      <div className="flex flex-col gap-2">
        <p>
          {sent
            ? `E-mail envoyé à ${who} (${result.email?.reference}).`
            : result.email
              ? `L’e-mail n’est pas parti : ${result.email.error ?? "erreur d’envoi"}. Transmettez le lien ci-dessous vous-même.`
              : `Transmettez ce lien à ${who}.`}{" "}
          Le lien n’est affiché qu’une fois ; il expire le {formatDate(result.expires_at)}.
        </p>
        <CopyField value={result.activation_url} label="Lien personnel (choix du mot de passe)" />
      </div>
    </Notice>
  );
}

// --- Équipe ----------------------------------------------------------------------------------------------

export function TeamSettings({ initial, roles }: { initial: TeamData; roles: RolesData }) {
  const router = useRouter();
  const [team, setTeam] = useState(initial);
  const [inviting, setInviting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState<{ result: LinkResult; who: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const isOwner = team.my_role === "owner";
  const assignable = roles.roles.filter((r) => isOwner || !PRIVILEGED.has(r.value));
  const label = (value: string) => roles.roles.find((r) => r.value === value)?.label ?? value;
  const ssoApps = roles.apps.filter((a) => a.sso);

  function replace(member: TeamMember) {
    setTeam((t) => ({ ...t, members: t.members.map((m) => (m.id === member.id ? member : m)) }));
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const target = event.currentTarget;
    setBusy("invite");
    setMessage(null);
    setLink(null);
    const r = await api<{ member: TeamMember } & LinkResult>("team", "POST", {
      email: form.get("email"),
      name: form.get("name"),
      role: form.get("role"),
      send_email: form.get("send_email") === "on",
    });
    setBusy(null);
    if (!r.ok) {
      setMessage({ ok: false, text: r.error ?? "Invitation refusée." });
      return;
    }
    setTeam((t) => ({ ...t, members: [...t.members, r.data.member] }));
    setLink({ result: r.data, who: r.data.member.email });
    target.reset();
    setInviting(false);
    router.refresh();
  }

  async function patch(member: TeamMember, body: Record<string, unknown>, success: string) {
    setBusy(member.id);
    setMessage(null);
    const r = await api<TeamMember>(`team/${member.id}`, "PATCH", body);
    setBusy(null);
    if (!r.ok) {
      setMessage({ ok: false, text: r.error ?? "Modification refusée." });
      return;
    }
    replace(r.data);
    setMessage({ ok: true, text: success });
  }

  async function newLink(member: TeamMember) {
    setBusy(member.id);
    setMessage(null);
    setLink(null);
    const r = await api<{ member: TeamMember } & LinkResult>(`team/${member.id}/link`, "POST", { send_email: true });
    setBusy(null);
    if (!r.ok) {
      setMessage({ ok: false, text: r.error ?? "Lien refusé." });
      return;
    }
    replace(r.data.member);
    setLink({ result: r.data, who: member.email });
  }

  async function setApp(member: TeamMember, app: string, enabled: boolean, role: string | null) {
    setBusy(member.id);
    setMessage(null);
    const r = await api<TeamMember>(`team/${member.id}/apps/${app}`, "PUT", { enabled, role });
    setBusy(null);
    if (!r.ok) {
      setMessage({ ok: false, text: r.error ?? "Modification refusée." });
      return;
    }
    replace(r.data);
  }

  const canEdit = (m: TeamMember) => m.id !== team.me && (isOwner || !PRIVILEGED.has(m.role));

  return (
    <Section
      icon={Users}
      title="Équipe GSMS"
      description="Un compte par personne, le même sur le portail, DocuLens, GRACE, QAtrial et le CRM. Le membre choisit son mot de passe par le lien reçu."
      action={
        <Button type="button" variant="contrast" size="sm" onClick={() => setInviting((v) => !v)}>
          <UserPlus className="size-4" aria-hidden />
          Inviter
        </Button>
      }
    >
      {inviting ? (
        <form onSubmit={invite} className="grid gap-3 rounded-[12px] border border-border bg-surface-subtle p-4 md:grid-cols-[1fr_1fr_200px]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-name">Nom</Label>
            <Input id="invite-name" name="name" required minLength={2} autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">E-mail professionnel</Label>
            <Input id="invite-email" name="email" type="email" required autoComplete="off" placeholder="prenom.nom@gsms-security.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Rôle</Label>
            <Select id="invite-role" name="role" defaultValue="consultant">
              {assignable.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-[13px] md:col-span-2">
            <input type="checkbox" name="send_email" defaultChecked className="size-4" />
            Envoyer l’invitation par e-mail (messagerie de la plateforme)
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setInviting(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="contrast" size="sm" disabled={busy === "invite"}>
              {busy === "invite" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Inviter
            </Button>
          </div>
        </form>
      ) : null}

      {message ? <Notice ok={message.ok}>{message.text}</Notice> : null}
      {link ? <LinkNotice result={link.result} who={link.who} /> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Membre</th>
              <th className="py-2 pr-3 font-medium">Rôle</th>
              <th className="py-2 pr-3 font-medium">État</th>
              <th className="py-2 pr-3 font-medium">Dernière connexion</th>
              <th className="py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.members.map((m) => {
              const editable = canEdit(m);
              const status = STATUS[m.status];
              return (
                <Fragment key={m.id}>
                  <tr className={cn("border-b border-border/70 align-middle", !m.is_active && "opacity-60")}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">
                        {m.name}
                        {m.id === team.me ? <span className="ml-1.5 text-muted-foreground">(vous)</span> : null}
                      </p>
                      <p className="text-muted-foreground">{m.email}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      {editable ? (
                        <Select
                          aria-label={`Rôle de ${m.name}`}
                          className="h-8 w-[150px] text-[13px]"
                          value={m.role}
                          disabled={busy === m.id}
                          onChange={(e) => patch(m, { role: e.target.value }, `Rôle de ${m.name} : ${label(e.target.value)}.`)}
                        >
                          {assignable.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        label(m.role)
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={status.tone}>{status.label}</Badge>
                      {m.status === "invite" && m.invitation_expires_at ? (
                        <p className="mt-1 text-[11.5px] text-muted-foreground">expire le {formatDate(m.invitation_expires_at)}</p>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{formatDate(m.last_login_at)}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id}>
                          <AppWindow className="size-3.5" aria-hidden />
                          Applications
                        </Button>
                        {editable && m.is_active ? (
                          <Button type="button" variant="outline" size="sm" disabled={busy === m.id} onClick={() => newLink(m)}>
                            <Link2 className="size-3.5" aria-hidden />
                            {m.status === "invite" ? "Renvoyer l’invitation" : "Nouveau mot de passe"}
                          </Button>
                        ) : null}
                        {editable ? (
                          <Button
                            type="button"
                            variant={m.is_active ? "ghost" : "outline"}
                            size="sm"
                            disabled={busy === m.id}
                            onClick={() => {
                              if (m.is_active && !window.confirm(`Désactiver ${m.name} ? Il ne pourra plus se connecter à aucune application.`)) return;
                              patch(m, { is_active: !m.is_active }, m.is_active ? `${m.name} est désactivé.` : `${m.name} est réactivé.`);
                            }}
                          >
                            {m.is_active ? "Désactiver" : "Réactiver"}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {open === m.id ? (
                    <tr className="border-b border-border/70 bg-surface-subtle/60">
                      <td colSpan={5} className="px-3 py-3">
                        <div className="grid gap-3 md:grid-cols-4">
                          {roles.apps.map((app) => {
                            const access = m.apps.find((a) => a.app === app.key);
                            const roleLabel = (v: string | null) => app.roles.find((r) => r.value === v)?.label ?? v ?? "—";
                            return (
                              <div key={app.key} className="flex flex-col gap-1.5 rounded-[10px] border border-border bg-card p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium">{app.name}</span>
                                  {access?.overridden ? <Badge tone="primary">Dérogation</Badge> : null}
                                </div>
                                {!app.sso ? (
                                  <p className="text-muted-foreground">{access?.enabled ? roleLabel(access.role) : "Pas d’accès"} · suit le rôle Core</p>
                                ) : editable ? (
                                  <>
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        className="size-4"
                                        checked={Boolean(access?.enabled)}
                                        disabled={busy === m.id}
                                        onChange={(e) => setApp(m, app.key, e.target.checked, access?.role ?? access?.default_role ?? app.roles.at(-1)?.value ?? null)}
                                      />
                                      Accès autorisé
                                    </label>
                                    <Select
                                      aria-label={`Rôle ${app.name} de ${m.name}`}
                                      className="h-8 text-[13px]"
                                      value={access?.role ?? ""}
                                      disabled={!access?.enabled || busy === m.id}
                                      onChange={(e) => setApp(m, app.key, true, e.target.value)}
                                    >
                                      {!access?.enabled ? <option value="">—</option> : null}
                                      {app.roles.map((r) => (
                                        <option key={r.value} value={r.value}>
                                          {r.label}
                                          {r.value === access?.default_role ? " (par défaut)" : ""}
                                        </option>
                                      ))}
                                    </Select>
                                  </>
                                ) : (
                                  <p className="text-muted-foreground">{access?.enabled ? roleLabel(access.role) : "Pas d’accès"}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {ssoApps.length ? (
                          <p className="mt-2 text-[12px] text-muted-foreground">
                            Le changement s’applique à la prochaine connexion « Se connecter avec GSMS » dans l’application.
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// --- Rôles -----------------------------------------------------------------------------------------------

export function RolesMatrix({ roles }: { roles: RolesData }) {
  return (
    <Section
      icon={ShieldCheck}
      title="Rôles et droits par application"
      description="Le rôle choisi pour un membre se traduit ainsi dans chaque application ; une dérogation par membre reste possible (Équipe → Applications)."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Rôle</th>
              {roles.apps.map((a) => (
                <th key={a.key} className="py-2 pr-3 font-medium">
                  {a.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.roles.map((r) => (
              <tr key={r.value} className="border-b border-border/70 align-top">
                <td className="py-2.5 pr-3">
                  <p className="font-medium">{r.label}</p>
                  <p className="text-muted-foreground">{r.description}</p>
                </td>
                {roles.apps.map((a) => {
                  const value = r.apps[a.key];
                  const appRole = a.roles.find((x) => x.value === value);
                  return (
                    <td key={a.key} className="py-2.5 pr-3">
                      {appRole ? (
                        <>
                          <p className="font-medium">{appRole.label}</p>
                          <p className="text-muted-foreground">{appRole.description}</p>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Pas d’accès</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// --- Applications connectées (clients OIDC) --------------------------------------------------------------

function envFor(app: string, issuer: string, clientId: string, secret: string, callback: string) {
  if (app === "crm") {
    return [`GSMS_SSO_ISSUER=${issuer}`, `GSMS_SSO_CLIENT_ID=${clientId}`, `GSMS_SSO_CLIENT_SECRET=${secret}`].join("\n");
  }
  return [
    "SSO_ENABLED=true",
    `SSO_ISSUER_URL=${issuer}`,
    `SSO_CLIENT_ID=${clientId}`,
    `SSO_CLIENT_SECRET=${secret}`,
    `SSO_CALLBACK_URL=${callback}`,
    "SSO_ROLE_CLAIM=gsms_role",
    ...(app === "qatrial" ? ["SSO_ORG_NAME=GSMS"] : []),
  ].join("\n");
}

export function SsoApplications({ initial }: { initial: SsoClients }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [secret, setSecret] = useState<{ app: string; env: string } | null>(null);

  async function save(app: string, uris: string, rotate: boolean) {
    setBusy(app);
    setMessage(null);
    setSecret(null);
    const redirect_uris = uris.split(/\s+/).map((u) => u.trim()).filter(Boolean);
    const r = rotate
      ? await api<{ client: NonNullable<SsoClients["clients"][number]["client"]>; client_secret: string | null }>(`sso/clients/${app}/secret`, "POST")
      : await api<{ client: NonNullable<SsoClients["clients"][number]["client"]>; client_secret: string | null }>(`sso/clients/${app}`, "PUT", { redirect_uris });
    setBusy(null);
    if (!r.ok) {
      setMessage({ ok: false, text: r.error ?? "Enregistrement refusé." });
      return;
    }
    setData((d) => ({
      ...d,
      clients: d.clients.map((c) => (c.app === app ? { ...c, configured: true, client: r.data.client } : c)),
    }));
    if (r.data.client_secret) {
      setSecret({
        app,
        env: envFor(app, data.issuer, r.data.client.client_id, r.data.client_secret, r.data.client.redirect_uris[0] ?? ""),
      });
    } else {
      setMessage({ ok: true, text: "Adresses de retour enregistrées." });
    }
  }

  return (
    <Section
      icon={KeyRound}
      title="Applications connectées"
      description={`Connexion « Se connecter avec GSMS » (OpenID Connect). Émetteur : ${data.issuer}`}
    >
      {message ? <Notice ok={message.ok}>{message.text}</Notice> : null}
      {secret ? (
        <Notice ok>
          <div className="flex flex-col gap-2">
            <p>
              Variables à mettre dans le fichier <code>.env</code> de {data.clients.find((c) => c.app === secret.app)?.name} sur le
              serveur, puis redémarrer l’application. Le secret n’est affiché qu’une fois.
            </p>
            <textarea readOnly value={secret.env} rows={secret.env.split("\n").length} className="w-full rounded-[10px] border border-border bg-background p-2 font-mono text-[12px]" onFocus={(e) => e.currentTarget.select()} />
          </div>
        </Notice>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-3">
        {data.clients.map((c) => (
          <SsoClientCard key={c.app} entry={c} busy={busy === c.app} onSave={(uris) => save(c.app, uris, false)} onRotate={() => save(c.app, "", true)} />
        ))}
      </div>
    </Section>
  );
}

function SsoClientCard({
  entry,
  busy,
  onSave,
  onRotate,
}: {
  entry: SsoClients["clients"][number];
  busy: boolean;
  onSave: (uris: string) => void;
  onRotate: () => void;
}) {
  const [uris, setUris] = useState((entry.client?.redirect_uris ?? entry.suggested_redirect_uris).join("\n"));
  return (
    <div className="flex flex-col gap-2.5 rounded-[12px] border border-border p-3.5 text-[13px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{entry.name}</span>
        <Badge tone={entry.configured ? "success" : "neutral"}>{entry.configured ? "Déclarée" : "Non déclarée"}</Badge>
      </div>
      {entry.client ? (
        <p className="text-muted-foreground">
          Secret du {formatDate(entry.client.secret_rotated_at)} · dernière connexion {formatDate(entry.client.last_used_at)}
        </p>
      ) : null}
      <Label htmlFor={`uris-${entry.app}`}>Adresse(s) de retour</Label>
      <textarea
        id={`uris-${entry.app}`}
        value={uris}
        onChange={(e) => setUris(e.target.value)}
        rows={2}
        className="w-full rounded-[10px] border border-input bg-background p-2 font-mono text-[12px]"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={entry.configured ? "outline" : "contrast"} size="sm" disabled={busy} onClick={() => onSave(uris)}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {entry.configured ? "Enregistrer" : "Déclarer"}
        </Button>
        {entry.configured ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Générer un nouveau secret pour ${entry.name} ? L’ancien cesse de fonctionner immédiatement.`)) onRotate();
            }}
          >
            Nouveau secret
          </Button>
        ) : null}
      </div>
    </div>
  );
}
