import { eq } from "drizzle-orm";
import { charactersTable, db, rollsTable, weavekeeperBestiaryTable } from "@workspace/db";
import { buildRollEmbed } from "./discord-roll-format";

type Roll = typeof rollsTable.$inferSelect;

export async function postRollEmbed(roll: Roll, url: string): Promise<{ ok: boolean; status: number }> {
  let portrait: unknown;
  if (roll.characterId !== null) {
    try {
      const [character] = await db.select({ data: charactersTable.data })
        .from(charactersTable).where(eq(charactersTable.id, roll.characterId)).limit(1);
      portrait = (character?.data as { avatarDataUrl?: unknown } | null)?.avatarDataUrl;
    } catch {
      // A portrait read failure must not prevent the result itself from arriving.
    }
  }
  if (roll.weavekeeperCreatureId !== null) {
    try {
      const [entry] = await db.select({ sheet: weavekeeperBestiaryTable.sheet })
        .from(weavekeeperBestiaryTable).where(eq(weavekeeperBestiaryTable.id, roll.weavekeeperCreatureId)).limit(1);
      portrait = (entry?.sheet as { avatarDataUrl?: unknown } | null)?.avatarDataUrl ?? portrait;
    } catch {
      // A portrait read failure must not prevent the result itself from arriving.
    }
  }
  const { embed, attachment } = buildRollEmbed(roll, portrait);
  const payload = {
    embeds: [embed],
    allowed_mentions: { parse: [] as string[] },
    ...(attachment ? { attachments: [{ id: 0, filename: attachment.filename }] } : {}),
  };
  let body: string | FormData = JSON.stringify(payload);
  const headers: Record<string, string> = {};
  if (attachment) {
    const form = new FormData();
    form.set("payload_json", JSON.stringify(payload));
    form.set("files[0]", new Blob([Uint8Array.from(attachment.bytes)], { type: attachment.contentType }), attachment.filename);
    body = form;
  } else {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(url, {
    method: "POST", headers, body, redirect: "error", signal: AbortSignal.timeout(5000),
  });
  return { ok: response.ok, status: response.status };
}
