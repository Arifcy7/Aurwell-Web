# Aurwell Monorepo Architecture & Guidelines

## 1. Monorepo Overview
This project is structured as an **npm workspaces + Turborepo** monorepo (`aurwell-monorepo`). Do not place application code, Next.js configurations, or static assets in the root workspace directory.

### Workspace Structure:
- `apps/website/` (`@aurwell/website` - Port 3000): Standalone Next.js application for the public customer landing page.
- `apps/admin/` (`@aurwell/admin` - Port 3001): Standalone Next.js application for the clinic administration panel and backend management.
- `packages/config/` (`@aurwell/config`): Shared TypeScript (`base.json`, `next.json`), Tailwind presets, and ESLint configurations.
- `packages/types/` (`@aurwell/types`): Shared TypeScript data models and interfaces.
- `packages/utils/` (`@aurwell/utils`): Shared helper functions and utilities.
- `packages/ui/` (`@aurwell/ui`): Reusable UI component library (e.g., `MotionButton`).

---

## 2. Routing & URL Conventions
- **Admin Panel (`apps/admin`) — Option A (Clean Root URLs)**:
  - Do NOT use `/admin` prefixes for routes or folders within `apps/admin`.
  - All routes start at the root: `/login`, `/signup`, `/dashboard`, `/app-builder/*`, `/clients`, `/shop`, `/memberships`, and `/notifications`.
- **Website Landing Page (`apps/website`)**:
  - Links pointing to the admin portal must dynamically use `process.env.NEXT_PUBLIC_ADMIN_URL` (defaulting to `http://localhost:3001`). Example: `href={`${adminUrl}/login`}`.

---

## 3. Firebase & Backend Files Location
All Firebase configuration, security rules, indexes, and schema documentation reside inside `apps/admin/`:
- **Config & Rules**: `apps/admin/.firebaserc`, `apps/admin/firebase.json`, `apps/admin/firestore.rules`, `apps/admin/storage.rules`, `apps/admin/firestore.indexes.json`.
- **Schema & Docs**: `apps/admin/FIREBASE_SCHEMA.md`, `apps/admin/FCM_KMP_INTEGRATION.md`.
- **SDK & Client Libs**: Initialized inside `apps/admin/src/lib/`.
When deploying Firebase security rules or indexes, execute commands from within the `apps/admin/` directory.

---

## 4. Development & Build Workflows
- **Running Locally**: Use `npm run dev` from the root directory to run both dev servers (`localhost:3000` and `localhost:3001`) concurrently via Turborepo.
- **Building for Production**: Use `npm run build` from the root directory to build all apps and packages in parallel.
- **Targeting Single Workspace**: Use `--workspace=@aurwell/<name>` (e.g., `npm run dev --workspace=@aurwell/admin` or `npm run build --workspace=@aurwell/website`).
- **Turborepo Invariant**: Turborepo v2 requires the `"packageManager"` property (e.g., `"packageManager": "npm@11.6.1"`) in the root `package.json`. Do not remove it.
