---
name: WebGL browser previews
description: Browser automation may not provide a usable GPU context for interactive dice.
---

Browser-driven preview tools may fail to create a WebGL context even while the web page and APIs work normally. A non-blank 2D fallback is necessary for players in restricted browsers, and visual verification should distinguish that fallback from the actual 3D renderer.

**Why:** The browser used for Dice Atelier verification reported WebGL context creation errors, but the rest of the customization and save flow worked; without a styled fallback, players see only an uninformative flat shape.

**How to apply:** For future visual changes to the shared dice preview, preserve equivalent color, motif, finish, and readable result feedback when WebGL is unavailable. Do not infer that the 3D renderer itself is broken solely from an automated browser's context error.