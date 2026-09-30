"use client";

import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { Label } from "@crm/ui/components/label";
import { Textarea } from "@crm/ui/components/textarea";
import { cn } from "@crm/ui/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useId, useMemo, useState } from "react";

type MissionType = "audit" | "ao" | "contact";

const TITLES: Record<MissionType, string> = {
	audit: "Demander un audit de sécurité",
	ao: "Répondre à un appel d'offres",
	contact: "Nous contacter",
};

const DESCRIPTIONS: Record<MissionType, string> = {
	audit:
		"Décrivez votre établissement et le besoin. Nous revenons vers vous avec un cadrage de mission.",
	ao: "Indiquez le marché et vos coordonnées. Nous vous accompagnons sur le dossier de réponse.",
	contact: "Une question, un contexte particulier ? Écrivez-nous.",
};

const ETABLISSEMENT_LABELS: Record<string, string> = {
	erp: "Établissement recevant du public",
	sante: "Santé et accueil spécialisé",
	industrie: "Tertiaire, industrie et logistique",
	"securite-privee": "Société de sécurité privée",
};

function resolveType(raw: string | null): MissionType {
	if (raw === "ao" || raw === "contact" || raw === "audit") return raw;
	return "audit";
}

export function MissionRequestForm() {
	const search = useSearchParams();
	const router = useRouter();
	const type = useMemo(() => resolveType(search.get("type")), [search]);
	const cta = search.get("cta") ?? undefined;
	const offer = search.get("offer") ?? undefined;
	const etablissement = search.get("etablissement") ?? undefined;
	const etablissementLabel = etablissement
		? ETABLISSEMENT_LABELS[etablissement]
		: undefined;

	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setPending(true);

		const form = new FormData(event.currentTarget);
		const payload = Object.fromEntries(form.entries());

		try {
			const res = await fetch("/api/gsms-intake", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type,
					cta,
					offer,
					etablissement: etablissementLabel ?? etablissement,
					...payload,
				}),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) {
				throw new Error(data.error ?? "Envoi impossible. Réessayez.");
			}
			setDone(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur d'envoi");
		} finally {
			setPending(false);
		}
	}

	if (done) {
		return (
			<div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-8">
				<h1 className="font-semibold text-2xl tracking-tight">
					Demande bien reçue
				</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Nous avons enregistré votre demande. Un interlocuteur GSMS vous
					recontacte rapidement.
				</p>
				<Button type="button" size="xl" onClick={() => router.push("/")}>
					Retour à l'accueil
				</Button>
			</div>
		);
	}

	return (
		<form
			onSubmit={onSubmit}
			className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 md:p-8"
		>
			<div className="flex flex-col gap-2">
				<h1 className="font-semibold text-2xl tracking-tight">
					{TITLES[type]}
				</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{DESCRIPTIONS[type]}
				</p>
				{etablissementLabel ? (
					<p className="mt-1 w-fit rounded-sm border border-border px-2.5 py-1 text-[12px]/5 text-muted-foreground">
						Situation retenue :{" "}
						<span className="text-foreground">{etablissementLabel}</span>
					</p>
				) : null}
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="Prénom" name="firstName" required />
				<Field label="Nom" name="lastName" />
				<Field
					label="Email"
					name="email"
					type="email"
					autoComplete="email"
					required
					className="sm:col-span-2"
				/>
				<Field
					label="Téléphone"
					name="phone"
					type="tel"
					autoComplete="tel"
					className="sm:col-span-2"
				/>
				<Field
					label="Organisation / établissement"
					name="companyName"
					required={type !== "contact"}
					className="sm:col-span-2"
				/>
				{type === "contact" ? (
					<Field label="Objet" name="subject" className="sm:col-span-2" />
				) : (
					<Field
						label={
							type === "ao" ? "Intitulé du marché / AO" : "Objet de la mission"
						}
						name="title"
						required
						className="sm:col-span-2"
					/>
				)}
				{type === "audit" ? (
					<Field
						label="Date de la commission de sécurité (si connue)"
						name="echeanceCommission"
						type="date"
						className="sm:col-span-2"
					/>
				) : null}
				{type === "ao" ? (
					<Field
						label="Référence du marché (si connue)"
						name="referenceAo"
						className="sm:col-span-2"
					/>
				) : null}
				<MessageField required={type === "contact"} />
			</div>

			<input
				type="text"
				name="honeypot"
				tabIndex={-1}
				autoComplete="off"
				className="absolute left-[-9999px] h-0 w-0 opacity-0"
				aria-hidden
			/>

			{error ? (
				<p className="text-destructive text-sm" role="alert">
					{error}
				</p>
			) : null}

			<div className="flex flex-wrap gap-3">
				<Button type="submit" disabled={pending} size="xl">
					{pending ? "Envoi…" : "Envoyer la demande"}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="xl"
					onClick={() => router.push("/")}
				>
					Annuler
				</Button>
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
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				name={name}
				type={type}
				required={required}
				autoComplete={autoComplete}
			/>
		</div>
	);
}

function MessageField({ required }: { required: boolean }) {
	const id = useId();

	return (
		<div className="flex flex-col gap-2 sm:col-span-2">
			<Label htmlFor={id}>Message</Label>
			<Textarea id={id} name="message" required={required} rows={5} />
		</div>
	);
}
