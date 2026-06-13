import { Router } from "express";
import { db, charactersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const user = (req as any).user;
  const characters = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.userId, user.id));
  res.json(characters);
});

router.post("/", async (req, res) => {
  const user = (req as any).user;
  const { name, level = 1, affinity, mode, data = {}, isDraft = true } = req.body;

  if (!name) {
    res.status(400).json({ error: "Name required" });
    return;
  }

  const [character] = await db
    .insert(charactersTable)
    .values({
      userId: user.id,
      name,
      level,
      affinity: affinity || null,
      mode: mode || null,
      data,
      isDraft,
    })
    .returning();

  res.status(201).json(character);
});

router.get("/:id", async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(req.params.id ?? "0");

  const [character] = await db
    .select()
    .from(charactersTable)
    .where(and(eq(charactersTable.id, id), eq(charactersTable.userId, user.id)))
    .limit(1);

  if (!character) {
    res.status(404).json({ error: "Character not found" });
    return;
  }

  res.json(character);
});

router.patch("/:id", async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(req.params.id ?? "0");

  const [existing] = await db
    .select()
    .from(charactersTable)
    .where(and(eq(charactersTable.id, id), eq(charactersTable.userId, user.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Character not found" });
    return;
  }

  const { name, level, affinity, mode, data, isDraft } = req.body;
  const updates: Partial<typeof existing> = {};
  if (name !== undefined) updates.name = name;
  if (level !== undefined) updates.level = level;
  if (affinity !== undefined) updates.affinity = affinity;
  if (mode !== undefined) updates.mode = mode;
  if (data !== undefined) updates.data = data;
  if (isDraft !== undefined) updates.isDraft = isDraft;

  const [updated] = await db
    .update(charactersTable)
    .set(updates)
    .where(eq(charactersTable.id, id))
    .returning();

  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(req.params.id ?? "0");

  const [existing] = await db
    .select()
    .from(charactersTable)
    .where(and(eq(charactersTable.id, id), eq(charactersTable.userId, user.id)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Character not found" });
    return;
  }

  await db
    .delete(charactersTable)
    .where(eq(charactersTable.id, id));

  res.status(204).end();
});

export default router;
