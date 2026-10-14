# Admin Account — UI/UX Audit & Revision Plan (v1)

Date: 2026-10-14 · Scope: everything an `admin` (not superadmin) sees/does · No schema changes proposed.

## 1. What the admin actually sees (traced surface)

- Login → `/dashboard` → `Dashboard.jsx` routes `admin|superadmin` → `AdminDashboard` (shared; superadmin-only blocks hidden). Nav accent amber, title "Admin Dashboard" in nav / "Dashboard Overview" on page.
- Sidebar (`Layout.jsx:62-76`): ADMIN Dashboard (ungrouped) · Operations: Schedule, Directory, Rooms · System: Settings. **No User Management** (superadmin-only).
- `/admin/users` → `SuperAdminRoute` redirects to `/dashboard` (`App.jsx:51`).
- Settings: Appearance (working) · Center Information · Notification prefs · System & Privacy · ~~Database Management~~ (superadmin-only, hidden).
- Operational pages: `ScheduleCalendar`, `Directory`, `Rooms`, `ProfilePage` — all shared with superadmin.
- NotificationPanel, GlobalSearch, toasts — role-badged, no role-specific breakage found.

Boundary note (verified in migrations): migration `004` dropped the `Allow public access` policies from `001`; writes on `students/sessions/rooms/profiles` are `admin|superadmin`-only (RLS, `010`). `audit_logs` read is `admin|superadmin` after migration `012` (file drafted, **not yet applied**). So the admin's data reach is real and bounded — the gaps below are UI, not RLS.

## 2. Audit findings (ranked, file:line)

### P0 — broken or lying controls
1. **ProfilePage "Case Notes" is a dead form** (`ProfilePage.jsx:234-248`): uncontrolled `<textarea>` + "Save Note" button with no state and no handler. Every profile view, every role. Typing then clicking does nothing, silently.
2. **Reschedule suggestions assert a false guarantee** (`ScheduleCalendar.jsx:1336`): caption reads `{room} · confirmed available` — nothing checks conflicts. `handleReschedule` (line 735) only calls `moveSession`; suggestions are blindly +1/+2/+3h. Also never suggests a different room.
3. **Session delete is one click, no confirmation** (`ScheduleCalendar.jsx:1219`): the detail-panel trash icon calls `deleteSession` directly. Destructive, no confirm, on drag-and-miss territory.
4. **Settings below "Appearance" is entirely decorative**: "Save Changes" has no onClick (`Settings.jsx:149`); Center Information inputs are `defaultValue`-only (`SettingInput`, line 123) with hardcoded fake values ("123 Harmony St., Metro Manila, PH"); accent-color picker does nothing (lines 176-192); notification toggles are local-only state (lines 215-229); "View Privacy Policy & Terms of Service" dead (line 254); "Last backup: 24 minutes ago" is fabricated copy (line 249).
5. **Rooms has three dead/fake blocks**: "Generate Utilization Report" button, no handler (`Rooms.jsx:440`); "List view is in development" dead-end behind a working toggle (line 277-287); "Venue Resources" amenities are a hardcoded array presented as room facts (lines 416-423).
6. **Directory "Add Staff" cannot succeed** (`Directory.jsx:54-56` + `addPerson`): selecting "Staff / Provider" inserts a `profiles` row **with no `id`** — and `profiles.id` has no DB default (migration `001`, verified: only `student_documents` gets `gen_random_uuid()`). Every attempt errors with a raw Postgres null-PK message toasted at the user. Dead option that looks functional.

