import { createTranslator } from "next-intl";
import enAgents from "../messages/en/agents.json";

export const RUN_FAILURE_NAMESPACE = "agentsRunFailure";

export type RunFailureTranslate = (key: string) => string;

const KNOWN_CODES = new Set([
	"ACTION_NOT_PERFORMED",
	"NO_EXECUTOR",
	"DEPENDENCY_UNAVAILABLE",
	"NOT_AUTHORISED",
	"PROVIDER_ERROR",
	"NEVER_SETTLED",
	"TURN_FAILED",
	"DELIVERY_FAILED",
	"DELIVERY_EXHAUSTED",
	"ACTION_REJECTED",
	"AGENT_UNAVAILABLE",
	"AGENT_DELETED",
	"CANCELLED_BY_USER",
	"RUN_TIMED_OUT",
]);

const englishTranslator = createTranslator({
	locale: "en",
	messages: enAgents,
	namespace: RUN_FAILURE_NAMESPACE,
});

const englishTranslate: RunFailureTranslate = (key) =>
	englishTranslator(key as Parameters<typeof englishTranslator>[0]);

export function runFailureReason(
	code: string | null | undefined,
	message: string | null | undefined,
	translate: RunFailureTranslate = englishTranslate,
): string {
	if (code && KNOWN_CODES.has(code)) return translate(`codes.${code}`);
	if (message?.trim()) return message.trim();
	return translate("unknown");
}
