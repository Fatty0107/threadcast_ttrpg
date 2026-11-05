import { randomUUID } from "node:crypto";
import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, weavekeeperBestiaryTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { RANK_F_BESTIARY, type BestiaryAttributeKey, type BestiarySheet } from "../data/rank-f-bestiary";

const router = Router();
router.use(requireAuth);

function weavekeeperOnly(req: any, res: any): boolean {
  if (req.user?.role === "weavekeeper") return true;
  res.status(403).json({ error: "Weavekeeper access required" });
  return false;
}

async function seedManualProfiles() {
  await db.insert(weavekeeperBestiaryTable).values(RANK_F_BESTIARY.map(entry => ({ ...entry, isSeed: true })))
    .onConflictDoNothing({ target: weavekeeperBestiaryTable.slug });
}

function safeText(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}

function validAttribute(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= 30;
}

function deriveCustomSheet(body: any): BestiarySheet | null {
  const allowedKinds = ["NPC", "Monster", "Creature", "Construct", "Boss"];
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      !allowedKinds.includes(body.kind) || !Number.isSafeInteger(body.level) || body.level < 1 || body.level > 30 ||
      !Number.isSafeInteger(body.refinementBonus) || body.refinementBonus < 0 || body.refinementBonus > 10 ||
      !body.attributes || !["pot", "ctr", "res", "acu", "pre", "ths"].every(key => validAttribute(body.attributes[key])) ||
      !safeText(body.role, 180) || !safeText(body.affinityModes, 400) || !safeText(body.tactics, 2000)) return null;

  const listsValid = (value: unknown, max: number) => Array.isArray(value) && value.length <= max;
  if (!listsValid(body.skills, 40) || !listsValid(body.actions, 40) || !listsValid(body.abilities, 40) || !listsValid(body.gmNotes, 20)) return null;
  const skills = body.skills.map((item: any) => ({
    name: safeText(item?.name, 100), modifier: item?.modifier,
  }));
  if (skills.some((item: any) => !item.name || !Number.isSafeInteger(item.modifier) || item.modifier < -20 || item.modifier > 50)) return null;
  const actions = body.actions.map((item: any) => {
    if (!safeText(item?.name, 120) || !safeText(item?.detail, 500)) return null;
    if (item.attackModifier !== undefined && (!Number.isSafeInteger(item.attackModifier) || item.attackModifier < -20 || item.attackModifier > 50)) return null;
    if (item.checkModifier !== undefined && (!Number.isSafeInteger(item.checkModifier) || item.checkModifier < -20 || item.checkModifier > 50)) return null;
    if (item.dc !== undefined && (!Number.isSafeInteger(item.dc) || item.dc < 1 || item.dc > 40)) return null;
    if (item.tensionCost !== undefined && (!Number.isSafeInteger(item.tensionCost) || item.tensionCost < 0 || item.tensionCost > 1000)) return null;
    if (item.targetDefense !== undefined && !["GR", "WR"].includes(item.targetDefense)) return null;
    if (item.damage !== undefined) {
      const dice = item.damage;
      if (![4, 6, 8, 10, 12].includes(dice?.diceSides) || ![1, 2].includes(dice?.diceCount) ||
          !Number.isSafeInteger(dice?.modifier) || dice.modifier < -50 || dice.modifier > 50 ||
          ((dice.bonusDiceSides === undefined) !== (dice.bonusDiceCount === undefined)) ||
          (dice.bonusDiceSides !== undefined && (![4, 6, 8, 10, 12].includes(dice.bonusDiceSides) || dice.bonusDiceCount !== 1))) return null;
    }
    return {
      name: item.name.trim(), detail: item.detail.trim(),
      ...(item.attackModifier === undefined ? {} : { attackModifier: item.attackModifier }),
      ...(item.targetDefense ? { targetDefense: item.targetDefense } : {}),
      ...(item.damage ? { damage: item.damage } : {}),
      ...(item.checkModifier === undefined ? {} : { checkModifier: item.checkModifier }),
      ...(item.dc === undefined ? {} : { dc: item.dc }),
      ...(item.tensionCost === undefined ? {} : { tensionCost: item.tensionCost }),
    };
  });
  const abilities = body.abilities.map((item: any) => ({ name: safeText(item?.name, 120), detail: safeText(item?.detail, 800) }));
  const gmNotes = body.gmNotes.map((item: unknown) => safeText(item, 800));
  if (actions.some((item: unknown) => item === null) || abilities.some((item: any) => !item.name || !item.detail) || gmNotes.some((item: unknown) => item === null)) return null;

  const attributes = body.attributes as Record<BestiaryAttributeKey, number>;
  const mod = (score: number) => Math.floor((score - 10) / 2);
  const pot = mod(attributes.pot), ctr = mod(attributes.ctr), res = mod(attributes.res);
  const max = attributes.res + 8 + 2 * (body.level - 1);
  const pool = Math.max(6, (pot + ctr + body.level) * 2);
  return {
    section: "Weavekeeper creations", role: body.role.trim(), refinementBonus: body.refinementBonus,
    attributes: { ...attributes }, affinityModes: body.affinityModes.trim(), skills,
    actions: actions as BestiarySheet["actions"], abilities, tactics: body.tactics.trim(), gmNotes,
    vitality: { current: max, max }, tension: { current: 0, pool, safeLimit: pot + ctr + body.level },
    guardRating: 10 + res, wardRating: 10 + ctr, burnout: 0, conditions: [],
  };
}

