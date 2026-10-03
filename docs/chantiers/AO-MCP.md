# Chantier AO-MCP — texte de référence (fourni par Samir, conservé tel quel)

> Ce document est la commande d'origine. Ne pas le modifier ; l'audit et le plan sont dans
> [`AO-MCP-AUDIT.md`](./AO-MCP-AUDIT.md).

CHANTIER GSMS — MCP APPEL D'OFFRES / DOSSIER DE RÉPONSE

Objectif : Construire autour du MCP Appel d'Offres un vrai moteur de traitement complet d'un DCE, depuis l'ingestion documentaire jusqu'à la production contrôlée du dossier de réponse. Le MCP ne doit pas être seulement une collection d'outils techniques sans interface métier. Il doit devenir un moteur opératoire GSMS, appelé par le GSMS Core, capable de travailler avec : DocuLens, GSMS Core, GRACE, QATrial, CRM Camp AI / Eve, moteur Python de chiffrage / production, stockage documentaire, workflow de validation. Le chantier initial se concentre UNIQUEMENT sur les APPELS D'OFFRES.

1. ENTRÉE : DCE COMPLET — Le système doit accepter : RC, CCTP, CCAP, AE, BPU, DPGF, DQE, annexes, plans, documents administratifs, pièces techniques, éventuels documents Word / Excel / PDF / scans. Le dossier entre dans DocuLens. DocuLens : ingère, extrait, OCR si besoin, classifie, structure, indexe, garde les sources / pages / tableaux / cellules, rattache chaque document au workspace_id GSMS.

2. DIGEST / EXTRACTION MÉTIER — À partir du DCE, le Core doit produire un Digest métier structuré. Exemples : exigences obligatoires, critères d'attribution, pondérations, délais, échéances, contraintes techniques, contraintes humaines, qualifications requises, moyens matériels, horaires, nombre de postes, nombre d'agents, sites, variantes, options, pénalités, obligations contractuelles, pièces à produire, attestations demandées, mémoire technique demandé, trames imposées, BPU / DPGF / DQE à compléter, clauses sociales, clauses environnementales, sécurité / sûreté, SSIAP, CNAPS, plan de prévention, sous-traitance, reprise du personnel, convention collective, délais de mobilisation. Chaque information doit conserver sa provenance exacte : document, page, section, tableau, cellule, ligne.

3. ANALYSE DE FAISABILITÉ — Le moteur doit produire un GO / NO-GO documenté. Mais ne pas faire un simple score opaque. Créer une matrice : capacité humaine, capacité réglementaire, capacité technique, capacité financière, capacité documentaire, délai, certifications, moyens, risques, dépendances, informations manquantes. Sortie : READY / WARNING / BLOCKED avec justification et sources.

4. MOTEUR PYTHON DE PRODUCTION — Créer un moteur Python dédié aux documents chiffrés et calculs. Il doit notamment gérer : BPU, DPGF, DQE, sous-détails de prix, effectifs, heures, vacations, cycles, majorations, dimanches, nuits, jours fériés, heures supplémentaires, encadrement, matériel, tenues, véhicules, consommables, frais, coûts directs, coûts indirects, marge, prix de vente. Le moteur doit être déterministe. Les calculs financiers ne doivent PAS être confiés directement à un LLM. Le LLM peut : expliquer, proposer, détecter des incohérences. Mais : prix, quantités, totaux, formules, marges, coûts = Python.

5. BPU / DPGF / DQE — Le moteur doit pouvoir : lire les modèles Excel reçus, conserver leur structure, identifier les cellules à remplir, compléter les quantités, compléter les prix, recalculer les totaux, vérifier les formules, détecter incohérences, ne jamais écraser les cellules non prévues, produire une version de travail, produire une version finale validée. Toujours conserver : source, version, date, auteur / moteur, état, validation.

6. MÉMOIRE TECHNIQUE — Le MCP doit pouvoir préparer un mémoire technique structuré à partir des exigences du DCE. Sections possibles : compréhension du besoin, organisation, méthodologie, gouvernance, moyens humains, encadrement, recrutement, formation, continuité de service, remplacement, contrôle, rondes, supervision, matériel, outils, reporting, qualité, sécurité, sûreté, SSI, RSE, gestion des incidents, plan de progrès, démarrage, reprise de personnel, mobilisation. Mais aucune section ne doit être inventée inutilement. Le contenu doit être directement relié aux exigences du DCE.

7. GRACE — GRACE apporte les éléments métier sécurité / sûreté : analyse des risques, sécurité incendie, sûreté, contraintes site, vulnérabilités, mesures de prévention, recommandations, organisation sécurité, plan de prévention, observations réglementaires, prescriptions, risques opérationnels. GRACE ne doit pas produire tout le dossier d'appel d'offres. Il agit comme expert spécialisé appelé par le Core / MCP.

8. QATRIAL — QATrial intervient comme moteur de contrôle qualité / conformité. Il vérifie notamment : couverture des exigences, présence des preuves, conformité des livrables, cohérence documentaire, pièces manquantes, exigences non traitées, contradictions, versions, checklist finale, CAPA si anomalie grave. QATrial ne remplace pas le MCP. Il contrôle le résultat.

9. PLAN DE PRÉVENTION — Le plan de prévention doit pouvoir être préparé à partir de : informations du site, CCTP, contraintes sécurité, risques détectés, obligations contractuelles, informations fournies par GRACE, données client, contraintes opérationnelles. Le moteur Python / templates doit produire le squelette structuré. GRACE peut enrichir la partie risques / mesures. QATrial peut contrôler la complétude.

