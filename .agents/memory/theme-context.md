---
name: ThemeContext light/dark mode system
description: How the dark/light mode toggle works in this project.
---

**Rule:** The ThemeProvider in `artifacts/threadcast/src/contexts/ThemeContext.tsx` toggles `dark`/`light` class on `<html>`. CSS variables are defined in two blocks in `index.css`.

**How it works:**
- `:root, .dark {}` — dark theme variables (default)
- `.light {}` — light parchment/warm theme variables (added below the dark block)
- `html.dark { color-scheme: dark; }` / `html.light { color-scheme: light; }` in `@layer base`
- Theme preference persisted to `localStorage` under key `threadcast-theme`
- Navbar has a Sun/Moon toggle button using `useTheme()` from ThemeContext
- ThemeProvider wraps the entire app in `App.tsx` (wraps AuthProvider)
- The `@custom-variant dark (&:is(.dark *))` in `index.css` makes Tailwind `dark:` classes work with the `.dark` class on html
