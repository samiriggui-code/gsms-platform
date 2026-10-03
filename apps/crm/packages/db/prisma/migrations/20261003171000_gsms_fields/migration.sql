-- GSMS : champs métier des sociétés et des affaires, créés aussi en production (auparavant seulement par le seed).
-- Idempotent : un champ déjà présent (même entité, même clé) n'est pas modifié, ses options non plus.

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_company_statut_commercial','COMPANY','statut_commercial','Statut commercial','SELECT',false,NULL,false,true,true,true,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;
INSERT INTO "fieldOption" ("id","fieldId","label","position")
SELECT v.* FROM (VALUES
  ('gsms_company_statut_commercial_0','gsms_company_statut_commercial','Prospect',0),
  ('gsms_company_statut_commercial_1','gsms_company_statut_commercial','Client',1),
  ('gsms_company_statut_commercial_2','gsms_company_statut_commercial','Ancien client',2),
  ('gsms_company_statut_commercial_3','gsms_company_statut_commercial','Partenaire',3),
  ('gsms_company_statut_commercial_4','gsms_company_statut_commercial','Fournisseur',4)
) AS v("id","fieldId","label","position")
WHERE EXISTS (SELECT 1 FROM "fieldDefinition" WHERE "id" = 'gsms_company_statut_commercial')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_company_type_d_tablissement','COMPANY','type_d_tablissement','Type d''établissement','SELECT',true,'Classe l''établissement principal du client selon la réglementation incendie : ERP (reçoit du public), IGH (immeuble de grande hauteur), ICPE, habitation, bureaux soumis au Code du travail, industrie / logistique, santé / médico-social, ou société de sécurité privée (client prestataire). Déduis-le de son activité et de son site ; laisse vide si incertain.',false,true,true,true,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;
INSERT INTO "fieldOption" ("id","fieldId","label","position")
SELECT v.* FROM (VALUES
  ('gsms_company_type_d_tablissement_0','gsms_company_type_d_tablissement','ERP',0),
  ('gsms_company_type_d_tablissement_1','gsms_company_type_d_tablissement','IGH',1),
  ('gsms_company_type_d_tablissement_2','gsms_company_type_d_tablissement','ERP + IGH',2),
  ('gsms_company_type_d_tablissement_3','gsms_company_type_d_tablissement','ICPE',3),
  ('gsms_company_type_d_tablissement_4','gsms_company_type_d_tablissement','Habitation',4),
  ('gsms_company_type_d_tablissement_5','gsms_company_type_d_tablissement','Bureaux / tertiaire (Code du travail)',5),
  ('gsms_company_type_d_tablissement_6','gsms_company_type_d_tablissement','Industrie / logistique',6),
  ('gsms_company_type_d_tablissement_7','gsms_company_type_d_tablissement','Santé / médico-social',7),
  ('gsms_company_type_d_tablissement_8','gsms_company_type_d_tablissement','Société de sécurité privée',8)
) AS v("id","fieldId","label","position")
WHERE EXISTS (SELECT 1 FROM "fieldDefinition" WHERE "id" = 'gsms_company_type_d_tablissement')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_company_cat_gorie_erp','COMPANY','cat_gorie_erp','Catégorie ERP','SELECT',true,'Seulement pour un ERP : catégorie selon l''effectif accueilli (public + personnel). Ne la renseigne que si elle est indiquée ou déductible avec certitude.',false,true,false,true,2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;
INSERT INTO "fieldOption" ("id","fieldId","label","position")
SELECT v.* FROM (VALUES
  ('gsms_company_cat_gorie_erp_0','gsms_company_cat_gorie_erp','1re catégorie (plus de 1 500 personnes)',0),
  ('gsms_company_cat_gorie_erp_1','gsms_company_cat_gorie_erp','2e catégorie (701 à 1 500)',1),
  ('gsms_company_cat_gorie_erp_2','gsms_company_cat_gorie_erp','3e catégorie (301 à 700)',2),
  ('gsms_company_cat_gorie_erp_3','gsms_company_cat_gorie_erp','4e catégorie (300 et moins)',3),
  ('gsms_company_cat_gorie_erp_4','gsms_company_cat_gorie_erp','5e catégorie (petit établissement)',4)
) AS v("id","fieldId","label","position")
WHERE EXISTS (SELECT 1 FROM "fieldDefinition" WHERE "id" = 'gsms_company_cat_gorie_erp')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_company_types_dactivit_erp','COMPANY','types_dactivit_erp','Types d''activité ERP','TEXT',true,'Lettres du ou des types d''activité ERP (ex. M magasins, N restaurants, L salles, O hôtels, R enseignement, U santé, J structures d''accueil, W bureaux recevant du public, X sport, P danse/jeux, S bibliothèques, T expositions, V culte, Y musées), séparées par des virgules.',false,true,false,false,3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_company_effectif_accueilli','COMPANY','effectif_accueilli','Effectif accueilli','NUMBER',false,NULL,false,true,false,false,4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_company_prochaine_commission_de_s_curit','COMPANY','prochaine_commission_de_s_curit','Prochaine commission de sécurité','DATE',false,NULL,false,true,true,true,5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_company_siret','COMPANY','siret','SIRET','TEXT',true,'Numéro SIRET à 14 chiffres du siège ou de l''établissement principal, s''il est publié (site, mentions légales, annuaires officiels).',false,true,false,false,6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_company_nombre_de_sites','COMPANY','nombre_de_sites','Nombre de sites','NUMBER',false,NULL,false,true,false,false,7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_deal_type_de_mission','DEAL','type_de_mission','Type de mission','SELECT',true,'Lis le bloc [GSMS_INTAKE] dans la description du deal ou dans la note d''activité créée à sa réception. Chaque ligne est au format clé: valeur — reprends la valeur de la clé correspondante.',false,true,true,true,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;
INSERT INTO "fieldOption" ("id","fieldId","label","position")
SELECT v.* FROM (VALUES
  ('gsms_deal_type_de_mission_0','gsms_deal_type_de_mission','audit',0),
  ('gsms_deal_type_de_mission_1','gsms_deal_type_de_mission','appel-offres',1),
  ('gsms_deal_type_de_mission_2','gsms_deal_type_de_mission','commission-securite',2),
  ('gsms_deal_type_de_mission_3','gsms_deal_type_de_mission','accompagnement',3),
  ('gsms_deal_type_de_mission_4','gsms_deal_type_de_mission','conformite',4),
  ('gsms_deal_type_de_mission_5','gsms_deal_type_de_mission','contact',5)
) AS v("id","fieldId","label","position")
WHERE EXISTS (SELECT 1 FROM "fieldDefinition" WHERE "id" = 'gsms_deal_type_de_mission')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_deal_type_d_tablissement','DEAL','type_d_tablissement','Type d''établissement','SELECT',true,'Lis le bloc [GSMS_INTAKE] dans la description du deal ou dans la note d''activité créée à sa réception. Chaque ligne est au format clé: valeur — reprends la valeur de la clé correspondante.',false,true,false,true,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;
INSERT INTO "fieldOption" ("id","fieldId","label","position")
SELECT v.* FROM (VALUES
  ('gsms_deal_type_d_tablissement_0','gsms_deal_type_d_tablissement','Établissement recevant du public',0),
  ('gsms_deal_type_d_tablissement_1','gsms_deal_type_d_tablissement','Santé et accueil spécialisé',1),
  ('gsms_deal_type_d_tablissement_2','gsms_deal_type_d_tablissement','Tertiaire, industrie et logistique',2),
  ('gsms_deal_type_d_tablissement_3','gsms_deal_type_d_tablissement','Société de sécurité privée',3)
) AS v("id","fieldId","label","position")
WHERE EXISTS (SELECT 1 FROM "fieldDefinition" WHERE "id" = 'gsms_deal_type_d_tablissement')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_deal_ch_ance_commission','DEAL','ch_ance_commission','Échéance commission','DATE',true,'Lis le bloc [GSMS_INTAKE] dans la description du deal ou dans la note d''activité créée à sa réception. Chaque ligne est au format clé: valeur — reprends la valeur de la clé correspondante.',false,true,true,false,2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_deal_r_f_rence_ao','DEAL','r_f_rence_ao','Référence AO','TEXT',true,'Lis le bloc [GSMS_INTAKE] dans la description du deal ou dans la note d''activité créée à sa réception. Chaque ligne est au format clé: valeur — reprends la valeur de la clé correspondante.',false,true,false,false,3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;

INSERT INTO "fieldDefinition" ("id","entity","key","label","type","agentFilled","agentBrief","required","showOnSheet","showOnTable","showOnFilter","position","createdAt","updatedAt")
VALUES ('gsms_deal_date_limite_de_remise_des_offres','DEAL','date_limite_de_remise_des_offres','Date limite de remise des offres','DATE',true,'Pour un appel d''offres : date et heure limites de remise des offres indiquées dans le règlement de consultation (RC).',false,true,true,false,4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("entity","key") DO NOTHING;
