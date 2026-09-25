import { Router } from "express";
import { db, charactersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { UpdateWeavekeeperAdditionsBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.use(requireAuth);

function isWeavekeeper(req: any): boolean {
  return req.user?.role === "weavekeeper";
}

router.get("/", async (req, res) => {
  const user = (req as any).user;
  const characters = isWeavekeeper(req)
    ? await db.select().from(charactersTable)
    : await db.select().from(charactersTable).where(eq(charactersTable.userId, user.id));
  res.json(characters);
});

router.post("/", async (req, res) => {
  const user = (req as any).user;
  const { name, level = 1, affinity, mode, data = {}, isDraft = true } = req.body;

  if (!name) {
    res.status(400).json({ error: "Name required" });
    return;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    res.status(400).json({ error: "Invalid character data" });
    return;
  }
  // Character creation cannot write fields reserved for the Weavekeeper.
  const { weavekeeperAdditions: _ignored, ...playerData } = data;

  const [character] = await db
    .insert(charactersTable)
    .values({
      userId: user.id,
      name,
      level,
      affinity: affinity || null,
      mode: mode || null,
      data: playerData,
      isDraft,
    })
    .returning();

  res.status(201).json(character);
});

router.get("/:id", async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(req.params.id ?? "0");

  const query = isWeavekeeper(req)
    ? db.select().from(charactersTable).where(eq(charactersTable.id, id)).limit(1)
    : db.select().from(charactersTable).where(and(eq(charactersTable.id, id), eq(charactersTable.userId, user.id))).limit(1);

  const [character] = await query;

  if (!character) {
    res.status(404).json({ error: "Character not found" });
    return;
  }

  res.json(character);
});

router.patch("/:id/weavekeeper-additions", async (req, res) => {
  if (!isWeavekeeper(req)) {
    res.status(403).json({ error: "Weavekeeper access required" });
    return;
  }
  const id = Number(req.params.id);
  const parsed = UpdateWeavekeeperAdditionsBody.strict().safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success ||
      !Number.isSafeInteger(parsed.data.expectedVersion)) {
    res.status(400).json({ error: "Invalid Weavekeeper additions" });
    return;
  }
  const additions = parsed.data.additions;
  if ([additions.feats, additions.items, additions.backgrounds, additions.notes].some(
    entries => new Set(entries.map(entry => entry.id)).size !== entries.length ||
      entries.some(entry => !entry.name.trim()),
  ) || [...additions.attunements, ...additions.expertise].some(name => !name.trim()) ||
      new Set(additions.attunements).size !== additions.attunements.length ||
      new Set(additions.expertise).size !== additions.expertise.length ||
      additions.items.some(item => !Number.isSafeInteger(item.quantity))) {
    res.status(400).json({ error: "Additions need unique entries, non-empty names, and whole-number quantities" });
    return;
  }
  try {
    const result = await db.transaction(async tx => {
      const [existing] = await tx.select().from(charactersTable)
        .where(eq(charactersTable.id, id)).for("update").limit(1);
      if (!existing) return { kind: "missing" as const };
      if (existing.version !== parsed.data.expectedVersion) return { kind: "stale" as const };
      const prior = existing.data && typeof existing.data === "object" && !Array.isArray(existing.data)
        ? existing.data as Record<string, unknown> : {};
      const [updated] = await tx.update(charactersTable).set({
        data: { ...prior, weavekeeperAdditions: additions },
        version: existing.version + 1,
      }).where(eq(charactersTable.id, id)).returning();
      return { kind: "updated" as const, character: updated };
    });
    if (result.kind === "missing") res.status(404).json({ error: "Character not found" });
    else if (result.kind === "stale") res.status(409).json({ error: "Sheet changed; reload before saving additions." });
    else res.json(result.character);
  } catch {
    res.status(500).json({ error: "Weavekeeper additions could not be saved" });
  }
});

router.patch("/:id", async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(req.params.id ?? "0");

  const allowed = ["expectedUpdatedAt", "expectedVersion", "name", "level", "affinity", "mode", "data", "isDraft"];
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) ||
      Object.keys(req.body).some(key => !allowed.includes(key)) ||
      (req.body.expectedVersion !== undefined &&
        (!Number.isInteger(req.body.expectedVersion) || req.body.expectedVersion < 0)) ||
      (req.body.expectedUpdatedAt !== undefined &&
        (typeof req.body.expectedUpdatedAt !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(req.body.expectedUpdatedAt) ||
          !Number.isFinite(Date.parse(req.body.expectedUpdatedAt))))) {
    res.status(400).json({ error: "Invalid character update" });
    return;
  }

  const { expectedUpdatedAt, expectedVersion, name, level, affinity, mode, data, isDraft } = req.body;
  if (data !== undefined && expectedVersion === undefined) {
    res.status(428).json({ error: "A character version is required to save sheet data. Reload and try again." });
    return;
  }
  try {
    const result = await db.transaction(async tx => {
      const whereClause = isWeavekeeper(req)
        ? eq(charactersTable.id, id)
        : and(eq(charactersTable.id, id), eq(charactersTable.userId, user.id));
      const [existing] = await tx.select().from(charactersTable).where(whereClause).for("update").limit(1);
      if (!existing) return { kind: "missing" as const };
      if (expectedVersion !== undefined && expectedVersion !== existing.version) {
        return { kind: "stale" as const };
      }
      if (expectedVersion === undefined && expectedUpdatedAt !== undefined &&
          new Date(expectedUpdatedAt).getTime() !== existing.updatedAt.getTime()) {
        return { kind: "stale" as const };
      }
      const updates: Partial<typeof existing> = {};
      if (name !== undefined) updates.name = name;
      if (level !== undefined) updates.level = level;
      if (affinity !== undefined) updates.affinity = affinity;
      if (mode !== undefined) updates.mode = mode;
      if (data !== undefined) {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          return { kind: "invalid" as const };
        }
        const prior = existing.data && typeof existing.data === "object" && !Array.isArray(existing.data)
          ? existing.data as Record<string, unknown> : {};
        const playerData = { ...data };
        // All full-sheet writes retain WK additions, including older builder saves.
        if (prior.weavekeeperAdditions !== undefined) playerData.weavekeeperAdditions = prior.weavekeeperAdditions;
        else delete playerData.weavekeeperAdditions;
        updates.data = playerData;
      }
      if (isDraft !== undefined) updates.isDraft = isDraft;
      const [updated] = await tx.update(charactersTable).set({ ...updates, version: existing.version + 1 })
        .where(eq(charactersTable.id, id)).returning();
      return { kind: "updated" as const, character: updated };
    });
    if (result.kind === "missing") {
      res.status(404).json({ error: "Character not found" });
      return;
    }
    if (result.kind === "invalid") {
      res.status(400).json({ error: "Invalid character data" });
      return;
    }
    if (result.kind === "stale") {
      res.status(409).json({ error: "Character sheet is stale; reload the latest character before saving." });
      return;
    }
    res.json(result.character);
  } catch {
    res.status(500).json({ error: "Character update could not be completed" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id ?? "0");

  const whereClause = isWeavekeeper(req)
    ? eq(charactersTable.id, id)
    : and(eq(charactersTable.id, id), eq(charactersTable.userId, (req as any).user.id));

  const [existing] = await db
    .select()
    .from(charactersTable)
    .where(whereClause)
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Character not found" });
    return;
  }

  await db.delete(charactersTable).where(eq(charactersTable.id, id));
  res.status(204).end();
});

export default router;
