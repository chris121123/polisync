# PLAN_responsive.md — Full-system responsiveness (mobile / tablet / desktop / large monitor)

**Status:** **SIGNED OFF** (§6) → **IMPLEMENTED** → **VERIFIED §7** (all gates pass)
**Supersedes:** nothing. Complements `PLAN_admin_deslop.md` (visual hygiene) — this plan is layout geometry.
**Constraints inherited:** no new dependencies, no permission/role changes, no DB schema changes,
no destructive flows during verification, credentials only via process env for one invocation.

---

## §0 · Method and evidence

Nothing here is guessed. A Playwright audit ran **150 combinations** — 5 roles × 15 routes × 10 widths
(360, 390, 414, 640, 768, 834, 1024, 1280, 1440, 1920) — plus 7 widths on public `/login` and 5 widths on
both global overlays.

**What already works** (do not "fix" these):

| Check | Result |
|---|---|
| Document-level horizontal overflow | **0 / 150** rows |
| Elements past viewport (outside scroll containers) | **0 / 150** rows |
| Page errors / script errors | **0** |
| `/login` at 7 widths 360→1920 | clean |
| Container cap at large monitors | content 1472 px at vw 1920 = `max-w-7xl` (1280) correctly centred |
| Tables (`Directory`, `UserManagement`) | `min-w-[620/640/700px]` inside `overflow-x-auto` — correct pattern |
| Notification panel | `w-[calc(100vw-16px)] md:w-[420px]` — already mobile-aware |

**Breakpoint token usage across `src/**/*.jsx`:**

```
sm 163 · lg 62 · md 31 · xl 5 · xs 2 · 2xl 0
```

`md` and `xl` are under-used: the tablet band (768–1023) and the large-monitor band (≥1280) have almost
no dedicated steps. That is the shape of the remaining work.

---

## §1 · Architectural Decision Records

### ADR-1 — Keep the existing five-step ladder; add no breakpoints
`xs 400 · sm 640 · md 768 · lg 1024 · xl 1280`, all already defined (`xs` added in `src/index.css:37`).
No container queries, no `2xl`, no JS `matchMedia` except the one `Layout.jsx:30` already owns.
**Rejected:** adding a 6th breakpoint to "cover more cases" — every extra step multiplies variant tokens
and the CSS we already carry.

### ADR-2 — The sidebar breakpoint and the grid breakpoint must not be the same token
`Layout.jsx:30` docks the sidebar when `innerWidth < 1024`. Dashboards switch to `lg:grid-cols-4` at the
**same** 1024. Because docking removes 256 px of content width at the exact moment the grid adds a
column, measured card width collapses:

```
viewport   768   900   1024   1100   1280   1920
card width 350   416   158    177    222    286     (admin /dashboard KPI row)
```

**416 px → 158 px.** Adding 124 px of viewport shrinks every card by 62 %. Content area at 1024 is only
768 px, so four columns cannot fit until the viewport reaches ≈1214.

**Decision:** the sidebar stays docked at `lg`. The 4th/5th grid column moves to `xl`, and `md` fills the
tablet band:

```
grid-cols-1  sm:grid-cols-2  md:grid-cols-3  xl:grid-cols-4
```

Why this ladder is right: at viewport 768 the sidebar is an overlay, so `main` = 768; at viewport 1024
the sidebar docks, so `main` = 768 again. `md` therefore yields **the same column width in both bands** —
one rule covers tablet portrait and the docked-laptop case. At 1280 `main` = 1024 and `xl` gives 4 × 222,
matching today's comfortable 1280 behaviour.

**Rejected (and why):** collapsing the sidebar to an icon rail below `xl` instead — it would preserve
4 columns at 1024 but requires JS state changes and strips nav labels from every 1024–1279 screen.
Pure class-token edits win.

### ADR-3 — Adopt the container convention that already exists; do not build a wrapper component
Nine of eleven pages already use it verbatim:

```html
p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry
```

**Decision:** this is the contract. Fix stragglers by editing the string. **Rejected:** a `<Page>`/`<Container>`
component — it would mean touching every page root to swap markup for a wrapper that adds nothing the
existing string does not, plus a second indirection for no reader benefit.

### ADR-4 — Keep the `max-w-7xl` cap on large monitors
At 1920 the cap centres 1280 px of content with honest margins. Raising it would take KPI cards from
286 px to ~360 px, which buys nothing and starts stretching card internals. `/schedule` and `/rooms`
already run full-bleed (content 1664 at vw 1920) where width genuinely helps — the calendar is the
correct exception, not the rule.

**Rejected:** `max-w-screen-2xl` for dashboards. Deliberate negative space is not a defect.

### ADR-5 — Fix tap targets to WCAG 2.5.8 (24 × 24), not to 44 × 44
Measured at 390 px:

