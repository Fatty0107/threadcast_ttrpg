---
name: Express body limit for avatar uploads
description: Express default JSON body limit (100kb) silently drops large base64 image uploads — character creation with avatar fails with no frontend error.
---

**Rule:** Always set `express.json({ limit: "15mb" })` and `express.urlencoded({ limit: "15mb" })` in `app.ts` for this project.

**Why:** Base64-encoded portrait images can easily exceed 100kb. Express's default limit silently rejects the request with a 413 status, causing character creation to fail with no visible error in the frontend (the mutation rejects with HTTP 413 but no `onError` toast was wired up).

**How to apply:** In `artifacts/api-server/src/app.ts`, the `express.json` middleware must include `{ limit: "15mb" }`. Already applied as of June 2026.
