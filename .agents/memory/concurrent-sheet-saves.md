---
name: Concurrent sheet saves
description: Why whole-sheet edits must retain their original revision across refetches and casting.
---

**Rule:** When a character sheet holds unsaved edits, keep the version of the snapshot those edits came from. Do not advance that version merely because another device's cast or an idempotent replay returned a newer or older character. Require a monotonic version check for whole-sheet saves; on conflict, preserve the unsaved input and ask the player to reconcile it rather than silently overwriting resources.

**Why:** A refetch can update the client's revision while a debounced edit still contains old Tension, damage, and conditions. Sending that old data with the new revision makes a superficially guarded save overwrite a valid cast. Timestamps rounded to milliseconds are not strong enough for this guard.

**How to apply:** Any new whole-sheet writer or cache refresh must distinguish the authoritative character version from the version attached to dirty local data. Treat replayed cast responses as historical outcomes and load current resources separately.