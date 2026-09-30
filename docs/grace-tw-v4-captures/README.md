# Grace Tailwind v4 — captures avant / après

Auth `/login` — référence visuelle pour QAtrial phase 2.

| Fichier | Moment | Thème |
|---------|--------|-------|
| `01-before-dark-panel.png` | avant (v3) | dark — panneau marque |
| `02-before-dark-form.png` | avant (v3) | dark — carte login |
| `03-before-dark.png` | avant (v3) | dark — carte login |
| `04-after-dark.png` | après (v4) | dark — carte login |
| `06-after-light.png` | après (v4) | light — carte login |

## Tokens mesurés après v4 (Runtime)

| | light | dark |
|--|-------|------|
| `--background` | `#fafafa` | `#050505` |
| `--a-500` | `#4f56e5` | `#009ef7` |
| body bg | `rgb(250,250,250)` | `rgb(5,5,5)` |

## Verdict drift

Pas de dérive intentionnelle du design system : mêmes tokens `tokens.css`. Overrides `!important` sur `n-*` / `a-*` / `bg-card` **retirés** — utilities passent par `@theme` → `var(--…)`. Conservé : remap `bg-white` → surface, alias `bg-n-25`, React Flow, scrollbars, inputs.

**Référence QAtrial = version après (v4).**