router.get("/", async (req, res): Promise<void> => {
  if (!weavekeeperOnly(req, res)) return;
  await seedManualProfiles();
  const entries = await db.select().from(weavekeeperBestiaryTable).orderBy(asc(weavekeeperBestiaryTable.id));
  res.json(entries);
});

router.post("/", async (req, res): Promise<void> => {
  if (!weavekeeperOnly(req, res)) return;
  const name = safeText(req.body?.name, 100);
  const sheet = deriveCustomSheet(req.body?.sheet);
  const kind = req.body?.kind;
  const level = req.body?.level;
  if (!name || !sheet || kind !== req.body.sheet.kind || level !== req.body.sheet.level) {
    res.status(400).json({ error: "Complete the name, type, level, attributes, skills, actions, and abilities." });
    return;
  }
  const [entry] = await db.insert(weavekeeperBestiaryTable).values({
    slug: `custom-${randomUUID()}`, name, kind, level, sheet, isSeed: false,
  }).returning();
  res.status(201).json(entry);
});

router.patch("/:id", async (req, res): Promise<void> => {
  if (!weavekeeperOnly(req, res)) return;
  const id = Number(req.params.id);
  const { expectedVersion, vitality, tension, burnout, conditions } = req.body ?? {};
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 ||
      (vitality !== undefined && (!vitality || !Number.isSafeInteger(vitality.current) || vitality.current < 0 || !Number.isSafeInteger(vitality.max) || vitality.max < 1 || vitality.current > vitality.max)) ||
      (tension !== undefined && (!tension || !Number.isSafeInteger(tension.current) || tension.current < 0 || !Number.isSafeInteger(tension.pool) || tension.pool < 0 || tension.current > tension.pool)) ||
      (burnout !== undefined && (!Number.isSafeInteger(burnout) || burnout < 0 || burnout > 6)) ||
      (conditions !== undefined && (!Array.isArray(conditions) || conditions.length > 20 || conditions.some((item: unknown) => !safeText(item, 100))))) {
    res.status(400).json({ error: "Invalid bestiary update" });
    return;
  }
  const result = await db.transaction(async tx => {
    const [entry] = await tx.select().from(weavekeeperBestiaryTable)
      .where(eq(weavekeeperBestiaryTable.id, id)).for("update").limit(1);
    if (!entry) return { status: "missing" as const };
    if (entry.version !== expectedVersion) return { status: "stale" as const };
    const prior = entry.sheet as BestiarySheet;
    const sheet: BestiarySheet = {
      ...prior,
      ...(vitality ? { vitality } : {}),
      ...(tension ? { tension } : {}),
      ...(burnout === undefined ? {} : { burnout }),
      ...(conditions ? { conditions: conditions.map((item: string) => item.trim()).filter(Boolean) } : {}),
    };
    const [updated] = await tx.update(weavekeeperBestiaryTable).set({ sheet, version: entry.version + 1 })
      .where(and(eq(weavekeeperBestiaryTable.id, id), eq(weavekeeperBestiaryTable.version, expectedVersion))).returning();
    return updated ? { status: "updated" as const, entry: updated } : { status: "stale" as const };
  });
  if (result.status === "missing") { res.status(404).json({ error: "Bestiary sheet not found" }); return; }
  if (result.status === "stale") { res.status(409).json({ error: "This sheet changed in another tab. Reload it before saving." }); return; }
  res.json(result.entry);
});

router.delete("/:id", async (req, res): Promise<void> => {
  if (!weavekeeperOnly(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Invalid bestiary sheet" }); return; }
  const [entry] = await db.delete(weavekeeperBestiaryTable)
    .where(and(eq(weavekeeperBestiaryTable.id, id), eq(weavekeeperBestiaryTable.isSeed, false))).returning({ id: weavekeeperBestiaryTable.id });
  if (!entry) { res.status(404).json({ error: "Custom sheet not found" }); return; }
  res.status(204).end();
});

export default router;
