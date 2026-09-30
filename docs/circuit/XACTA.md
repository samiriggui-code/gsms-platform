# Xacta GRC — fiche potentiel

**Date :** 2026-09-03  
**Clone :** `apps/xacta` ← https://github.com/xactasolutionsai/grc.git  
**Licence :** AGPL-3.0 (hors `enterprise/` commercial intuitem) — fork de CISO Assistant  

**Installé NUC (2026-09-03) :** oui · `/opt/xacta` · stack Docker `AI_ENABLED=False`  
**État 2026-09-04 soir :** **PURGÉ** — `docker compose down -v`, images `xacta-*` supprimées, `/opt/xacta` effacé. Plus de UI `:3000` ni API `:8000`.  
**UI lab (quand UP) :** http://192.168.1.37:3000  
**API (quand UP) :** http://192.168.1.37:8000/api  
**Login :** `admin@xacta.local` / `XactaDemo123!`  
**HTTPS Caddy :8443 :** désactivé en lab (Schannel Windows refuse TLS interne sur IP)  
**CSRF lab :** `ORIGIN=http://192.168.1.37:3000` sur le frontend (accès direct sans Caddy ; sinon « Cross-site POST form submissions are forbidden »)  
**Vitrine UX (2026-09-03) :** skin tokens `ciso-theme.css` (ink + teal) · login split · AppBar/sidebar sobres — **pas** de masquage modules / **pas** de changement métier. Sources : `apps/xacta/frontend` (sync NUC).

Circuit : [`CIRCUIT-PRECOM-ERP.md`](./CIRCUIT-PRECOM-ERP.md) · contrat [`contracts/precom-handoff.schema.json`](./contracts/precom-handoff.schema.json)

---

## Rôle GSMS

**Mission cabinet** : univers d’audit, plan, engagement, workpapers, revue, clôture.

Pas le walkthrough site (Grace) ni le CAPA formel (QAtrial).

---

## Stack NUC

| Conteneur | Port hôte |
|-----------|-----------|
| `xacta-frontend` | **3000** |
| `xacta-backend` | **8000** |
| `xacta-huey` | interne |
| `xacta-caddy` | profile `tls` (off) |

```bash
ssh jarvis-nuc
cd /opt/xacta
AI_ENABLED=False docker compose up -d
AI_ENABLED=False docker compose down
```

Objets utiles (code lu) :

| Objet | Fichier | Usage GSMS |
|-------|---------|------------|
| `AuditEntity` | `backend/audits/models.py` | Univers (site / process / domaine) |
| `AuditPlan` | idem | Programme annuel |
| `AuditEngagement` | idem | 1 engagement ≈ 1 `Assessment` Grace |
| `Workpaper` | `backend/workpapers/models.py` | Dossier mission |
| `Finding` / `AppliedControl` | `backend/core/models.py` | Overlap Grace — ne pas y coller Physsec/ERP |

---

## Verdict

Utile comme **enveloppe mission**. Déployé lab NUC (HTTP). Ne pas y importer `site-surete`.
