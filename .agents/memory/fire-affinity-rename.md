---
name: Fire affinity rename
description: Compatibility decisions when the named Cosmic handout became Fire.
---

**Rule:** Fire is the public name of the formerly Cosmic String catalog. Accept Cosmic as a legacy lookup name for older saved characters and clients; show Fire to players. Do not erase the older general Fire affinity's fallback behavior for custom or Water-named Strings.

**Why:** Fire already existed as a general affinity option before the rename, while Cosmic characters could already be persisted. A simple replacement would either strand those characters or change casting costs for previously valid Fire characters.

**How to apply:** Keep the compatibility alias when changing affinity catalogs, API responses, or casting logic. New characters use Fire; existing Cosmic rows can continue to resolve their original String costs and appear as Fire without requiring a destructive data migration.