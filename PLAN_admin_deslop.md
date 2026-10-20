# Plan — Admin Surface De-Slop Pass (visual/UX only)

**Status:** ✅ SIGNED OFF 2026-10-20 — approved for implementation.
**Deviations from the draft, as ruled by the requester:**

| Item | Ruling |
|---|---|
| ADR-7 (10 out-of-scope fill lines) | **APPROVED** — implement in full |
| P0-6 (Login error banner warn → danger) | **APPROVED** — implement |
| P0-8 (`ClearDatabaseModal` + `ForceChangePasswordModal` contrast) | **APPROVED** — implement |
| P0-9 (program-colour headers, `rehab`/`sped`) | **APPROVED** — implement |

No items were struck. All four flagged sections below are therefore **in scope**.
**Scope rule:** plan-only. Every step below is a *specification*, not code.
**Prepared:** 2026-10-20. All counts and contrast values in this document were **measured today**, not cited.

---

## Step 0 — Baseline & measured evidence

### 0.1 Build baseline (recorded, must be re-passed at the end)

| Check | Result |
|---|---|
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 (benign `>500 kB chunk` warning — pre-existing, not an error) |
| CSS bundle | 78.35 kB (gzip 13.09 kB) — **do not regress** |
| JS bundle | 806.62 kB |
| Tests / typecheck | **none exist** — verification is lint + build + manual `npm run dev` |

### 0.2 Per-file slop inventory (measured today)

Line counts differ from the counts you cited — every in-scope file grew during the previous
(signed-off) polish pass. **Your line references, however, all held**; each was re-verified.

| File | Lines | `motion.*` | offset-anims¹ | `font-bold` | `uppercase` | `rounded-3xl`² | other measured slop |
|---|---:|---:|---:|---:|---:|---:|---|
| `ScheduleCalendar.jsx` | 1468 | 21 | 4 | **66** | 9 (form labels) | 3 (L239, L403, L1255) | 3 radial-gradient sheens (L244/L408/L1266), `shadow-xl` ×5, 3 competing toolbar primaries (L939/L952/L963) |
| `admin/UserManagement.jsx` | 1128 | 0 | 0 | 0 | **11** (`th` L399–404, L547–551) | 0 | `shadow-lg` L463 + `shadow-xl` ×4 |
| `Rooms.jsx` | 483 | 12 | 2 | **37** | 2 | 0 | per-row stagger `delay: i*0.03` L177, `text-4xl font-bold` heading L286 |
| `Settings.jsx` | 368 | 13 | 6 | **25** | 0 | 1 (L163) | leftover indigo role card L242–243, marketing copy L186, `shadow-xl` L74 |
| `Login.jsx` | 357 | 6 | 2 | 11 | 3 (labels) | 0 | gradient hero L121, 3 blur blobs L123–125, marketing badge/headline/stat-cards L138–167 |
| `NotificationPanel.jsx` | 332 | 5 | 2 | 1 | 0 | 0 | per-row stagger `delay: index*0.02` L248, `shadow-xl` L159 |
| `ProfilePage.jsx` | 308 | 8 | 4 | **20** | 0 | 0 | gradient + legacy-program header L114–120, entrance delays L202/L263 |
| `GlobalSearch.jsx` | 276 | 4 | 0 | 1 | 0 | 0 | `shadow-xl` L225, stale comment + **gate bug** L89–90 |
| `Directory.jsx` | 235 | 2 | 1 | **15** | 0 | 0 | `shadow-xl` L30 |
| `Layout.jsx` | 264 | 1 | 0 | 3 | 0 | 0 | `shadow-xl` tooltip L235 |
| `index.css` | 143 | — | — | — | — | — | `.dark` state-token block L62–64 (Phase 0) |
| `App.jsx` | 94 | — | — | — | — | — | dead `AdminRoute` import L16 |

¹ `motion` elements carrying an entrance offset (`initial={{ opacity:0, y|x:… }}`) — i.e. decorative movement, as distinct from mount/unmount fades and drawer slides.
² counts include `rounded-t-3xl`. `rounded-3xl` plain also appears at `RequirementsUpload` (out of scope).

**Already clean (verified, not to be re-worked):** no `text-[Npx]` micro-type, no `font-black`, no `backdrop-blur*`, no `shadow-2xl`, no `animate-pulse` in `ScheduleCalendar`, no `bg-gradient-to-*` outside `Login:121` and `ProfilePage:115`.

### 0.3 Two verification gotchas to carry into implementation

1. **ESLint cannot catch dead imports.** `varsIgnorePattern: ^[A-Z_]` swallows every capitalized
   identifier, so `AdminRoute` would never be flagged. Dead-import removal is **manual + grep-verified**.
2. **Line numbers drift as you edit.** Every step below says *re-read the file first*. The refs are
   today's coordinates; treat them as search anchors, not coordinates.

---

## Phase 0 — the contrast regression (do this before any styling)

### 0.0 What is actually broken

`docs/superadmin_dashboard_polish_plan.md:72-79` instructed:

> **Do NOT add dark values for `success` / `warn` / `danger`** … no single value can satisfy both
> their real usages — white-on-fill needs luminance ≤ ~0.175 (≥4.5:1) while text-on-dark-surface
> needs ≥ ~0.2007, which is a contradiction.

That instruction was missed. `src/index.css:62-64` defines `.dark --color-ps-success: #10b981`,
`--color-ps-warn: #f59e0b`, `--color-ps-danger: #ef4444`.

**Measured verdict on the contradiction — it is real, and I reproduced it independently:**

| Need (4.5:1) | Required luminance | Achievable? |
|---|---|---|
| white text on a fill | L ≤ 0.1833 | — |
| token-as-text on `#0f1117` (dark surface) | L ≥ 0.2005 | **no — the intervals do not intersect** |

So the original correction was *right that one token cannot do both*, but wrong to conclude
therefore no dark value is needed: **removing the dark overrides makes dark TEXT fail**
(`#059669`→5.01 ✓, `#dc2626`→**3.91 ✗**, `#d97706`→**✗**), while keeping them makes dark FILLS fail.

**And light mode is broken too** — this is the part your table did not cover:

| Light usage | Measured today | Need |
|---|---:|---:|
| `bg-ps-success` + white | **3.77 ✗** | 4.5 |
| `text-ps-success` on surface | **3.77 ✗** | 4.5 |
| `text-ps-success` on its own `/10` tint | **3.35 ✗** | 4.5 |
| `text-ps-danger` on its own `/10` tint | **4.13 ✗** | 4.5 |
| `bg-ps-warn` + white | **3.19 ✗** | 4.5 |
| `text-ps-warn` on surface | **3.19 ✗** | 4.5 |
| `text-ps-warn` on its `/10` tint (Login error banner) | **2.86 ✗** | 4.5 |

**Ledger correction:** you cited `text-ps-danger` light = **6.2**. I measure **4.83** (`#dc2626` on
`#ffffff`). `#dc2626` cannot exceed 4.83 against any background it is lighter than, so 6.2 is not
reproducible for this token — most likely a different red was measured. **Verdict is unchanged: both
pass**, so no decision below depends on the discrepancy. Your dark value **5.01 reproduced exactly**,
as did all four fill rows (3.77 / 2.54 / 4.83 / 3.76 / 6.29 / 4.47) — the method is sound.

### Phase 0 decisions

**P0-1 · Darken the three LIGHT state tokens.** `src/index.css` `@theme` block only
(`:root` does not define these three):

| Token | From | To |
|---|---|---|
| `--color-ps-success` (L15) | `#059669` | **`#047857`** |
| `--color-ps-danger` (L17) | `#dc2626` | **`#b91c1c`** |
| `--color-ps-warn` (L16) | `#d97706` | **`#b45309`** |

