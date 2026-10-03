-- GSMS : pont CRM ↔ Core. Lien vers la prestation ouverte dans le portail GSMS quand l'affaire est gagnée,
-- et avancement du dossier de réponse d'un appel d'offres (mis à jour par le Core). Idempotent.
INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_deal_prestation_gsms','DEAL','prestation_gsms','Prestation GSMS','URL',false,NULL,false,true,false,false,20,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_deal_statut_dossier_ao','DEAL','statut_dossier_ao','Statut dossier AO','SELECT',false,NULL,false,true,true,true,21,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;
INSERT INTO "fieldOption" ("id","fieldId","label","position")
SELECT v.* FROM (VALUES
  ('gsms_deal_statut_dossier_ao_0','gsms_deal_statut_dossier_ao','Dossier en préparation',0),
  ('gsms_deal_statut_dossier_ao_1','gsms_deal_statut_dossier_ao','Déposé',1),
  ('gsms_deal_statut_dossier_ao_2','gsms_deal_statut_dossier_ao','Attribué',2),
  ('gsms_deal_statut_dossier_ao_3','gsms_deal_statut_dossier_ao','Non retenu',3)
) AS v("id","fieldId","label","position")
WHERE EXISTS (SELECT 1 FROM "fieldDefinition" WHERE "id" = 'gsms_deal_statut_dossier_ao')
ON CONFLICT ("id") DO NOTHING;
