# polisync Agent Guidelines

## Commands
- `npm run dev` — Vite dev server (`--host`); `npm run build` — prod build to `dist/`; `npm run preview` — serve build; `npm run lint` — ESLint; `npm run test:golden` — 54 golden tests
- No typecheck script. Verify with `npm run test:golden` + `npm run lint` + `npm run build` + manual check in dev server
- One-off: `node promote-superadmin.mjs` — promotes existing `admin` rows to `superadmin` (reads `.env`)

## Stack / Entrypoints
- React 19 JS (not TS), Vite 8, React Router 7, Tailwind 4 via `@tailwindcss/vite`, Framer Motion, `lucide-react`, `date-fns`, `clsx` + `tailwind-merge`
- `src/main.jsx` → `GlobalStateProvider` → `src/App.jsx` → `Layout` (protected `/` shell)
- `/login` public; `/signup` redirects to `/login`. SPA deploy: `vercel.json` / `netlify.toml` rewrite `/*` → `/index.html`, publish `dist/`

## State (do not bypass)
- Single source of truth: `src/context/GlobalStateContext.jsx` via `useGlobalState()` hook
- Call provider actions (`login`, `addSession`, `moveSession`, `addPerson`, `adminCreateUser`, `smartSchedule`, …) — never mutate state directly
- DB is `snake_case`, UI is `camelCase` — map at boundary (`therapist_id→therapistId`, `start_hour→startHour`, `max_capacity→maxCapacity`, `student_ids→studentIds`, `day_of_week→dayOfWeek`)
- Realtime: `supabase.channel('system-changes')` syncs `sessions/profiles/students/notifications` — optimistic updates must dedupe by `id`

## Auth / Roles
- Role source: `user_roles.role` wins, fallback `profiles.app_role`. Values: `superadmin | admin | teacher | therapist | parent`
- Guards in `src/components/RouteGuards.jsx` (`ProtectedRoute`, `AdminRoute`, `SuperAdminRoute`, `Parent/Teacher/TherapistRoute`, `RoleRoute`) — reuse them; check helpers are `isAdmin()`, `isSuperAdmin()`, etc.
- New users: `supabase.functions.invoke('admin-create-user' | 'admin-delete-user')` — never use service_role key in frontend
- `supabase` export in `src/lib/supabase.js` is `null` when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing — guard callers

## Supabase
- Env: copy `.env.example` → `.env`. Notification secrets (`SEMAPHORE_*`, `RESEND_*`) live in Supabase Dashboard → Edge Functions Secrets, not `.env`
- Migrations: `supabase/migrations/*.sql`. Edge functions: `admin-create-user`, `admin-delete-user`, `auto-scheduler`, `send-notification`
- Scheduler: `src/lib/scheduling/engine.js` — try `invokeSmartScheduler` (edge, `client.js`) first, fallback `localSmartSchedule`; persist via `sessions` + `student_programs.status='scheduled'`

## Conventions
- Styling: Tailwind 4 utilities; icons `lucide-react` ~18–20px; transitions via `motion` + `AnimatePresence`; toasts via `notify(msg, type)`
- Dark mode: `document.documentElement.classList` + `localStorage polisync_dark_mode` (see `App.jsx`)
- ESLint ignores `dist`; `no-unused-vars` ignores `^[A-Z_]|^motion$|^Icon$`
- New pages/data types: index in `src/components/GlobalSearch.jsx`; scheduling conflicts via `conflicts` / `enhanceConflictDetection`
