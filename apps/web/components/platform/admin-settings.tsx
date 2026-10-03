"use client";

import { BellRing, CheckCircle2, CircleSlash, KeyRound, Loader2, Mail, PlugZap, Send, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type MailSettings = {
  enabled: boolean;
  host: string;
  port: number;
  ssl: boolean;
  starttls: boolean;
  user: string;
  from: string;
  from_name: string;
  password_set: boolean;
  source: string;
  updated_by?: string | null;
  updated_at?: string | null;
};

export type LlmSettings = {
  provider: string;
  model: string;
  base_url: string;
  api_key_set: boolean;
  api_key_hint: string | null;
  source: string;
  providers: string[];
};

export type Check = { name: string; ok: boolean; detail: string; latency_ms?: number | null; skipped?: boolean };

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  openai_compatible: "Compatible OpenAI (URL personnalisée)",
};

const CHECK_LABELS: Record<string, string> = {
  database: "Base de données",
  storage: "Coffre-fort (stockage chiffré)",
  audit: "Journal d’audit chaîné",
  docling: "Moteur documentaire (Docling)",
  smtp: "Serveur e-mail (SMTP)",
  llm: "IA (clé API LLM)",
  crm: "Connecteur CRM",
  grace: "Connecteur GRACE",
  qatrial: "Connecteur QAtrial",
};

