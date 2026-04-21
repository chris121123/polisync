# polisync Agent Guidelines

## Development Commands
- `npm run dev` - Start development server with HMR
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

## ESLint Configuration
- Ignores `dist` directory
- Uses `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`
- `no-unused-vars` rule ignores variables matching `^[A-Z_]` pattern

## Build Tooling
- Vite with `@tailwindcss/vite` and `@vitejs/plugin-react` plugins
- Outputs to `/dist` (gitignored via `.gitignore`)
- CSS processed via Tailwind CSS 4

## Technology Stack
- React 19 (JavaScript, not TypeScript)
- Tailwind CSS 4 for styling (utility-first)
- React Router DOM v7 for routing
- Framer Motion for animations
- Context API for state management (`GlobalStateContext`)

## Project Structure
- `/src` - Application source
  - `/components` - Reusable UI components
  - `/pages` - Route components
  - `/context` - React context providers
  - `/assets` - Static assets (images, icons)
- `/public` - Static assets served directly
- `/dist` - Build output

## Important Notes
- Uses JavaScript standard (not TypeScript)
- React Compiler not enabled (see README for details)
- Dark/light mode toggle via `document.documentElement.classList`
- Protected routes implemented via `ProtectedRoute` and `AdminRoute` components
- State managed through `GlobalStateContext` with `useGlobalState` hook

## Verification
No test framework configured. Verify changes via:
1. `npm run lint`
2. Manual inspection (typechecking via IDE support for JS)
3. Visual review in development server