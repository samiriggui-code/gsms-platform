import { db } from "@crm/db";
import {
	forwardToGsmsCore,
	type GsmsCoreRecord,
	gsmsCoreConfig,
} from "../agent/lib/gsms-core";

if (!gsmsCoreConfig()) {
	console.error(
		"GSMS_CORE_URL et GSMS_CORE_WEBHOOK_SECRET sont requis (fichier .env du CRM).",
	);
	process.exit(1);
}

const live = { archivedAt: null };
const records: GsmsCoreRecord[] = [
	...(await db.company.findMany({ where: live, select: { id: true } })).map(
		({ id }) => ({ kind: "company" as const, id }),
	),
	...(
		await db.contact.findMany({
			where: { ...live, companyId: { not: null } },
			select: { id: true },
		})
	).map(({ id }) => ({ kind: "contact" as const, id })),
	...(await db.deal.findMany({ where: live, select: { id: true } })).map(
		({ id }) => ({ kind: "deal" as const, id }),
	),
];

let sent = 0;
let opened = 0;
const failures: string[] = [];

for (const record of records) {
	const outcome = await forwardToGsmsCore({
		type: `${record.kind}.synced`,
		record,
	});
	if (outcome.outcome === "sent") {
		sent += 1;
		if (outcome.workspace?.created) opened += 1;
	} else if (outcome.outcome === "failed") {
		failures.push(`${record.kind} ${record.id} : ${outcome.reason}`);
	}
}

console.log(
	`GSMS Core : ${sent}/${records.length} enregistrements synchronisés, ${opened} prestation(s) ouverte(s).`,
);
for (const failure of failures) console.error(`Échec — ${failure}`);

await db.$disconnect();
process.exit(failures.length > 0 ? 1 : 0);
