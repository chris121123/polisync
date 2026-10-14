# SuperAdmin Account — UI/UX Audit & Revision Plan (v2)

Date: 2026-10-14 · Scope: everything a `superadmin` sees/does · Re-audit after v1 implementation.

## 1. Status of v1 plan (verified in code)

| v1 item | Status |
|---|---|
| 1.1 ⌘K toggles open/close | ✅ `GlobalSearch` takes `onToggle`; `Layout` passes it |
| 1.3 `superadmin` filter chip | ✅ chip array includes it, labeled "Super Admin" |
| 1.4 `alert()` → toast | ✅ no `alert(` left |
| 1.5 Fake trends (`+12%`, `−2%`) | ✅ removed; subtexts are real derived counts |
| 1.6 Dead "Analyze Roster" | ✅ removed |
| 1.7 Mobile overlay | ✅ `isMobile` state, no render-time `window.innerWidth` |
| 2.2 Activity tab | ✅ added, lazily fetches `audit_logs` |
| 2.3 Name/email search | ✅ composes with role filter |
| 2.4 `overflow-x-auto` + "Session Notes" rename | ✅ table has `min-w-[640px]` |
| 2.5 Search page results | ✅ "User Management" indexed |
| Bonus | ✅ Superadmin quick-actions block + role-aware title in `AdminDashboard` |

v1 shipped. This re-audit targets **what v1 got wrong** and the **role-level fit** question.

## 2. Re-audit findings (ranked)

### P0 — broken in what shipped
1. **Activity tab is permanently empty for the real superadmin.** The RLS policy `audit_logs_admin_read` (migration `005`, line 43) grants SELECT only to `role = 'admin'`. Migration `010` updated every sibling policy to `IN ('admin','superadmin')` — it lists `user_roles, profiles, students, sessions, rooms, programs, …` — but **missed `audit_logs`**. Result: a superadmin's `audit_logs` select returns `[]` with no error; the tab shows "No activity logs found" forever. Plain `admin` sees it.
2. **Activity rows render `undefined`.** The tab reads `log.target_name`, `log.actor_name`, `log.actor_email` (`UserManagement.jsx:465-468`) — **none of these columns exist**. `audit_logs` has `action, performed_by, target_user_id, details, ip_address, created_at`, and the inserts in `GlobalStateContext` / `admin-create-user` write only those. Every row will read e.g. `user_deleted — undefined / System`.
3. **"Create User" quick action is a lie.** `AdminDashboard.jsx:66` navigates `state: { openCreate: true }`; `UserManagement.jsx` never reads `location.state` (no `useLocation` import). Button navigates; modal never opens.

### P1 — role-level fit (the actual ask)
4. **No system-level overview.** The superadmin dashboard shows center-operations stats (room occupancy %, sessions). A system owner needs: **accounts by role** (5 staff + N students is detectable only via filter chips), inactive/deactivated account count, recent admin actions. None exist above the fold.
5. **No audit visibility anywhere else.** Activity is buried inside User Management's third tab. For an oversight role it belongs on the dashboard (last 5 events) — but see finding 1: needs the RLS fix first.
6. **Flat nav hides role level.** Superadmin and admin see the same 6-item list; the only signal is the violet User Management entry. Nothing marks the "system" surfaces (User Management, Activity, Database-in-Settings) as a distinct level from day-to-day operations (Schedule, Directory, Rooms).
7. **Directory hides superadmin accounts** (`Directory.jsx:120`: `staff.filter(s => s.app_role !== 'superadmin')`) while User Management and the dashboard include them. Three surfaces, two answers. Needs a product decision (see §3).

### P2 — carried over, still open
8. Contrast: `text-slate-400` ≈ 2.8:1 on white; used for muted/body-adjacent text repo-wide (token decision, fence to touched files).
9. Icon-only hit areas are 32px (`p-2`); 44px minimum per WCAG/UX guidance.
10. No `aria-label` on icon-only buttons (menu toggle, kebab trigger, bell has `title` only).
11. Modal z-index war: `z-[9999]` (User modals) vs `z-[10000]` (self-role) vs `z-[100000]` (force password) vs `z-[200]` (clear DB) — ad-hoc scale, one overlapping modal loses.

