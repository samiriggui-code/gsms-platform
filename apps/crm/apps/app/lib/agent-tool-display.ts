import {
	type EveToolFields,
	type EveToolInput,
	eveToolText,
} from "@crm/validation/eve-tool";
import { createTranslator } from "next-intl";
import enAgents from "../messages/en/agents.json";

export const TOOL_LABEL_NAMESPACE = "agentsToolLabels";

export type ToolLabelTranslate = (
	key: string,
	values: Record<string, string>,
) => string;

const englishTranslator = createTranslator({
	locale: "en",
	messages: enAgents,
	namespace: TOOL_LABEL_NAMESPACE,
});

const englishTranslate: ToolLabelTranslate = (key, values) =>
	englishTranslator(key as Parameters<typeof englishTranslator>[0], values);

type ArtifactNames = Record<string, string>;

const ARTIFACT_NAMES: ArtifactNames = {
	"agent/instructions.md": "instructions",
	"agent/manifest.json": "manifest",
	"agent/README.md": "readme",
};

type LabelInput = {
	tool: string;
	input: EveToolInput;
	label: string;
	pending: boolean;
};

type ToolInputLabel = (
	input: EveToolFields,
	pending: boolean,
	translate: ToolLabelTranslate,
) => string | null;

type ToolInputLabels = Record<string, ToolInputLabel>;

const INPUT_LABELS: ToolInputLabels = {
	write_agent_file: (input, pending, translate) => {
		const path = eveToolText.parse(input.path);
		if (!path) return null;
		return translate(pending ? "writingFile" : "wroteFile", {
			artifact: ARTIFACT_NAMES[path] ?? "other",
			path,
		});
	},
	save_agent_draft: (input, pending, translate) => {
		const name = eveToolText.parse(input.name).trim();
		const verb = translate(pending ? "savingDraft" : "savedDraft", {});
		return name ? `${verb} · ${name}` : verb;
	},
	set_chat_title: (input, pending, translate) => {
		const title = eveToolText.parse(input.title).trim();
		const verb = translate(pending ? "namingChat" : "namedChat", {});
		return title ? `${verb} · ${title}` : verb;
	},
};

export function toolLabel(
	item: LabelInput,
	translate: ToolLabelTranslate = englishTranslate,
	fallback: string = item.label,
): string {
	const fromInput = item.input
		? INPUT_LABELS[item.tool]?.(item.input, item.pending, translate)
		: null;
	return fromInput ?? fallback;
}
