# GEMINI.md - Polisync Project Context

## Project Overview
**Polisync** is a modern SPED (Special Education) Center Management System. It streamlines therapy scheduling, student/staff management, and room allocation.

## Core Technologies
- **Frontend Framework:** React 19 (Functional components, Hooks)
- **State Management:** React Context API (`GlobalStateContext.jsx`)
- **Build Tool:** Vite 8
- **Routing:** React Router 7
- **Styling:** Tailwind CSS 4 (`@tailwindcss/vite`)
- **Animations:** Framer Motion (for modal transitions and interactive elements)
- **Icons:** Lucide React
- **Date Handling:** date-fns

## Project Architecture & Directory Structure

### Key Directories
- `src/context/`: Contains `GlobalStateContext.jsx`, the source of truth for all application data.
- `src/components/`: Reusable UI components.
  - `Layout.jsx`: Main application shell (Sidebar, Header, Search Trigger).
  - `AISearch.jsx`: Global search modal with natural language support.
- `src/pages/`: Main application views.
  - `Dashboard.jsx`: Metrics and summary.
  - `ScheduleCalendar.jsx`: Core scheduling logic and conflict detection.
  - `Directory.jsx`: Searchable list of all people.
  - `ProfilePage.jsx`: Dynamic profiles for both Staff and Students.
  - `Rooms.jsx`: Room management and occupancy status.

### Data Model & State
The application uses a centralized `GlobalStateProvider`. Key data types:

#### Staff (`staff`)
- `id`: Unique number
- `name`: string
- `role`: string (e.g., 'Occupational Therapist', 'Admin')
- `department`: string ('Rehab', 'SPED', 'Playschool', 'Admin')
- `type`: 'Staff'
- `status`: 'Active', 'On Leave'
- `email`, `phone`, `joined`: Contact and history metadata

#### Students (`students`)
- `id`: Unique number
- `name`: string
- `role`: string (Current Program, e.g., 'ASD Program')
- `department`: string
- `type`: 'Student'
- `status`: 'Enrolled', 'Inactive'
- `diagnosis`: string (e.g., 'Autism Spectrum Disorder')

#### Sessions (`sessions`)
- `id`: Unique number
- `title`: string
- `therapistId`: number (maps to Staff ID)
- `studentIds`: number[] (maps to Student IDs)
- `room`: string (Room name)
- `startHour`: number (8-16, representing 8 AM to 4 PM)
- `span`: number (duration in hours)
- `type`: 'sped' | 'rehab' | 'playschool'

#### Rooms (`rooms`)
- `id`, `name`, `type`, `maxCapacity`

### Routing & Security
Defined in `App.jsx`:
- **Public Routes:** `/login`, `/signup`
- **Protected Routes:** Wrapped in `ProtectedRoute`. Base path `/` renders `Layout`.
- **Admin Routes:** Wrapped in `AdminRoute`. Only accessible to users with `role === 'Admin'`.

## Development Conventions

### Component Guidelines
- **Surgical Updates:** When modifying components, maintain the existing logic and styling unless a refactor is explicitly requested.
- **Styling:** Use Tailwind CSS 4 classes. Leverage `clsx` and `tailwind-merge` for dynamic classes.
- **Icons:** Use `lucide-react`. Standard size is usually 18-20px for nav/buttons.
- **Transitions:** Use `framer-motion`'s `AnimatePresence` and `motion` components for smooth UI transitions (e.g., modals, sidebar).

### State Management
- **Context Access:** Always use the `useGlobalState` hook.
- **Actions:** Use provider-level actions (`login`, `addSession`, `moveSession`, `addPerson`) instead of direct state manipulation.
- **Conflicts:** The provider automatically calculates `conflicts` (therapist/room overlaps) which should be checked in scheduling views.

### Search & Discovery
- **AISearch:** When adding new pages or data types, ensure they are indexed in `AISearch.jsx`. The search supports filtering by name, role, diagnosis, and room.

## Building and Running
- `npm run dev`: Start dev server (Vite)
- `npm run build`: Production build
- `npm run lint`: ESLint check

## Design Tokens (Tailwind 4)
- **Primary:** `indigo-600`
- **Secondary/Success:** `emerald-500`
- **Warning/Admin:** `amber-500`
- **Error/Destructive:** `red-500`
- **Background:** `slate-50`
- **Text:** `slate-800` (main), `slate-500` (muted)
