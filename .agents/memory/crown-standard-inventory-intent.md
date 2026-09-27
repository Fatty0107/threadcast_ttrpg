---
name: Crown Standard inventory intent
description: Why money management belongs in the character Inventory, and what denomination counts mean.
---

**Rule:** Keep the character's money management inside Inventory as a denomination-aware wallet, not merely a standalone economy reference or a bare total-balance field. Do not represent Royal Notes as fixed-value coins or claim that a computed breakdown reflects exact physical coin holdings.

**Why:** The user explicitly corrected a prior implementation that put only a plain balance editor in Inventory; they wanted a D&D Beyond-like inventory money experience. A single integer Cinder balance is still the canonical accounting record, so a denomination breakdown can only show equivalents, not a historical inventory of coin stacks.

**How to apply:** Future money UI should let players see and adjust funds in the Inventory flow, preserve the canonical integer, and label breakdowns as equivalent denominations. If exact physical coin counts or individual Royal Note documents become necessary, ask for a data-model decision rather than deriving them from the total.