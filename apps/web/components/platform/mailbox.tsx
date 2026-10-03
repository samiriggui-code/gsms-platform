"use client";

// Messagerie (relances et e-mails) : les trois volets de la boîte mail de gsms-qualiopi
// (dossiers par statut, liste des messages, lecture du contenu exact), dans le portail GSMS.
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  ChevronLeft,
  CircleCheck,
  Clock,
  Inbox,
  Loader2,
  Mail,
  MailQuestion,
  RefreshCw,
  Send,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type MessageStatus = "A_VALIDER" | "PREVU" | "ENVOYE" | "ECHEC" | "SANS_ADRESSE" | "ANNULE";

type Message = {
  id: string;
  reference: string;
  regle: string;
  regle_libelle: string;
  modele: string;
  version_modele: number;
  externe: boolean;
  destinataire: { type: string; nom: string | null; email: string | null };
  prestation: { id: string; nom: string } | null;
  objet: string;
  statut: MessageStatus;
  prevu_le: string;
  valide_par: string | null;
  valide_le: string | null;
  envoye_le: string | null;
  tentatives: number;
  erreur: string | null;
  motif_annulation: string | null;
  empreinte: string;
  html?: string;
};

type Box = { compteurs: Partial<Record<MessageStatus, number>>; peut_gerer: boolean; messages: Message[] };
type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

const STATUS: Record<MessageStatus, { label: string; one: string; tone: Tone; icon: LucideIcon }> = {
  A_VALIDER: { label: "À valider", one: "À valider", tone: "warning", icon: MailQuestion },
  PREVU: { label: "Prévus", one: "Prévu", tone: "primary", icon: CalendarClock },
  ENVOYE: { label: "Envoyés", one: "Envoyé", tone: "success", icon: Send },
  ECHEC: { label: "Échecs", one: "Échec", tone: "danger", icon: AlertTriangle },
  SANS_ADRESSE: { label: "Sans adresse", one: "Sans adresse", tone: "danger", icon: UserX },
  ANNULE: { label: "Annulés", one: "Annulé", tone: "neutral", icon: Ban },
};
const FOLDERS: (MessageStatus | "ALL")[] = ["A_VALIDER", "PREVU", "ENVOYE", "ECHEC", "SANS_ADRESSE", "ANNULE", "ALL"];
const KIND: Record<string, string> = { CLIENT: "Client", EQUIPE: "Équipe GSMS", ADMIN: "Administrateurs", TEST: "Test" };

const PANE = "lg:h-[calc(100vh-190px)] lg:min-h-[560px]";

const initials = (name: string | null, email: string | null) =>
  (name || email || "?")
    .split(/[\s.@-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

function fmt(value: string | null, withTime = false) {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", withTime ? { dateStyle: "medium", timeStyle: "short" } : { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function shortDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(d);
}

async function call<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`/api/core/communications${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Erreur ${res.status}`);
  return data as T;
}

