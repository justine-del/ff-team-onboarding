# Performance — why it loads slow, and what we did

## The honest answer: it's the app's architecture, not your location

Measured from a US machine to this app's infra:
- TCP connect to the (Tokyo) Supabase project: **~20–46ms** (Supabase fronts the REST API with a CDN edge near you).
- A real DB query's **TTFB: ~88ms warm / ~258ms cold**.
- A Vercel **cold start: ~538ms** (first hit after the function's been idle ~15–30s).

Per call, that's not catastrophic. The problem is **how many calls each page makes** and **how they stack**:

- **Server pages** (dashboard, phase layouts, resources) run on a Vercel function in **US-East**, which then fires **6–7 queries to the database in Tokyo** and streams HTML back. Cold starts add ~400–500ms on top.
- **The Task Sheet** was loading in **3 sequential waves** (a useEffect waterfall): session → 6 main queries → a 28-day "recent days" query — instead of all at once.

### Why it's slow for *everyone* (US and Philippines)
The bottleneck is **server↔database** distance and the **number of round-trips**, not user↔server. A Philippines teammate is actually *closer* to the Tokyo DB for client-side calls, but still pays the same round-trip count and cold starts — so neither side wins.

### Why the separate client portal is fast globally
`ff-client-portal` (success.funnelfuturist.com) has its **database co-located with its functions** (local round-trips) and a simpler data model — fewer, closer calls. That's the difference; it's not about user geography.

## Ranked causes
1. **Number of server↔DB round-trips per page** (6–7), amplified by the Tokyo distance.
2. **Task-sheet load waterfall** (3 sequential stages).
3. **Cold starts** on server-rendered pages.
4. **Tokyo distance** per call (real, but secondary — it multiplies the above rather than being the root).

## What we did (code, no infra change)
- **Collapsed the task-sheet waterfall**: the "recent days" load was keyed on `completions` (which it never reads), serializing it behind the main fetch and re-running on every time entry. Removed that dependency → it now runs **in parallel** with the main load. (`app/tasks/page.tsx`)
- Earlier batches: middleware now gates with a **cookie session** (no per-navigation auth round-trip to Tokyo); phase pages stopped calling `getUser()` 3×; DB indexes applied; Resources server-rendered; admin Performance N+1 removed.

## The remaining big lever (deferred, your call)
Co-locating the database with the functions would cut **~600–800ms on server-heavy pages**. Options:
- **Move Supabase to US-East** (next to the functions). Best overall here, since most heavy queries are server-side. Tradeoff: client-side calls from PH get slightly slower; it's a project migration (new project + data move).
- Or move Vercel functions to Asia — favors the DB + PH users but slows US.

It's a real win, not a band-aid — but only worth doing after the code fixes, and it's a deliberate "who do we optimize for" decision. Not executed.
