"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useId, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type MissionType = "audit" | "ao" | "contact";

const TITLES: Record<MissionType, string> = {
  audit: "Demander un audit de sécurité",
  ao: "Répondre à un appel d'offres",
  contact: "Nous contacter",
};

const DESCRIPTIONS: Record<MissionType, string> = {
  audit: "Décrivez votre établissement et le besoin. Nous revenons vers vous avec un cadrage de mission.",
  ao: "Indiquez le marché et vos coordonnées. Nous vous accompagnons sur le dossier de réponse.",
  contact: "Une question, un contexte particulier ? Écrivez-nous.",
};

const ETABLISSEMENT_LABELS: Record<string, string> = {
  erp: "Établissement recevant du public",
  sante: "Santé et accueil spécialisé",
  industrie: "Tertiaire, industrie et logistique",
  "securite-privee": "Société de sécurité privée",
};

const TYPE_LINKS: { type: MissionType; label: string }[] = [
  { type: "audit", label: "Audit" },
  { type: "ao", label: "Appel d'offres" },
  { type: "contact", label: "Contact" },
];

export function MissionRequestForm({
  type,
  cta,
  offer,
  etablissement,
}: {
  type: MissionType;
  cta?: string;
  offer?: string;
  etablissement?: string;
}) {
  const etablissementLabel = etablissement ? ETABLISSEMENT_LABELS[etablissement] : undefined;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Clé d'idempotence stable pour les nouvelles tentatives de la même demande.
  const requestId = useRef<string | null>(null);
  const titleId = useId();
  const errorId = useId();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    requestId.current ??= crypto.randomUUID();

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          type,
          cta,
          offer,
          etablissement: etablissementLabel ?? etablissement,
          requestId: requestId.current,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Envoi impossible. Réessayez.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'envoi.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="surface-card flex flex-col items-start gap-4 p-8">
        <CheckCircle2 className="size-7 text-success" aria-hidden />
        <h1 className="text-2xl font-[650] tracking-[-0.03em]">Demande bien reçue</h1>
        <p className="text-[14px]/[1.65] text-muted-foreground">
          Nous avons enregistré votre demande. Un interlocuteur GSMS vous recontacte rapidement.
        </p>
        <Link href="/" className={buttonVariants({ variant: "contrast", size: "lg" })}>
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} aria-labelledby={titleId} aria-describedby={error ? errorId : undefined} className="surface-card relative flex flex-col gap-6 p-6 md:p-8">
      <nav aria-label="Type de demande" className="flex flex-wrap gap-1.5">
        {TYPE_LINKS.map((item) => (
          <Link
            key={item.type}
            href={`/demande?type=${item.type}${etablissement ? `&etablissement=${etablissement}` : ""}`}
            aria-current={item.type === type ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors",
              item.type === type ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-2">
        <h1 id={titleId} className="text-[26px]/[1.15] font-[650] tracking-[-0.035em]">
          {TITLES[type]}
        </h1>
        <p className="text-[14px]/[1.6] text-muted-foreground">{DESCRIPTIONS[type]}</p>
        {etablissementLabel ? (
          <p className="mt-1 w-fit rounded-md border border-border px-2.5 py-1 text-[12px]/5 text-muted-foreground">
            Situation retenue : <span className="text-foreground">{etablissementLabel}</span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" name="firstName" autoComplete="given-name" required />
        <Field label="Nom" name="lastName" autoComplete="family-name" />
        <Field label="E-mail" name="email" type="email" autoComplete="email" required className="sm:col-span-2" />
        <Field label="Téléphone" name="phone" type="tel" autoComplete="tel" className="sm:col-span-2" />
        <Field
          label="Organisation / établissement"
          name="companyName"
          autoComplete="organization"
          required={type !== "contact"}
          className="sm:col-span-2"
        />
        {type === "contact" ? (
          <Field label="Objet" name="subject" className="sm:col-span-2" />
        ) : (
          <Field
            label={type === "ao" ? "Intitulé du marché / appel d'offres" : "Objet de la mission"}
            name="title"
            required
            className="sm:col-span-2"
          />
        )}
        {type === "audit" ? (
          <Field label="Date de la commission de sécurité (si connue)" name="echeanceCommission" type="date" className="sm:col-span-2" />
        ) : null}
        {type === "ao" ? <Field label="Référence du marché (si connue)" name="referenceAo" className="sm:col-span-2" /> : null}
        <MessageField required={type === "contact"} />
      </div>

      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input type="text" name="honeypot" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="rounded-[10px] border border-destructive/30 bg-destructive/[0.06] px-4 py-3 text-[13.5px]/[1.55] text-destructive">
          {error}
        </p>
      ) : null}

      <p className="text-[12px]/[1.5] text-muted-foreground">
        Les champs marqués <span aria-hidden>*</span>
        <span className="sr-only">d&apos;un astérisque</span> sont obligatoires. Vos informations servent uniquement à traiter votre demande.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending} variant="contrast" size="lg" aria-busy={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? "Envoi…" : "Envoyer la demande"}
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Annuler
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden className="text-primary"> *</span> : null}
      </Label>
      <Input id={id} name={name} type={type} required={required} autoComplete={autoComplete} />
    </div>
  );
}

function MessageField({ required }: { required: boolean }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <Label htmlFor={id}>
        Message
        {required ? <span aria-hidden className="text-primary"> *</span> : null}
      </Label>
      <Textarea id={id} name="message" required={required} rows={5} />
    </div>
  );
}
