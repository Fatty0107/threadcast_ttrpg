---
name: Threadcast casting source of truth
description: Resolve disagreements between older sheet text and the supplied core rules before changing mechanics.
---

**Rule:** Use the supplied Threadcast core rules and supplements to decide casting check types; do not assume an older sheet label or picker implements the intended rule. Primary Mode is Harmony, secondary/tertiary Modes are Normal, and unpracticed Modes are Discord. Modes affect the check type, not the numeric DC. Two-String Weaves are Normal, three-/four-String Weaves are Discord, except explicitly applicable features such as Precision Weave. Exceeding Thread Pool triggers automatic Snapback, not a reduced Tension charge.

**Why:** During the dice upgrade, the sheet's tertiary legend and Weave mode picker disagreed with the source rules, while the existing pool formula also differed from the core PDF. The user explicitly requested that Threadcast mechanics not be silently changed.

**How to apply:** Check the core PDF sections on Mode Proficiency, Weaving, and Thread Pool/Safe Limit before touching cast logic. The pool formula discrepancy was resolved in favor of the core PDF; do not restore the older sheet-derived arithmetic. Preserve the automatic Snapback rule and make incomplete mechanical consequences explicit instead of silently ignoring them.

**Rule:** The user confirmed that each named String's listed cost/DC are the automatic casting values; custom Strings without a table use the core PL table. The existing Weave arithmetic (sum the String costs, multiply by String count; highest String DC plus 2 for each String beyond two) is confirmed. Failed casts spend Tension, too. Do not add a Weavekeeper approval step or editable DC control to casting. Treat effect text as examples, not fixed spells.

**Why:** Named String supplements have per-String costs and DCs that differ materially from the core PL scale. The user explicitly chose to retain those numbers, the current Weave formula, and Tension on every attempted cast when asked about the conflict, while also instructing that approval not be required.

**How to apply:** Keep the sheet, compendium, and printable output consistent with these decisions. If the user later requests a different numerical system, confirm its scope before changing more than one casting path.