import { randomInt, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { Router } from "express";
import {
  db, charactersTable, rollsTable, castResponsesTable, collaborativeCastsTable,
} from "@workspace/db";
import { canonicalAffinity, CORE_POWER_LEVELS, calcMod, calcSafeLimit, calcThreadPool, getHandoutStringLevelForCharacter, guildAttributeBonus, guildBonusAlreadyInAttributes, isHandoutAffinity, maximumSafePowerLevel, namedStringLevel, weaveCheckMode, weaveMultiplier } from "@workspace/casting-rules";
import { CreateCastBody, CreateCastStrainCheckBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { postRollEmbed } from "../lib/discord-roll";
import { decideReplay, resolvePermanentInjury, stringKey } from "../lib/cast-resolution";

const router = Router();
router.use("/casts", requireAuth);

type Component = { string: string; powerLevel: number; mode: string };
type RollRecord = typeof rollsTable.$inferSelect;
type Tx = any;
type Effect = {
  name: string; description: string; damage?: { sides: 4 | 6 | 8 | 10 | 12; count: 1 | 2 | 3 | 4 };
  burnout?: number; resetTension?: boolean; condition?: string;
};
type Consequence = {
  id: string;
  name: string;
  prompt: string;
  choiceType: "target" | "string" | "sense";
  status: "pending" | "resolved";
  choice?: string;
};
type PermanentInjury = {
  id: string;
  die: number;
  name: string;
  description: string;
  string?: string;
  senseType?: string;
};

const MODES = new Set(["Striker", "Anchor", "Slider", "Binder", "Shearer", "Tensioner", "Imprinter", "Conductor"]);
const FEAT_BONUSES: Record<string, { pool?: number; safe?: number }> = {
  "Extended Thread Pool": { pool: 4, safe: 2 },
};
const MISHAPS: Effect[] = [
  { name: "Flinch", description: "Effect fails. Lose your Minor Action next turn and take 1d4 feedback damage.", damage: { sides: 4, count: 1 }, condition: "Lose Minor Action next turn" },
  { name: "Backlash", description: "Effect occurs at half power. Discord on Thread Checks until Mend.", condition: "Discord on Thread Checks until Mend" },
  { name: "Wild Release", description: "Effect occurs at full power but hits the wrong target. Choose the target at the table." },
  { name: "Tension Spike", description: "Add the casting cost again and make an immediate Strain Check." },
];
const SNAPBACKS: Effect[] = [
  { name: "Flinch", description: "Take 1d6 affinity-typed damage and lose your Minor Action next turn.", damage: { sides: 6, count: 1 }, condition: "Lose Minor Action next turn" },
  { name: "Burn", description: "Take 2d8 affinity-typed damage. −1 to Thread Checks until Mend.", damage: { sides: 8, count: 2 }, condition: "−1 to Thread Checks until Mend" },
  { name: "Rupture", description: "Take 2d10 damage. Make a RES check (DC 14); on failure gain Shaking Hands.", damage: { sides: 10, count: 2 } },
  { name: "Discharge", description: "Take 3d10 damage. Effect releases in a random direction (d8).", damage: { sides: 10, count: 3 } },
  { name: "Overload", description: "Take 3d12 damage. Stunned until end of next turn; all Tension resets to 0.", damage: { sides: 12, count: 3 }, resetTension: true, condition: "Stunned until end of next turn" },
  { name: "Collapse", description: "Take 4d12 damage. Unconscious for 1 minute; gain 2 Burnout.", damage: { sides: 12, count: 4 }, burnout: 2, condition: "Unconscious for 1 minute" },
  { name: "Total Break", description: "Maximum damage (48 VP), roll on the Permanent Injury Table, and gain 3 Burnout.", burnout: 3 },
];

function responseRoll(roll: RollRecord) {
  const { userId: _userId, characterId: _characterId, requestId: _requestId, deliveryStatus: _deliveryStatus, ...visible } = roll;
  return { ...visible, d2: roll.d2 ?? undefined, dc: roll.dc ?? undefined,
    isBreak: !!roll.isBreak, isMisfire: !!roll.isMisfire, createdAt: roll.createdAt.toISOString() };
}

function rollDie(sides: number) { return randomInt(1, sides + 1); }

async function saveRoll(tx: Tx, args: {
  userId: number; characterId: number; playerName: string; characterName: string;
  castId?: string; leadCharacterId?: number; tensionContribution?: number;
  title: string; category: "cast" | "weave" | "table" | "damage" | "check";
  mode: "NORMAL" | "HARMONY" | "DISCORD"; sides: number; count: number;
  modifier?: number; dc?: number; requestId?: string; diceName?: string; diceColor?: string; fixedDice?: number[];
}): Promise<RollRecord> {
  if (args.fixedDice && (args.fixedDice.length !== args.count ||
      args.fixedDice.some(value => !Number.isInteger(value) || value < 1 || value > args.sides))) {
    throw new Error("Fixed dice must match the requested count and die size");
  }
  const d1 = args.fixedDice?.[0] ?? rollDie(args.sides);
  const d2 = args.count >= 2 && (args.category === "damage" || args.count === 2)
    ? args.fixedDice?.[1] ?? rollDie(args.sides) : null;
  const extraDice = Array.from({ length: Math.max(0, args.count - 2) }, (_, index) => ({
    sides: args.sides, value: args.fixedDice?.[index + 2] ?? rollDie(args.sides),
  }));
  const finalDie = args.category === "damage" ? d1 + (d2 ?? 0) + extraDice.reduce((sum, die) => sum + die.value, 0)
    : args.mode === "HARMONY" && d2 !== null ? Math.max(d1, d2)
    : args.mode === "DISCORD" && d2 !== null ? Math.min(d1, d2) : d1;
  const modifier = args.modifier ?? 0;
  const total = args.category === "damage" ? Math.max(1, finalDie + modifier) : finalDie + modifier;
  const isBreak = ["cast", "weave", "check"].includes(args.category) && finalDie === 20;
  const isMisfire = ["cast", "weave", "check"].includes(args.category) && finalDie === 1;
  const outcome = args.category === "damage" ? "Damage" : args.category === "table" ? "Rolled"
    : isBreak ? "Thread Break" : isMisfire ? "Misfire"
    : args.dc ? total >= args.dc ? "Success" : "Failure" : "Rolled";
  const [row] = await tx.insert(rollsTable).values({
    userId: args.userId, requestId: args.requestId ?? randomUUID(), characterId: args.characterId,
    castId: args.castId ?? null, leadCharacterId: args.leadCharacterId ?? null,
    tensionContribution: args.tensionContribution ?? null,
    playerName: args.playerName, characterName: args.characterName, title: args.title,
    category: args.category, mode: args.mode, diceSides: args.sides, d1, d2, extraDice,
    modifier, multiplier: 1, finalDie, total, dc: args.dc ?? null, isBreak: Number(isBreak),
    isMisfire: Number(isMisfire), outcome, diceName: args.diceName ?? "Standard Issue", diceColor: args.diceColor ?? "#C48650",
    deliveryStatus: process.env.DISCORD_WEBHOOK_URL ? "pending" : "disabled",
  }).returning();
  return row as RollRecord;
}

function getAttr(data: any, key: string): number {
  const base = data?.attributes?.[key] || 10;
  if (!Number.isFinite(base)) return 10;
  let asiBonus = 0;
  const feats: string[] = Array.isArray(data?.feats) ? data.feats : [];
  feats.forEach((feat, index) => {
    if (feat !== "Attribute Score Improvement") return;
    const choice = data?.featChoices?.[String(index)];
    if (choice?.mode === "one" && choice.attrs?.[0] === key) asiBonus += 2;
    if (choice?.mode === "two" && Array.isArray(choice.attrs)) {
      asiBonus += choice.attrs.filter((attribute: string) => attribute === key).length;
    }
  });
  // Builder characters already have their guild bonus in saved attributes.
  // Legacy sheets without baseAttributes may still hold unmodified scores.
  const guildBonus = guildBonusAlreadyInAttributes(data)
    ? 0 : guildAttributeBonus(data?.guild, data?.guildRank, key as "pot" | "ctr" | "res" | "ths");
  return base + asiBonus + guildBonus;
}

function getStringLevel(name: string, level: number, character: { affinity?: unknown }) {
  const affinity = typeof character.affinity === "string" ? character.affinity : "";
  const handoutAffinity = isHandoutAffinity(affinity);
  const named = handoutAffinity
    ? getHandoutStringLevelForCharacter(character, name, level) ??
      (affinity === "Fire" ? namedStringLevel(name, level) : undefined)
    : namedStringLevel(name, level);
  const base = CORE_POWER_LEVELS[level - 1];
  return named ?? (base ? { ...base, checkAttr: "ctr" as const } : undefined);
}

function castRequestKey(input: { characterId: number; castId?: string; kind: string; intent: string; components: Component[] }): string {
  // Request JSON key order can differ between devices and retries. Compare
  // values, not serialization order, before returning a confirmed result.
  return JSON.stringify([
    input.characterId, input.castId ?? null, input.kind, input.intent.trim(),
    input.components.map(component => [stringKey(component.string), component.powerLevel, component.mode]),
  ]);
}

function poolAndSafe(character: typeof charactersTable.$inferSelect) {
  const data = character.data as any;
  const potency = getAttr(data, "pot");
  const control = getAttr(data, "ctr");
  const features = Array.isArray(data.feats) ? data.feats : [];
  const bonus = FEAT_BONUSES[data.guildFeatChoice] ?? {};
  const injuries = readInjuries(data.permanentInjuries);
  const ceilingLoss = injuries.filter(injury => injury.name === "Reduced Ceiling").length * 4;
  const nerveDamage = injuries.filter(injury => injury.name === "Nerve Damage (Hands)").length;
  return {
    pool: Math.max(0, calcThreadPool(character.level, potency, control) + (features.includes("Extended Thread Pool") ? 4 : 0) + (bonus.pool ?? 0) - ceilingLoss - 2 * nerveDamage),
    safeLimit: Math.max(0, calcSafeLimit(character.level, potency, control) + (features.includes("Extended Thread Pool") ? 2 : 0) + (bonus.safe ?? 0) - nerveDamage),
  };
}

function castingModifier(data: any, key: string): number {
  const injuries = readInjuries(data?.permanentInjuries);
  const nerveDamage = key === "ctr" ? injuries.filter(injury => injury.name === "Nerve Damage (Hands)").length : 0;
  return calcMod(getAttr(data, key)) - nerveDamage;
}

const DIRECTIONS = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];

function readInjuries(value: unknown): PermanentInjury[] {
  return Array.isArray(value) ? value.filter((injury: any): injury is PermanentInjury =>
    !!injury && typeof injury === "object" && typeof injury.id === "string" &&
    Number.isInteger(injury.die) && typeof injury.name === "string" && typeof injury.description === "string") : [];
}

function readConsequences(value: unknown): Consequence[] {
  return Array.isArray(value) ? value.filter((item: any): item is Consequence =>
    !!item && typeof item === "object" && typeof item.id === "string" && typeof item.name === "string" &&
    typeof item.prompt === "string" && ["target", "string", "sense"].includes(item.choiceType) &&
    ["pending", "resolved"].includes(item.status)) : [];
}

function castOutcome(effect: Effect[], die: number, max: number) {
  const idx = max === 6 ? die <= 2 ? 0 : die <= 4 ? 1 : die === 5 ? 2 : 3
    : die <= 2 ? 0 : die <= 4 ? 1 : die <= 6 ? 2 : die <= 8 ? 3 : die <= 10 ? 4 : die === 11 ? 5 : 6;
  return effect[idx];
}

type SaveCastRoll = (tx: Tx, args: Parameters<typeof saveRoll>[1]) => Promise<RollRecord>;
type EffectContext = {
  userId: number;
  playerName: string;
  character: typeof charactersTable.$inferSelect;
  data: any;
  sheet: any;
  aftermath: any;
  conditions: string[];
  consequences: Consequence[];
  injuries: PermanentInjury[];
  newRolls: RollRecord[];
};

async function applyEffect(
  tx: Tx,
  saveCastRoll: SaveCastRoll,
  context: EffectContext,
  kind: "Mishap" | "Snapback",
  asAdditional = false,
): Promise<Effect> {
  const { userId, playerName, character, data, sheet, aftermath, conditions, consequences, injuries, newRolls } = context;
  const tableRoll = await saveCastRoll(tx, {
    userId, characterId: character.id, playerName, characterName: character.name,
    title: `${kind} table`, category: "table", mode: "NORMAL", sides: kind === "Mishap" ? 6 : 12, count: 1,
  });
  newRolls.push(tableRoll);
  const effect = castOutcome(kind === "Mishap" ? MISHAPS : SNAPBACKS, tableRoll.finalDie, kind === "Mishap" ? 6 : 12);
  const table: any = { kind, die: tableRoll.finalDie, effect };
  if (effect.condition && !conditions.includes(effect.condition)) conditions.push(effect.condition);
  if (effect.burnout) sheet.burnout = Math.min(6, (Number(sheet.burnout) || 0) + effect.burnout);
  if (effect.resetTension) sheet.tension.current = 0;
  aftermath.tension = sheet.tension.current;
  let damage: number | undefined;
  if (kind === "Snapback" && effect.name === "Total Break") {
    const damageRoll = await saveCastRoll(tx, {
      userId, characterId: character.id, playerName, characterName: character.name,
      title: `${kind} · ${effect.name} damage`, category: "damage", mode: "NORMAL",
      sides: 12, count: 4, fixedDice: [12, 12, 12, 12],
    });
    newRolls.push(damageRoll);
    damage = damageRoll.total;
  } else if (effect.damage) {
    const damageRoll = await saveCastRoll(tx, {
      userId, characterId: character.id, playerName, characterName: character.name,
      title: `${kind} · ${effect.name} damage`, category: "damage", mode: "NORMAL",
      sides: effect.damage.sides, count: effect.damage.count,
    });
    newRolls.push(damageRoll);
    damage = damageRoll.total;
  }
  if (damage !== undefined) {
    const vp = sheet.vitalityPoints ?? { current: 0, max: 0 };
    sheet.vitalityPoints = { ...vp, current: Math.max(0, vp.current - damage) };
  }
  let direction: { id: string; die: number; name: string } | undefined;
  let permanentInjury: { id: string; die: number; name: string; description: string } | undefined;
  if (kind === "Snapback" && effect.name === "Discharge") {
    const directionRoll = await saveCastRoll(tx, {
      userId, characterId: character.id, playerName, characterName: character.name,
      title: "Discharge · d8 direction", category: "table", mode: "NORMAL", sides: 8, count: 1,
    });
    newRolls.push(directionRoll);
    direction = { id: String(directionRoll.id), die: directionRoll.finalDie, name: DIRECTIONS[directionRoll.finalDie - 1] };
    consequences.push({
      id: direction.id, name: "Discharge",
      prompt: `The d8 discharge direction is ${direction.name}.`,
      choiceType: "target", status: "resolved", choice: direction.name,
    });
  }
  if (kind === "Snapback" && effect.name === "Total Break") {
    const injuryRoll = await saveCastRoll(tx, {
      userId, characterId: character.id, playerName, characterName: character.name,
      title: "Permanent Injury table", category: "table", mode: "NORMAL", sides: 6, count: 1,
    });
    newRolls.push(injuryRoll);
    const pendingLostThreads = consequences.filter(item => item.name === "Lost Thread" && item.status === "pending").length;
    const injury = resolvePermanentInjury(injuryRoll.finalDie, {
      attunedStrings: data?.strings,
      existingInjuries: injuries,
      pendingLostThreadChoices: pendingLostThreads,
    });
    const injuryId = String(injuryRoll.id);
    permanentInjury = { id: injuryId, die: injuryRoll.finalDie, name: injury.name, description: injury.description };
    injuries.push({ ...permanentInjury });
    if (injury.choiceType && !injury.noEligibleString) {
      const prompt = injury.choiceType === "string"
        ? "Choose one attuned String to lose permanently. Casting is blocked until this choice is resolved."
        : "Choose the specific Thread Sense type that suffers permanent Discord.";
      consequences.push({ id: injuryId, name: injury.name, prompt, choiceType: injury.choiceType, status: "pending" });
    }
    if (injury.name === "The Shakes" && !conditions.includes("The Shakes")) conditions.push("The Shakes");
  }
  if (effect.name === "Wild Release") {
    consequences.push({
      id: String(tableRoll.id), name: effect.name,
      prompt: "Choose the target affected by this Wild Release.",
      choiceType: "target", status: "pending",
    });
  }
  if (kind === "Snapback" && effect.name === "Rupture") {
    const resCheck = await saveCastRoll(tx, {
      userId, characterId: character.id, playerName, characterName: character.name,
      title: "Rupture · RES check", category: "check", mode: "NORMAL", sides: 20, count: 1,
      modifier: calcMod(getAttr(data, "res")), dc: 14,
    });
    newRolls.push(resCheck);
    if (resCheck.isMisfire || (!resCheck.isBreak && resCheck.total < 14)) {
      if (!conditions.includes("Shaking Hands")) conditions.push("Shaking Hands");
    }
  }
  if (direction) table.direction = direction;
  if (permanentInjury) table.permanentInjury = permanentInjury;
  if (asAdditional) {
    aftermath.additionalTable = { ...table, kind: "Snapback", ...(damage !== undefined ? { damage } : {}) };
  } else {
    aftermath.table = table;
    if (damage !== undefined) aftermath.damage = damage;
  }
  return effect;
}

router.post("/casts", async (req, res): Promise<void> => {
  const parsed = CreateCastBody.safeParse(req.body);
  if (!parsed.success || !req.body || Object.keys(req.body).some(key =>
    !["requestId", "characterId", "castId", "kind", "intent", "components"].includes(key)) ||
      !Number.isInteger(req.body?.characterId) ||
      !Array.isArray(req.body?.components) ||
      req.body.components.some((component: unknown) =>
        !component || typeof component !== "object" || Array.isArray(component) ||
        Object.keys(component).some(key => !["string", "powerLevel", "mode"].includes(key)))) {
    res.status(400).json({ error: "Invalid cast request" });
    return;
  }
  const input = parsed.data as { requestId: string; characterId: number; castId?: string; kind: "cast" | "weave"; intent: string; components: Component[] };
  const intent = input.intent.trim();
  const components = input.components;
  const count = components.length;
  if (!intent || !Number.isInteger(input.characterId) || (input.kind === "cast" && count !== 1) || (input.kind === "weave" && (count < 2 || count > 4)) ||
      new Set(components.map(c => c.string.trim().toLowerCase())).size !== count ||
      components.some(c => !c.string.trim() || !Number.isInteger(c.powerLevel) || c.powerLevel < 1 || c.powerLevel > 5 || !MODES.has(c.mode))) {
    res.status(400).json({ error: "Invalid cast components" });
    return;
  }

  const user = (req as any).user;
  const style = user.dicePreferences?.sets?.find((set: { id: string }) => set.id === user.dicePreferences.selectedId);
  const saveCastRoll = (tx: Tx, args: Parameters<typeof saveRoll>[1]) =>
    saveRoll(tx, { ...args, ...(input.castId ? { castId: input.castId, leadCharacterId: input.characterId } : {}),
      diceName: style?.name, diceColor: style?.edgeColor });
  let newRolls: RollRecord[] = [];
  let result: any;
  try {
    result = await db.transaction(async tx => {
      // Prevent duplicate requests racing even if they name different character IDs.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${user.id}, hashtext(${input.requestId}))`);
      const [existing] = await tx.select().from(castResponsesTable)
        .where(and(eq(castResponsesTable.userId, user.id), eq(castResponsesTable.requestId, input.requestId))).limit(1);
      if (existing) {
        const replay = decideReplay(existing.requestId, existing.response, input.requestId, "cast", input);
        if (replay.kind === "conflict") {
          throw Object.assign(new Error("Request ID was already used for a different cast"), { statusCode: 409 });
        }
        const replayResult = replay.result;
        // Keep legacy cast responses as their original snapshots. Older stored
        // snapshots predate version; add the migration default, never a fresh sheet.
        if (replayResult?.character && !Number.isInteger(replayResult.character.version)) {
          return { ...replayResult, character: { ...replayResult.character, version: 0 } };
        }
        return replayResult;
      }

      const castable = user.role === "weavekeeper"
        ? eq(charactersTable.id, input.characterId)
        : and(eq(charactersTable.id, input.characterId), eq(charactersTable.userId, user.id));
      const [locked] = await tx.select({ id: charactersTable.id }).from(charactersTable)
        .where(castable)
        .for("update").limit(1);
      if (!locked) throw Object.assign(new Error("Character unavailable for this cast"), { statusCode: 403 });
      const [character] = await tx.select().from(charactersTable).where(eq(charactersTable.id, locked.id)).limit(1);
      if (input.castId) {
        const [group] = await tx.select().from(collaborativeCastsTable)
          .where(eq(collaborativeCastsTable.id, input.castId)).limit(1);
        if (!group || group.leadCharacterId !== character.id || group.leadUserId !== user.id)
          throw Object.assign(new Error("Only the Lead can cast for this group"), { statusCode: 403 });
      }
      if (input.kind === "weave" && count === 4 && character.level < 7) {
        throw Object.assign(new Error("Four-String Weaves require level 7"), { statusCode: 400 });
      }
      const data = character.data as any;
      const savedStrings: string[] = Array.isArray(data?.strings) ? data.strings : [];
      const consequences = readConsequences(data?.castConsequences);
      const injuries = readInjuries(data?.permanentInjuries);
      if (consequences.some(item => item.name === "Lost Thread" && item.status === "pending")) {
        throw Object.assign(new Error("Resolve the pending Lost Thread choice before casting"), { statusCode: 409 });
      }
      const lostStrings = new Set(injuries.filter(injury => injury.name === "Lost Thread" && typeof injury.string === "string")
        .map(injury => stringKey(injury.string!)));
      if (components.some(c => !savedStrings.some(name => stringKey(name) === stringKey(c.string)) ||
          lostStrings.has(stringKey(c.string)))) {
        throw Object.assign(new Error("Cast String is not attuned on this character"), { statusCode: 400 });
      }

      const availableModes = [
        data?.primaryMode, data?.secondaryMode, data?.secondaryMode2,
        data?.tertiaryMode, data?.tertiaryMode2,
      ].filter((mode: unknown): mode is string => typeof mode === "string" && MODES.has(mode));
      // A primary/secondary mode that is saved on the sheet is valid; other known modes
      // are also selectable and resolve as Discord, matching the game's mode rules.
      if (components.some(c => !MODES.has(c.mode))) {
        throw Object.assign(new Error("Selected mode is invalid"), { statusCode: 400 });
      }

      const { pool, safeLimit } = poolAndSafe(character);
      const current = Number.isFinite(data?.tension?.current) ? data.tension.current : 0;
      const computed = components.map(c => getStringLevel(c.string, c.powerLevel, character));
      if (computed.some(level => !level)) throw Object.assign(new Error("Invalid String power level"), { statusCode: 400 });
      const levels = computed as NonNullable<typeof computed[number]>[];
      const multiplier = input.kind === "weave" ? weaveMultiplier(count) : 1;
      const rawCost = levels.reduce((sum, level) => sum + level.cost, 0) * multiplier;
      const feats: string[] = Array.isArray(data?.feats) ? data.feats : [];
      const featCharges = { ...(data?.featCharges ?? {}) };
      const hasPrecisionWeave = feats.includes("Precision Weave");
      const precisionReady = input.kind === "weave" && count === 2 && hasPrecisionWeave && featCharges["Precision Weave"] !== 0;
      const cost = Math.max(0, rawCost - (precisionReady ? 1 : 0));
      const overflow = current + cost > pool;
      const overSafe = components.some(component => component.powerLevel > maximumSafePowerLevel(character.level, getAttr(data, "pot")));
      const conditions: string[] = Array.isArray(data?.castingConditions) ? [...data.castingConditions] : [];
      const forcedDiscord = (Number(data?.burnout) || 0) >= 1 ||
        conditions.includes("Discord on Thread Checks until Mend") || conditions.includes("Shaking Hands") ||
        injuries.some(injury => injury.name === "The Shakes");
      const primary = data?.primaryMode || character.mode;
      let rollMode: "NORMAL" | "HARMONY" | "DISCORD";
      if (input.kind === "cast") {
        rollMode = components[0].mode === primary ? "HARMONY" : availableModes.includes(components[0].mode) ? "NORMAL" : "DISCORD";
        if (overSafe || forcedDiscord) rollMode = "DISCORD";
      } else {
        rollMode = weaveCheckMode(count, hasPrecisionWeave, overSafe, forcedDiscord);
      }
      const rollAttr = input.kind === "weave" ? "ctr" : levels[0].checkAttr;
      const modifier = castingModifier(data, rollAttr) - (conditions.includes("−1 to Thread Checks until Mend") ? 1 : 0);
      const dc = input.kind === "cast" ? levels[0].dc : Math.max(...levels.map(level => level.dc)) + (count - 2) * 2;
      const title = `${input.kind === "cast" ? components[0].string : "Weave"} · ${intent}`.slice(0, 160);
      const roll = await saveCastRoll(tx, {
        userId: user.id, characterId: character.id, playerName: user.displayName, characterName: character.name,
        title, category: input.kind, mode: rollMode, sides: 20, count: rollMode === "NORMAL" ? 1 : 2,
        modifier, dc, requestId: input.requestId, ...(input.castId ? { tensionContribution: cost } : {}),
      });
      newRolls.push(roll);

      const sheet = { ...data };
      sheet.permanentInjuries = injuries;
      sheet.castConsequences = consequences;
      if (precisionReady) featCharges["Precision Weave"] = 0;
      sheet.featCharges = featCharges;
      sheet.tension = { ...(data?.tension ?? {}), current: overflow ? 0 : current + cost, pool, safeLimit };
      let aftermath: any = { cost, tension: sheet.tension.current, pool, safeLimit, overflow };
      const failed = roll.isMisfire || (!roll.isBreak && roll.total < dc);
      const effectContext: EffectContext = {
        userId: user.id, playerName: user.displayName, character, data, sheet, aftermath,
        conditions, consequences, injuries, newRolls,
      };

      if (overflow || roll.isMisfire) {
        await applyEffect(tx, saveCastRoll, effectContext, "Snapback");
      } else if (failed) {
        const effect = await applyEffect(tx, saveCastRoll, effectContext, "Mishap");
        if (effect.name === "Tension Spike") {
          const spiked = sheet.tension.current + cost;
          const spikeOverflow = spiked > pool;
          sheet.tension.current = spikeOverflow ? 0 : spiked;
          aftermath.tension = sheet.tension.current;
          aftermath.overflow = spikeOverflow;
          if (spikeOverflow) {
              await applyEffect(tx, saveCastRoll, effectContext, "Snapback", true);
          } else {
            const strainDC = 10 + Math.max(0, spiked - safeLimit);
            const strain = await saveCastRoll(tx, {
              userId: user.id, characterId: character.id, playerName: user.displayName, characterName: character.name,
              title: "Tension Spike · immediate Strain", category: "check", mode: "NORMAL",
              sides: 20, count: 1, modifier: calcMod(getAttr(data, "res")), dc: strainDC,
            });
            newRolls.push(strain);
            const strainFailed = strain.isMisfire || (!strain.isBreak && strain.total < strainDC);
            aftermath.strain = { die: strain.finalDie, total: strain.total, dc: strainDC, failed: strainFailed };
            if (strainFailed) await applyEffect(tx, saveCastRoll, effectContext, "Snapback", true);
          }
        }
      }
      sheet.castingConditions = conditions;
      sheet.permanentInjuries = injuries;
      sheet.castConsequences = consequences;
      const postCastResources = poolAndSafe({ ...character, data: sheet });
      sheet.tension.pool = postCastResources.pool;
      sheet.tension.safeLimit = postCastResources.safeLimit;
      aftermath.pool = postCastResources.pool;
      aftermath.safeLimit = postCastResources.safeLimit;
      const [updated] = await tx.update(charactersTable)
        .set({ data: sheet, version: character.version + 1 })
        .where(eq(charactersTable.id, character.id)).returning();
      const response = {
        roll: responseRoll(roll),
        character: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() },
        aftermath,
      };
      await tx.insert(castResponsesTable).values({
        userId: user.id, requestId: input.requestId, response: { requestType: "cast", request: input, result: response },
      });
      return response;
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode;
    if (statusCode) {
      res.status(statusCode).json({ error: (error as Error).message });
      return;
    }
    req.log.error({ err: error }, "Cast transaction failed");
    res.status(500).json({ error: "Cast could not be completed" });
    return;
  }

  res.status(201).json(result.character?.affinity === "Cosmic"
    ? { ...result, character: { ...result.character, affinity: canonicalAffinity(result.character.affinity) } }
    : result);
  for (const roll of newRolls) {
    if (roll.deliveryStatus === "pending") void deliverDiscord(roll, req.log);
  }
});

router.post("/casts/strain", async (req, res): Promise<void> => {
  const parsed = CreateCastStrainCheckBody.safeParse(req.body);
  if (!parsed.success || !req.body || Object.keys(req.body).some(key => !["requestId", "characterId"].includes(key))) {
    res.status(400).json({ error: "Invalid strain check request" });
    return;
  }
  const input = parsed.data;
  const user = (req as any).user;
  const style = user.dicePreferences?.sets?.find((set: { id: string }) => set.id === user.dicePreferences.selectedId);
  const saveCastRoll: SaveCastRoll = (tx, args) =>
    saveRoll(tx, { ...args, diceName: style?.name, diceColor: style?.edgeColor });
  let newRolls: RollRecord[] = [];
  let response: any;
  try {
    response = await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${user.id}, hashtext(${input.requestId}))`);
      const [existing] = await tx.select().from(castResponsesTable)
        .where(and(eq(castResponsesTable.userId, user.id), eq(castResponsesTable.requestId, input.requestId))).limit(1);
      if (existing) {
        const replay = decideReplay(existing.requestId, existing.response, input.requestId, "strain", input);
        if (replay.kind === "conflict") {
          throw Object.assign(new Error("Request ID was already used for a different request"), { statusCode: 409 });
        }
        return replay.result;
      }

      const castable = user.role === "weavekeeper"
        ? eq(charactersTable.id, input.characterId)
        : and(eq(charactersTable.id, input.characterId), eq(charactersTable.userId, user.id));
      const [locked] = await tx.select({ id: charactersTable.id }).from(charactersTable)
        .where(castable)
        .for("update").limit(1);
      if (!locked) throw Object.assign(new Error("Character unavailable for this strain check"), { statusCode: 403 });
      const [character] = await tx.select().from(charactersTable).where(eq(charactersTable.id, locked.id)).limit(1);
      const data = character.data as any;
      const { pool, safeLimit } = poolAndSafe(character);
      const tension = Number.isFinite(data?.tension?.current) ? data.tension.current : 0;
      if (tension <= safeLimit) {
        throw Object.assign(new Error("A strain check is only available when Tension exceeds the Safe Limit"), { statusCode: 409 });
      }
      const dc = 10 + Math.max(0, tension - safeLimit);
      const modifier = calcMod(getAttr(data, "res"));
      const roll = await saveCastRoll(tx, {
        userId: user.id, characterId: character.id, playerName: user.displayName, characterName: character.name,
        title: "Strain check", category: "check", mode: "NORMAL", sides: 20, count: 1,
        modifier, dc, requestId: input.requestId,
      });
      newRolls.push(roll);

      const sheet = { ...data };
      const conditions: string[] = Array.isArray(data?.castingConditions) ? [...data.castingConditions] : [];
      const consequences = readConsequences(data?.castConsequences);
      const injuries = readInjuries(data?.permanentInjuries);
      sheet.tension = { ...(data?.tension ?? {}), current: tension, pool, safeLimit };
      sheet.castingConditions = conditions;
      sheet.castConsequences = consequences;
      sheet.permanentInjuries = injuries;
      const failed = roll.isMisfire || (!roll.isBreak && roll.total < dc);
      const aftermath: any = {
        cost: 0, tension, pool, safeLimit, overflow: false,
        strain: { die: roll.finalDie, total: roll.total, dc, failed },
      };
      if (failed) {
        await applyEffect(tx, saveCastRoll, {
          userId: user.id, playerName: user.displayName, character, data, sheet, aftermath,
          conditions, consequences, injuries, newRolls,
        }, "Snapback");
      }

      sheet.castingConditions = conditions;
      sheet.castConsequences = consequences;
      sheet.permanentInjuries = injuries;
      const postCheckResources = poolAndSafe({ ...character, data: sheet });
      sheet.tension.pool = postCheckResources.pool;
      sheet.tension.safeLimit = postCheckResources.safeLimit;
      aftermath.pool = postCheckResources.pool;
      aftermath.safeLimit = postCheckResources.safeLimit;
      const [updated] = await tx.update(charactersTable).set({ data: sheet, version: character.version + 1 })
        .where(eq(charactersTable.id, character.id)).returning();
      const result = {
        roll: responseRoll(roll),
        character: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() },
        aftermath,
      };
      await tx.insert(castResponsesTable).values({
        userId: user.id, requestId: input.requestId,
        response: { requestType: "strain", request: input, result },
      });
      return result;
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode;
    if (statusCode) {
      res.status(statusCode).json({ error: (error as Error).message });
      return;
    }
    req.log.error({ err: error }, "Strain check transaction failed");
    res.status(500).json({ error: "Strain check could not be completed" });
    return;
  }

  res.status(201).json(response);
  for (const roll of newRolls) {
    if (roll.deliveryStatus === "pending") void deliverDiscord(roll, req.log);
  }
});

router.post("/casts/consequences/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const body = req.body;
  if (!/^\d{1,20}$/.test(id) || !body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => key !== "choice") ||
      typeof body.choice !== "string" || !body.choice.trim() || body.choice.trim().length > 120) {
    res.status(400).json({ error: "A valid consequence ID and choice are required" });
    return;
  }
  const consequenceId = id;
  const choice = body.choice.trim();
  const user = (req as any).user;
  const [candidate] = await db.select({ id: charactersTable.id }).from(charactersTable)
    .where(user.role === "weavekeeper"
      ? sql`${charactersTable.data}->'castConsequences' @> ${JSON.stringify([{ id: consequenceId }])}::jsonb`
      : and(
        eq(charactersTable.userId, user.id),
        sql`${charactersTable.data}->'castConsequences' @> ${JSON.stringify([{ id: consequenceId }])}::jsonb`,
      )).limit(1);
  if (!candidate) {
    res.status(404).json({ error: "Pending cast consequence not found" });
    return;
  }

  try {
    const result = await db.transaction(async tx => {
      const [character] = await tx.select().from(charactersTable)
        .where(user.role === "weavekeeper"
          ? eq(charactersTable.id, candidate.id)
          : and(eq(charactersTable.id, candidate.id), eq(charactersTable.userId, user.id)))
        .for("update").limit(1);
      if (!character) return { kind: "missing" as const };
      const data = { ...(character.data as any) };
      const consequences = readConsequences(data.castConsequences);
      const consequence = consequences.find(item => item.id === consequenceId);
      if (!consequence) return { kind: "missing" as const };
      if (consequence.status === "resolved") {
        const sameChoice = consequence.choiceType === "string"
          ? typeof consequence.choice === "string" && stringKey(consequence.choice) === stringKey(choice)
          : consequence.choice === choice;
        if (!sameChoice) return { kind: "conflict" as const };
        return { kind: "updated" as const, character };
      }
      if (consequence.status !== "pending") return { kind: "missing" as const };

      let resolvedChoice = choice;
      const injuries = readInjuries(data.permanentInjuries);
      const injuryIndex = injuries.findIndex(injury => injury.id === consequenceId);
      if (consequence.choiceType === "string") {
        const strings: string[] = Array.isArray(data.strings) ? data.strings : [];
        const lostStrings = new Set(injuries.filter(injury => injury.name === "Lost Thread" && typeof injury.string === "string")
          .map(injury => stringKey(injury.string!)));
        const selected = strings.find(name => stringKey(name) === stringKey(choice));
        if (!selected || lostStrings.has(stringKey(selected))) return { kind: "invalid" as const };
        resolvedChoice = selected;
        data.strings = strings.filter(name => stringKey(name) !== stringKey(selected));
        if (injuryIndex >= 0) injuries[injuryIndex] = { ...injuries[injuryIndex], string: selected };
      } else if (consequence.choiceType === "sense") {
        if (injuryIndex >= 0) injuries[injuryIndex] = { ...injuries[injuryIndex], senseType: choice };
      } else if (consequence.choiceType !== "target") {
        return { kind: "invalid" as const };
      }

      consequence.status = "resolved";
      consequence.choice = resolvedChoice;
      data.castConsequences = consequences;
      data.permanentInjuries = injuries;
      const [updated] = await tx.update(charactersTable)
        .set({ data, version: character.version + 1 })
        .where(eq(charactersTable.id, character.id)).returning();
      return { kind: "updated" as const, character: updated };
    });
    if (result.kind === "missing") {
      res.status(404).json({ error: "Pending cast consequence not found" });
      return;
    }
    if (result.kind === "conflict") {
      res.status(409).json({ error: "This consequence was already resolved with a different choice" });
      return;
    }
    if (result.kind === "invalid") {
      res.status(400).json({ error: "Choice is not valid for this pending consequence" });
      return;
    }
    const updated = result.character;
    res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (error) {
    req.log.error({ err: error }, "Could not resolve cast consequence");
    res.status(500).json({ error: "Cast consequence could not be resolved" });
  }
});

async function deliverDiscord(roll: RollRecord, log: { warn: (data: object, message: string) => void }) {
  const raw = process.env.DISCORD_WEBHOOK_URL;
  let status = "failed";
  let url: string | null = null;
  try {
    if (raw) {
      const parsed = new URL(raw);
      if (parsed.protocol === "https:" && parsed.hostname === "discord.com" && !parsed.port &&
        !parsed.username && !parsed.password && !parsed.search && !parsed.hash &&
        /^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(parsed.pathname)) url = parsed.href;
    }
  } catch { /* invalid webhook configuration */ }
  if (url) {
    try {
      const result = await postRollEmbed(roll, url);
      status = result.ok ? "sent" : "failed";
      if (!result.ok) log.warn({ rollId: roll.id, statusCode: result.status }, "Discord roll delivery failed");
    } catch {
      log.warn({ rollId: roll.id }, "Discord roll delivery failed");
    }
  }
  try {
    await db.update(rollsTable).set({ deliveryStatus: status }).where(eq(rollsTable.id, roll.id));
  } catch {
    log.warn({ rollId: roll.id }, "Could not save Discord delivery status");
  }
}

export default router;