---
name: shadcn-ui-charts
description: Build UI with shadcn/ui components first, including chart patterns from shadcn/ui charts guidance. Use CLI-driven component generation and consistent design tokens.
---

# shadcn/ui + Charts Skill

Primary references:
- https://ui.shadcn.com/llms.txt
- https://ui.shadcn.com/docs/components
- https://ui.shadcn.com/charts

## Rules

1. Treat `DESIGN.md` in the repo root as the design authority when it exists.
1. Prefer existing `src/components/ui/*` components before custom primitives.
2. If a component is missing, add it via shadcn CLI instead of rebuilding behavior manually.
3. Keep styling within existing project tokens and component variants; do not drift back to generic shadcn defaults when `DESIGN.md` specifies Chai tokens.
4. If the product exposes theme choices, preserve the `Light`, `Dark`, `Chai`, `System` distinction from `DESIGN.md`; never treat `Chai` as the automatic dark-system result.
5. For charts, use shadcn chart patterns (with Recharts) and style them with the restrained warm palette and table-vs-chart guidance from `DESIGN.md`.
6. Use accessible defaults (labels, focus states, keyboard support) from shadcn components.

## Recommended Workflow

1. Check if required component already exists in `src/components/ui`.
2. If missing, add via shadcn registry/CLI.
3. Compose screens using shadcn primitives (`Card`, `Button`, `Input`, `Select`, etc.).
4. For data visualization, use shadcn charts structure and avoid ad-hoc chart wrappers.
5. Match chart color, border, hover, and annotation choices to `DESIGN.md`, especially the rule that orange is highlight-only.

## Common Checks

- No duplicate custom button/input/select implementations.
- Dialogs, popovers, and menus are built with shadcn primitives.
- Charts use consistent spacing, legends, and axis labels.
