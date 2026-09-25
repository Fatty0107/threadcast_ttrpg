import { randomInt, randomUUID } from "node:crypto";
import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, charactersTable, rollsTable, collaborativeCastsTable } from "@workspace/db";
import { CreateRollBody, ListRollsResponseItem, GetRollDiscordStatusResponse, ListRollsResponse,
  StartCollaborativeCastBody, GetCollaborativeCastParams, GetCollaborativeCastResponse,
  ResolveCollaborativeSupportParams, ResolveCollaborativeSupportBody, ResolveCollaborativeSupportResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { postRollEmbed } from "../lib/discord-roll";

const router = Router();
router.use("/rolls", requireAuth);
router.use("/collaborative-casts", requireAuth);

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
  const { userId, requestId, deliveryStatus, ...visible } = roll;
  return { ...visible, d2: roll.d2 ?? undefined, dc: roll.dc ?? undefined,
    isBreak: !!roll.isBreak, isMisfire: !!roll.isMisfire, createdAt: roll.createdAt.toISOString() };
}

router.post("/collaborative-casts", async (req, res): Promise<void> => {
  const parsed = StartCollaborativeCastBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.effect.trim()) {
    res.status(400).json({ error: "Invalid cast" }); return;
  }
  const user = (req as any).user;
  const [lead] = await db.select({ id: charactersTable.id }).from(charactersTable)
    .where(and(eq(charactersTable.id, parsed.data.leadCharacterId), eq(charactersTable.userId, user.id))).limit(1);
  if (!lead) { res.status(403).json({ error: "Lead character unavailable" }); return; }
  const [cast] = await db.insert(collaborativeCastsTable).values({
    id: randomUUID(), leadCharacterId: lead.id, leadUserId: user.id,
    participantIds: [lead.id], effect: parsed.data.effect.trim(),
  }).returning();
  res.status(201).json(GetCollaborativeCastResponse.parse({ ...cast, createdAt: cast.createdAt.toISOString(), rolls: [] }));
});

router.get("/collaborative-casts/:id", async (req, res): Promise<void> => {
  const parsed = GetCollaborativeCastParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid cast ID" }); return; }
  const [cast] = await db.select().from(collaborativeCastsTable).where(eq(collaborativeCastsTable.id, parsed.data.id)).limit(1);
  if (!cast) { res.status(404).json({ error: "Cast not found" }); return; }
  const rolls = await db.select().from(rollsTable).where(eq(rollsTable.castId, cast.id)).orderBy(rollsTable.id);
  res.json(GetCollaborativeCastResponse.parse({ ...cast, createdAt: cast.createdAt.toISOString(), rolls: rolls.map(responseRoll) }));
});

// Matches the Snapback table in threadcast/src/lib/casting-rules.ts. This path
// resolves the entire automatic consequence in a single transaction.
const snapbackEffects = [
  { name: "Flinch", sides: 6, count: 1, condition: "Lose Minor Action next turn" },
  { name: "Burn", sides: 8, count: 2, condition: "−1 to Thread Checks until Mend" },
  { name: "Rupture", sides: 10, count: 2 },
  { name: "Discharge", sides: 10, count: 3 },
  { name: "Overload", sides: 12, count: 3, condition: "Stunned until end of next turn", resetTension: true },
  { name: "Collapse", sides: 12, count: 4, condition: "Unconscious for 1 minute", burnout: 2 },
  { name: "Total Break", condition: "Permanent injury — resolve at the table", burnout: 3 },
] as const;

