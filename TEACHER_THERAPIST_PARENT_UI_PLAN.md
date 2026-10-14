# Teacher / Therapist / Parent — UI/UX Audit & Revision Plan (v1)

Date: 2026-10-14 · Scope: everything `teacher`, `therapist`, `parent` see/do · No schema changes proposed (one optional migration gated on D4).

## 1. What each role actually sees (traced)

- All three land on `/dashboard` → `Dashboard.jsx` switches per `appRole`. No dedicated routes except therapist's `/therapist/notes` (`TherapistRoute`).
- Sidebar: teacher = Dashboard + Settings. Parent = Dashboard + Settings. Therapist = Dashboard + Session Notes + Settings. (Schedule/Directory/Rooms are `AdminRoute`-wrapped since the admin round.)
- `/profile/:id` is `ProtectedRoute`-only for every role; `GlobalSearch` staff/student results are ungated for every role.
- RLS (verified): `session_notes` writable by creator + therapist/owner of the session + admin; `attendance` writable by admin + session owner + any teacher; `student_documents` viewable by linked parent / any teacher-or-therapist / admin, parent-insert only for own children, **no parent delete policy**.

## 2. Audit findings (ranked, file:line)

### P0 — data loss / crashes
1. **Therapist "Save Note" discards the note.** `TherapistDashboard.jsx:37-42` — `handleAddNote` only clears local state; `addSessionNote` (context, working, RLS-allowed) is never called. Every note typed on the dashboard is thrown away.
2. **Therapist note has no student.** Even if wired, the modal collects content + rating only. Sessions carry multiple `studentIds`; `session_notes.student_id` would persist as null. Needs a student picker (D2).
3. **Parent dashboard crashes for the common single-child family.** `ParentDashboard.jsx:140-141,155` read `selectedChild.id` while `selectedChild` is `null` (`activeChild` falls back to `parentChildren[0]`, line 17). TypeError → blank page. Multi-child highlight is also broken: line 58 compares the stored child *object* to `child.id`.
4. **Teacher attendance closes after every single mark.** `TeacherDashboard.jsx:30-33` — `handleMarkAttendance` calls `setShowAttendanceModal(null)` per student. A class of 8 needs 8 modal reopens.

### P1 — wrong or missing for the role
5. **Teacher modal is missing the 4th legal status.** DB CHECK allows `present/absent/late/excused`; modal (`TeacherDashboard.jsx:173-193`) offers three. No notes field although `markAttendance` accepts notes. No existing-marks display although `fetchAttendance` exists in context — teacher can't tell what's already marked.
6. **Teacher stats lie twice.** "Students" and "Programs" cards both render `myAssignments.length` (`TeacherDashboard.jsx:52-72`). "This Week" is an unfiltered all-time count. The fetched `myAssignments` join (program names) is never displayed — contrast therapist's "My Programs" list.
7. **Parent "Programs Enrolled" shows the wrong programs.** `ParentDashboard.jsx:124` renders global `programs.slice(0,3)`, not the child's rows in `student_programs`.
8. **All three dashboards ignore `sessionDate`.** Teacher (`:21`), therapist (`:24`), parent week grid (`:19-30`) group by `dayOfWeek` only. Dated sessions from the scheduler misattribute to the wrong day tab.
9. **Parent upload fails silently.** `RequirementsUpload.jsx:52-55` — `console.error` + `continue`, no toast. No file type/size validation, no delete affordance (RLS also lacks a parent delete policy — D4).
10. **Privacy hole: any parent can open any child's profile.** Search results (`GlobalSearch.jsx:56-75`) + `/profile/:id` are ungated; profile shows diagnosis (`ProfilePage.jsx:119-127`). Teacher/therapist see all staff the same way. Needs D1.
11. **Search promises what roles can't have.** Placeholder "Search students, staff, rooms, sessions…" (`GlobalSearch.jsx:220`) for roles whose room/session queries are gated to empty.
12. **SessionNotes page is a read-only archive.** `SessionNotes.jsx` lists/filters but creates nothing; with dashboard save broken (P0-1), therapists currently have **zero** working note-creation paths.

### P2 — carried hygiene (fence to touched files)
13. `formatTime` noon bug (`TeacherDashboard.jsx:24`, same shape in therapist/parent): hour 12 renders "12:00 AM". 14. `text-slate-400` contrast, 32px hit areas, missing `aria-label`s in touched files.

## 3. Decisions (resolved 2026-10-14)