## 3. Decisions (resolved 2026-10-14)

| # | Decision | Outcome |
|---|---|---|
| D1 | Migration `012_superadmin_audit_read.sql`: `audit_logs_admin_read` → `role IN ('admin','superadmin')` | ✅ **Approved by user.** Superadmin is a superset of admin in every other policy; the omission was an oversight in `010`. |
| D2 | Superadmin accounts in Directory | ✅ **Approved — show them.** Staff with departments; excluded today only in `Directory.jsx:120`. |

Both gates open. Phases 2–4 are buildable as written.

## 4. Revised plan

### Phase 1 — Fix P0 (≈30 lines, no migration needed)
| # | Change | File(s) |
|---|--------|---------|
| 1.1 | Join names client-side: map `performed_by`/`target_user_id` → staff names (already in `staff` state), render `action` + name + time. Drop the nonexistent fields. | `UserManagement.jsx` |
| 1.2 | Read `location.state.openCreate` in `UserManagement` (`useLocation` + one effect) → auto-open create modal once, then clear state. | `UserManagement.jsx` |

### Phase 2 — Gated on D1 (migration + dashboard oversight)
| # | Change | File(s) |
|---|--------|---------|
| 2.1 | **If D1 approved:** new migration `012_superadmin_audit_read.sql` (policy swap above). I approve the SQL; user sign-off required. | `supabase/migrations/` |
| 2.2 | Dashboard "Accounts by role" strip: one chip per role with count (from `staff`), violet for superadmin — replaces nothing, adds the missing system view. | `AdminDashboard.jsx` |
| 2.3 | Dashboard "Recent Activity" mini-list (last 5 `audit_logs`, same join as 1.1). **Skipped if D1 not approved.** | `AdminDashboard.jsx` |

### Phase 3 — Role-level navigation + product decision (gated on D2)
| # | Change | File(s) |
|---|--------|---------|
| 3.1 | Sidebar sections: "Operations" (Schedule/Directory/Rooms) + "System" (User Management — superadmin only; Settings). Section labels only, no route changes. | `Layout.jsx` |
| 3.2 | **If D2 approved:** remove the `app_role !== 'superadmin'` exclusion in Directory. | `Directory.jsx` |

### Phase 4 — Hygiene (unchanged from v1, fenced)
- 8. Contrast in **touched files only**: `slate-400` text → `slate-500`/`600`. Repo-wide token change stays a separate decision (GEMINI.md table too).
- 9./10. Icon buttons: `aria-label` + 40px hit area in touched files.
- 11. Adopt a documented z-scale (`z-[100]` page overlay, `z-[1000]` modal, `z-[10000]` force-password above all) — touched files only.

### Out of scope
- Role model / RLS changes beyond D1 · new dependencies · re-theme · rebuilding other role dashboards · session-notes content in the admin console (accepted: superadmin has RLS read and it's legitimate center-wide oversight)

## 5. Verification (no test suite — per AGENTS.md)

1. `npm run lint` && `npm run build`
2. As superadmin: Activity tab shows rows with **real names, no "undefined"** (proves 1.1); dashboard "Create User" opens the modal (proves 1.2); after 2.1, dashboard activity list matches the tab.
3. Regression as `admin`: audit visibility unchanged (policy keeps admin); no User Management nav; Directory count unchanged if D1/D2 approved.
4. Mobile <1024: nav sections + table scroll + overlay.

## 6. Handoff

- Phase 1: `frontend` (one PR)
- Phase 2.1 migration: `database-expert` drafts, **my sign-off + user approval before apply**
- Phase 2.2–3: `frontend`; `ui-ux-designer` gate on 2.2/3.1; `code-reviewer` before merge
