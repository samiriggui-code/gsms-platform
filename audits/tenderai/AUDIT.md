# Audit — TenderAI MCP Server Max (`apps/tenderai-mcp-server-max`)

**Date :** 2026-10-02 · **Décision V2 :** KEEP (service MCP « répondre aux AO ») + ADAPT léger · interface dans `apps/web /app/tenders` via le Core

## Identité
- **Origine :** `github.com/dbugom/tenderai-mcp-server-max` @ `772335c`. Prédécesseur `dbugom/tenderai-mcp-server` (legacy, rollback NUC). Contexte d'origine : Oman (OMR, `tender.yfi.ae`).
- **Licence :** ⚠ **AUCUN fichier LICENSE** → tous droits réservés par défaut. Ni copie dans le Core, ni redistribution, tant que l'auteur n'a pas clarifié.
- **Stack :** Python 3.12, FastMCP v1 (`mcp[cli]>=1.9,<2`), anthropic, aiosqlite + sqlite-vec, voyageai (optionnel), pdfplumber, python-docx, openpyxl.
- **Transport :** stdio ou streamable-http `/mcp` (`:8090` en déploiement), Bearer `MCP_API_KEY` ou OAuth 2.1 (inutilisé chez GSMS).

## Données (source de vérité)
- **Base :** SQLite `db/tenderai.db` (WAL) :
  - `rfp` (requirements / criteria / sections en JSON, deadline, statut) ;
  - `proposal`, `vendor`, `bom`, `partner`, `partner_deliverable`, `past_proposal_index` ;
  - FTS5 + vec0 ;
  - tables OAuth.
- **Fichiers :** `data/{rfp_documents, past_proposals, vendor_quotes, knowledge_base, generated_proposals}`.

## Outils MCP (18 dans le repo)
- **Document :** `parse_tender_rfp`, `generate_compliance_matrix`, `check_submission_deadline`, `validate_document_completeness`.
- **Technique :** `write_technical_section`, `build_full_technical_proposal`, `generate_architecture_description`, `write_compliance_narrative`.
- **Financier :** `ingest_vendor_quote`, `build_bom`, `calculate_final_pricing`, `generate_financial_proposal`.
- **Partenaires :** `draft_partner_brief`, `create_nda_checklist`, `track_partner_deliverable`.
- **Indexation :** `index_past_proposal`, `search_past_proposals` (FTS / vecteur / RRF), `list_indexed_proposals`.
- **Ressources :** `proposals://`, `templates://`, `vendors://`, `company://`, `standards://` (vide).
- **Prompts :** `analyze_new_tender` (seul Go / No-Go, texte libre non persisté), `write_executive_summary`, `partner_suitability_check`, `full_proposal_workflow`.

## Écarts critiques
1. **Repo en retard sur la prod NUC :** `save_proposal_index`, `get_proposal_details` et le mode « data-tool sans clé LLM » (20 tools en prod) **absents ici**. Ce code n'est pas canonique tant que les patches ne sont pas reportés (voir `docs/ops/TENDERAI_MAX_MIGRATION.md`, `scripts/nuc/patch-tenderai-max-gsms.sh`).
2. **`generate_compliance_matrix` :** statut **`"Compliant"` codé en dur** (`document.py`). Faux par construction ; à corriger avant toute exposition UI.
3. **Rien de français :** pas de DCE / RC / CCTP / CCAP / BPU / DPGF, pas de BOAMP. Ce découpage est fait par le Document Engine du Core.
4. **Fichiers locaux :** `parse_tender_rfp` exige un chemin présent sur l'hôte MCP, et les livrables sont des chemins locaux. Aucun endpoint d'upload ni de téléchargement.
5. **Aucun test.**

## Actions V2
1. Reporter les patches NUC dans le repo ; ne déployer que depuis le repo.
2. Patch : accepter `file_url` (URL présignée MinIO du Core) ; renvoyer les livrables en flux / base64 ou les pousser au Core.
3. Corriger le statut de la matrice (évaluation réelle ou `to_review`) ; sortie JSON utilisée par le Core.
4. Mode data-tool par défaut : Eve rédige, TenderAI structure et génère les fichiers.
5. Retirer OAuth / nginx inutiles ; garder Bearer de service derrière la passerelle MCP du Core.
6. **Licence :** contacter dbugom ; à défaut, préparer un `core/tenders` réimplémenté.
7. Tests de fumée MCP en CI (`initialize`, `tools/list`, appel `check_submission_deadline`).
