import type { rollsTable } from "@workspace/db";

type Roll = typeof rollsTable.$inferSelect;

function plain(value: string, limit: number): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/@/g, "@\u200b").trim().slice(0, limit);
}

function rollTitle(roll: Roll): string {
  const character = plain(roll.characterName, 80);
  const title = plain(roll.title, 150).replace(/[.!?]+$/, "");
  const verb = roll.category === "cast" || roll.category === "weave" ? "casts"
    : roll.category === "check" || roll.category === "support" ? "makes a"
    : roll.category === "mend" ? "mends with" : "rolls";
  return `${character} ${verb} ${title}!`.slice(0, 256);
}

function rollFormula(roll: Roll): string {
  const dice = roll.diceSides === 0 ? "1 flat"
    : roll.d2 === null ? `1d${roll.diceSides} (${roll.d1})`
    : `2d${roll.diceSides} (${roll.d1}, ${roll.d2}${roll.mode === "NORMAL" || roll.category === "damage" || roll.category === "mend"
      ? "" : ` → ${roll.finalDie} ${roll.mode.toLowerCase()}`})`;
  const extras = roll.extraDice.map(die => ` + 1d${die.sides} (${die.value})`).join("");
  const multiplier = roll.multiplier !== 1 ? ` × ${roll.multiplier}` : "";
  const modifier = roll.modifier < 0 ? ` − ${Math.abs(roll.modifier)}` : ` + ${roll.modifier}`;
  const result = `${dice}${extras}${multiplier}${modifier} = \`${roll.total}\``;
  return roll.dc === null ? result : `${result}\nDC ${roll.dc} · ${plain(roll.outcome, 80)}`;
}

function portraitAttachment(value: unknown): { filename: string; contentType: string; bytes: Uint8Array } | null {
  if (typeof value !== "string") return null;
  const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length > 11_000_000) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 8_000_000) return null;
  return { filename: `portrait.${match[1] === "jpeg" ? "jpg" : match[1]}`, contentType: `image/${match[1]}`, bytes };
}

export function buildRollEmbed(roll: Roll, portrait?: unknown) {
  const attachment = portraitAttachment(portrait);
  const embed: {
    title: string; description: string; color: number; thumbnail?: { url: string };
  } = {
    title: rollTitle(roll),
    description: rollFormula(roll),
    color: roll.outcome === "Failure" || roll.outcome === "Misfire" ? 0xA34F4B : 0x78934B,
  };
  if (attachment) embed.thumbnail = { url: `attachment://${attachment.filename}` };
  else if (typeof portrait === "string" && /^https:\/\/[^ ]{1,1000}$/.test(portrait)) {
    embed.thumbnail = { url: portrait };
  }
  return { embed, attachment };
}