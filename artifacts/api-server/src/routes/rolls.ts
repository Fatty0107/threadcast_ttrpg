import { randomInt } from "node:crypto";
import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, charactersTable, rollsTable } from "@workspace/db";
import { CreateRollBody, ListRollsResponseItem, GetRollDiscordStatusResponse, ListRollsResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { postRollEmbed } from "../lib/discord-roll";

const router = Router();
router.use("/rolls", requireAuth);

function webhookUrl(): string | null {
  const raw = process.env.DISCORD_WEBHOOK_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "discord.com" || url.port ||
        url.username || url.password || url.search || url.hash ||
        !/^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

type SavedRoll = typeof rollsTable.$inferSelect;
function responseRoll(roll: SavedRoll) {
  const { userId, characterId, requestId, deliveryStatus, ...visible } = roll;
  return { ...visible, d2: roll.d2 ?? undefined, dc: roll.dc ?? undefined,
    isBreak: !!roll.isBreak, isMisfire: !!roll.isMisfire, createdAt: roll.createdAt.toISOString() };
}

async function sendToDiscord(roll: SavedRoll, url: string, log: { warn: (data: object, message: string) => void }) {
  let status = "failed";
  try {
    const result = await postRollEmbed(roll, url);
    if (result.ok) status = "sent";
    else log.warn({ rollId: roll.id, statusCode: result.status }, "Discord roll delivery failed");
  } catch {
    // Never log the error: network errors can contain the webhook URL.
    log.warn({ rollId: roll.id }, "Discord roll delivery failed");
  }
  try {
    await db.update(rollsTable).set({ deliveryStatus: status }).where(eq(rollsTable.id, roll.id));
  } catch {
    log.warn({ rollId: roll.id }, "Could not save Discord delivery status");
  }
}

router.get("/rolls", async (_req, res): Promise<void> => {
  const rolls = await db.select().from(rollsTable).orderBy(desc(rollsTable.id)).limit(100);
  res.json(ListRollsResponse.parse(rolls.map(responseRoll)));
});

router.post("/rolls", async (req, res): Promise<void> => {
  const parsed = CreateRollBody.safeParse(req.body);
  if (!parsed.success || !req.body || Object.keys(req.body).some(key =>
    !["requestId", "characterId", "title", "category", "mode", "modifier", "diceSides", "diceCount", "bonusDiceSides", "bonusDiceCount", "multiplier", "dc"].includes(key))) {
    res.status(400).json({ error: "Invalid roll request" });
    return;
  }
  const input = parsed.data;
  const isMend = input.category === "mend";
  const isDamage = input.category === "damage";
  const isTable = input.category === "table";
  if (!input.title.trim() ||
      ![input.characterId, input.modifier, input.diceSides, input.diceCount, input.bonusDiceSides, input.bonusDiceCount, input.multiplier, input.dc]
        .every(value => value === undefined || Number.isInteger(value)) || (isDamage
    ? input.mode !== "NORMAL" || input.multiplier !== 1 || input.dc !== undefined ||
      (input.diceSides === 0 ? input.diceCount !== 0 || input.bonusDiceSides !== undefined || input.bonusDiceCount !== undefined
        : ![4, 6, 8, 10, 12].includes(input.diceSides) || input.diceCount < 1 ||
          (input.bonusDiceSides === undefined) !== (input.bonusDiceCount === undefined))
    : isMend
    ? input.diceSides !== 6 || input.diceCount !== 2 || input.mode !== "NORMAL" || input.modifier !== 0 || input.dc !== undefined
      || input.bonusDiceSides !== undefined || input.bonusDiceCount !== undefined
    : isTable
    ? ![6, 12].includes(input.diceSides) || input.diceCount !== 1 || input.mode !== "NORMAL" ||
      input.modifier !== 0 || input.multiplier !== 1 || input.dc !== undefined ||
      input.bonusDiceSides !== undefined || input.bonusDiceCount !== undefined
    : input.diceSides !== 20 || input.multiplier !== 1 || input.bonusDiceSides !== undefined || input.bonusDiceCount !== undefined ||
      input.diceCount !== (input.mode === "NORMAL" ? 1 : 2))) {
    res.status(400).json({ error: "Invalid dice configuration" });
    return;
  }
  const user = (req as any).user;
  let characterName = user.displayName as string;
  if (input.characterId !== undefined) {
    const [character] = await db.select({ name: charactersTable.name })
      .from(charactersTable)
      .where(user.role === "weavekeeper"
        ? eq(charactersTable.id, input.characterId)
        : and(eq(charactersTable.id, input.characterId), eq(charactersTable.userId, user.id)))
      .limit(1);
    if (!character) {
      res.status(403).json({ error: "Character unavailable for this roll" });
      return;
    }
    characterName = character.name;
  } else if (input.category !== "check") {
    res.status(400).json({ error: "Character required for sheet rolls" });
    return;
  }
  const [previous] = await db.select().from(rollsTable)
    .where(and(eq(rollsTable.userId, user.id), eq(rollsTable.requestId, input.requestId))).limit(1);
  if (previous) {
    res.status(201).json(ListRollsResponseItem.parse(responseRoll(previous)));
    return;
  }

  const d1 = input.diceSides === 0 ? 1 : randomInt(1, input.diceSides + 1);
  const d2 = input.diceCount === 2 ? randomInt(1, input.diceSides + 1) : null;
  const extraDice = Array.from({ length: input.bonusDiceCount ?? 0 }, () => ({
    sides: input.bonusDiceSides!, value: randomInt(1, input.bonusDiceSides! + 1),
  }));
  const finalDie = isDamage ? d1 + (d2 ?? 0) + extraDice.reduce((sum, die) => sum + die.value, 0)
    : isMend ? d1 + d2! : d2 === null ? d1
    : input.mode === "HARMONY" ? Math.max(d1, d2) : Math.min(d1, d2);
  const total = isDamage ? Math.max(1, finalDie + input.modifier) : finalDie * input.multiplier + input.modifier;
  const isBreak = !isTable && !isMend && !isDamage && finalDie === 20;
  const isMisfire = !isTable && !isMend && !isDamage && finalDie === 1;
  const outcome = isDamage ? "Damage" : isMend ? "Mend" : isTable ? "Rolled" : isBreak ? "Thread Break" : isMisfire ? "Misfire"
    : input.dc ? (total >= input.dc ? "Success" : "Failure") : "Rolled";
  const preferences = user.dicePreferences;
  const style = preferences?.sets?.find((set: { id: string }) => set.id === preferences.selectedId);
  const url = webhookUrl();
  const [created] = await db.insert(rollsTable).values({
    userId: user.id, requestId: input.requestId, characterId: input.characterId ?? null,
    playerName: user.displayName, characterName, title: input.title.trim(),
    category: input.category, mode: input.mode, diceSides: input.diceSides,
    d1, d2, extraDice, modifier: input.modifier, multiplier: input.multiplier, finalDie, total,
    dc: input.dc ?? null, isBreak: Number(isBreak), isMisfire: Number(isMisfire),
    outcome, diceName: style?.name ?? "Standard Issue", diceColor: style?.edgeColor ?? "#C48650",
    deliveryStatus: !process.env.DISCORD_WEBHOOK_URL ? "disabled" : url ? "pending" : "failed",
  }).onConflictDoNothing().returning();
  const roll = created ?? (await db.select().from(rollsTable)
    .where(and(eq(rollsTable.userId, user.id), eq(rollsTable.requestId, input.requestId))).limit(1))[0];
  res.status(201).json(ListRollsResponseItem.parse(responseRoll(roll)));
  if (created && url) void sendToDiscord(roll, url, req.log);
});

router.get("/rolls/discord/status", async (req, res): Promise<void> => {
  if ((req as any).user.role !== "weavekeeper") {
    res.status(403).json({ error: "Weavekeeper access required" });
    return;
  }
  const recent = await db.select({ deliveryStatus: rollsTable.deliveryStatus, createdAt: rollsTable.createdAt })
    .from(rollsTable).orderBy(desc(rollsTable.id)).limit(100);
  res.json(GetRollDiscordStatusResponse.parse({
    configured: !!process.env.DISCORD_WEBHOOK_URL,
    valid: !!webhookUrl(),
    recentSent: recent.filter(r => r.deliveryStatus === "sent").length,
    recentFailed: recent.filter(r => r.deliveryStatus === "failed").length,
    recentPending: recent.filter(r => r.deliveryStatus === "pending").length,
    lastFailureAt: recent.find(r => r.deliveryStatus === "failed")?.createdAt.toISOString() ?? null,
  }));
});

export default router;