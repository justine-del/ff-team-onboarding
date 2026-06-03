# UI Improvement Map

Presentation/polish opportunities that **don't change features**. Items marked
✅ were applied in this pass; the rest are a backlog to pull from.

## Applied

- ✅ **Shared class tokens** — [lib/ui.ts](../lib/ui.ts) (`CARD_CLASS`,
  `INPUT_CLASS`, `LABEL_CLASS`). The dashboard now imports `CARD_CLASS` instead of
  an inline string. Pattern is ready to adopt elsewhere.
- ✅ **Consolidated chat** — one floating widget instead of a widget + a separate
  full-page chat + duplicate nav/card entries.
- ✅ **Universal locked-phase treatment** — every member now sees the locked-card
  visual on gated phases (previously only two hardcoded users).

## Backlog (low-risk, high polish)

1. **Adopt `lib/ui.ts` tokens app-wide.** `INPUT_CLASS` / `LABEL_CLASS` are
   duplicated verbatim in `admin/offboarding/page.tsx`, `VAOffboardingForm.tsx`,
   `login`, `sops`, etc. Swap them in for consistency and one-place restyling.
2. **Unify the top nav.** The dashboard renders its own inline `<nav>` while other
   member pages use `components/nav/QuickNav.tsx`. Extract one shared header
   component so links/sign-out/branding are identical everywhere.
3. **Loading & empty states.** Client pages that fetch on mount
   (`admin/users`, `tasks`, `sops`) flash empty content first. Add skeletons or a
   spinner and friendly empty states ("No members yet — invite one").
4. **Error feedback on fire-and-forget POSTs.** Several `fetch('/api/…')` calls
   ignore failures (e.g. task toggles). Surface a toast/inline error on non-200.
5. **Progress bar polish.** Phase cards compute `width: %` inline; a tiny
   `<ProgressBar value total />` component would dedupe and standardize the look.
6. **Consistent date formatting.** Several ad-hoc `toLocaleDateString` calls with
   different options — centralize a `formatDate`/`formatWeek` helper.
7. **Mobile nav.** `QuickNav` is a horizontal scroll bar; consider a wrap or a
   menu on small screens.
8. **Reduce emoji-as-icons** in favor of a small icon set for a cleaner, more
   professional presentation (optional, brand-dependent).

None of the above alter behavior or data — they're safe to schedule independently.