| Surface | elements | under 24 | under 44 |
|---|---|---|---|
| `/directory` | 47 | **14** | 42 |
| `/schedule` | 22 | 0 | 17 |
| `/rooms` | 18 | 0 | 13 |
| `/dashboard` | 14 | **2** | 9 |
| NotificationPanel (open) | 44 | **27** | — |

24 px is the AA minimum and covers the real failures. Chasing 44 px would touch 42 elements on
`/directory` alone for an AAA goal nobody asked for. **Rejected:** a global `min-h-11` utility — it would
bloat already-dense tables; fix the failing elements, leave compliant ones alone.

### ADR-6 — The ≤79.5 kB CSS guard in `PLAN_admin_deslop.md` is waived for this plan
Current build is 80.71 kB (already over, attributed to the responsive-variant pass). This plan adds more
variant tokens by design — that is the user's request, not drift. The guard's purpose was to stop
*uncontrolled* growth; responsiveness is controlled growth. **Obligation:** report the before/after byte
delta, not enforce a ceiling.

---

## §2 · Defect register

### R1 — Horizontal overflow on both admin dashboards at 360 px
**Measured:** `main.scrollWidth` = 389 in a 360 viewport → 29 px of inner horizontal scroll.
Affects `admin /dashboard` and `superadmin /dashboard` (same component). Clean at 390+.

**Cause:** the Session Load histogram, `src/pages/admin/AdminDashboard.jsx`:

```
L216  h-44 flex items-end justify-between gap-2 sm:gap-4 px-2 pb-2 border-b ...
L224  flex flex-col items-center flex-1 h-full justify-end group cursor-pointer
L250  span  "text-xs mt-2 transition-colors"   → {d.label}
```

10 bars (`hours = [8..5]`, L45), labels `8am … 12pm … 5pm`. `flex-1` columns have **no `min-w-0`**, so each
column is at least its label's content width; 10 labels + 9 × 8 px gaps + `px-2` exceed the available
288 px at 360.

### R2 — The `lg` collision (ADR-2). Every 4/5-column KPI grid on the role dashboards
Card widths measured 416 px @900 → **158 px @1024**. Affected candidates:

| File | Grid declaration |
|---|---|
| `src/pages/admin/AdminDashboard.jsx` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| `src/pages/teacher/TeacherDashboard.jsx` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| `src/pages/therapist/TherapistDashboard.jsx` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| `src/pages/parent/ParentDashboard.jsx` | `grid-cols-1 sm:grid-cols-3 lg:grid-cols-5` |

**Gate:** change a grid only if it measures **< 180 px per child at viewport 1024**. Grids at
`lg:grid-cols-3` (~230 px at 1024) and Settings/ProfilePage grids must be measured first and left
alone unless they fail the gate. No blanket find-and-replace.

### R3 — Tap targets under 24 px
- `src/pages/Directory.jsx` — **14** student-name links `a.font-medium.text-sm.text-ps-ink-1` at 16–20 px tall
- `src/pages/admin/AdminDashboard.jsx` — `Manage in Schedule` (137 × **16**) and `View Rooms` (88 × **16**)
- `src/components/NotificationPanel.jsx:296` — **25** per-row action buttons `button.p-1 …` at **22 × 22** (2 px short)

### R4 — Hover-only affordance on touch (NotificationPanel)
Same button: `opacity-0 group-hover:opacity-100`. On a phone there is no hover, so the per-notification
action is **never visible and never tappable** — 25 rows affected at every mobile width. This is a
functional gap, not a cosmetic one: the control does not exist on touch devices.

### R5 — Minor container inconsistency
`src/pages/Settings.jsx` root uses `p-6 lg:p-8` while every sibling uses `p-4 sm:p-6 lg:p-8` — Settings is
over-padded at 360 px relative to the rest of the app.

---

## §3 · Change manifest (the contract implementers code against)

**R1 — histogram fits 360 px.** Add `min-w-0` to L224; tighten `gap-2` → `gap-1` at the smallest step on L216;
shorten labels below `xs` (hour number instead of `8am`) or reduce their type step. Target: `main.scrollWidth`
≤ viewport at 360, and no mid-word ellipsis in labels. Measure at 360 / 390 / 768 after.

**R2 — grid ladder.** For each grid passing the §2 gate: `lg:grid-cols-4` → `xl:grid-cols-4` with
`md:grid-cols-3` inserted; parent's `lg:grid-cols-5` → `xl:grid-cols-5` with `md:grid-cols-3`.
Record measured child width at 768 / 1024 / 1280 before and after.

**R3 — padding only, no layout change.** Directory links get enough vertical padding to reach 24 px inside
their existing table row; the two dashboard text buttons get `py-1`; NotificationPanel row button `p-1` → `p-1.5`.

**R4 — touch visibility.** The NotificationPanel row action must be visible without hover on coarse
pointers (e.g. a `max-md:opacity-100` / `pointer-coarse` variant). Desktop hover behaviour unchanged.

**R5 — one string.** `p-6 lg:p-8` → `p-4 sm:p-6 lg:p-8` in `Settings.jsx`.