Justification: in light mode fill-with-white and text-on-white have the *identical* constraint
(L ≤ 0.1833 — symmetry of the ratio), so there is **no** contradiction in light mode. One value per
token fixes fill, text *and* tint-text simultaneously. All three changes are **strictly
contrast-improving on every out-of-scope consumer** (e.g. `TeacherDashboard:327` attendance chips
3.77→5.48, 4.83→6.47, 3.19→5.02) — zero per-site edits needed outside this file.

**P0-2 · Keep the `.dark` state overrides exactly as they are** (L62–64: `#10b981` / `#f59e0b` / `#ef4444`).
Measured dark **text** values are the ones that work: 7.44 / 8.79 / 5.01 on surface, 6.51 / 7.58 / 4.61
on their own tints — all pass. This inverts `superadmin_dashboard_polish_plan.md:72`'s
"do not add" instruction; the reason is that its scope assumption is now stale — that document
reasoned that *"in-scope usage is only the `text-ps-danger` conflict icon"*, but `Settings.jsx`
(danger tab label, Danger Zone body copy) is in scope **this** pass and needs the 5.01. **Recorded in ADR-6.**

**P0-3 · Fix dark state FILLS locally, in-scope only** (`dark:` variants, your prescribed pattern):

| Override | Measured | Applies to (in-scope) |
|---|---|---|
| `dark:bg-emerald-700` (`#047857`) | white **5.48 ✓** (was 2.54) | `ScheduleCalendar` availability header L243, availability chip L299 (+ any success fill not converted by the primary-action rule) |
| `dark:bg-red-700` (`#b91c1c`) | white **6.47 ✓** (was 3.76) | `Settings` L320, `UserManagement` L1063/L1115, `ScheduleCalendar` L1276 (+ `L1292` hover) |
| `dark:bg-amber-700` (`#b45309`) | white **5.02 ✓** (was 2.15) | `ScheduleCalendar` `TYPE_CONFIG.playschool.gradient` string (covers L30/L407/L1265) |

Out-of-scope dark state fills (`TeacherDashboard:327` chips, etc.) are **deliberately not touched**:
their tokens are unchanged, so they are exactly as today — no regression, recorded as a residual.

**P0-4 · Accent: dark token brightened + fills overridden.** See **ADR-7** — this is the one decision
that crosses into out-of-scope files and **needs your explicit sign-off** (§4).

| Change | Measured effect |
|---|---|
| `--color-ps-accent` dark `#6366f1` → **`#818cf8`** | text-on-surface **4.22 ✗ → 6.33 ✓**, text-on-`accent-soft` **3.48 ✗ → 5.21 ✓** (0 edits at ~70 text sites) |
| `dark:bg-indigo-600` (`#4f46e5`) on every white-text accent **fill** | fill **4.47 ✗ → 6.29 ✓** (and light stays 6.29 ✓) |

Why the token must move rather than stay: dark accent fails as *both* text (4.22) **and** fill (4.47),
and the two requirements are the empty-set contradiction above. Text sites outnumber fill sites
(~70 vs ~30), so the cheap fix is: token serves text, fills get local overrides.

**P0-5 · Action colours are not state colours** (answers your "primary action per modal" requirement):

> **Rule:** a *filled action* is always `bg-ps-accent`. `bg-ps-success` / `bg-ps-warn` are reserved for
> **state** (chips, dots, status banners); `bg-ps-danger` is reserved for **destructive** controls.
> Exactly one primary per drawer footer; everything else secondary (border + text, no fill).

Consequences in `ScheduleCalendar`:
- toolbar: **Add Session** = primary (accent, L963); **Auto-Schedule** (L939) and **Set Availability**
  (L952) demote to secondary — three competing filled buttons is the slop, and demoting two also
  deletes two contrast-problem sites.
- **Save Availability** (L323): success → primary accent.
- **Confirm delete** (L1276): stays `bg-ps-danger` (destructive) ✓.
- Availability header (L243) and availability chip (L299): stay `bg-ps-success` (genuine state) ✓.

**P0-6 · `Login` error banner uses the wrong semantic colour** *(flagged — 2 lines, can be struck)*.
`Login:236` is `bg-ps-warn/10 … text-ps-warn`. Measured **2.86 light / 4.39 after P0-1** — still fails.
An authentication failure is an *error*, not a warning: switching the banner to the danger pair gives
**5.45 ✓ light / 4.61 ✓ dark**. No logic, no copy, no layout change.

**P0-7 · `ProfilePage` department header** is covered by Phase 1 step 6 (gradient removal), not here.

**P0-8 · Two out-of-scope gates in the Settings flow** *(flagged — 3 lines, can be struck)*:
- `ClearDatabaseModal:111, :190` — `bg-ps-danger … text-white`, dark **3.76 ✗**. Light fixes free (P0-1);
  dark needs `dark:bg-red-700`.
- `ForceChangePasswordModal:125` — `bg-ps-warn … text-white`, dark **2.15 ✗**; `dark:bg-amber-700`.

Rationale for touching files outside the list: the first is *the* superadmin break-glass confirm that
opens **from `Settings`** — leaving it at 3.76 while the screen that opens it passes is incoherent, and
the brief requires that gate to stay reachable and legible. Both edits are one className each, no
styling. **Strike them if you want the file list held strictly.**

**P0-9 · Program-colour headers in `ScheduleCalendar`** *(approved — implemented, then corrected)*.
Measured white-on-fill: `bg-rehab` **2.56 ✗**, `bg-sped` **2.99 ✗** (L407/L1265 headers, title + label +
close button). `playschool` is fixed for free by P0-1/P0-4 (5.02 ✓).

