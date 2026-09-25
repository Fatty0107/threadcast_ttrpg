import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetDicePreferencesResponse,
  PutDicePreferencesBody,
  PutDicePreferencesResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  hasStrictPreferencesShape,
  satisfiesPreferencesInvariants,
} from "../lib/dice-preferences-validation";

const router = Router();

router.use("/dice/preferences", requireAuth);

router.get("/dice/preferences", async (req, res): Promise<void> => {
  const userId = (req as any).user.id as number;
  const [user] = await db
    .select({ dicePreferences: usersTable.dicePreferences })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const stored = user.dicePreferences;
  const parsed = GetDicePreferencesResponse.safeParse(stored);
  if (
    !parsed.success ||
    !hasStrictPreferencesShape(stored) ||
    !satisfiesPreferencesInvariants(parsed.data)
  ) {
    res.status(500).json({ error: "Stored dice preferences are invalid" });
    return;
  }

  res.json(parsed.data);
});

router.put("/dice/preferences", async (req, res): Promise<void> => {
  if (!hasStrictPreferencesShape(req.body)) {
    res.status(400).json({ error: "Invalid dice preferences" });
    return;
  }
  const parsed = PutDicePreferencesBody.safeParse(req.body);
  if (!parsed.success || !satisfiesPreferencesInvariants(parsed.data)) {
    res.status(400).json({ error: "Invalid dice preferences" });
    return;
  }

  const userId = (req as any).user.id as number;
  const [user] = await db
    .update(usersTable)
    .set({ dicePreferences: parsed.data })
    .where(eq(usersTable.id, userId))
    .returning({ dicePreferences: usersTable.dicePreferences });

  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json(PutDicePreferencesResponse.parse(user.dicePreferences));
});

export default router;