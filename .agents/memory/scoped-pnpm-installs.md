---
name: Scoped pnpm installs in this workspace
description: The package-install helper can target the workspace root instead of a child artifact.
---

**Rule:** For a dependency of a child artifact in this pnpm workspace, install against the named package with a scoped pnpm command when the package helper cannot target it.

**Why:** The installation helper refused a valid child-package dependency with `ERR_PNPM_ADDING_TO_ROOT` and rejected filter arguments; using pnpm's `--filter` against the child package worked.

**How to apply:** Keep runtime dependencies on the relevant artifact rather than the root workspace. Use the workspace's scoped package name when a helper installation would write at the root.