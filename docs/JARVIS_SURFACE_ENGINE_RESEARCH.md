# Jarvis — recherche Surface / Scene Engine (pas Generative UI)

**Date :** 2026-09-05  
**Statut :** recherche / pivot d’architecture — **pas** d’implémentation  
**Contexte :** grand écran Jarvis · agent local + cerveau serveur (cf. pattern Device Agent) · mémoire Tencent sur NUC

**Socle choisi (user) :** [jamesyong-42/infinite-canvas](https://github.com/jamesyong-42/infinite-canvas) — npm `@jamesyong42/infinite-canvas` · MIT · démo https://jamesyong-42.github.io/infinite-canvas/

**Fondation ECS :** [jamesyong-42/reactive-ecs](https://github.com/jamesyong-42/reactive-ecs) — npm `@jamesyong42/reactive-ecs` · zéro deps runtime · conçu pour UI React (pas bitECS/jeux).

**Clones locaux (lab laptop) :**
- `C:\laragon\www\infinite-canvas` — monorepo v1.6.0 (`packages/infinite-canvas` + `apps/playground`)
- `C:\laragon\www\reactive-ecs` — lib v0.17.0

Les autres pistes (Vibecanvas, layman, layout-engine) restent des **références de contrat / heuristiques**, pas le runtime.

---

## Couche 0 — reactive-ecs (la base)

**Rôle :** world d’état réactif. Pas de rendu, pas de canvas — uniquement :

| Primitive | API |
|-----------|-----|
| World | `createWorld()` |
| Data | `defineComponent` / `defineTag` / `defineResource` / `defineRelation` |
| Systems | `defineSystem` + `SystemScheduler` / `PhasedScheduler` |
| Tick | `tickWorld(world, fn)` → execute → emitFrame → clearDirty → incrementTick |
| React | `@jamesyong42/reactive-ecs/react` — `useSyncExternalStore` sur events |
| Devtools | inspector / timeline (optionnel) |

**Principes utiles Jarvis :**
1. Absence jamais silencieuse (`undefined` / throw)  
2. Données gérées **frozen** (identité stable → React ne re-render pas pour rien)  
3. Events = journal synchrone ; buffers = dirty depuis le dernier clear  
4. Conçu pour **UI**, pas pour 10k entités/frame de jeu  

**Taille locale :** ~4.2k LOC `src/` (hors tests).

**Attention versions :** le `package.json` d’infinite-canvas déclare `"@jamesyong42/reactive-ecs": "^0.3.0"` alors que le clone standalone est **0.17.0**. Pour un spike Jarvis : utiliser la dep npm résolue par le lockfile d’IC, ou linker en local après smoke de compat.

---

## Couche 1 — infinite-canvas (le runtime surface)

**Rôle :** applique reactive-ecs à une surface spatiale React/WebGL.

```
reactive-ecs (World + PhasedScheduler)
        ▲
        │ createWorld, defineSystem, EntityId, …
        │
LayoutEngine (createLayoutEngine)
  phases: input → react → control → simulate → derive → present → cleanup
  systems: card, transform, cull, breakpoint, nav, tween, …
  CommandBuffer (undo/redo)
  WidgetRegistry + Archetypes
        ▲
InfiniteCanvas (React)
  z0 WebGL chrome · z1 R3F · z2 DOM · z3 UI
```

**Structure clone :**

```
infinite-canvas/
  packages/infinite-canvas/src/   ~18k LOC
    ecs/     engine, systems, components, commands, spatial
    react/   InfiniteCanvas, hooks, widgets, input
    r3f/     compositor WebGL widgets
    webgl/   grid / selection SDF
    profiler/
  apps/playground/                démo cards iOS + 3D
```

**Node :** monorepo exige `node >= 24` · `pnpm@9.15`.

---

## Pivot

| Avant (piste faible) | Maintenant (piste forte) |
|----------------------|--------------------------|
| « Generative UI » | Scene / layout engine |
| LLM génère / choisit des widgets (JSX, CSS) | Surface = **état** ; agent envoie des **commandes** |
| Agentic UI framework | Surface orchestration + layout solver |

```
JARVIS AGENT
     │  commandes très simples (add / focus / move / …)
     ▼
JARVIS SURFACE ENGINE
  Scene State · Layout Solver · Focus · Transitions · Component Registry
     │
     ├── React (DOM widgets)
     ├── Three.js / R3F (spatial / média)
     └── Media
     ▼
GRAND ÉCRAN
```

**Règle d’or :** l’agent n’a jamais `setWidth()`, `setCSS()`, `position:absolute`, `grid-template…`.  
Il parle uniquement le vocabulaire surface.

---

## Lexique de recherche (à privilégier)

| Terme | Pourquoi |
|-------|----------|
| scene graph UI runtime React | hiérarchie de scènes = état |
| dynamic / adaptive / dock layout manager React | fenêtres, focus, auto-arrange |
| spatial UI React Three Fiber | grand écran + profondeur |
| infinite canvas React WebGL | surface libre, DOM + GL |
| surface orchestration UI | agents + humains sur la même API |
| UI scene state manager | source de vérité = scène, pas le DOM |

**À déprioriser :** « generative UI », frameworks qui demandent au LLM de dessiner l’interface.

---

## Ordre d’étude (canonique)

1. **infinite-canvas** — moteur de scène / surface  
2. **Vibecanvas** — API de commandes agent = utilisateur  
3. **react-layman** — auto-layout / focus / tabs  
4. **react-layout-engine** — contraintes layout-as-data  
5. **Ensuite seulement** — agent Jarvis par-dessus  

---

## 1. infinite-canvas — SOCLE JARVIS (retenu)

| | |
|--|--|
| Repo | https://github.com/jamesyong-42/infinite-canvas |
| npm | `@jamesyong42/infinite-canvas` (MIT) · peers React + optionnel `three` / `@react-three/fiber` |
| Démo | https://jamesyong-42.github.io/infinite-canvas/ |
| ECS | `@jamesyong42/reactive-ecs` |
| Monorepo | `packages/infinite-canvas` + `apps/playground` · pnpm |
| Cousin (plus tard) | [ICE / infinite-canvas-engine](https://github.com/jamesyong-42/infinite-canvas-engine) — CRDT, collab ; **pas** le premier spike |

### Pourquoi c’est le bon fit grand écran

| Besoin Jarvis | Ce que le repo livre |
|---------------|----------------------|
| Surface = état | World ECS + `serializeWorld` / `deserializeWorld` |
| Pas de CSS agent | `spawn` / `set` / tags — pas de grid CSS |
| DOM + 3D + média | layers z0 WebGL chrome · z1 R3F · z2 DOM · z3 UI |
| Zoom grand écran | breakpoints `micro→detailed` selon **taille écran du widget** |
| Tuiles dashboard | `createCardWidget` presets small/medium/large/xl |
| Focus / navigation | caméra `panTo` / `zoomToFit` + containers enter/exit |
| Undo | command buffer (1 drag = 1 undo) |
| Extensibilité | `defineSystem` / `defineComponent` sans toucher le rendu |

### Stack de rendu (à garder en tête)

```
z:0  WebGL — grille + sélection (SDF)
z:1  R3F   — widgets 3D (caméra sync)
z:2  DOM   — widgets React + hit overlays
z:3  UI    — chrome app (hors engine)
```

### Mapping commandes Jarvis → API engine

| `surface.*` (façade agent) | Appel engine |
|----------------------------|--------------|
| `add(kind, data?, at?)` | `engine.spawn(kind, { at, data })` ou `spawnAtCameraCenter` |
| `replace(id, data)` | `useUpdateWidget` / mutation `WidgetData` via `engine.set` |
| `move(id, at)` | `engine.set(id, Transform2D, { x, y })` |
| `focus(id)` | `engine.addTag(id, Selected)` + `zoomToFit([id])` / `panTo` |
| `hide(id)` | `engine.removeTag(id, Visible)` |
| `group` / nest | `parent` à spawn + `Children` / `Container` |
| `back()` | `engine.exitContainer()` (Escape dans le playground) |
| `undo` / `redo` | `engine.undo()` / `engine.redo()` |

**Couche à écrire nous-mêmes :** un petit `JarvisSurface` qui wrappe `LayoutEngine` et n’expose que ce vocabulaire fermé à l’agent. L’agent ne voit jamais `Transform2D` ni CSS.

### Ce qu’il n’est pas

- Pas une API agent prête — c’est le **moteur** ; Vibecanvas inspire le *contrat*, pas le runtime  
- Projet jeune (1★, ~131 commits) — OK pour lab NUC ; pin de version + spike avant dépendance « prod »  
- WebGL 2 obligatoire · SSR Next = `dynamic(..., { ssr: false })`

### Premier spike (fait 2026-09-05 — jarvis-os-linux)

Intégré dans `C:\laragon\www\jarvis-os-linux\hud` :

| Fichier | Rôle |
|---------|------|
| `hud/src/agentic/canvas/` | Façade + DomWidget + sync |
| `JarvisSurface.ts` | `add/focus/move/hide/replace/remove` |
| `agenticSlotWidget.tsx` | Un widget `agentic-slot` → registry agentic |
| `CanvasAgentSurface.tsx` | `<InfiniteCanvas>` synchronisé sur le document |
| `AgentSurface.tsx` | Branche canvas (défaut) ou grille (`?engine=grid`) |

**Smoke :** `http://127.0.0.1:5173/?surface=canvas-demo&engine=canvas` (HUD `npm run dev`).

**Dep :** `@jamesyong42/infinite-canvas@1.6.0` installé avec `--legacy-peer-deps` (R3F 8 HUD vs peer optional 9 — DOM-only OK).

4. Brancher l’agent en dernier : tools = commandes surface uniquement

---

## 2. Vibecanvas — piste #2 (commandes agent)

| | |
|--|--|
| Produit | https://vibecanvas.dev/ |
| Repos | https://github.com/omnidraw/vibecanvas · skills https://github.com/vibecanvas/skills |
| Idée clé | **Même surface CLI** pour humain et agent |

**Commandes canvas (skill agent)**

```
list | query | add | patch | move | group | ungroup | delete | reorder
```

Options utiles : `--json`, `--dry-run`, résolution DB locale / API serveur.

**Ce qu’il apporte à Jarvis**

- Pattern architectural : l’agent **ne génère pas de JSX** — il mute la surface via un **vocabulaire fermé**  
- Parité UI ↔ agent (mêmes commandes)  
- CRDT / collab (Automerge) — intéressant plus tard (plusieurs écrans / postes)  

**Cible API Jarvis (proposition alignée)**

```ts
surface.add(...)
surface.focus(...)
surface.move(...)
surface.replace(...)
surface.group(...)
surface.hide(...)
surface.back(...)   // navigation hiérarchie / historique focus
```

Pas dans le vocabulaire agent : dimensions CSS, grid, absolute.

---

## 3. react-layman — piste #3 (dock / tabs / auto-arrange)

| | |
|--|--|
| Repo | https://github.com/Jeshwin/react-layman |
| npm | `react-layman` |
| Démo | https://jeshwin.github.io/react-layman |
| Inspiration | Replit IDE, LeetCode, React Mosaic |

**Ce qu’il apporte**

- Layout = **données** (`LaymanWindow` / `LaymanNode` tree)  
- Dispatch d’actions : `addTab`, `addWindow`, `moveWindow`, `autoArrange`, `addTabWithHeuristic`  
- Tabs + split row/column + DnD  

**Rôle Jarvis :** idées pour Focus Manager + modes « docked » (pas forcément le rendu spatial libre).  
Complément naturel d’un canvas spatial : zones ancrées (sidebar briefing, feed, contrôles).

Alternatives dock connues (réf. secondaire) : FlexLayout, React Mosaic, Dynamix Layout.

---

## 4. react-layout-engine — piste #4 (contraintes)

| | |
|--|--|
| Repo | https://github.com/delpikye-v/react-layout-engine |
| npm | `react-layout-engine-z` |

**Mental model**

```
React Tree → Layout Nodes
  size: fill | hug | fixed | min/max
  direction / align / gap
  → computed (x, y, width, height)
```

**Rôle Jarvis :** logique du **Layout Solver** à l’intérieur d’une carte / d’un panel — pas le moteur de scène global.  
L’agent dit `surface.add({ kind: 'briefing', size: 'large' })` ; le solver résout fill/hug/fixed.

---

## Architecture cible (synthèse)

```
                 JARVIS AGENT
                      │
                Surface Commands
                      │
        ┌─────────────▼─────────────┐
        │    JARVIS SURFACE ENGINE  │
        │                           │
        │ Scene State               │  ← inspiré ECS infinite-canvas
        │ Layout Solver             │  ← contraintes + layman heuristics
        │ Focus Manager             │  ← focus / back / dock
        │ Transition Manager        │  ← undo buffer / anim
        │ Component Registry        │  ← widgets déclarés (pas JSX LLM)
        └─────────────┬─────────────┘
                      │
          ┌───────────┼────────────┐
          │           │            │
        React       Three.js      Media
          └───────────┼────────────┘
                      ▼
                 GRAND ÉCRAN
```

**Découpage produit (rappel lab)**

- Agent Jarvis **local** (device) + cerveau / API **serveur** — cf. Device Agent Comp  
- Mémoire agents : Tencent `tdai-*` sur NUC — **hors** surface engine  
- Surface engine = runtime UI grand écran, pas le CRM / Eve  

---

## Anti-patterns à éviter

1. Demander au LLM de produire du React / CSS pour le grand écran  
2. Exposer `setStyle` / flex / grid dans les tools agent  
3. Confondre « Agentic UI » (chat qui invente des composants) avec « scene manager »  
4. Brancher Eve/CRM Generative UI (mécanisme A Deal) sur Jarvis sans couche surface  
5. Adopter un monorepo canvas entier (Omnidraw/Vibecanvas) comme dépendance — **copier le contrat de commandes**, pas forcément le produit  

---

## Prochaines étapes (quand GO code)

1. Spécifier le **contrat** `SurfaceCommand` (schéma Zod fermé) + événements  
2. Spike lecture seule : clone / démo `infinite-canvas` + mapping spawn → `surface.add`  
3. Prototype Focus Manager (1 surface, 3–5 widgets registry) **sans** LLM  
4. Brancher l’agent en dernier : tools = commandes surface uniquement  
5. Documenter dans `HANDOFF-CURSOR` le GO / NOK avant tout merge NUC  

---

## Liens rapides

| Priorité | Lien |
|----------|------|
| P1 | https://github.com/jamesyong-42/infinite-canvas |
| P1b | https://github.com/jamesyong-42/infinite-canvas-engine |
| P2 | https://github.com/omnidraw/vibecanvas · https://vibecanvas.dev/ · https://github.com/vibecanvas/skills |
| P3 | https://github.com/Jeshwin/react-layman |
| P4 | https://github.com/delpikye-v/react-layout-engine |
