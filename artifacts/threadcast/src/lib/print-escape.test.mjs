import assert from "node:assert/strict";
import { test } from "node:test";
import { escapePrintHtml } from "./print-escape.ts";

test("player-entered consequence choices render as text, never printable HTML", () => {
  const choice = '<img src=x onerror="alert(\'unsafe\')">&';
  const printHtml = `<div>Thread Sense type: ${escapePrintHtml(choice)}</div>`;
  assert.equal(printHtml, '<div>Thread Sense type: &lt;img src=x onerror=&quot;alert(&#39;unsafe&#39;)&quot;&gt;&amp;</div>');
  assert.equal(printHtml.includes("<img"), false);
});