type Toast = { id: number; ok: boolean; text: string };

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((ok: boolean, text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, ok, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const view = (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-[12px] border px-4 py-2.5 text-[13px] shadow-lg",
            t.ok ? "border-success/30 bg-card text-foreground" : "border-destructive/30 bg-card text-destructive",
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
  return { push, view };
}

function Folders({
  value,
  counts,
  total,
  onChange,
}: {
  value: MessageStatus | "ALL";
  counts: Partial<Record<MessageStatus, number>>;
  total: number;
  onChange: (v: MessageStatus | "ALL") => void;
}) {
  return (
    <nav
      aria-label="Dossiers"
      className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border p-2.5 [scrollbar-width:none] lg:w-[210px] lg:flex-col lg:border-e lg:border-b-0"
    >
      {FOLDERS.map((f) => {
        const Icon = f === "ALL" ? Inbox : STATUS[f].icon;
        const count = f === "ALL" ? total : (counts[f] ?? 0);
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            aria-current={value === f ? "true" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground",
              value === f && "bg-muted font-semibold text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="grow text-start">{f === "ALL" ? "Tous" : STATUS[f].label}</span>
            {count > 0 ? <span className="font-mono text-[11px] tabular-nums">{count}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}

function MessageList({
  messages,
  selected,
  onSelect,
  loading,
}: {
  messages: Message[];
  selected: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className={cn(PANE, "min-w-0 overflow-y-auto border-border max-lg:flex-1 lg:w-[360px] lg:shrink-0 lg:border-e")}>
      <div className="space-y-1 p-2.5">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)
          : null}
        {!loading && !messages.length ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Mail className="size-10 text-muted-foreground/40" aria-hidden />
            <p className="text-[13.5px] font-medium">Aucun message ici</p>
            <p className="max-w-[240px] text-[12px] text-muted-foreground">
              Les relances apparaissent à chaque passage du planificateur (toutes les 10 minutes).
            </p>
          </div>
        ) : null}
        {messages.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg p-2 text-start transition-colors hover:bg-muted",
              selected === m.id && "bg-muted",
            )}
          >
            <span className="grid size-[32px] shrink-0 place-items-center rounded-full border border-border bg-background text-[11px] font-semibold">
              {initials(m.destinataire.nom, m.destinataire.email)}
            </span>
            <span className="min-w-0 flex-1 space-y-0.5">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13.5px] font-medium">
                  {m.destinataire.nom || m.destinataire.email || "Destinataire inconnu"}
                </span>
                {m.statut === "A_VALIDER" ? <span className="size-2 shrink-0 rounded-full bg-warning" aria-label="à valider" /> : null}
              </span>
              <span className="block truncate text-[12px] text-muted-foreground">{m.objet}</span>
              {m.prestation ? <span className="block truncate text-[11px] text-muted-foreground/80">{m.prestation.nom}</span> : null}
            </span>
            <span className="shrink-0 self-start text-[11.5px] text-muted-foreground">{shortDate(m.prevu_le)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2 text-[13px]">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function Reader({
  id,
  canManage,
  onBack,
  onChanged,
  toast,
}: {
  id: string | null;
  canManage: boolean;
  onBack: () => void;
  onChanged: () => void;
  toast: (ok: boolean, text: string) => void;
}) {
  const [m, setM] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setM(await call<Message>(`/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message illisible.");
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    call<Message>(`/${id}`)
      .then((data) => !cancelled && setM(data))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Message illisible."));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="flex grow flex-col items-center justify-center gap-2 py-16 text-center max-lg:hidden">
        <div className="grid size-24 place-items-center rounded-full bg-muted">
          <Mail className="size-10 text-muted-foreground" aria-hidden />
        </div>
        <p className="text-[13.5px] font-semibold">Aucun message ouvert</p>
        <p className="text-[12px] text-muted-foreground">Choisissez un message pour voir son contenu exact.</p>
      </div>
    );
  }

  async function run(action: "valider" | "annuler" | "renvoyer", why?: string) {
    setPending(action);
    try {
      const res = await call<Message>(`/${id}/${action}`, "POST", why ? { motif: why } : {});
      toast(
        res.statut !== "ECHEC",
        action === "valider"
          ? res.statut === "ENVOYE"
            ? "Message validé et envoyé."
            : res.statut === "ANNULE"
              ? `Message annulé : ${res.motif_annulation}`
              : res.statut === "ECHEC"
                ? `Échec de l’envoi : ${res.erreur}`
                : "Message validé."
          : action === "annuler"
            ? "Message annulé."
            : res.statut === "ENVOYE"
              ? "Message envoyé."
              : `Nouvel échec : ${res.erreur}`,
      );
      dialog.current?.close();
      await load();
      onChanged();
    } catch (e) {
      toast(false, e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex min-w-0 grow flex-col">
      {!m ? (
        <div className="space-y-3 p-5">
          {error ? <p className="text-[13px] text-destructive">{error}</p> : <div className="h-40 animate-pulse rounded-lg bg-muted" />}
        </div>
      ) : (
        <div className={cn(PANE, "min-w-0 overflow-y-auto")}>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={onBack} aria-label="Retour à la liste">
                <ChevronLeft className="size-4" />
              </Button>
              <Badge tone={STATUS[m.statut].tone}>{STATUS[m.statut].one}</Badge>
              <Badge>{m.externe ? "Externe" : "Interne"}</Badge>
              <span className="ms-auto font-mono text-[11.5px] text-muted-foreground">{m.reference}</span>
            </div>
            <h2 className="text-[16px] font-semibold">{m.objet}</h2>

            <div className="space-y-1.5 rounded-[12px] border border-border p-3.5">
              <Field label="À">
                {m.destinataire.nom || "—"}
                {m.destinataire.email ? <span className="text-muted-foreground"> &lt;{m.destinataire.email}&gt;</span> : null}
                <span className="text-muted-foreground"> · {KIND[m.destinataire.type] ?? m.destinataire.type}</span>
              </Field>
              {m.prestation ? (
                <Field label="Prestation">
                  <a href={`/app/coffre-fort?ws=${m.prestation.id}`} className="underline-offset-2 hover:underline">
                    {m.prestation.nom}
                  </a>
                </Field>
              ) : null}
              <Field label="Règle">{m.regle_libelle}</Field>
              <Field label="Prévu le">{fmt(m.prevu_le)}</Field>
              {m.valide_par ? (
                <Field label="Validé">
                  par {m.valide_par} le {fmt(m.valide_le, true)}
                </Field>
              ) : null}
              {m.envoye_le ? <Field label="Envoyé le">{fmt(m.envoye_le, true)}</Field> : null}
              {m.erreur ? (
                <Field label="Erreur">
                  <span className="text-destructive">
                    {m.erreur} ({m.tentatives} tentative{m.tentatives > 1 ? "s" : ""})
                  </span>
                </Field>
              ) : null}
              {m.motif_annulation ? <Field label="Annulé">{m.motif_annulation}</Field> : null}
              <Field label="Modèle">
                {m.modele} v{m.version_modele}
              </Field>
            </div>

            {canManage && (m.statut === "A_VALIDER" || m.statut === "PREVU" || m.statut === "ECHEC") ? (
              <div className="flex flex-wrap items-center gap-2">
                {m.statut === "A_VALIDER" ? (
                  <Button size="sm" disabled={Boolean(pending)} onClick={() => void run("valider")}>
                    {pending === "valider" ? <Loader2 className="size-4 animate-spin" /> : <CircleCheck className="size-4" />}
                    Valider et envoyer
                  </Button>
                ) : null}
                {m.statut === "ECHEC" ? (
                  <Button size="sm" disabled={Boolean(pending)} onClick={() => void run("renvoyer")}>
                    {pending === "renvoyer" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Réessayer l’envoi
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMotif("");
                    dialog.current?.showModal();
                  }}
                >
                  <Ban className="size-4" /> Annuler l’envoi
                </Button>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[12px] border border-border bg-white">
              <iframe title={`Contenu : ${m.objet}`} srcDoc={m.html} sandbox="" className="block h-[560px] w-full" />
            </div>
            <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Clock className="size-3.5" aria-hidden /> Contenu exact tel qu’envoyé · empreinte SHA-256 {m.empreinte.slice(0, 16)}…
            </p>
          </div>
        </div>
      )}

      <dialog
        ref={dialog}
        className="m-auto w-[min(92vw,460px)] rounded-[16px] border border-border bg-card p-0 text-foreground backdrop:bg-foreground/30"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <form
          method="dialog"
          className="flex flex-col gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (motif.trim()) void run("annuler", motif.trim());
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold">Annuler l’envoi</h3>
              <p className="text-[12.5px] text-muted-foreground">Le message reste dans le journal, avec votre motif.</p>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Fermer" className="text-muted-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="motif">Motif</Label>
            <Textarea id="motif" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => dialog.current?.close()}>
              Retour
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={!motif.trim() || Boolean(pending)}>
              Annuler l’envoi
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

export function Mailbox() {
  const [box, setBox] = useState<Box | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<MessageStatus | "ALL">("A_VALIDER");
  const [selected, setSelected] = useState<string | null>(null);
  const [prestation, setPrestation] = useState("");
  const [planning, setPlanning] = useState(false);
  const { push, view } = useToasts();

  const refresh = useCallback(async () => {
    try {
      setBox(await call<Box>(""));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Messagerie indisponible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    call<Box>("")
      .then((data) => !cancelled && setBox(data))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Messagerie indisponible."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const prestations = useMemo(() => {
    const map = new Map<string, string>();
    box?.messages.forEach((m) => m.prestation && map.set(m.prestation.id, m.prestation.nom));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [box]);

  const scoped = (box?.messages ?? []).filter((m) => !prestation || m.prestation?.id === prestation);
  const messages = scoped.filter((m) => folder === "ALL" || m.statut === folder);
  const counts = scoped.reduce<Partial<Record<MessageStatus, number>>>((acc, m) => ({ ...acc, [m.statut]: (acc[m.statut] ?? 0) + 1 }), {});
  const total = scoped.length;
  const toValidate = box?.compteurs.A_VALIDER ?? 0;

  async function planNow() {
    setPlanning(true);
    try {
      const r = await call<{ inactif?: boolean; crees?: number; envoyes?: number; annules?: number; echecs?: number }>("/planifier", "POST");
      push(
        true,
        r.inactif
          ? "Les relances sont désactivées (Paramètres > Plateforme > Relances)."
          : `Planification faite : ${r.crees ?? 0} message(s) créé(s), ${r.envoyes ?? 0} envoyé(s)${r.echecs ? `, ${r.echecs} échec(s)` : ""}.`,
      );
      await refresh();
    } catch (e) {
      push(false, e instanceof Error ? e.message : "Planification impossible.");
    } finally {
      setPlanning(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="inline-flex items-center gap-2.5 text-[clamp(22px,2.4vw,28px)] font-[650] tracking-[-0.03em]">
          <Mail className="size-5 text-primary" aria-hidden />
          Messagerie
          {toValidate > 0 ? <Badge tone="warning">{toValidate} à valider</Badge> : null}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {prestations.length ? (
            <Select aria-label="Filtrer par prestation" value={prestation} onChange={(e) => setPrestation(e.target.value)} className="h-9 max-w-[260px] text-[13px]">
              <option value="">Toutes les prestations</option>
              {prestations.map(([id, nom]) => (
                <option key={id} value={id}>
                  {nom}
                </option>
              ))}
            </Select>
          ) : null}
          {box?.peut_gerer ? (
            <Button size="sm" variant="outline" disabled={planning} onClick={() => void planNow()}>
              {planning ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Planifier maintenant
            </Button>
          ) : null}
        </div>
      </div>
      <div className="overflow-hidden rounded-[16px] border border-border bg-card">
        {error ? (
          <p role="alert" className="p-6 text-[13.5px] text-destructive">
            {error}
          </p>
        ) : (
          <div className="flex min-w-0 grow max-lg:flex-col">
            <Folders
              value={folder}
              counts={counts}
              total={total}
              onChange={(f) => {
                setFolder(f);
                setSelected(null);
              }}
            />
            <div className={cn("flex min-w-0 grow", selected && "max-lg:hidden")}>
              <MessageList messages={messages} selected={selected} onSelect={setSelected} loading={loading} />
              <div className="hidden min-w-0 grow lg:flex">
                <Reader key={selected ?? "none"} id={selected} canManage={Boolean(box?.peut_gerer)} onBack={() => setSelected(null)} onChanged={refresh} toast={push} />
              </div>
            </div>
            {selected ? (
              <div className="flex min-w-0 grow lg:hidden">
                <Reader key={selected ?? "none"} id={selected} canManage={Boolean(box?.peut_gerer)} onBack={() => setSelected(null)} onChanged={refresh} toast={push} />
              </div>
            ) : null}
          </div>
        )}
      </div>
      {view}
    </>
  );
}
