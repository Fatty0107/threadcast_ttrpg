---
name: Post-merge workflow port conflicts
description: Diagnosing a managed service that fails to bind after merge reconciliation
---

When a managed workflow reports that its assigned port is already in use after post-merge reconciliation, check which process owns the listener before changing any port configuration.

**Why:** A previous Vite child survived workflow reconciliation while a replacement workflow failed to bind the same assigned port. The app still rendered through the orphaned process, so a successful preview alone concealed the failed managed workflow.

**How to apply:** Identify whether the listener belongs to an old instance of the same service; only then stop that stale process and restart the managed workflow. Do not change the artifact port to work around the conflict.