| # | Decision | Outcome |
|---|---|---|
| D1 | Parent search/profile scope | ✅ **Approved — restrict.** Parent `GlobalSearch` + `/profile/:id` limited to own linked children. Teacher/therapist keep full search. |
| D2 | Therapist note→student linkage | ✅ **Approved — picker.** Student dropdown in the note modal (that session's students). |
| D3 | Parent "Programs Enrolled" source | ✅ **Approved — wire real data** via `student_programs` ⨝ `programs` for the active child. |
| D4 | Parent document delete | ✅ **Approved — leave permanent.** No migration, no UI change. Uploads stay append-only. |

All gates open except D4, which is closed by decision (no migration).

## 4. Plan

### Phase 0 — P0s (≈60 lines, 3 files; D2 shapes the modal)
| # | Change | File(s) |
|---|--------|---------|
| 0.1 | Parent crash + selector: store child **id** (`setSelectedChild(child.id)`), derive `activeChild` by id, replace all `selectedChild.id` with `activeChild.id`, fix highlight compare. | `ParentDashboard.jsx` |
| 0.2 | Therapist note persistence: call `addSessionNote({ sessionId, studentId, noteType:'general', content, rating })` in `handleAddNote`; add student `<select>` (session's students, default first) + keep rating stars; toast already comes from provider. | `TherapistDashboard.jsx` |
| 0.3 | Teacher attendance stays open: remove premature close; per-student marked state in-modal; Close button only exit. | `TeacherDashboard.jsx` |

### Phase 1 — role fit (≈120 lines)
| # | Change | File(s) |
|---|--------|---------|
| 1.1 | Teacher modal: 4th "Excused" button, notes input passed through to `markAttendance`, existing marks shown via `fetchAttendance(sessionId)` on open (checkmark per already-marked student). | `TeacherDashboard.jsx` |
| 1.2 | Teacher programs list reusing therapist "My Programs" pattern (names from `myAssignments[].programs`); fix duplicated Students/Programs counts (students = unique students across `mySessions`; programs = assignments). | `TeacherDashboard.jsx` |
| 1.3 | Parent programs via `student_programs` ⨝ `programs` for `activeChild` (D3); week grid + Upcoming keyed off `activeChild.id` and prefer `sessionDate` when present, `dayOfWeek` fallback. | `ParentDashboard.jsx` |
| 1.4 | Teacher/therapist day filter: same `sessionDate`-first grouping. One shared helper in `src/lib/` (e.g. `sessionDay.js`) used by all three dashboards — kills the triple-cloned logic. | `src/lib/sessionDay.js` + 3 dashboards |
| 1.5 | Upload errors via `notify(msg,'error')`; accept-attribute + size guard (e.g. 10 MB) with message; keep no-delete unless D4 flips. | `RequirementsUpload.jsx` |
| 1.6 | SessionNotes stays the read-only archive (filters + expand); creation lives in the dashboard modal only. Delete the implication otherwise — no code, just scope lock. | — |

### Phase 2 — privacy (gated on D1)
| # | Change | File(s) |
|---|--------|---------|
| 2.1 | **If D1 = yes:** parent-role `GlobalSearch` staff/student results filtered to `parentChildren` ids; student results for other roles unchanged. Role-aware placeholder ("Search students…" for parent). | `GlobalSearch.jsx` |
| 2.2 | **If D1 = yes:** `/profile/:id` guard — parent visiting an unlinked student id redirects to `/dashboard` (same `isAdminLevel`-style pattern as the back-link fix). | `ProfilePage.jsx` or `App.jsx` |

### Phase 3 — hygiene (touched files only)
- Noon fix in shared `formatTime` (all three dashboards import it from one place after 1.4 — fix once). `slate-400`→`slate-500/600`, `aria-label`s, ≥40px hit areas in touched files.

### Out of scope
- Schema/RLS changes except D4-gated parent-doc-delete migration · new routes/pages · teacher/therapist access to Schedule/Directory/Rooms (admin operations by design) · re-theming.

## 5. Verification (per AGENTS.md — no test suite)

1. `npm run lint` && `npm run build`
2. As therapist: write note (multi-student session → picker) → appears in Session Notes page; as teacher: mark full-class attendance incl. Excused + note, reopen shows marks; as parent (single child AND multi-child): no crash, correct programs, upload + error toast on oversize file.
3. If D1: as parent, searching another child's name returns nothing; direct `/profile/<other-id>` redirects.
4. Regression: admin/superadmin dashboards, search, and profile views unchanged.

## 6. Handoff

- Phase 0–1: `frontend` (one PR) · Phase 2: `frontend` · `code-reviewer` before merge · D4 migration (if approved): `database-expert` drafts, my sign-off + your approval before apply.
