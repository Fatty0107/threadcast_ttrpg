---
name: Threadcast casting source of truth
description: Resolve disagreements between older sheet text and the supplied core rules before changing mechanics.
---

**Rule:** Use the supplied Threadcast core rules and supplements to decide casting check types; do not assume an older sheet label or picker implements the intended rule. Primary Mode is Harmony, secondary/tertiary Modes are Normal, and unpracticed Modes are Discord. Modes affect the check type, not the numeric DC. Two-String Weaves are Normal, three-/four-String Weaves are Discord, except explicitly applicable features such as Precision Weave. Exceeding Thread Pool triggers automatic Snapback, not a reduced Tension charge.

**Why:** During the dice upgrade, the sheet's tertiary legend and Weave mode picker disagreed with the source rules, while the existing pool formula also differed from the core PDF. The user explicitly requested that Threadcast mechanics not be silently changed.

**How to apply:** Check the core PDF sections on Mode Proficiency, Weaving, and Thread Pool/Safe Limit before touching cast logic. Do not rewrite pool arithmetic until the discrepancy is reconciled, and do not invent automatic Snapback resolution where the app has no implementation; state that a Weavekeeper must resolve it manually.

**Rule:** Keep the existing named String tables' listed cost/DC as their casting starting values until the user decides whether the core PL cost/DC table should replace these supplement-specific numbers. Use the core PL table for custom Strings that have no table, and let the Weavekeeper adjust DC for a declared effect. Treat table effect text as examples, not fixed spells.

**Why:** Named String supplements have per-String costs and DCs that differ materially from the core PL scale. Replacing them implicitly while implementing creative casting would silently rebalance existing characters. The supplied play guide establishes creative intent and PL magnitude but does not explicitly settle this numerical conflict.

**How to apply:** If a later request demands strict core-wide cost/DC alignment, reconcile it with the user and update the sheet, compendium, and printable output together rather than changing only one casting path.