### P1 — admin-level friction
7. **Availability-first trap in Add Session** (`ScheduleCalendar.jsx:335-352`): with zero `staff_availability` rows (fresh system), the provider dropdown says "No staff available for this date" and Next is disabled — with no hint that the Availability modal must be used first. Admin is stuck with no guidance.
8. **Title mismatch**: nav says "Admin Dashboard", page says "Dashboard Overview" (`AdminDashboard.jsx:57` — the superadmin alias exists but admin doesn't get it).
9. **`filteredSessions.sort()` mutates the `useMemo` result during render** (`ScheduleCalendar.jsx:945`). Works by accident; should be `[...filteredSessions].sort(...)`.
10. **Drag-to-room math is selector-brittle** (`ScheduleCalendar.jsx:760`): `e.target.closest('.flex-1.relative.border-l')` couples behavior to a Tailwind class string; any styling change silently misassigns rooms.
11. **Routes not role-guarded** (carried from the superadmin round, still open): `/schedule`, `/directory`, `/rooms`, `/profile/:id` are `ProtectedRoute`-only. Nav hides them from teacher/parent/therapist, but URLs work; RLS limits the damage, the UI doesn't.

### P2 — carried hygiene (fence to touched files)
12. `text-slate-400` ≈2.8:1 contrast on white; 13. 32px icon hit areas; 14. `Layout.jsx` has a third `window.innerWidth` reader pattern avoided already — n/a now.

## 3. Decisions (resolved 2026-10-14)

| # | Decision | Outcome |
|---|---|---|
| D1 | Settings decorative sections | ✅ **Approved — strip.** Keep Appearance + version row; delete Save button, Center Information, accent picker, Notifications card, privacy link, fake backup line. |
| D2 | Directory "Add Staff / Provider" | ✅ **Approved — remove.** Student-only adds at admin level; staff accounts are superadmin's via `admin-create-user`. `addPerson` staff branch stays API-compatible but unreachable. |
| D3 | Route guards on schedule/directory/rooms | ✅ **Approved — wrap in `AdminRoute`.** Matches nav visibility + RLS. Teacher/parent/therapist redirect to `/dashboard`. |

All gates open.

## 4. Plan

### Phase 1 — Stop the lies (≈120 lines, 5 files)
| # | Change | File(s) |
|---|--------|---------|
| 1.1 | Delete the Case Notes card (dead textarea + Save). Admin isn't a note author; therapists own notes (`addSessionNote`). | `ProfilePage.jsx` |
| 1.2 | Make reschedule suggestions honest: compute conflict-freeness per suggested hour using the same overlap+therapist/room logic as `AddSessionModal.conflictMessage` (lines 354-368); show only safe slots; caption "{room} · no conflict at this time"; if none, show a neutral empty line. | `ScheduleCalendar.jsx |
| 1.3 | Two-step delete in the detail panel: trash → inline "Confirm delete?" state → `deleteSession`. Reuse existing provider (it toasts). No new modal. | `ScheduleCalendar.jsx |
| 1.4 | **If D1 = strip:** delete the Save button, Center Information card, accent picker block, Notifications card, privacy button, fake backup sentence. Keep Appearance + System&Privacy version row. **If D1 = label:** add "Coming soon" state + disabled buttons instead. | `Settings.jsx |
| 1.5 | Rooms: remove "Generate Utilization Report" button, remove the hardcoded Venue Resources array, remove the list-view toggle (grid only). | `Rooms.jsx |
| 1.6 | **If D2 = remove:** drop the "Staff / Provider" option from AddRecordModal; modal copy → "Add Student Record"; `addPerson` Staff branch stays (API-compatible) but unreachable from UI. | `Directory.jsx |

### Phase 2 — Admin-level fit (≈40 lines, 3 files)
| # | Change | File(s) |
|---|--------|---------|
| 2.1 | Availability guidance: when `staffAvailability` has no rows for the selected date, show a hint + button that opens the Availability modal (already openable from toolbar — pass an opener or lift state). | `ScheduleCalendar.jsx |
| 2.2 | Admin title: `appRole === 'admin' ? 'Admin Dashboard' : 'Super Admin Dashboard'` on the page (nav already says it). | `AdminDashboard.jsx |
| 2.3 | `[...filteredSessions].sort(...)` — kill the render-time mutation of memo output. | `ScheduleCalendar.jsx |
| 2.4 | **If D3 = wrap:** `<AdminRoute>` around schedule/directory/rooms routes in `App.jsx` (same pattern as `/admin/users`). | `App.jsx |

### Phase 3 — Hygiene (fenced, touched files only)
- 12/13/14. `slate-400` text → `slate-500/600` in touched files; `aria-label` + ≥40px hit area on touched icon buttons (session trash, room panel close, Rooms view toggles). No repo-wide re-theme.

### Out of scope
- Schema/RLS changes (none needed; `012` already covers the only gap)
- Teacher/therapist/parent level dashboards (their own audit)
- Wiring the Settings sections for real (product scoping, not a UI fix)

## 5. Verification (per AGENTS.md — no test suite)

1. `npm run lint` && `npm run build`
2. As admin: dashboard (title) → Schedule (create session incl. zero-availability hint, reschedule suggestion safety, two-step delete) → Directory (student add only; no Staff option) → Rooms (grid only, no dead buttons) → Profile (no Case Notes) → Settings (stripped or labeled, nothing lies) → ⌘K, bell, toasts.
3. Regression as superadmin: everything above still reachable; User Management intact; Settings still shows DB management.
4. If D3 approved: as teacher — `/schedule` and `/directory` redirect to `/dashboard`.

## 6. Handoff

- Phase 1: `frontend` (one PR) · Phase 2: `frontend` · `ui-ux-designer` gate on 2.1 · `code-reviewer` before merge.
- Follows the same review bar as the superadmin round: no `alert()`, no silent fetch failures, `notify()` for errors.