> **Correction (2026-10-20, post-implementation).** The original fix swapped `text-white` →
> `text-ps-ink-1`, measured at **6.72 / 6.46**. That measurement was **light mode only — a gap in the
> original plan.** `--color-ps-ink-1` is theme-adaptive (`#0d0f1a` → `#f0f2fa`), so in dark mode the same
> headers measure **2.27 / 2.64 ✗**. An adaptive token cannot fix a fill whose own colour is unchanged in
> dark mode; the two were never measured together.
>
> **Amended fix:** darken the *fill* to the same palette family in **both themes**, keeping white text
> byte-identical to today. `bg-rehab` → **`bg-sky-700`** (`#0369a1`, white **5.87 ✓**) and `bg-sped` →
> **`bg-purple-700`** (`#7e22ce`, white **6.96 ✓`), on the two header containers only. Preserves the
> program identity cue, changes **zero** text classes, and is symmetric across themes. Reverts the
> `headerTitle`/`headerLabel`/`headerClose` config fields the first attempt introduced, restoring the
> original hardcoded `text-white*` literals.
> Close-button chip (`bg-ps-surface/20` + white icon): **4.0 ✓** / **4.76 ✓** against the new fills —
> icons need 3:1 only.

**P0-9b · Selected category button (`ScheduleCalendar` L448)** *(approved by architect, not re-voted —
same defect class as P0-9, found during its verification)*.

`cfg.gradient` turns out to feed **8** sites, not the 2 my audit found. The agent's report surfaced the
rest. Full census:

| Site | Carries text? | Verdict |
|---|---|---|
| L114, L115, L167, L597, L1010 — 1–6 px accent rails | no | **Leave.** Decoration; the program type is stated in text inside the card, so it is not required to understand content (WCAG 1.4.11 exempts these). |
| L407, L1265 — drawer + detail headers | yes (white) | Fixed by P0-9. |
| **L448 — selected category button** | yes (white) | **Fails: 2.56 / 2.99 ✗.** |

**Decision — do not add a third copy of the rehab/sped ternary.** Make the selected category state
`bg-ps-accent dark:bg-indigo-600 text-white border-transparent shadow-md` (white **6.29 ✓** both themes).
Three reasons, in order of weight:

1. The brief sanctions program colours for *program identity (text, border, badge)* and **never as a
   fill**. A selected-button fill was already out of bounds — replicating it in a darker shade would
   propagate the misuse to a third site.
2. Per **P0-5**, a filled control is an action and takes accent; the program identity is already carried
   by the button's own `cfg.label` text, so the colour was redundant decoration.
3. `dark:bg-indigo-600` is the established Phase 0 pattern (30 sites already carry it), so this is one
   line and no new structure.

The two header containers keep their `rehab ? bg-sky-700 : sped ? bg-purple-700 : gradient` ternaries —
a header *is* an identity surface, which the brief explicitly permits.

### The measured ledger (final state, both themes)

**LIGHT — after P0-1**

| Usage | Site(s) | Before | After | |
|---|---|---:|---:|---|
| `bg-ps-success` + white | `ScheduleCalendar` L243/L299/L323/L939/L952/L1412 | 3.77 | **5.48** | ✓ |
| `text-ps-success` / surface | `ScheduleCalendar` L276, L974 | 3.77 | **5.48** | ✓ |
| `text-ps-success` / own tint | `ScheduleCalendar` L310/L1014, `Directory` L204 | 3.35 | **4.78** | ✓ |
| `bg-ps-danger` + white | `Settings` L320, `UserManagement` L1063/L1115 | 4.83 | **6.47** | ✓ |
| `text-ps-danger` / surface | `Settings` L144/L304/L309/L313 | 4.83 *(you cited 6.2)* | **6.47** | ✓ |
| `text-ps-danger` / own tint | `Settings` L308, `ScheduleCalendar` L1014 | 4.13 | **5.45** | ✓ |
| `bg-ps-warn` + white | `ForceChangePasswordModal` L125, playschool header | 3.19 | **5.02** | ✓ |
| `text-ps-warn` / surface | `ScheduleCalendar` L19/L478/L975, `ProfilePage` L89/L97/L242 | 3.19 | **5.02** | ✓ |
| `text-ps-warn` / own tint | `Login` L236 error banner | 2.86 | 4.39 → **5.45** after P0-6 | ✓ |
| `text-ps-warn` / `ps-bg` | — | 3.05 | **4.61** | ✓ |
| `bg-ps-accent` + white | ~19 in-scope fills | 6.29 | 6.29 | ✓ |
| `text-ps-accent` / surface | links, tabs | 6.29 | 6.29 | ✓ |
| `text-ps-accent` / `accent-soft` | chips, badges | 5.62 | 5.62 | ✓ |

**DARK — after P0-2 / P0-3 / P0-4**

| Usage | Before | After | |
|---|---:|---:|---|
| `text-ps-success` / surface | 7.44 | 7.44 *(token unchanged)* | ✓ |
| `text-ps-success` / own tint | 6.51 | 6.51 | ✓ |
| `bg-ps-success` + white | **2.54** | **5.48** (`dark:bg-emerald-700`) | ✓ |
| `text-ps-danger` / surface | 5.01 | 5.01 *(token unchanged)* | ✓ |
| `text-ps-danger` / own tint | 4.61 | 4.61 | ✓ |
| `bg-ps-danger` + white | **3.76** | **6.47** (`dark:bg-red-700`) | ✓ |
| `text-ps-warn` / surface | 8.79 | 8.79 | ✓ |
| `text-ps-warn` / own tint | 7.58 | 7.58 | ✓ |
| `bg-ps-warn` + white | **2.15** | **5.02** (`dark:bg-amber-700`) | ✓ |
| `text-ps-accent` / surface | **4.22** | **6.33** (token → `#818cf8`) | ✓ |
| `text-ps-accent` / `accent-soft` | **3.48** | **5.21** (token → `#818cf8`) | ✓ |
| `bg-ps-accent` + white | **4.47** | **6.29** (`dark:bg-indigo-600`) | ✓ |
| `text-ps-surface` on accent fill (`Directory` L97/L131) | 4.23 | **6.46** — *no override; `text-ps-surface` inverts in dark* | ✓ |
| white on `bg-rehab` header (`ScheduleCalendar` L407/L1265) | **2.56** | **5.87** (`bg-sky-700`) — *same value in light* | ✓ |
| white on `bg-sped` header (`ScheduleCalendar` L407/L1265) | **2.99** | **6.96** (`bg-purple-700`) — *same value in light* | ✓ |
| selected category button (`ScheduleCalendar` L448) | **2.56 / 2.99** | **6.29** (`bg-ps-accent` + `dark:bg-indigo-600`) — *same value in light* | ✓ |

**Measured and deliberately left failing — recorded, not fixed (see NOT-doing):**

| Usage | Value | Why left |
|---|---:|---|
| Dark state fills on parent/teacher/therapist dashboards (white on `#10b981`/`#ef4444`/`#f59e0b`) | 2.54 / 3.76 / 2.15 | tokens unchanged → exactly today's values, no regression; fixing needs `TeacherDashboard` config edits (out of scope) |
| Legacy program colours as text/badge (`--color-rehab` `#0ea5e9`, `--color-sped` `#a855f7`) | 2.56 / 2.99 | brief explicitly permits program colours for identity text/border/badge |

---

## Phase 1+ — per-file steps, **smallest first**

Cross-cutting rules the implementer must apply in **every** step are in §4.1; they are not repeated per file.

### Step 1 — `src/App.jsx` + `src/components/RouteGuards.jsx` · *revertible: yes*
- **Files:** `App.jsx` (94L), `RouteGuards.jsx` (45L)
- **Change:** remove `AdminRoute` from the import at `App.jsx:16`. Wrap the app tree in
  `<MotionConfig reducedMotion="user">` (one wrapper).
  `framer-motion@12.38.0` exports `MotionConfig` — verified in `dist/es/index.mjs:6`.
  Precedent: `docs/UI-SYSTEM-REDESIGN.md:473` already calls this "a one-line accessibility requirement".
- **Why the wrapper:** the existing guard at `index.css:123-130` only mutes CSS animations/transitions.
  Framer Motion animates via `requestAnimationFrame` + inline styles and **is not covered by it**. The
  brief asks for a *global* extension rather than per-component logic — `MotionConfig` is that extension.
- **Must not change:** any guard's logic or redirect target; the route table; `AdminRoute`'s export
  (**keep it** — zero consumers today, but it is not this pass's business to delete a guard other roles
  may need later; say so in the commit).
- **Verify:** `lint`, `build`, `grep -rn "AdminRoute" src` → exactly two hits: the definition in
  `RouteGuards.jsx` and the (fixed in Step 4) comment in `GlobalSearch.jsx`.
- **Risk note:** `reducedMotion="user"` disables transform/layout animation and keeps opacity —
  drawers still fade, they just stop sliding for users who asked for that.

### Step 2 — `src/components/Layout.jsx` (264L) · *revertible: yes*
- **Change:** 3 `font-bold` → policy (L109 sidebar wordmark → `font-semibold`; L213 avatar initials →
  `font-medium`). Tooltip `shadow-xl` L235 → `shadow-md` (it genuinely floats — keep elevation, quiet it).
- **Must not change:** nav construction or its role gates — L81–83 already use `appRole === 'admin'`
  correctly and are the reference for Step 4; the L72 `isAdminLevel` is legitimately used for the
  dashboard icon at L77, **leave it**; mobile-drawer motion (state change).
- **Verify:** `lint`, `build`, diff shows ≤ 4 lines.

### Step 3 — `src/pages/Directory.jsx` (235L) · *revertible: yes*
- **Change:** 15 `font-bold` → policy (`th`/filter pills/buttons → `font-medium`, modal title L34 →
  `font-semibold`). Modal `shadow-xl` L30 → `shadow-md`.
- **Must not change:** the 2 `motion` elements (modal mount/unmount — `AnimatePresence` needs them);
  **do not touch L97/L131 accent fills** — `text-ps-surface` adapts per theme and already reaches 6.46 ✓
  in dark after ADR-7; adding an override there would *break* them (3.07 ✗).
- **Verify:** `lint`, `build`, confirm L97/L131 untouched.

### Step 4 — `src/components/GlobalSearch.jsx` (276L) · *revertible: yes, **ship separately from styling***
- **Change (styling):** `shadow-xl` L225 → `shadow-md`. The 4 `motion` elements are modal mount — keep.
- **Change (the ONE sanctioned behaviour fix in this pass):** the stale comment at L89 and the gate at L90.
  Today `isAdminLevel = appRole === 'admin' || appRole === 'superadmin'` gates results that navigate to
  `/schedule`, `/directory`, `/rooms` — but those routes are
  `RoleRoute allowedRoles={['admin']}` (`App.jsx:54/55/57`), so **superadmin gets a result, clicks it,
  and `RouteGuards.jsx:43` bounces them to `/dashboard`.** `Layout.jsx:81-83` already hides those three
  nav items from superadmin, so the intent is unambiguous.
  **Fix: gate those results on `appRole === 'admin'`, matching both the router and the sidebar.**
  Affects L90 (definition → rename to make intent explicit), L93, L104, L145, L158, L166, L174, and the
  L89 comment ("AdminRoute-guarded" is stale — no route uses `AdminRoute` any more).
- **Must not change:** the `/admin/users` gate at L136 (`appRole === 'superadmin'` — already correct for
  `SuperAdminRoute`); the unguarded `/settings` and `/profile/:id` results; any result's `id`/`action`.
- **Verify:** `lint`, `build`. Manual: as **superadmin**, search "rooms" → no rooms/nav results (no
  dead-end); as **admin**, search "rooms" → result appears and opens. Search "user management" as
  superadmin → still appears. Admin loses nothing.
- **Why it counts as a logic change:** it alters which results a role sees. It is listed explicitly in
  your brief and is a *reduction to match existing permissions*, not a permissions change — admin
  capability is untouched, superadmin gains nothing and loses only an affordance that never worked.

### Step 4b — `src/pages/ProfilePage.jsx` · *second instance of the same gate defect (added 2026-10-20)*
- **Finding:** `ProfilePage.jsx:13` defines the identical
  `isAdminLevel = appRole === 'admin' || appRole === 'superadmin'` helper, gating the page's **primary
  back-navigation affordance** at L68–69 and L102–103
  (`to={isAdminLevel ? '/directory' : '/dashboard'}`, label "Return/Back to Directory").
- **Why it is live, not theoretical:** `/profile/:id` (`App.jsx:57`) carries **no role guard** — only
  `ProtectedRoute` — so superadmin reaches every profile page, and `RoleRoute allowedRoles={['admin']}`
  on `/directory` then bounces them to `/dashboard`. A worse instance than Step 4's: a search result is
  optional, but "Back to Directory" is the only way out of the page.
- **Fix:** same rule — rename to an admin-only helper (`appRole === 'admin'`) at L13 and its 4 uses.
  Effect is **superadmin-only**: admin still gets "Back to Directory" (it can reach `/directory`);
  parent/teacher/therapist still get "Back to Dashboard". **No role loses capability.**
- Rides with Step 6 (same file); commit it alongside Step 4's behaviour change.

### Step 5 — `src/components/NotificationPanel.jsx` (332L) · *revertible: yes*
- **Change:** delete `transition={{ delay: index * 0.02 }}` L248 (per-row entrance animation ban);
  `shadow-xl` L159 → `shadow-md`; 1 `font-bold` → policy. The 5 `motion` elements are panel mount — keep.
- **Must not change:** the notification hue config (L33–49), read/unread handling, focus order,
  every `id`/`aria-*`.
- **Verify:** `lint`, `build`; open panel → items appear together, no cascade.

### Step 6 — `src/pages/ProfilePage.jsx` (308L) · *revertible: yes*
- **Change:** replace L113–120 (`h-20 bg-gradient-to-br` + the three legacy-program conditionals) with a
  single flat `h-20 bg-ps-accent-soft` — **deletes 7 lines → 1**. Department identity already lives in
  the badge at L132, so nothing is lost. **This withdraws ADR-4's Profile-header gradient exception**
  (`PLAN_dashboard_uiux_polish.md:278`) — say so in the commit; ADR-4 otherwise stands.
- Remove entrance offsets/delays: L108–110, L199–202 (`delay: 0.1`), L260–263 (`delay: 0.3`), and the
  remaining `initial` offsets (4 total).
- 20 `font-bold` → policy (h1 L129 → `font-semibold`, avatar initial L124 → `font-medium`,
  badges L132/L135 → `font-medium`).
- **Must not change:** `deptColors` / `statusColors` maps, the department-colour `style` on L125
  (program identity — measured 2.56/2.99, sanctioned exception, NOT-doing), session list logic, data hooks.
- **Verify:** `lint`, `build`; profile header is a flat tint, no gradient; badges still show department.

### Step 7 — `src/pages/Login.jsx` (357L) · *revertible: yes — but shared by **every** role*
- **Change:** see **ADR-8** for the decision. Summary:
  - L121 gradient hero → flat `bg-ps-accent dark:bg-indigo-600` (reuses the ADR-7 fill pattern →
    **6.29 ✓ both themes**, no new colour introduced)
  - delete the 3 blur blobs L123–125; delete the Sparkles badge + "Next-Gen Center Intelligence" L138–141;
    delete the 3 feature/stat cards L150–167; footer L171–173 stays
  - headline L143 → one factual line (what the product is), subcopy L145–147 → same line or delete
  - remove the form entrance offset at L178 (keep mount fade)
  - 3 labels (`text-xs font-bold uppercase tracking-wider`, first at L247) → `text-xs font-medium` + drop `uppercase`
  - 11 `font-bold` → policy
- **Must not change:** form fields, `id=`/`aria-*`, validation, lockout flow, `must_change_password`,
  error/lockout banners, submit handler, and **everything below `lg`** — the panel is `hidden lg:flex`,
  so mobile users see zero change.
- **Verify:** `lint`, `build`; `npm run dev` → log in at ≥1024px and <1024px; confirm the
  `must_change_password` path still renders.
- **ADR-4's Login gradient exception is withdrawn by this pass.**

### Step 8 — `src/pages/Settings.jsx` (368L) · *revertible: yes*
- **Change:** `rounded-3xl` L163 → `rounded-2xl`. Leftover indigo role card L242–243 → the same treatment
  as its three siblings (violet/amber/teal use a `border-l-*` accent + token text; make the Faculty card
  consistent instead of hard-coding `indigo-600`/`indigo-700`). Marketing copy L186
  ("Deep indigo and neutral surfaces designed to eliminate eye strain.") → factual description of the
  setting. Remove the 6 tab-switch `initial={{ opacity:0, y:10 }}` offsets (L60–L223 region). `shadow-xl`
  L74 → `shadow-md`. 25 `font-bold` → policy (L41 is a 14px label → `font-medium`; role legend
  L231/L235/L239/L243 `text-xs font-bold` → `font-medium`).
- **Must not change:** tab ids, settings save handlers, **Factory Wipe reachability** (break-glass), and
  — *if P0-8 is approved* — the two modal classNames it touches are Phase 0, not this step.
- **Verify:** `lint`, `build`; click through all 6 tabs → no fade-in stutter; wipe + confirm dialogs still open.

### Step 9 — `src/pages/Rooms.jsx` (483L) · *revertible: yes*
- **Change:** remove the per-row stagger `transition={{ delay: i * 0.03 }}` L177 and its entrance offset
  L175 (cards render together). Heading L286 `text-4xl font-bold` → `text-2xl font-semibold`
  (matches the page-heading scale used elsewhere). 37 `font-bold` → policy. Accent fills L127/L469 →
  `dark:bg-indigo-600` (ADR-7).
- **Two `uppercase` sites missed in the original inventory** *(added 2026-10-20 — found by the
  acceptance sweep, not by the census)*:
  - **L337** — session title inside a card (`<h4 … uppercase tracking-tight">{s.title}`). Content, so
    banned. Drop `uppercase tracking-tight`; weight → `font-semibold` (it is a heading).
  - **L394** — modal title "Add New Room" (`<h3 … uppercase tracking-tight>`). Content, not a sidebar
    section label, so banned. Drop `uppercase tracking-tight`; weight → `font-semibold`.
  Both are the *content-label* class the rule targets; neither is chrome. Expected post-fix
  `uppercase` count in this file: **0**.
- **Must not change:** the occupancy-bar `motion` (`initial={{ width: 0 }}` L215 — that is a data
  animation, not decoration), modal mount, room data/filters, `id`/`aria-*`.
- **Verify:** `lint`, `build`; room grid appears without cascade.

### Step 10 — `src/pages/admin/UserManagement.jsx` (1128L) · *revertible: yes*
- **Change:** 11 `th` (L399–404, L547–551) → drop `uppercase tracking-wider`, keep
  `text-xs font-medium text-ps-ink-2`. `shadow-lg` L463 (dropdown) and `shadow-xl` L744/L817/L1030/L1080
  → `shadow-md`. Accent fills L334/L373/L728/L795/L999 → `dark:bg-indigo-600`.
- **Must not change:** **every `focus-visible:outline-*`** (a11y — your brief mandates preservation),
  the create/delete-user flow and its `admin-create-user` / `admin-delete-user` invocations, role gates,
  any `id`/`aria-*`, and the absence of motion (this file has **zero** `motion` — do not add any).
- **Verify:** `lint`, `build`; tab to a button and confirm the focus ring still renders.

### Step 11 — `src/pages/ScheduleCalendar.jsx` (1468L) · *revertible: yes — **ship last, alone***
Largest file and the densest change-set; isolate it so it can be reverted without losing steps 1–10.
- **Typography:** 9 form labels — L259, L429, L439, L459, L485, L504, L538, L562, L572 — currently
  `text-xs font-bold text-ps-ink-2 uppercase mb-2 block` → `text-xs font-medium text-ps-ink-2 mb-2 block`.
  Remaining 57 `font-bold` → policy.
- **Radius:** L239, L403, L1255 `rounded-t-3xl md:rounded-3xl` → `rounded-t-2xl md:rounded-2xl`
  (mobile sheet keeps its grab-radius; it drops one step to match the scale).
- **Motion:** remove the 4 decorative offsets — L427 (`x:-10`), L536 (`x:10`), plus the remaining
  `initial={{ opacity:0, x|y: … }}` non-drawer instances found by grep. **Keep** the drawer slides
  L236/L400 (`y:'100%'` — those are state changes, explicitly sanctioned by your brief), keep
  `AnimatePresence` exits, keep all `animate-*` state indicators.
- **Decoration:** delete the 3 radial-gradient sheens L244/L408/L1266 (`bg-[radial-gradient(...)]` overlays —
  glow-by-another-name). `shadow-xl` L108/L161 (selected cards) and L239/L403/L1255 (drawers) → `shadow-md`.
- **Primary actions (P0-5):** L939 Auto-Schedule and L952 Set Availability → secondary (border + text);
  L963 Add Session remains the toolbar primary; L323 Save Availability → primary accent; L619/L627 stay
  the single drawer primary; L1276 Confirm delete stays danger.
- **Colour (Phase 0):** L243/L299 → `dark:bg-emerald-700`; `TYPE_CONFIG.playschool.gradient` → append
  `dark:bg-amber-700`; L1276/L1292 → `dark:bg-red-700`; accent fills L580/L619/L627/L847/L963/L1151
  → `dark:bg-indigo-600`; L1412 → accent (P0-5) + `dark:bg-indigo-600`.
  If P0-9 approved: **revert** the `headerTitle`/`headerLabel`/`headerClose` config fields and the ink
  text classes — restore the original hardcoded `text-white*` literals — and instead put `bg-sky-700`
  on the `rehab` header container and `bg-purple-700` on the `sped` one (both L407 and L1265), leaving
  the playschool header on `bg-ps-warn` with white text (5.02 ✓). See the P0-9 correction note.
- **Must not change:** scheduler state, conflict detection (`conflicts` / `enhanceConflictDetection`),
  drag/resize/click handlers, `smartSchedule`, **every `id=` / `aria-label` / `title=`**, drawer
  mount/unmount, or any `day_of_week`/`start_hour` mapping.
- **Verify:** `lint`, `build`, then `npm run dev` and walk: toolbar → Add Session (2 steps) → Save →
  drawer opens/closes → availability modal → auto-schedule → detail panel → delete confirm.
- **Deviations from your citation:** you listed 19 `motion` (21 measured) and did not list the
  3 radial sheens or the 3-way primary competition; the labels/counts you cited all matched exactly.

---

## 4 · ADRs

### ADR-6 — State tokens serve TEXT; fills get local `dark:` overrides · *proposed*
**Context.** `.dark` overrides for success/warn/danger (`index.css:62-64`) were added contrary to
`superadmin_dashboard_polish_plan.md:72`. In light mode the three tokens fail as fill, as text *and*
as tint-text (3.77 / 3.77 / 3.35 · 3.19 / 3.19 / 2.86 · danger-tint 4.13).

**Decision.**
1. Light `@theme` values are darkened to `#047857` / `#b45309` / `#b91c1c`. In light mode fill-with-white
   and text-on-white impose the *same* bound (L ≤ 0.1833), so one value per token fixes all three usages
   at once with a 3-line change and **strictly improves every out-of-scope consumer** (no per-site edits
   outside `index.css`).
2. The `.dark` overrides are **kept** — dark text depends on them (7.44 / 8.79 / 5.01 on surface;
   6.51 / 7.58 / 4.61 on tints, all ✓).
3. Dark **fills** are fixed per-site with `dark:bg-emerald-700` / `dark:bg-red-700` / `dark:bg-amber-700`
   — measured 5.48 / 6.47 / 5.02 with white. In-scope only; out-of-scope dark fills keep today's values.

**Consequences.** Reverses the scope *conclusion* of `superadmin_dashboard_polish_plan.md:72` while
honouring its *reasoning* (one token cannot serve both). That document assumed in-scope danger usage was
a single 3:1 conflict icon; `Settings.jsx`'s danger tab label and Danger Zone copy are in scope now and
need 4.5:1. The ledger in Phase 0 is the evidence.
**Alternatives rejected.** *Remove the dark overrides* → dark text falls to 3.91 ✗/ ✗. *One fill shade
in both themes* → dark text falls to 3.44 ✗ / 2.92 ✗. *Add `--color-ps-success-fill` etc.* → a second
token pair nobody asked for, plus a sweep of every fill site; per-site `dark:` variants are the smaller diff.

### ADR-7 — Dark accent token is split by role: token = text, `dark:bg-indigo-600` = fill · *proposed — needs sign-off*
**Context.** `#6366f1` in dark measures **4.47 as fill** (needs 4.5) and **4.22 as text** and **3.48 on
`accent-soft`** — all three fail. The required intervals (L ≤ 0.1833 for fill, L ≥ 0.2005 for text) do
not intersect, so no single value can fix them.

**Decision.** Move `.dark --color-ps-accent` to **`#818cf8`** (fixes text: 6.33 on surface, 5.21 on
soft) and put `dark:bg-indigo-600` (`#4f46e5`, white 6.29 ✓) on every white-text accent fill.

**Cost — the part that crosses your anti-goal:** ~30 fill sites, of which **10 are outside the in-scope
list** and must be patched or they regress from 4.47 to **2.98**:

| File | Lines |
|---|---|
| `ParentDashboard.jsx` | 73, 243 |
| `TeacherDashboard.jsx` | 102, 211, 319 (config string), 344 |
| `TherapistDashboard.jsx` | 140, 348 |
| `SessionNotes.jsx` | 65 |
| `RequirementsUpload.jsx` | 150 |

Plus 20 in-scope sites (`Layout` L105; `UserManagement` L334/373/728/795/999; `Login` L185/L330 + the
new flat panel; `ProfilePage` L68; `Rooms` L127/469; `ScheduleCalendar` L580/619/627/847/963/1151;
`Settings` L37/95/142).

**Why it must be app-wide rather than in-scope-only:** `Layout` and `NotificationPanel` are **shared by
every role**. Brightening the token changes shared chrome for parents, teachers and therapists too; if
only admin pages' fills were patched, a teacher would see two different indigos in one session. The
10 out-of-scope lines are **regression prevention, className-only, no restyling** — but they do touch
the five files your anti-goal names, which is why this ADR is called out rather than buried.

**Alternatives rejected.**
- *Keep `#6366f1`, fix text in-scope per-site*: ~46 `dark:text-indigo-400` edits (vs 10), creates a
  two-indigo app because shared chrome can't be changed without changing it for everyone, and leaves
  the two accent text rows failing. Rejected as larger *and* less coherent.
- *Darken `--color-ps-accent-soft` in dark* to fix 3.48: would need L ≤ 0.0022 — essentially the page
  background; the tint would cease to exist. Measured, rejected.
- *Brighten to `#818cf8` without patching fills*: 4.47 → 2.98 on every primary button app-wide. Rejected.
- *One CSS rule (`.dark .bg-ps-accent { … }`)*: one line fixes all 43 sites, but it is un-layered CSS
  that outranks every Tailwind utility (including `hover:`/`focus:` variants), it is un-greppable for the
  audit you asked for, and `index.css` is scoped to tokens in this pass. Rejected as too clever.

**Sign-off required:** approve the 10 out-of-scope lines, or strike ADR-7 → accent fills stay 4.47 and
the two accent text rows (4.22 / 3.48) go into NOT-doing as measured, deferred, with a named follow-up
("split the accent token, sweep the whole app at once").

### ADR-8 — Login: **simplify in place**, do not rebuild · *proposed*
**Context.** `Login.jsx` holds the largest single concentration of slop (gradient hero L121, 3 blur blobs
L123–125, marketing badge/headline L138–143, 3 feature cards L150–167, 3 uppercase labels, 11
`font-bold`). It is also the one screen **every role** sees, and the brief asks for the smallest change
that removes the marketing.

**Decision.** Keep the two-column structure and every line of form behaviour; strip the decoration.
- Panel background: gradient → flat `bg-ps-accent dark:bg-indigo-600`. This is **not a new colour** — it
  reuses ADR-7's fill treatment, measures **6.29 ✓ in both themes**, and needs no bespoke exception.
- Delete: 3 blur blobs, Sparkles badge, the "Next-Gen Center Intelligence" eyebrow, the three
  feature/stat cards.
- Copy: headline + subcopy collapse to **one factual line** naming the product and what it does
  (no adjective, no claim). Footer line stays.
- Remove the entrance offset; demote the 3 labels to `text-xs font-medium` without `uppercase`.

**Rejected alternatives.**
- *Delete the panel entirely* — the form would span the viewport with nothing to balance it, and it
  changes the layout rather than the decoration; larger diff, no proportional gain.
- *Rebuild per the ADR-005 `src/ui/` direction* (`UI-SYSTEM-REDESIGN.md`) — that is a separate,
  unexecuted redesign. Out of scope here; noted so nobody assumes this pass implements it.
- *Restyle-but-keep-the-copy* — the brief explicitly names the marketing copy as the problem.

**Consequences.** ADR-4's Login gradient exception (`PLAN_dashboard_uiux_polish.md:278`) is **withdrawn**;
ADR-4 stands for everything else. Mobile (<1024px) is untouched — the panel is `hidden lg:flex`.
Blast radius: all roles see the desktop-left panel change; **no** role sees a form, error, lockout or
`must_change_password` change.

---

## 4.1 Cross-cutting rules (apply in every step)

1. **`font-bold` policy.** Exactly three weights in the admin surface:
   page/section headings → `font-semibold`; labels, table headers, buttons, badges, eyebrows → `font-medium`;
   body → default. `font-bold` survives **only** on a true display heading (`h1` with `font-display`).
   Default answer when unsure: `font-medium`.
2. **Radius scale.** `rounded-2xl` = panels/drawers/modals · `rounded-xl` = cards, rows, buttons, inputs ·
   `rounded-lg` = pills, chips, segmented controls, table cells. No `rounded-3xl` anywhere in scope.
   Mobile bottom sheets keep `rounded-t-2xl`.
3. **No `uppercase` on content labels.** Form labels, buttons, table `th`, card titles → sentence case.
   The sidebar's nav **section** labels may keep `uppercase` (chrome, not content).
4. **No decorative icons beside headings.** Icons stay for *state, category and affordance*
   (a conflict ⚠, a room type, a close ✕) — never as a bullet in front of a title.
5. **No per-row entrance animation.** Lists, table rows, cards, grid tiles and search results render
   together. Entrance/exit motion is reserved for **state changes**: modal and drawer mount/unmount,
   sidebar collapse, tab switches.
6. **Elevation.** Nothing gets `shadow-lg`/`shadow-xl`/`shadow-2xl`. An element that genuinely floats
   (modal, drawer, dropdown, tooltip) gets `shadow-md`; everything else `shadow-sm` or none.
7. **No decoration.** No `bg-gradient-to-*`, no `blur-[0-9]xl` / `backdrop-blur*`, no glow, no
   radial-sheen overlay, no `shadow-2xl`. **Standing exceptions** (unchanged by this pass): legacy
   program colours used as text/border/badge for program identity.
8. **Motion & reduced motion.** Framer Motion is muted globally via `MotionConfig reducedMotion="user"`
   (Step 1) **and** the CSS guard at `index.css:123-130` stays as-is. Do not add per-component
   `useReducedMotion`.
9. **One primary action per surface.** Filled = accent. Success/warn = state. Danger = destructive only.
   All other buttons secondary or ghost.
10. **Preservation contract.** Every `id=`, `aria-*`, `title=` survives byte-identical. No state moves
    into components — `GlobalStateContext` remains the single source. No `service_role` in the frontend.
    No new dependencies. No logic in presentational steps except Step 4's explicitly sanctioned gate fix.

---

## 5 · Acceptance checklist

- [ ] `npm run lint` → exit 0
- [ ] `npm run build` → exit 0; CSS **≤ 79.5 kB**, JS not materially up. *(Cap raised from 78.35 kB:
      Phase 0 adds 7 spec-required classes — 5 `dark:bg-*`, 1 `dark:hover:bg-red-700`, `text-ps-ink-1/70`
      — plus 4 newly-referenced colour vars ≈ 0.62 kB. Measured 78.97 kB. The original cap was a bloat
      guard against the previous pass, not a constraint on required accessibility classes.)*
- [ ] `grep -rn "AdminRoute" src` → definition in `RouteGuards.jsx` only (comment in `GlobalSearch.jsx` rewritten)
- [ ] `grep -rn "bg-gradient-to" src` → **0** (Login + ProfilePage both gone)
- [ ] `grep -rn "blur-\[" src` → **0**; `backdrop-blur` → **0**; `shadow-2xl`/`font-black` → **0**
- [ ] `grep -rn "shadow-xl\|shadow-lg"` in the 10 in-scope components → **0**
- [ ] `grep -rn "rounded-3xl"` in the in-scope files → **0**
- [ ] `grep -rn "text-[0-9]*px"` in `src` → **0** (already true — must stay true)
- [ ] `grep -c "font-bold"` in `ScheduleCalendar` ≪ 66 (target: display headings only, ≤ 8); `Rooms` ≪ 37; `Settings` ≪ 25; `ProfilePage` ≪ 20; `Directory` ≪ 15
- [ ] `grep -n "uppercase"` in `ScheduleCalendar` → **0** at the 9 form labels; `UserManagement` → **0** at the 11 `th`; sidebar section labels still present
- [ ] `grep -rn "delay: index\|delay: i \*"` in in-scope files → **0**
- [ ] **Contrast ledger verified live**, not from this document: each Phase 0 row re-measured in the browser
      (both themes) and recorded with its number
- [ ] `dark:bg-indigo-600` count == audited white-text accent-fill count (20 in-scope + 10 out-of-scope if ADR-7 approved)
- [ ] `dark:bg-emerald-700` / `dark:bg-red-700` / `dark:bg-amber-700` present at every in-scope state fill
- [ ] Manual `npm run dev`: login at ≥1024px and <1024px · Settings all 6 tabs + Factory Wipe +
      confirm dialogs open · admin searches "rooms"/"directory"/"schedule" and arrives · superadmin
      searching "rooms" gets **no** dead-end and still reaches System Console · Schedule add/edit/
      availability/autoschedule/detail/delete walk-through · focus rings visible on every primary button
- [ ] `prefers-reduced-motion: reduce` honoured for **both** CSS and Framer Motion (drawer stops sliding, fades remain)
- [ ] Dark + light visual pass: no two-tone indigo visible on any single screen; `AdminDashboard.jsx`
      diff is **empty** (reference implementation, not a target)

---

## 6 · NOT doing (explicit)

1. **No restyling of parent / teacher / therapist dashboards or `SessionNotes`, `AdminDashboard`, `RequirementsUpload`, `ClearDatabaseModal`, `ForceChangePasswordModal`** — with exactly two declared exceptions if approved: the **10 ADR-7 regression-prevention fill lines** (§ADR-7 table) and the **3 P0-8 contrast lines** (Settings-flow gates). Both are className-only and both are called out so you can strike them.
2. **Not re-doing the previous pass.** `docs/PLAN_dashboard_uiux_polish.md` §9 residuals stand: the
   NotificationPanel hue collapse, `AdminDashboard` itself, and its chrome sweep. No `AdminDashboard.jsx` edit.
3. **No new cards, charts, metrics, panels or sections** anywhere — including the Settings role legend
   (its four cards are *recoloured*, never added to).
4. **No animation added.** Only removal (or retention of existing state motion).
5. **No permissions changes.** Step 4 narrows a search result to match routes that already exist; admin
   loses nothing, superadmin gains nothing.
6. **No logic/state changes** outside Step 4: scheduler, conflict detection, `smartSchedule`, `auth`,
   `GlobalStateContext`, all Supabase queries, all Edge Function invocations untouched.
7. **No `service_role` in the frontend; no new dependencies** (`MotionConfig` ships with the installed `framer-motion@12.38.0`).
8. **No new tokens.** No `--color-ps-success-fill` or any second token pair (ADR-6).
9. **Legacy program colours stay as-is** — measured 2.56 / 2.99 as text and badge. The brief explicitly
   sanctions them for program identity; darkening `--color-rehab` / `--color-sped` would change
   out-of-scope appearance. Named follow-up: "program colours → AA-passing variants".
10. **Dark state fills on out-of-scope dashboards stay failing** (2.54 / 3.76 / 2.15) — tokens unchanged,
    values identical to today, so no regression. Named follow-up with #9.
11. **`UI-SYSTEM-REDESIGN.md` is not implemented here** (`src/ui/`, Fraunces/Manrope, slate/indigo
    ban). Unrelated, unexecuted direction; only its `reducedMotion="user"` note is cited as prior art.
12. **No `text-[Npx]`, no `font-black`, no `backdrop-blur`, no `shadow-2xl`, no `uppercase`-as-decoration,
    no emoji, no per-component reduced-motion logic.**
13. **No tests written** — there is no test harness and none is introduced; verification is the §5 checklist.

---

## 7 · Execution notes (appended 2026-10-20 — status: ✅ EXECUTED)

### 7.1 Verification (final, run centrally by the architect)

| Check | Baseline | Final |
|---|---|---|
| `npm run lint` | exit 0 | **exit 0** |
| `npm run build` | exit 0 | **exit 0** |
| CSS | 78.35 kB | **74.95 kB (−3.40 kB)** |
| JS | 806.62 kB | **804.70 kB (−1.92 kB)** |
| `npm run dev` | — | **boots clean** (Vite v8, 292 ms; `Rooms.jsx` transform HTTP 200) |
| `src/pages/admin/AdminDashboard.jsx` | reference | **diff empty — untouched** |

Acceptance sweep across all 10 in-scope components + `App.jsx` — **every target is 0**:
`shadow-xl` · `shadow-lg` · `shadow-2xl` · `rounded-3xl` · `font-black` · **`font-bold`** ·
`backdrop-blur` · `bg-gradient-to` · `blur-[` · **`uppercase`** · `delay: index` · `delay: i *` ·
`isAdminLevel` · `text-[Npx]`.
Repo-wide: `bg-gradient-to` **0**, `\bAdminRoute\b` **1** (the retained `RouteGuards.jsx` export).

**Correction to the sweep line above (added 2026-10-20, post-commit re-audit): `font-bold` is 2, not 0.**
Both are exactly the sanctioned case — a true `h1` carrying `font-display`:
`Settings.jsx:126` and `Login.jsx:133`. The claim that "no `font-display` heading exists in any in-scope
file" was wrong, as was the assertion that every target was 0. Every *other* target in that sweep is
genuinely 0. `GlobalSearch.jsx:262` was a real third instance (a `text-sm` `h4`, no `font-display`,
over a `font-semibold` sub) and was fixed to `font-semibold` / `font-medium` *after* this section was
written — it was never covered by any step, because Step 4's brief specified only the elevation swap
and the gate fix. Weights elsewhere are `font-semibold` (headings + stat values) / `font-medium`
(labels, buttons, badges). All three values pass the ≤8 / ≪37 / ≪25 / ≪20 / ≪15 targets.

**`dark:bg-indigo-600` count is 34, not the 31 §5 item 13 predicts.** Breakdown: 10 out-of-scope
(exact match to the ADR-7 table) + 24 in-scope. The in-scope audit listed 6 `ScheduleCalendar` sites
but wrote the subtotal as 20 when the list itself sums to 21; execution found 9 in `ScheduleCalendar`.
Extra overrides on white-text accent fills cannot fail — indigo-600 + white is 6.29, so applying one
where it was not strictly needed only moves a 4.47 fail to a pass. Same known defect as deviation #2:
the original census undercounted.

### 7.2 Deviations found during execution — all resolved, none left open

| # | What the plan got wrong | Resolution |
|---|---|---|
| 1 | **P0-9 was measured in light mode only.** Swapping white → `text-ps-ink-1` fixed light (6.72/6.46) and left dark at **2.27/2.64**, because `--color-ps-ink-1` is theme-adaptive. A gap in my measurement, caught by the implementing agent. | Inverted the fix: darken the **fill** (`bg-sky-700` = 5.87, `bg-purple-700` = 6.96) and keep white text byte-identical. Symmetric across themes, zero text changes. |
| 2 | **The audit grepped only the 2 headers.** `cfg.gradient` feeds **8** sites; the agent's census surfaced 6 more. | 5 accent rails left alone (decoration, program type stated in text → WCAG 1.4.11 exempt); **L448 selected category button** was a genuine 2.56/2.99 fail → made accent (P0-9b), since the brief permits program colours as identity *text/border/badge* and never as a fill. |
| 3 | **Only `GlobalSearch:89` was named.** `ProfilePage:13` has the identical `isAdminLevel` gate — and it is the worse instance: `/profile/:id` has **no role guard**, so superadmin reaches the page, and the *only* back-navigation ("Back to Directory") then bounces them to `/dashboard`. | Added **Step 4b**; renamed to `isAdminOnly` (4 uses). Effect is superadmin-only — no role loses capability. |
| 4 | **Rooms' 2 `uppercase` sites were missed by the census** (L337 card title, L394 modal title) — found by the acceptance sweep, not the inventory. | Folded into Step 9; both dropped to sentence case + `font-semibold`. |
| 5 | **Login inventory said 2 offset-anims; Step 7 named only the form wrapper.** Error banner `y:-10` and lockout `scale:0.95` were left. | Follow-up: both demoted to plain opacity fades — offset removed, entrance kept (they are state banners). |
| 6 | **Settings: "6 offsets" → 5 exist** (the 6th is the sanctioned drawer slide); **"three" role siblings → four** (pink/Parent). | No action needed; agent read the file rather than the census. |
| 7 | **Rooms stat values** were demoted to `font-medium` by rule; the reference impl uses `font-semibold` for stat values. | **Reference wins** (the brief names it the target pattern): L301/L310 → `font-semibold`. Weight only; `font-display` not added, since no font-family change was requested. |
| 8 | CSS cap **≤ 78.35 kB** was written as a hard gate. | Raised to ≤79.5 in-plan: Phase 0 adds 7 required classes ≈ 0.62 kB. **Actual landed at 74.95 kB** — the Login/ProfilePage/Settings deletions more than paid for the contrast classes. The cap is comfortably met. |

### 7.3 Structural observations worth carrying forward

- **P0-5 (one primary per surface) did more than colour work.** Demoting Auto-Schedule and Availability
  to secondary deleted two of the six green-fill contrast sites outright — the toolbar fix and the
  contrast fix turned out to be the same change.
- **ADR-7's 10 out-of-scope lines cost nothing visually.** `dark:bg-indigo-600` is `#4f46e5`, which is
  what those buttons already render in light mode; only dark-mode fill shade moved, and it moved to a
  passing value.
- **The dead `AdminRoute` import could never have been caught by lint** — `varsIgnorePattern ^[A-Z_]`
  swallows it. Grep is the only tool; `\bAdminRoute\b` is the correct pattern (a plain substring match
  false-positives on `SuperAdminRoute`, which cost a round-trip here).

### 7.4 Not done — owed

- **Browser walkthrough.** No test harness exists and no dependency may be added, so the §5 manual
  checklist (login at both breakpoints, Settings tabs + Factory Wipe, admin vs superadmin search,
  schedule add/edit/availability/autoschedule/detail/delete walk-through, focus rings, both themes,
  `prefers-reduced-motion`) **was not performed.** Greps, lint, build and a dev-server boot all pass;
  visual confirmation of the color ledger against a live browser remains open.
- **COMMITTED (superseded 2026-10-20).** The line that stood here read "Nothing is committed."
  Two commits now exist on `feature/ui-system-redesign`:
  `1e75e6a` *style: admin surface de-slop + contrast fixes* (18 files) and `5003c54` *fix: narrow two
  admin-only gates to match their routes* (2 files). Both trees were built in isolation before landing,
  so either commit can be reverted alone. The per-step topology of §8 was **not** achievable — the
  previous pass, Phase 0 and Phase 1 are interleaved inside the same files, and separating `index.css`
  from its fill overrides would yield an intermediate commit where every dark primary button renders
  `#818cf8` behind white text (2.98). What was isolated is behaviour vs styling.

## 8 · Blast radius

| Area | Exposure | Mitigation |
|---|---|---|
| **`Login.jsx`** | **Every role, every login.** Largest single-user-visible change — desktop-left panel only; mobile (<1024px) sees **zero** change. | ADR-8; form, error, lockout and `must_change_password` paths byte-identical; verified at both breakpoints. |
| **`GlobalSearch.jsx`** | Shared chrome, every role — but the change is a *removal* of results superadmin could never open. | Ship separately from styling; verify as **both** admin and superadmin. Admin's results unchanged. |
| **`index.css` state tokens (P0-1)** | **All roles, all pages** — every success/danger/warn element in light mode gets slightly deeper. | Strictly contrast-improving (measured); appearance-only; 3 lines; zero per-site edits outside `index.css`. |
| **`--color-ps-accent` dark token (ADR-7)** | **All roles, all pages** — links/icons/focus rings become a brighter indigo; ~30 fill sites need an override. | **Needs explicit sign-off.** 10 lines fall outside the in-scope list (ADR-7 table); those are regression-prevention only. |
| **`Layout.jsx`, `NotificationPanel.jsx`** | Shared by all roles; light touch (≤ 4 lines each). | Isolated in Steps 2 and 5. |
| **`ScheduleCalendar.jsx`** | Admin-only route; biggest diff. | Shipped **last and alone** so steps 1–10 survive a revert. |
| **`App.jsx` / `RouteGuards.jsx`** | App-wide boot path. | One import line + one wrapper; guards and route table untouched. |
| **Out-of-scope dashboards** | `ParentDashboard`, `TeacherDashboard`, `TherapistDashboard`, `SessionNotes`, `RequirementsUpload` — touched **only** by ADR-7's 10 lines (and optionally P0-8's 3). | Listed line-by-line; `AdminDashboard.jsx` **not** touched at all; every other out-of-scope byte unchanged. |
| **Previous pass's work** | 19 files, uncommitted in the working tree. | This plan layers on top; no previous-phase file is reverted. Git warns LF→CRLF — leave line endings alone. |

**Commit shape (recommended):** `1` App/RouteGuards · `2` Layout · `3` Directory · `4` GlobalSearch
(behaviour fix, separate) · `5` NotificationPanel · `6` ProfilePage · `7` Login · `8` Settings ·
`9` Rooms · `10` UserManagement · `11` ScheduleCalendar · plus **one Phase 0 commit** before all of
them (`index.css` tokens + fill overrides), so colour can be reverted independently of de-slop.
