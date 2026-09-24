---
name: Radix forced tab panels
description: Why mounted tab panels need explicit inactive visibility handling
---

When preserving a tab's internal state with Radix TabsContent forceMount, explicitly hide the panel when its data-state is inactive.

**Why:** Radix treats forceMount as present even when the tab isn't selected, so its hidden attribute is false. An inactive panel can stay in document flow and push later tab contents below it. This can make clicks appear broken even though the tab itself becomes active. A previous tab-height fix addressed a different layout issue and did not solve this.

**How to apply:** When keeping a form or cast panel mounted across tab switches, combine forceMount with an inactive-panel display rule. Verify that the selected panel appears immediately under the tab list rather than merely checking the selected-tab styling.