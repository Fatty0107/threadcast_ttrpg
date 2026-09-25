/** Escape player-entered text before adding it to the printable sheet HTML. */
export function escapePrintHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch] || ch);
}