10. MCP = ORCHESTRATEUR MÉTIER AO — Le MCP doit exposer ses outils au Core. Même s'il possède déjà environ 18 outils, ils doivent être regroupés logiquement. Exemple : workspace, document, requirements, compliance, pricing, staffing, memory, prevention, quality, export. Le MCP doit pouvoir enchaîner : 1. charger workspace 2. récupérer Digest 3. analyser exigences 4. créer matrice de conformité 5. lancer dimensionnement 6. produire BPU 7. produire DPGF 8. produire DQE 9. demander éléments GRACE 10. préparer mémoire technique 11. demander contrôle QATrial 12. corriger anomalies 13. vérifier pièces 14. produire checklist 15. assembler package final 16. statut READY / WARNING / BLOCKED.

11. MATRICE DE CONFORMITÉ — Construire une matrice centrale : Requirement ID, Source, Exigence, Type, Obligatoire, Réponse prévue, Preuve, Document cible, Responsable, Statut. Statuts : TODO, IN_PROGRESS, COVERED, PARTIAL, BLOCKED, NOT_APPLICABLE. Cette matrice doit être la colonne vertébrale du dossier.

12. CHECKLIST FINALE — Avant export : toutes les pièces demandées présentes, toutes les exigences obligatoires couvertes, BPU cohérent, DPGF cohérente, DQE cohérent, totaux contrôlés, mémoire complet, attestations présentes, signatures prévues, dates cohérentes, noms société cohérents, pagination, nommage fichiers, formats demandés, taille fichiers, pièces non demandées retirées si nécessaire, contradictions détectées, anomalies résolues.

13. PACKAGE FINAL — Le système doit pouvoir produire : Dossier final/ ├── Administratif/ ├── Technique/ ├── Financier/ ├── Annexes/ └── Checklist/ avec : fichiers originaux, fichiers générés, versions, hashes, provenance, journal de production. Sorties possibles : ZIP, PDF, DOCX, XLSX.

14. CRM CAMP AI / EVE — Eve reste dans le circuit. Le CRM gère : client, contact, opportunité, interlocuteurs, relances, rendez-vous, tâches, échéances, historique, next best action. Exemple : opportunité CRM → workspace Core → DCE → DocuLens → Digest → MCP AO → production → QATrial → validation → Eve suit dépôt / relance / résultat.

15. WORKSPACE UNIQUE — Un seul identifiant transverse : workspace_id, partagé par GSMS Core, DocuLens, MCP AO, GRACE, QATrial, CRM Eve. Exemple : WS-AO-2026-0042. Toute pièce / action / rapport / calcul / événement doit pouvoir être rattaché à ce workspace.

16. LE CORE ORCHESTRE — Le Core ne produit pas lui-même les BPU. Il orchestre. Exemple : Digest détecte AO, CCTP, BPU, DPGF, exigence SSIAP, plan de prévention demandé. Le Core décide : → MCP AO → Pricing Engine → GRACE → QATrial. Puis collecte les résultats.

17. CIRCUIT CIBLE — CRM Eve → Opportunité → GSMS Core → Workspace → DocuLens → DCE → Digest → Requirements Matrix → GO / NO-GO → MCP AO (Pricing Engine, Staffing Engine, BPU, DPGF, DQE, Mémoire, Plan prévention, Annexes) → GRACE → QATrial → Final Compliance Check → Package final → Dépôt → Suivi Eve.

18. INTERFACE MCP — Le MCP n'ayant pas encore d'interface dédiée, ne créer PAS une application séparée juste pour lui. Le frontend Next.js de GSMS doit exposer une interface métier. Exemple pages : /app/tenders, /app/tenders/{workspace_id}, /app/tenders/{workspace_id}/requirements, /app/tenders/{workspace_id}/pricing, /app/tenders/{workspace_id}/documents, /app/tenders/{workspace_id}/quality. L'utilisateur ne doit pas voir "outil MCP #12". Il doit voir : Analyse du DCE, Exigences, Chiffrage, Mémoire, Documents, Contrôles, Dossier final.

19. VALIDATION HUMAINE — Aucun dossier ne doit être déposé automatiquement sans validation humaine. Prévoir : DRAFT, REVIEW, READY, APPROVED, SUBMITTED. Le système prépare et contrôle. L'utilisateur valide.

20. AUDIT DE L'EXISTANT AVANT MODIFICATION — Avant d'implémenter, auditer : MCP existant, liste réelle de ses outils, Core, DocuLens, GRACE, QATrial, CRM Eve, modèles DB, endpoints, workflows, EventBus, fichiers Excel déjà gérés, génération documentaire existante. Ne pas réécrire ce qui existe déjà. Produire : 1. inventaire 2. gaps 3. architecture cible 4. mapping outil existant → capacité cible 5. fichiers à modifier 6. nouveaux modules minimaux 7. tests 8. ordre d'implémentation.

21. PRIORITÉ — On commence uniquement par le circuit Appel d'Offres. Pas de refonte complète de la plateforme. Pas de chantier commission/audit en parallèle. L'objectif immédiat est : DCE → Digest → exigences → GO/NO-GO → BPU/DPGF/DQE → mémoire → éléments GRACE → contrôle QATrial → dossier final.
