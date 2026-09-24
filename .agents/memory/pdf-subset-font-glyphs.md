---
name: PDF subset font glyphs
description: Avoid missing characters when adding text to an existing PDF using embedded fonts.
---

**Rule:** Do not assume an embedded font extracted from a PDF contains glyphs for new text. Use a complete font for inserted rules text, then inspect both the rendered page and extracted text for symbols and numbers.

**Why:** The original handout's embedded sans-serif font was subsetted. New plus signs and parts of dice notation rendered as boxes or disappeared, even though the PDF saved without an error.

**How to apply:** When revising existing PDF pages, especially rules tables with dice notation or modifiers, verify the actual exported glyphs rather than trusting that text insertion succeeded.