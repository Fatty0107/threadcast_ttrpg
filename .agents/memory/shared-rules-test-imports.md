---
name: Shared rules test imports
description: TypeScript references and Node strip-types differ in how they consume shared rules.
---

**Rule:** After adding an export to a shared TypeScript project, rebuild its reference declarations before checking dependent packages. For Node strip-types tests, import a directly addressable source module rather than an index that re-exports extensionless relative paths.

**Why:** Dependent typechecks can read stale generated declarations even though a production bundler sees the fresh source. Node's native ESM resolver does not resolve the index's extensionless relative re-export in a direct strip-types test.

**How to apply:** When a shared rule needs both production imports and lightweight Node tests, keep the testable pure rule in a focused module, export it through the package index for apps, and test the module directly.