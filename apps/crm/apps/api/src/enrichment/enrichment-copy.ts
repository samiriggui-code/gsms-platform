import { MAX_ATTEMPTS, type TaskKind } from "@crm/db/agent-tasks";

export type EnrichmentQueueState = "running" | "queued" | "failed";

const STEPS = {
	brand: "Récupération du logo",
	portrait: "Recherche de la photo",
	"meeting-prep": "Préparation de votre rendez-vous",
	identify: "Lecture du profil",
	profile: "Lecture du profil",
	recheck: "Recherche de nouveautés",
	"company-profile": "Lecture du site de la société",
	"workspace-profile": "Lecture de votre site web",
	"field-backfill": "Complétion des champs vides",
	"slack-people-match": "Association des personnes dans Slack",
	"slack-channel-join": "Ajout à un canal Slack",
	"agent-event": "Réaction à un changement",
} satisfies Record<TaskKind, string>;

const STEP_BY_KIND = new Map<string, string>(Object.entries(STEPS));

const UNKNOWN_STEP = "Recherche en cours";
const WAITING = "En attente";
const GAVE_UP = "Recherche impossible";

const SECOND_MS = 1_000;
const DAY_MS = 24 * 60 * 60 * SECOND_MS;
const DAYS_IN_WEEK = 7;
const DAYS_IN_MONTH = 30;
const WEEKS_FROM = 14;
const MONTHS_FROM = 60;

const TODAY = "Plus tard aujourd’hui";
const TOMORROW = "Demain";

export function enrichmentStep(kind: string): string {
	return STEP_BY_KIND.get(kind) ?? UNKNOWN_STEP;
}

export function enrichmentQueueState(
	attempts: number,
	leasedUntil: Date | null,
	now: Date,
): EnrichmentQueueState {
	if (leasedUntil !== null && leasedUntil.getTime() > now.getTime()) {
		return "running";
	}

	return attempts >= MAX_ATTEMPTS ? "failed" : "queued";
}

export function enrichmentQueueLine(
	state: EnrichmentQueueState,
	kind: string,
): string {
	if (state === "queued") return WAITING;
	if (state === "failed") return GAVE_UP;

	return enrichmentStep(kind);
}

export function enrichmentDueLabel(dueAt: Date, now: Date): string {
	const ahead = dueAt.getTime() - now.getTime();
	if (ahead < DAY_MS) return TODAY;

	const days = Math.floor(ahead / DAY_MS);
	if (days === 1) return TOMORROW;
	if (days < WEEKS_FROM) return `Dans ${days} jours`;
	if (days < MONTHS_FROM)
		return `Dans ${Math.round(days / DAYS_IN_WEEK)} semaines`;

	return `Dans ${Math.round(days / DAYS_IN_MONTH)} mois`;
}
