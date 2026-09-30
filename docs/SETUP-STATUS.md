# Setup status — 2026-09-02

## Fait

- [x] Arborescence `gsms-platform/{apps,audits,docs}`
- [x] Clone `apps/grace`
- [x] Clone `apps/xacta`
- [x] Clone `apps/simplerisk`
- [x] Clone `apps/qatrial`
- [x] Clone local `apps/gsms-school` (depuis `C:\laragon\www\gsms-school`)
- [x] Docs lab (`README`, `VISION`, ce fichier)
- [x] Dossiers `audits/*` prêts (vides — à remplir après usage)
- [x] **GRACE local** : DB `csmp_v2`, migrations OK, seed Nordica partiel, API `:3011` + UI `:5173`

## URLs GRACE

| | URL |
|--|-----|
| **Local (lab)** | http://127.0.0.1:5173 |
| **Démo officielle** | https://demo.grace-ps.io/ |
| API locale | http://127.0.0.1:3011 |
| Swagger | http://127.0.0.1:3011/api/docs |

Login seed (si OK) : `admin@nordica.demo` / `Demo123!`  
Sinon : formulaire bootstrap premier admin au premier accès.

## Pas fait (volontaire)

- [ ] Audits écrits dans `audits/grace/`
- [x] Fiches lecture Xacta / SimpleRisk / QAtrial (`docs/circuit/`)
- [x] Pack `igh-precommission` P0 (seed + surveys, 2026-09-03)
- [x] Pack `sec-privee-cnaps` P0 + `entreprise-risques` P0 (2026-09-03)
- [ ] Pack `site-global` (orchestrateur — pas un dump)
- [ ] XACTA / SIMPLERISK / QATRIAL installés (docker)
- [ ] Toute connexion inter-apps
- [ ] Toute modification du GSMS de production (`www/gsms-school`)