async function api<T>(path: string, method: "GET" | "POST" | "PUT", body?: unknown) {
  const res = await fetch(`/api/core/admin/${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, data, error: data?.error };
}

function Section({ icon: Icon, title, description, children }: { icon: typeof Mail; title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-border bg-surface-subtle">
          <Icon className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <p className="text-[13px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CheckLine({ check }: { check: Check }) {
  const Icon = check.skipped ? CircleSlash : check.ok ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <Icon className={cn("mt-0.5 size-4 shrink-0", check.skipped ? "text-muted-foreground" : check.ok ? "text-success" : "text-destructive")} aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{CHECK_LABELS[check.name] ?? check.name}</p>
        <p className="break-words text-muted-foreground">
          {check.detail}
          {typeof check.latency_ms === "number" ? ` · ${check.latency_ms} ms` : ""}
        </p>
      </div>
    </div>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-[13px]">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4" />
      {label}
    </label>
  );
}

export function MailSettingsForm({ initial }: { initial: MailSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [password, setPassword] = useState("");
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [test, setTest] = useState<Check | null>(null);
  const [testing, setTesting] = useState(false);
  const set = <K extends keyof MailSettings>(key: K, value: MailSettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, unknown> = {
      enabled: form.enabled,
      host: form.host,
      port: Number(form.port),
      ssl: form.ssl,
      starttls: form.starttls,
      user: form.user,
      from: form.from,
      from_name: form.from_name,
    };
    if (password) body.password = password;
    const r = await api<MailSettings>("settings/mail", "PUT", body);
    setSaving(false);
    if (!r.ok) {
      setMessage({ ok: false, text: r.error ?? "Enregistrement refusé." });
      return;
    }
    setForm(r.data);
    setPassword("");
    setMessage({ ok: true, text: "Réglages enregistrés (mot de passe chiffré)." });
    router.refresh();
  }

  async function sendTest() {
    setTesting(true);
    const r = await api<Check>("settings/mail/test", "POST", testTo ? { to: testTo } : {});
    setTesting(false);
    setTest(r.ok ? r.data : { name: "mail", ok: false, detail: r.error ?? "Test impossible." });
  }

  return (
    <Section icon={Mail} title="Messagerie (SMTP)" description="Serveur d’envoi des e-mails de la plateforme. Le mot de passe est chiffré et n’est jamais réaffiché.">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
          <Toggle id="mail-enabled" label="Envoi activé" checked={form.enabled} onChange={(v) => set("enabled", v)} />
          <Badge tone={form.source === "portail" ? "primary" : "neutral"}>Source : {form.source}</Badge>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mail-host">Serveur</Label>
          <Input id="mail-host" value={form.host} onChange={(e) => set("host", e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mail-port">Port</Label>
          <Input id="mail-port" type="number" value={form.port} onChange={(e) => set("port", Number(e.target.value))} required />
        </div>
        <div className="sm:col-span-2 flex flex-wrap gap-4">
          <Toggle id="mail-ssl" label="SSL (port 465)" checked={form.ssl} onChange={(v) => set("ssl", v)} />
          <Toggle id="mail-starttls" label="STARTTLS (port 587)" checked={form.starttls} onChange={(v) => set("starttls", v)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mail-user">Compte</Label>
          <Input id="mail-user" value={form.user} onChange={(e) => set("user", e.target.value)} autoComplete="off" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mail-password">Mot de passe {form.password_set ? "(renseigné)" : "(vide)"}</Label>
          <Input
            id="mail-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={form.password_set ? "•••••••• — laisser vide pour conserver" : "Mot de passe de la boîte"}
            autoComplete="new-password"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mail-from">Adresse d’expédition</Label>
          <Input id="mail-from" type="email" value={form.from} onChange={(e) => set("from", e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mail-from-name">Nom affiché</Label>
          <Input id="mail-from-name" value={form.from_name} onChange={(e) => set("from_name", e.target.value)} />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="submit" variant="contrast" size="sm" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Enregistrer
          </Button>
          {message ? <span className={cn("text-[12.5px]", message.ok ? "text-success" : "text-destructive")}>{message.text}</span> : null}
        </div>
      </form>
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
            <Label htmlFor="mail-test-to">Envoyer un e-mail de test à</Label>
            <Input id="mail-test-to" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Votre adresse (par défaut)" />
          </div>
          <Button size="sm" variant="outline" onClick={() => void sendTest()} disabled={testing}>
            {testing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />} Tester l’envoi
          </Button>
        </div>
        {test ? <CheckLine check={test} /> : null}
      </div>
    </Section>
  );
}

export function LlmSettingsForm({ initial }: { initial: LlmSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [test, setTest] = useState<Check | null>(null);
  const [testing, setTesting] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, unknown> = { provider: form.provider, model: form.model, base_url: form.base_url };
    if (apiKey) body.api_key = apiKey;
    const r = await api<LlmSettings>("settings/llm", "PUT", body);
    setSaving(false);
    if (!r.ok) {
      setMessage({ ok: false, text: r.error ?? "Enregistrement refusé." });
      return;
    }
    setForm(r.data);
    setApiKey("");
    setMessage({ ok: true, text: "Réglages enregistrés (clé chiffrée)." });
    router.refresh();
  }

  async function runTest() {
    setTesting(true);
    const r = await api<Check>("settings/llm/test", "POST");
    setTesting(false);
    setTest(r.ok ? r.data : { name: "llm", ok: false, detail: r.error ?? "Test impossible." });
  }

  return (
    <Section icon={KeyRound} title="IA — clé API du LLM" description="Fournisseur et modèle utilisés par les analyses assistées. La clé est chiffrée et seuls ses 4 derniers caractères sont affichés.">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="llm-provider">Fournisseur</Label>
          <Select id="llm-provider" value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}>
            {form.providers.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p] ?? p}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="llm-model">Modèle</Label>
          <Input id="llm-model" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="claude-sonnet-5-5" />
        </div>
        {form.provider === "openai_compatible" ? (
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="llm-url">URL de l’API</Label>
            <Input id="llm-url" value={form.base_url} onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))} placeholder="https://…/v1" required />
          </div>
        ) : null}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="llm-key">Clé API {form.api_key_set ? `(renseignée ${form.api_key_hint ?? ""})` : "(vide)"}</Label>
          <Input
            id="llm-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={form.api_key_set ? "Laisser vide pour conserver la clé actuelle" : "sk-…"}
            autoComplete="off"
          />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="submit" variant="contrast" size="sm" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Enregistrer
          </Button>
          <Button size="sm" variant="outline" onClick={() => void runTest()} disabled={testing}>
            {testing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <PlugZap className="size-4" aria-hidden />} Tester la clé
          </Button>
          {message ? <span className={cn("text-[12.5px]", message.ok ? "text-success" : "text-destructive")}>{message.text}</span> : null}
        </div>
      </form>
      {test ? <CheckLine check={test} /> : null}
    </Section>
  );
}

export function CoreDiagnostics() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    const r = await api<Check[]>("diagnostics", "GET");
    setBusy(false);
    if (!r.ok || !Array.isArray(r.data)) {
      setError(r.error ?? "Test impossible.");
      return;
    }
    setChecks(r.data);
  }

  const failed = checks?.filter((c) => !c.ok && !c.skipped).length ?? 0;
  return (
    <Section icon={PlugZap} title="Connectivité du Core" description="Base de données, coffre-fort chiffré, journal d’audit, Docling, e-mail, IA et connecteurs des applications.">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="contrast" onClick={() => void run()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <PlugZap className="size-4" aria-hidden />} Lancer le test
        </Button>
        {checks ? (
          <Badge tone={failed ? "danger" : "success"}>{failed ? `${failed} point(s) en erreur` : "Tout est opérationnel"}</Badge>
        ) : null}
        {error ? <span className="text-[12.5px] text-destructive">{error}</span> : null}
      </div>
      {checks ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {checks.map((c) => (
            <CheckLine key={c.name} check={c} />
          ))}
        </div>
      ) : null}
    </Section>
  );
}

export type RelanceSettings = {
  actif: boolean;
  validation_externe: boolean;
  adresse_reponse: string;
  rattrapage_jours: number;
  regles_desactivees: string[];
};

export type RelanceRule = {
  cle: string;
  libelle: string;
  destinataire: string;
  externe: boolean;
  portee: string;
  decalages: number[];
  frequence_jours: number | null;
  jour: string | null;
};

const WHO: Record<string, string> = { CLIENT: "Client", EQUIPE: "Équipe GSMS", ADMIN: "Administrateurs" };

function when(rule: RelanceRule) {
  if (rule.portee === "PRESTATION" && rule.frequence_jours) return `tous les ${rule.frequence_jours} jours tant que des pièces manquent`;
  if (rule.portee === "ECHEANCE") return rule.decalages.map((d) => `J${d}`).join(", ") + " avant la remise des offres";
  if (rule.portee === "HEBDO" && rule.jour) return `chaque ${rule.jour}`;
  if (rule.portee === "CONFLIT") return "à la détection d’un conflit";
  if (rule.portee === "DEPOT") return "le jour du dépôt";
  return "";
}

export function RelancesSettingsForm({ initial, rules }: { initial: RelanceSettings; rules: RelanceRule[] }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const disabled = new Set(form.regles_desactivees);

  function toggleRule(key: string, active: boolean) {
    setForm((f) => ({
      ...f,
      regles_desactivees: active ? f.regles_desactivees.filter((k) => k !== key) : [...f.regles_desactivees, key],
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const r = await api<RelanceSettings>("settings/relances", "PUT", {
      actif: form.actif,
      validation_externe: form.validation_externe,
      adresse_reponse: form.adresse_reponse,
      rattrapage_jours: Number(form.rattrapage_jours),
      regles_desactivees: form.regles_desactivees,
    });
    setSaving(false);
    if (!r.ok) {
      setMessage({ ok: false, text: r.error ?? "Enregistrement refusé." });
      return;
    }
    setForm(r.data);
    setMessage({ ok: true, text: "Réglages des relances enregistrés." });
    router.refresh();
  }

  return (
    <Section icon={BellRing} title="Relances et alertes" description="Calendrier des messages planifiés par le Core (toutes les 10 minutes). Chaque règle peut être désactivée.">
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-5">
          <Toggle id="rel-actif" label="Relances actives" checked={form.actif} onChange={(v) => setForm((f) => ({ ...f, actif: v }))} />
          <Toggle
            id="rel-validation"
            label="Messages aux clients : validation avant envoi"
            checked={form.validation_externe}
            onChange={(v) => setForm((f) => ({ ...f, validation_externe: v }))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rel-reply">Adresse de réponse (vide : aucune)</Label>
            <Input id="rel-reply" type="email" value={form.adresse_reponse} onChange={(e) => setForm((f) => ({ ...f, adresse_reponse: e.target.value }))} placeholder="contact@gsms-security.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rel-grace">Rattrapage (jours) : un message en retard part encore</Label>
            <Input id="rel-grace" type="number" min={0} max={14} value={form.rattrapage_jours} onChange={(e) => setForm((f) => ({ ...f, rattrapage_jours: Number(e.target.value) }))} />
          </div>
        </div>
        <ul className="divide-y divide-border rounded-[12px] border border-border">
          {rules.map((rule) => (
            <li key={rule.cle} className="flex items-start gap-3 px-3.5 py-3">
              <input
                id={`rule-${rule.cle}`}
                type="checkbox"
                className="mt-1 size-4"
                checked={!disabled.has(rule.cle)}
                onChange={(e) => toggleRule(rule.cle, e.target.checked)}
              />
              <label htmlFor={`rule-${rule.cle}`} className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium">{rule.libelle}</span>
                <span className="block text-[12px] text-muted-foreground">
                  {WHO[rule.destinataire] ?? rule.destinataire} · {when(rule)}
                </span>
              </label>
              <Badge tone={rule.externe ? "warning" : "neutral"}>{rule.externe ? "Externe" : "Interne"}</Badge>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="contrast" size="sm" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Enregistrer
          </Button>
          {message ? <span className={cn("text-[12.5px]", message.ok ? "text-success" : "text-destructive")}>{message.text}</span> : null}
        </div>
      </form>
    </Section>
  );
}
