---
name: Render start-command precedence
description: Why changing the Render Blueprint start command may not affect an existing service
---

An existing Render service can continue using its dashboard-configured start command even after `render.yaml` is changed. Inspect the `Running '...'` line in its deploy logs rather than assuming the Blueprint command was applied.

**Why:** A deployed revision included a new preflight in `render.yaml`, but Render still ran its previous command. Changes inside the package script that command invoked did take effect.

**How to apply:** When fixing startup behavior for the existing Render service, make the code reachable from the start command shown in deploy logs. Do not assume a Blueprint change alone changes dashboard-managed settings.