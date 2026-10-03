const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;

export const AGENT_DISPATCH = {
	poke: { timeoutMs: 2 * SECOND_MS },
	heartbeat: { everyMs: MINUTE_MS },
	cancel: {
		errorCode: "CANCELLED_BY_USER",
		message: "Un membre de l’espace de travail a arrêté cette exécution.",
		redeliverWithinMs: 10 * MINUTE_MS,
		redeliverBatch: 20,
	},
	fieldBackfill: { concurrency: 8 },
} as const;
