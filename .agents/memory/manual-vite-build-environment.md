---
name: Manual Vite build environment
description: Why local shell builds need explicit runtime routing variables even when managed previews work.
---

Manual artifact builds launched from an ordinary shell do not inherit the managed web workflow's injected runtime environment. A typecheck can pass while a direct Vite build fails before loading the app because both a valid port and base path are required.

**Why:** The managed preview supplies routing variables automatically; the manual build command does not. Treat missing variables in that context as a command-environment issue, not an application regression.

**How to apply:** When checking a build outside the managed workflow, supply a valid temporary `PORT` and the artifact's correct `BASE_PATH` for the command. Do not modify the project's routing or workflow configuration just to make a manual check start.