**Explicitly out of bounds for implementers:** `Layout.jsx` sidebar logic, `App.jsx` routes, any
`GlobalStateContext` code, any `supabase/` migration, `package.json`, auth/role helpers, and every
destructive handler (`handleAutoSchedule`, delete, Factory Wipe).

---

## §4 · NOT doing

1. No `2xl` breakpoint and no container queries — ADR-1.
2. No `<Page>` wrapper component — ADR-3.
3. No cap increase above `max-w-7xl` — ADR-4.
4. No 44 px target pass — ADR-5.
5. No sidebar JS changes — ADR-2 rejected alternative.
6. No dark/light contrast work here; that arc is closed (verification doc §9–§11).
7. No refactor of the 1357-line `ScheduleCalendar.jsx` beyond what the gate proves broken.
   Its fixed `w-[360px]` (L1249) and hardcoded `grid-cols-2/3` are already inside `overflow-auto` (L983)
   and measured clean at every width.

---

## §5 · Verification contract

Success = all of the following, measured, not eyeballed:

1. Re-run the 150-combination audit: **0 rows** with `mainScroll > viewport`, **0** document overflow,
   **0** page errors.
2. Admin + superadmin `/dashboard` at 360: `main.scrollWidth ≤ 360`.
3. KPI card width at 1024 ≥ 200 px on each of the four dashboards (was 158).
4. Tap targets: **0** elements under 24 px on `/directory`, `/dashboard`, and the open NotificationPanel.
5. NotificationPanel row action visible at 390 px without hover.
6. `npm run lint` 0 errors / 0 warnings; `npm run build` succeeds; **report CSS byte delta** per ADR-6.
7. No visual regression at 1280 / 1920 — card widths there must not shrink below today's 222 / 286.

---

## §6 · Delegation and sign-off

**Signed off: Lead Architect, for the whole of §1–§5.** This is the contract. Implementation is delegated;
no agent may widen scope beyond §3 or touch §3's out-of-bounds list.

- **Implement:** `frontend` — single sequential pass, one agent, because the affected files overlap and
  parallel edits would conflict.
- **Review:** `architect-review` — confirm every diff maps to a §3 line and nothing else moved.
- **Verify:** Lead Architect re-runs §5 personally and reports the numbers.

Deferred (recorded, not blocking): session-detail modal interior still unmeasured; teacher/therapist/parent
modals carrying `shadow-xl` never opened; the `notifications` RLS `42501` bug; nothing is committed.

---

## §7 · Verification results (Lead Architect, measured — not eyeballed)

Implementation: 14 edits / 7 files, `frontend` agent, one sequential pass.
`npm run lint` 0 errors / 0 warnings. `npm run build` succeeds. CSS **80.71 → 81.23 kB (+0.52)** per ADR-6.

| §5 gate | Before | After | Pass |
|---|---|---|---|
| 150-combination audit — inner horizontal scroll | 2 rows | **0** | ✅ |
| 150-combination audit — document overflow | 0 | **0** | ✅ |
| 150-combination audit — page errors | 0 | **0** | ✅ |
| Admin/superadmin `/dashboard` @360 offenders | 29 px overflow | **0** | ✅ |
| KPI card width @1024 (≥200 required) | **158** | **219** | ✅ |
| `/directory` targets <24 px | **14** | **0** | ✅ |
| `/dashboard` targets <24 px | **2** | **0** | ✅ |
| NotificationPanel targets <24 px (open) | **27** | **0** | ✅ |
| Panel row action visible @390 without hover | invisible on touch | **26/26 at opacity 1, 26×26** | ✅ |
| Panel row action still hover-gated on desktop | — | **26/26 hidden @768, 1024, 1440** | ✅ |
| No regression at 1280 / 1920 | 222 / 286 | **222 / 286** | ✅ |
| Contrast regression sweep (62 combos) | 61/62 | **61/62, 0 errors** | ✅ |
| Banned tokens | none | **none** | ✅ |

**The R2 ladder behaves as designed** — admin KPI card width across the full range:

```
viewport   768   900   1024  1100  1280  1920
columns     3     3      3     3     4     4
card px   227   271    219   244   222   286
before    350   416    158   177   222   286
```

Cards are ≥219 px everywhere in the band that previously collapsed to 158, and 1280/1920 are bit-identical
to today. `md` yields the same column width at viewport 768 (overlay sidebar, `main`=768) and at 1024
(docked sidebar, `main`=768) — exactly the argument in ADR-2.

**Known-open items confirmed still open** (pre-existing, outside §4's scope, inside never-mounted modals):
`shadow-xl` at `TeacherDashboard.jsx:266` and `TherapistDashboard.jsx:280`; `sm:rounded-3xl` at
`ParentDashboard.jsx:169,201`. These are invisible to page-state sweeps because the modals mount only when
opened — that is why §7's sweep still reports zero banned tokens while these four exist.
