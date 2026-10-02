"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password"), next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; next?: string };
      if (!res.ok) throw new Error(data.error ?? "Connexion impossible.");
      router.replace(data.next ?? next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" aria-describedby={error ? errorId : undefined}>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px]/[1.2] font-[650] tracking-[-0.03em]">Connexion</h1>
        <p className="text-[13.5px]/[1.55] text-muted-foreground">Accédez à votre espace GSMS.</p>
      </div>

      {notice ? (
        <p role="status" className="rounded-[10px] border border-border bg-muted/50 px-3.5 py-2.5 text-[13px]/[1.5] text-muted-foreground">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={emailId}>E-mail</Label>
        <Input id={emailId} name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={passwordId}>Mot de passe</Label>
        <Input id={passwordId} name="password" type="password" autoComplete="current-password" required />
      </div>

      {error ? (
        <p id={errorId} role="alert" className="rounded-[10px] border border-destructive/30 bg-destructive/[0.06] px-3.5 py-2.5 text-[13px]/[1.5] text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="contrast" size="md" disabled={pending} aria-busy={pending} className="h-11 w-full">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pending ? "Connexion…" : "Se connecter"}
      </Button>

      <p className="text-center text-[12.5px] text-muted-foreground">
        Pas encore client ?{" "}
        <Link href="/demande?type=contact" className="font-medium text-foreground underline-offset-4 hover:underline">
          Contactez-nous
        </Link>
      </p>
    </form>
  );
}
