---
name: Render webhook environment
description: Distinguishing external Render runtime secrets from Replit workspace secrets.
---

**Rule:** When debugging Discord delivery on the external Render service, do not use the presence of a Replit workspace secret as evidence that the published server has the webhook. Verify the Render service's Environment configuration and its own runtime diagnostics separately; a Blueprint declaration alone is not proof an existing service received the value.

**Why:** Local development and Render run with separate environment configuration. Rolls can be committed to the database and displayed while asynchronous Discord delivery is disabled or fails, so a visible roll result alone does not establish webhook health.

**How to apply:** Use the Weavekeeper's deployed Shared Roll Log status and Render's service logs to distinguish missing configuration, invalid URL, and delivery failure. Never print or request the webhook URL in chat.