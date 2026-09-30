import {
  upsertCyberResponse,
  listCyberResponses,
  cyberStatusToFindingStatus,
} from '../src/modules/circuit/cyber-store.ts';

const row = await upsertCyberResponse({
  catalogSlug: 'iso27001-2022',
  controlIdentifier: 'A.5.1',
  controlName: 'Policies for information security',
  status: 'non_conforme',
  notes: 'smoke local',
});

const list = await listCyberResponses({ catalogSlug: 'iso27001-2022' });
const hit = list.find((r) => r.controlIdentifier === 'A.5.1');
if (!hit) throw new Error('missing response');
if (cyberStatusToFindingStatus(hit.status) !== 'non_conforme') {
  throw new Error('status map');
}

console.log('cyber-store smoke OK', {
  id: hit.id.slice(0, 8),
  status: hit.status,
  n: list.length,
  upsertId: row.id.slice(0, 8),
});
