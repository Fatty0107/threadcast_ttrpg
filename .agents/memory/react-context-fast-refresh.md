---
name: React context and Fast Refresh
description: Avoiding transient missing-provider errors during Vite hot updates
---

Keep a React context and its consumer hook in a module without component exports; let the provider component import that context rather than creating it beside a hook in the provider module.

**Why:** Vite Fast Refresh invalidated a mixed provider-and-hook module during generated-client changes. The browser retained a consumer from one module instance and a provider from another, producing a missing-provider error even though the component tree was nested correctly.

**How to apply:** When adding a context consumed across many components, separate the stable context identity from provider implementation and avoid re-exporting the hook from a component-only module. A fresh page load can mask this hot-update-only failure.