router.post("/collaborative-casts/:id/resolve-support", async (req, res): Promise<void> => {
  const params = ResolveCollaborativeSupportParams.safeParse(req.params);
  const body = ResolveCollaborativeSupportBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid support resolution" }); return; }
  const user = (req as any).user;
  const [cast] = await db.select().from(collaborativeCastsTable).where(eq(collaborativeCastsTable.id, params.data.id)).limit(1);
  if (!cast || cast.leadUserId !== user.id) { res.status(403).json({ error: "Only the Lead can resolve support" }); return; }
  const [source] = await db.select().from(rollsTable).where(eq(rollsTable.id, body.data.supportRollId)).limit(1);
  if (!source || source.castId !== cast.id || source.category !== "support" ||
      (source.isBreak || (!source.isMisfire && source.total >= 12))) {
    res.status(400).json({ error: "A failed support roll is required" }); return;
  }
  const style = user.dicePreferences?.sets?.find((set: { id: string }) => set.id === user.dicePreferences?.selectedId);
  const url = webhookUrl();
  const created: SavedRoll[] = [];
  const resolution = await db.transaction(async tx => {
    await tx.select({ id: collaborativeCastsTable.id }).from(collaborativeCastsTable)
      .where(eq(collaborativeCastsTable.id, cast.id)).for("update");
    const [existing] = await tx.select().from(rollsTable).where(eq(rollsTable.sourceRollId, source.id)).limit(1);
    if (existing) {
      const [snapback] = await tx.select().from(rollsTable).where(eq(rollsTable.parentRollId, existing.id)).limit(1);
      const aftermath = snapback ? await tx.select().from(rollsTable).where(eq(rollsTable.parentRollId, snapback.id)) : [];
      return { strain: existing, snapback: snapback ?? null,
        damage: aftermath.find(r => r.category === "damage") ?? null,
        rupture: aftermath.find(r => r.category === "check") ?? null,
        effect: snapback ? snapbackEffects[snapback.finalDie === 12 ? 6 : Math.floor((snapback.finalDie - 1) / 2)].name : null };
    }
    const [sheet] = await tx.select().from(charactersTable)
      .where(and(eq(charactersTable.id, cast.leadCharacterId), eq(charactersTable.userId, user.id))).for("update");
    if (!sheet) throw new Error("Lead character unavailable");
    const rollBase = {
      userId: user.id, characterId: sheet.id, castId: cast.id, leadCharacterId: sheet.id,
      playerName: user.displayName as string, characterName: sheet.name,
      contributedString: null, contributedMode: null, tensionContribution: null,
      diceName: style?.name ?? "Standard Issue", diceColor: style?.edgeColor ?? "#C48650",
      deliveryStatus: !process.env.DISCORD_WEBHOOK_URL ? "disabled" : url ? "pending" : "failed",
      multiplier: 1,
    };
    async function store(fields: Omit<typeof rollsTable.$inferInsert, keyof typeof rollBase | "userId" | "characterId" | "castId" | "leadCharacterId">) {
      const [roll] = await tx.insert(rollsTable).values({ ...rollBase, ...fields }).returning();
      created.push(roll);
      return roll;
    }
    const resMod = body.data.resModifier;
    const strainDie = randomInt(1, 21);
    const strainTotal = strainDie + resMod;
    const strain = await store({
      requestId: randomUUID(), sourceRollId: source.id, parentRollId: null,
      title: `Support failure · Strain (roll #${source.id})`, category: "check",
      mode: "NORMAL", diceSides: 20, d1: strainDie, d2: null, extraDice: [],
      modifier: resMod, finalDie: strainDie, total: strainTotal, dc: 15,
      isBreak: Number(strainDie === 20), isMisfire: Number(strainDie === 1),
      outcome: strainDie === 20 ? "Thread Break" : strainDie === 1 ? "Misfire" : strainTotal >= 15 ? "Success" : "Failure",
    });
    if (strainDie === 20 || (strainDie !== 1 && strainTotal >= 15))
      return { strain, snapback: null, damage: null, rupture: null, effect: null };
    const tableDie = randomInt(1, 13);
    const effect = snapbackEffects[tableDie === 12 ? 6 : Math.floor((tableDie - 1) / 2)];
    const snapback = await store({
      requestId: randomUUID(), sourceRollId: null, parentRollId: strain.id,
      title: `Support failure · Snapback table (${effect.name})`, category: "table",
      mode: "NORMAL", diceSides: 12, d1: tableDie, d2: null, extraDice: [],
      modifier: 0, finalDie: tableDie, total: tableDie, dc: null, isBreak: 0, isMisfire: 0, outcome: "Rolled",
    });
    let damage: SavedRoll | null = null;
    let rupture: SavedRoll | null = null;
    if ("sides" in effect) {
      const dice = Array.from({ length: effect.count }, () => randomInt(1, effect.sides + 1));
      const total = dice.reduce((sum, die) => sum + die, 0);
      damage = await store({
        requestId: randomUUID(), sourceRollId: null, parentRollId: snapback.id,
        title: `Snapback · ${effect.name} damage`, category: "damage",
        mode: "NORMAL", diceSides: effect.sides, d1: dice[0], d2: dice[1] ?? null,
        extraDice: dice.slice(2).map(value => ({ sides: effect.sides, value })),
        modifier: 0, finalDie: total, total, dc: null, isBreak: 0, isMisfire: 0, outcome: "Damage",
      });
    }
    if (effect.name === "Rupture") {
      const die = randomInt(1, 21);
      const total = die + resMod;
      rupture = await store({
        requestId: randomUUID(), sourceRollId: null, parentRollId: snapback.id,
        title: "Rupture · RES check", category: "check", mode: "NORMAL", diceSides: 20,
        d1: die, d2: null, extraDice: [], modifier: resMod, finalDie: die, total, dc: 14,
        isBreak: Number(die === 20), isMisfire: Number(die === 1),
        outcome: die === 20 ? "Thread Break" : die === 1 ? "Misfire" : total >= 14 ? "Success" : "Failure",
      });
    }
    const data = sheet.data as {
      tension?: { current: number; pool: number; safeLimit: number };
      vitalityPoints?: { current: number; max: number };
      burnout?: number; castingConditions?: string[];
    };
    const conditions = [...(data.castingConditions || [])];
    if ("condition" in effect && !conditions.includes(effect.condition)) conditions.push(effect.condition);
    if (rupture && (rupture.isMisfire || (!rupture.isBreak && rupture.total < 14)) &&
        !conditions.includes("Shaking Hands")) conditions.push("Shaking Hands");
    await tx.update(charactersTable).set({ data: {
      ...data, castingConditions: conditions,
      burnout: Math.min(6, (data.burnout || 0) + ("burnout" in effect ? effect.burnout : 0)),
      tension: "resetTension" in effect && data.tension ? { ...data.tension, current: 0 } : data.tension,
      vitalityPoints: damage && data.vitalityPoints
        ? { ...data.vitalityPoints, current: Math.max(0, data.vitalityPoints.current - damage.total) }
        : data.vitalityPoints,
    } }).where(eq(charactersTable.id, sheet.id));
    return { strain, snapback, damage, rupture, effect: effect.name };
  });
  res.json(ResolveCollaborativeSupportResponse.parse({
    ...resolution, strain: responseRoll(resolution.strain),
    snapback: resolution.snapback ? responseRoll(resolution.snapback) : null,
    damage: resolution.damage ? responseRoll(resolution.damage) : null,
    rupture: resolution.rupture ? responseRoll(resolution.rupture) : null,
  }));
  if (url) for (const roll of created) void sendToDiscord(roll, url, req.log);
});

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
    !["requestId", "characterId", "title", "category", "mode", "modifier", "diceSides", "diceCount", "bonusDiceSides", "bonusDiceCount", "multiplier", "dc", "castId", "tensionContribution", "contributedString", "contributedMode"].includes(key))) {
    res.status(400).json({ error: "Invalid roll request" });
    return;
  }
  const input = parsed.data;
  const isMend = input.category === "mend";
  const isDamage = input.category === "damage";
  const isTable = input.category === "table";
  const isSupport = input.category === "support";
  if ((isSupport && (!input.castId || !input.tensionContribution || !input.contributedString?.trim() || !input.contributedMode?.trim() || input.dc !== 12)) ||
      (!isSupport && (input.contributedString !== undefined || input.contributedMode !== undefined ||
        (input.tensionContribution !== undefined && (!input.castId || !["cast", "weave"].includes(input.category)))))) {
    res.status(400).json({ error: "Invalid collaborative roll" }); return;
  }
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
  let cast: typeof collaborativeCastsTable.$inferSelect | undefined;
  if (input.castId) {
    [cast] = await db.select().from(collaborativeCastsTable).where(eq(collaborativeCastsTable.id, input.castId)).limit(1);
    if (!cast || !input.characterId || (isSupport
      ? input.characterId === cast.leadCharacterId
      : input.characterId !== cast.leadCharacterId || user.id !== cast.leadUserId)) {
      res.status(403).json({ error: "Character cannot roll for this cast" }); return;
    }
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
  const values = {
    userId: user.id, requestId: input.requestId, characterId: input.characterId ?? null,
    castId: cast?.id ?? null, leadCharacterId: cast?.leadCharacterId ?? null,
    tensionContribution: input.tensionContribution ?? null,
    contributedString: input.contributedString?.trim() ?? null,
    contributedMode: input.contributedMode?.trim() ?? null,
    sourceRollId: null,
    playerName: user.displayName, characterName, title: input.title.trim(),
    category: input.category, mode: input.mode, diceSides: input.diceSides,
    d1, d2, extraDice, modifier: input.modifier, multiplier: input.multiplier, finalDie, total,
    dc: input.dc ?? null, isBreak: Number(isBreak), isMisfire: Number(isMisfire),
    outcome, diceName: style?.name ?? "Standard Issue", diceColor: style?.edgeColor ?? "#C48650",
    deliveryStatus: !process.env.DISCORD_WEBHOOK_URL ? "disabled" : url ? "pending" : "failed",
  };
  let created: SavedRoll | undefined;
  if (isSupport && cast && input.characterId) {
    const result = await db.transaction(async tx => {
      // Serialize contributions to this cast, then re-check the request for retries.
      const [lockedCast] = await tx.select().from(collaborativeCastsTable)
        .where(eq(collaborativeCastsTable.id, cast.id)).for("update");
      const [repeat] = await tx.select().from(rollsTable)
        .where(and(eq(rollsTable.userId, user.id), eq(rollsTable.requestId, input.requestId))).limit(1);
      if (repeat) return { roll: repeat, error: null };
      const [sheet] = await tx.select().from(charactersTable)
        .where(and(eq(charactersTable.id, input.characterId!), eq(charactersTable.userId, user.id))).for("update");
      if (!sheet) return { roll: undefined, error: "Character unavailable" };
      const data = sheet.data as { tension?: { current: number; pool: number; safeLimit: number } };
      const tension = data.tension;
      if (!tension || !Number.isFinite(tension.current) || !Number.isFinite(tension.pool) ||
          tension.current + input.tensionContribution! > tension.pool)
        return { roll: undefined, error: "Not enough Thread Pool room on this character" };
      const [roll] = await tx.insert(rollsTable).values(values).onConflictDoNothing().returning();
      if (!roll) return { roll: undefined, error: "Roll request already recorded; refresh the cast" };
      await tx.update(charactersTable).set({ data: { ...data, tension: { ...tension, current: tension.current + input.tensionContribution! } } })
        .where(eq(charactersTable.id, sheet.id));
      if (!lockedCast.participantIds.includes(sheet.id))
        await tx.update(collaborativeCastsTable).set({ participantIds: [...lockedCast.participantIds, sheet.id] })
          .where(eq(collaborativeCastsTable.id, lockedCast.id));
      return { roll, error: null };
    });
    if (result.error) { res.status(409).json({ error: result.error }); return; }
    created = result.roll;
  } else {
    [created] = await db.insert(rollsTable).values(values).onConflictDoNothing().returning();
  }
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