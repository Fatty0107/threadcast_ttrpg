import { Router } from "express";
import { db, homebrewTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.use(requireAuth);

function requireWeavekeeper(req: any, res: any, next: any) {
  if (req.user?.role !== "weavekeeper") {
    res.status(403).json({ error: "Weavekeeper access required" });
    return;
  }
  next();
}

// List published homebrew (all authenticated users)
router.get("/published", async (_req, res) => {
  const items = await db
    .select()
    .from(homebrewTable)
    .where(eq(homebrewTable.published, true));
  res.json(items);
});

// List all homebrew (weavekeeper only)
router.get("/", requireWeavekeeper, async (_req, res) => {
  const items = await db.select().from(homebrewTable);
  res.json(items);
});

// Create homebrew (weavekeeper only)
router.post("/", requireWeavekeeper, async (req: any, res) => {
  const user = req.user;
  const { type, name, data = {} } = req.body;

  if (!type || !name) {
    res.status(400).json({ error: "type and name are required" });
    return;
  }

  const [item] = await db
    .insert(homebrewTable)
    .values({ type, name, data, published: false, createdBy: user.id })
    .returning();

  res.status(201).json(item);
});

// Update homebrew (weavekeeper only)
router.patch("/:id", requireWeavekeeper, async (req, res) => {
  const id = parseInt(req.params.id ?? "0");
  const [existing] = await db
    .select()
    .from(homebrewTable)
    .where(eq(homebrewTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { name, data, published } = req.body;
  const updates: Partial<typeof existing> = {};
  if (name !== undefined) updates.name = name;
  if (data !== undefined) updates.data = data;
  if (published !== undefined) updates.published = published;

  const [updated] = await db
    .update(homebrewTable)
    .set(updates)
    .where(eq(homebrewTable.id, id))
    .returning();

  res.json(updated);
});

// Publish/unpublish homebrew (weavekeeper only)
router.post("/:id/publish", requireWeavekeeper, async (req, res) => {
  const id = parseInt(req.params.id ?? "0");
  const [existing] = await db
    .select()
    .from(homebrewTable)
    .where(eq(homebrewTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [updated] = await db
    .update(homebrewTable)
    .set({ published: !existing.published })
    .where(eq(homebrewTable.id, id))
    .returning();

  res.json(updated);
});

// Delete homebrew (weavekeeper only)
router.delete("/:id", requireWeavekeeper, async (req, res) => {
  const id = parseInt(req.params.id ?? "0");
  const [existing] = await db
    .select()
    .from(homebrewTable)
    .where(eq(homebrewTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(homebrewTable).where(eq(homebrewTable.id, id));
  res.status(204).end();
});

export default router;
