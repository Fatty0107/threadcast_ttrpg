---
name: JSX string attribute escaping
description: Escaped apostrophes inside JSX string attributes cause Babel parse errors at build time.
---

**Rule:** Never use `\'` inside single-quoted JSX attribute strings. Either switch to double quotes or rewrite to avoid the apostrophe.

**Why:** JSX string attributes don't support backslash-escaped characters the same way JS strings do. `placeholder='it\'s broken'` causes a Babel parse error at the `'` after the backslash.

**How to apply:** Use double-quoted strings for placeholder text, or use a JSX expression `{...}` with a template literal if single quotes are needed.
