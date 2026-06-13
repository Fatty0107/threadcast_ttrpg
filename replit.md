# THREADCAST — World of Aethros

A full-stack TTRPG digital companion web app for the THREADCAST tabletop roleplaying game set in the World of Aethros. Players manage character sheets, roll dice, track Tension and Burnout, and use Affinity Strings. The Weavekeeper (GM) gets a gated control panel with a demo character sheet.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter routing, TanStack Query, shadcn UI, Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema (users, characters, sessions tables)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — Generated React Query hooks + types
- `artifacts/api-server/src/routes/` — Express route handlers (auth, characters, health)
- `artifacts/api-server/src/lib/auth.ts` — PBKDF2 password hashing (Node crypto, no bcrypt)
- `artifacts/threadcast/src/` — React frontend
- `artifacts/threadcast/src/lib/game-rules.ts` — Centralized TTRPG rules (modifiers, VP, etc.)
- `artifacts/threadcast/src/components/character/CharacterSheetContent.tsx` — Core character sheet UI
- `artifacts/threadcast/src/components/shared/DiceRoller.tsx` — Global dice roller modal (Normal/Harmony/Discord)
- `artifacts/threadcast/src/components/shared/TensionGauge.tsx` — SVG circular tension gauge
- `artifacts/threadcast/src/components/shared/BurnoutTrack.tsx` — 6-step burnout track

## Architecture decisions

- Character data stored as JSONB in `characters.data` — flexible for evolving game rules without schema migrations
- Auth uses hardcoded demo users seeded on first login (no registration flow); PBKDF2 with Node.js crypto (bcrypt dropped due to build script approval issues in Replit)
- Cookie-based sessions (httpOnly, sameSite: lax) with 7-day expiry stored in `sessions` table
- DiceRollerContext provides a global `openRoll(title, modifier)` — any attribute/skill button anywhere in the app can trigger a roll modal
- Weavekeeper page uses a hardcoded DEMO_CHARACTER object for Meren Vail (not fetched from DB) so it always loads instantly

## Product

- Login screen with demo credentials displayed
- Characters page — grid of all your characters with quick stats
- Character Sheet — dual-column layout: left has attributes (each modifier is a clickable dice roll button), Vitality Points bar, circular Tension Gauge, and Burnout Track; right has tabbed Skills/Strings/Techniques/Notes
- Compendium — static Water Affinity reference with all 5 Strings (Flow, Pressure, Still, Vital, Tide) fully documented
- Weavekeeper panel — role-gated GM view with environment tension tracker, campaign notes, and Meren Vail demo character sheet
- Dice roller modal — supports Normal, Harmony (roll 2d20 keep highest), and Discord (roll 2d20 keep lowest); detects Thread Break (nat 20) and Misfire (nat 1); last 5 roll history

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT use bcrypt — it requires native build scripts that require user approval in Replit. Use Node.js built-in `crypto` (PBKDF2) instead.
- The `session` cookie is set with `secure: true` only in production. In development it's plain HTTP.
- Character `data` field is `any` at the Drizzle level — cast to `CharacterData` (from api-client-react) in the frontend.
- `pnpm --filter @workspace/db run push` must be run after any schema changes before the API server will work.

## Demo credentials

- Player: `aria_solforge` / `embersong` → Aria Solforge, Level 3 Water Striker, Burnout 1
- Weavekeeper: `weavekeeper_dm` / `threadpuller` → Meren Vail demo sheet, campaign tools

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
