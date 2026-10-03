"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Info = { email: string; name: string; purpose: "invitation" | "reset"; expires_at: string; min_length: number };
type State =
  | { step: "loading" }
  | { step: "invalid"; message: string }
  | { step: "form"; token: string; info: Info }
  | { step: "done"; email: string };

async function post(body: unknown) {
  const res = await fetch("/api/activation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

/** Choix du mot de passe depuis le lien d'invitation (ou de réinitialisation) reçu par e-mail. Le jeton est
 * dans le fragment de l'adresse (#…) : il n'est jamais envoyé dans une URL ni journalisé par un serveur. */
export function ActivationForm() {
  const [state, setState] = useState<State>({ step: "loading" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pwdId = useId();
  const confirmId = useId();

  useEffect(() => {
    let cancelled = false;
    const token = window.location.hash.replace(/^#/, "");
    (async () => {
      if (!token) {
        if (!cancelled) setState({ step: "invalid", message: "Lien incomplet : ouvrez le lien reçu par e-mail." });
        return;
      }
      const { ok, data } = await post({ token, check: true });
      if (cancelled) return;
      setState(
        ok
          ? { step: "form", token, info: data as unknown as Info }
          : { step: "invalid", message: "Ce lien n’est plus valable (déjà utilisé ou expiré). Demandez-en un nouveau à un administrateur." },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.step !== "form") return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setPending(true);
    const { ok, data } = await post({ token: state.token, password });
    setPending(false);
    if (!ok) {
      setError(typeof data.error === "string" ? data.error : "Enregistrement impossible.");
      return;
    }
    window.history.replaceState(null, "", window.location.pathname);
    setState({ step: "done", email: state.info.email });
  }

  if (state.step === "loading") {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Chargement" />;
  }
  if (state.step === "invalid") {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-[22px]/[1.2] font-[650] tracking-[-0.03em]">Lien invalide</h1>
        <p className="text-[13.5px]/[1.55] text-muted-foreground">{state.message}</p>
        <Link href="/login" className="text-[13px] font-medium underline underline-offset-4">
          Aller à la connexion
        </Link>
      </div>
    );
  }
  if (state.step === "done") {
    return (
      <div className="flex flex-col gap-3">
        <CheckCircle2 className="size-7 text-success" aria-hidden />
        <h1 className="text-[22px]/[1.2] font-[650] tracking-[-0.03em]">Mot de passe enregistré</h1>
        <p className="text-[13.5px]/[1.55] text-muted-foreground">
          Connectez-vous avec {state.email}. Le même compte ouvre DocuLens, GRACE, QAtrial et le CRM (bouton « Se
          connecter avec GSMS »), selon vos droits.
        </p>
        <Link href="/login" className={cn(buttonVariants({ variant: "contrast", size: "md" }), "h-11 w-full")}>
          Se connecter
        </Link>
      </div>
    );
  }

  const { info } = state;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px]/[1.2] font-[650] tracking-[-0.03em]">
          {info.purpose === "invitation" ? `Bienvenue, ${info.name}` : "Nouveau mot de passe"}
        </h1>
        <p className="text-[13.5px]/[1.55] text-muted-foreground">
          Compte <span className="font-medium text-foreground">{info.email}</span>. Choisissez un mot de passe d’au
          moins {info.min_length} caractères, qui ne contient pas votre identifiant.
        </p>
      </div>
      <input type="email" name="username" autoComplete="username" value={info.email} readOnly hidden />
      <div className="flex flex-col gap-2">
        <Label htmlFor={pwdId}>Mot de passe</Label>
        <Input id={pwdId} name="password" type="password" autoComplete="new-password" minLength={info.min_length} required autoFocus />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={confirmId}>Confirmer</Label>
        <Input id={confirmId} name="confirm" type="password" autoComplete="new-password" minLength={info.min_length} required />
      </div>
      {error ? (
        <p role="alert" className="rounded-[10px] border border-destructive/30 bg-destructive/[0.06] px-3.5 py-2.5 text-[13px]/[1.5] text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="contrast" size="md" disabled={pending} aria-busy={pending} className="h-11 w-full">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Enregistrer mon mot de passe
      </Button>
    </form>
  );
}
