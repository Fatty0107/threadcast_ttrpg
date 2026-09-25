---
name: Collaborative consequence idempotence
description: Why linked support-failure consequences must be resolved as one atomic unit.
---

**Rule:** Resolve a failed support check's Lead Strain, any Snapback rolls, and resulting sheet changes in one server-side transaction. A unique constraint on the Strain roll alone does not make its consequences idempotent.

**Why:** Two open Lead sheets can receive the same failed support check. Even if both receive the same existing Strain roll, separate browser-side Snapback handling can roll the table twice and apply damage or conditions twice.

**How to apply:** When extending automatic collaborative consequences, keep all related rolls and resource updates under the same cast-scoped lock and return the previously committed resolution to duplicate callers. Do not add a second client-side consequence path for the same failure.