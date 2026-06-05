# UI Restructure Plan (proposal — not yet executed)

A phased plan to take the whole portal to the clean, intentional look of the
**Getting Started** page. Goal: consistency, hierarchy, and breathing room — not
a feature change. Layout/positions of features stay; the *system* gets tighter.

North star: the forest palette (mint primary, amber secondary, cream text) + the
calm spacing of the Getting Started page. Tokens already live in
[lib/ui.ts](../lib/ui.ts) and the `[data-theme="dark"]` block of
[app/globals.css](../app/globals.css).

## Principles
- **One shell.** Every page = `QuickNav` + a consistent content container (`max-w`, padding, page title slot, optional action slot). No bespoke per-page headers.
- **One card.** A single `<Card>` primitive (padding, radius, border, hover) replaces the ad-hoc `bg-gray-900 border …` repeated everywhere.
- **A type & spacing scale.** Fixed sizes for page title / section / body / caption, and a consistent vertical rhythm (e.g. 24px between sections, 12–16px inside cards).
- **Accent discipline.** Mint = primary actions/active; amber = secondary/links-to-docs; red = destructive only. No raw blue/purple/yellow.

## Phase 1 — Shell & primitives (foundation, low risk)
- `components/ui/PageShell.tsx` — wraps `QuickNav` + a `<main>` with a standard container, a `title` + optional `actions` slot. Adopt on dashboard, tasks, sops, resources, phases so headers are identical (this also finishes the nav cleanup started in Batch 5).
- `components/ui/Card.tsx`, `components/ui/SectionHeading.tsx`, `Badge`, `Button` (primary/secondary/ghost/danger) — wrap the current Tailwind strings so styling is centralized.
- Define the type scale in `globals.css` (or Tailwind theme) and map headings to it.

## Phase 2 — Page-by-page polish (uses the primitives)
- **Dashboard:** tighten the stat row + chart card spacing; the phase cards become a clear vertical "ladder" (Phase 0→2.1) with consistent locked styling; reduce emoji-as-icon in favor of a small consistent icon treatment.
- **Task sheet:** it's dense — add column/row rhythm, sticky header row, clearer group headers (Roles / Custom / EOW), and move Export/EOW into the standard `actions` slot. Consider a calmer time-cell style.
- **Phases / SOPs:** unify the task/lesson row card, the Mark-complete button, and the locked/disabled treatment via the primitives.
- **Resources:** card grid with consistent thumbnails/placeholders.

## Phase 3 — Motion & finish (optional, after perf is comfortable)
- Subtle transitions (hover, expand/collapse), skeletons that match final layout, and the "floating" accents the owner wanted — gated on load performance being solid so they don't add jank.

## Mobile
- `QuickNav` already scrolls horizontally; add a condensed/menu treatment under `sm`. Ensure cards stack and the task sheet scrolls cleanly.

## Sequencing & risk
- Phase 1 is mechanical and safe (introduce primitives, swap class strings) — do it first; it pays for itself immediately.
- Phases 2–3 are visual passes per page; each is independently shippable and screenshot-verifiable.
- No data/feature changes anywhere in this plan.

## Out of scope here
- The DB-region/perf decision (tracked separately), and the Google Docs → chat RAG backlog.
