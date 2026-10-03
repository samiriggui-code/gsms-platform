"use client";

import { Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

export type CompanyProfile = {
  raison_sociale: string;
  cnaps_autorisation: string | null;
  cnaps_validite: string | null;
  certifications: string[];
  effectifs: Record<string, number>;
  delai_mobilisation_jours: number | null;
  chiffre_affaires_annuel: number | null;
  reprise_personnel: boolean | null;
  sous_traitance: boolean | null;
};

export type CompanyProfileData = {
  profile: CompanyProfile;
  qualifications: Record<string, string>;
  missing: string[];
  updated_by?: string;
  updated_at?: string;
};

function triState(value: boolean | null): string {
  return value === null ? "" : value ? "oui" : "non";
}

function parseTri(value: FormDataEntryValue | null): boolean | null {
  return value === "oui" ? true : value === "non" ? false : null;
}

function num(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Profil GSMS lu par la matrice GO / NO-GO : un champ vide reste « à renseigner », rien n'est supposé. */
export function CompanyProfileForm({ initial, editable }: { initial: CompanyProfileData; editable: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [missing, setMissing] = useState(initial.missing);
  const [pending, startTransition] = useTransition();
  const p = initial.profile;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const effectifs: Record<string, number> = {};
    for (const key of Object.keys(initial.qualifications)) {
      const value = num(form.get(`eff_${key}`));
      if (value !== null) effectifs[key] = Math.max(0, Math.round(value));
    }
    const body: CompanyProfile = {
      raison_sociale: String(form.get("raison_sociale") ?? "").trim(),
      cnaps_autorisation: String(form.get("cnaps_autorisation") ?? "").trim() || null,
      cnaps_validite: String(form.get("cnaps_validite") ?? "") || null,
      certifications: String(form.get("certifications") ?? "")
        .split(/[,;\n]/)
        .map((c) => c.trim())
        .filter(Boolean),
      effectifs,
      delai_mobilisation_jours: num(form.get("delai_mobilisation_jours")),
      chiffre_affaires_annuel: num(form.get("chiffre_affaires_annuel")),
      reprise_personnel: parseTri(form.get("reprise_personnel")),
      sous_traitance: parseTri(form.get("sous_traitance")),
    };
    const res = await fetch("/api/core/tenders/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as Partial<CompanyProfileData> & { error?: string };
    if (!res || !res.ok) {
      setMessage({ ok: false, text: data?.error ?? "Enregistrement refusé." });
      return;
    }
    setMissing(data.missing ?? []);
    setMessage({ ok: true, text: "Profil enregistré : les matrices GO / NO-GO en tiennent compte immédiatement." });
    startTransition(() => router.refresh());
  }

  return (
    <section id="profil-ao" className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-border bg-surface-subtle">
          <Building2 className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold">Profil GSMS — appels d&apos;offres</h2>
          <p className="text-[13px] text-muted-foreground">
            Ce que GSMS peut engager sur un marché. La matrice GO / NO-GO compare chaque DCE à ce profil ; un champ vide est signalé « à renseigner ».
          </p>
        </div>
      </div>
      {missing.length > 0 ? (
        <p className="rounded-[10px] border border-warning/30 bg-warning/10 p-3 text-[12.5px]">À renseigner : {missing.join(", ")}.</p>
      ) : null}
      <form onSubmit={submit} className="grid gap-4">
        <fieldset disabled={!editable || pending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Raison sociale" htmlFor="raison_sociale">
            <Input id="raison_sociale" name="raison_sociale" defaultValue={p.raison_sociale} maxLength={200} />
          </Field>
          <Field label="N° d'autorisation d'exercer CNAPS" htmlFor="cnaps_autorisation">
            <Input id="cnaps_autorisation" name="cnaps_autorisation" defaultValue={p.cnaps_autorisation ?? ""} maxLength={60} placeholder="AUT-…" />
          </Field>
          <Field label="Valable jusqu'au" htmlFor="cnaps_validite">
            <Input id="cnaps_validite" name="cnaps_validite" type="date" defaultValue={p.cnaps_validite ?? ""} />
          </Field>
          <Field label="Chiffre d'affaires annuel (€)" htmlFor="chiffre_affaires_annuel">
            <Input id="chiffre_affaires_annuel" name="chiffre_affaires_annuel" inputMode="decimal" defaultValue={p.chiffre_affaires_annuel ?? ""} />
          </Field>
          <Field label="Délai de mobilisation (jours)" htmlFor="delai_mobilisation_jours">
            <Input id="delai_mobilisation_jours" name="delai_mobilisation_jours" type="number" min={0} max={365} defaultValue={p.delai_mobilisation_jours ?? ""} />
          </Field>
          <Field label="Certifications (séparées par des virgules)" htmlFor="certifications">
            <Input id="certifications" name="certifications" defaultValue={p.certifications.join(", ")} placeholder="ISO 9001, MASE" />
          </Field>
          <Field label="Reprise du personnel (avenant 5)" htmlFor="reprise_personnel">
            <Select id="reprise_personnel" name="reprise_personnel" defaultValue={triState(p.reprise_personnel)}>
              <option value="">Non renseigné</option>
              <option value="oui">Oui, GSMS sait reprendre le personnel</option>
              <option value="non">Non</option>
            </Select>
          </Field>
          <Field label="Sous-traitance ou groupement" htmlFor="sous_traitance">
            <Select id="sous_traitance" name="sous_traitance" defaultValue={triState(p.sous_traitance)}>
              <option value="">Non renseigné</option>
              <option value="oui">Possible</option>
              <option value="non">Exclu</option>
            </Select>
          </Field>
        </fieldset>
        <fieldset disabled={!editable || pending} className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-medium">Agents mobilisables par qualification</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(initial.qualifications).map(([key, label]) => (
              <Field key={key} label={label} htmlFor={`eff_${key}`}>
                <Input id={`eff_${key}`} name={`eff_${key}`} type="number" min={0} defaultValue={p.effectifs[key] ?? ""} placeholder="—" />
              </Field>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12px] text-muted-foreground">
            {initial.updated_at ? `Dernière mise à jour : ${new Date(initial.updated_at).toLocaleString("fr-FR")}` : "Jamais renseigné"}
            {!editable ? " · lecture seule (gestion réservée aux responsables)" : ""}
          </span>
          {editable ? (
            <Button type="submit" size="sm" variant="contrast" disabled={pending}>
              {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              Enregistrer le profil
            </Button>
          ) : null}
        </div>
        {message ? (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-[12.5px] text-muted-foreground" : "text-[12.5px] text-destructive"}>
            {message.text}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-[12.5px]">
        {label}
      </Label>
      {children}
    </div>
  );
}
