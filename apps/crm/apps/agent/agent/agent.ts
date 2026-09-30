import "@crm/env/load";

import { onTelemetryProblem, syncVersion } from "@crm/telemetry";
import { type AgentDefinition, defineAgent, defineDynamic } from "eve";
import { logCapabilities } from "./lib/capabilities";
import { defaultModel, selectedModel } from "./lib/model";

void logCapabilities();

onTelemetryProblem((message) => console.debug(`[telemetry] ${message}`));

void syncVersion();

const agent: AgentDefinition = defineAgent({
	model: defineDynamic({
		fallback: defaultModel(),
		events: { "session.started": () => selectedModel() },
	}),
	limits: {
		maxInputTokensPerSession: 500_000,
		maxOutputTokensPerSession: 50_000,
		sessionTimeoutMs: 30 * 24 * 60 * 60 * 1000,
	},
});

export default agent;
