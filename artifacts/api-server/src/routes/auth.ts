import { Router } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const HARDCODED_USERS = [
  { username: "aria_solforge", password: "embersong", displayName: "Aria Solforge", role: "player" },
  { username: "maya", password: "7777", displayName: "Maya", role: "player" },
  { username: "eternal", password: "0002", displayName: "Eternal", role: "player" },
  { username: "mike", password: "1317", displayName: "Mike", role: "player" },
  { username: "julia", password: "4806", displayName: "Julia", role: "player" },
  { username: "kit", password: "1872", displayName: "Kit", role: "player" },
  { username: "qis", password: "0905", displayName: "Qis", role: "player" },
  { username: "falisha", password: "1302", displayName: "Falisha", role: "player" },
  { username: "tifani", password: "7534", displayName: "Tifani", role: "player" },
  { username: "weavekeeper", password: "1268", displayName: "The Weavekeeper", role: "weavekeeper" },
] as const;

export async function seedUsers() {
  for (const u of HARDCODED_USERS) {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, u.username))
      .limit(1);
    if (!existing) {
      await db.insert(usersTable).values({
        username: u.username,
        passwordHash: hashPassword(u.password),
        displayName: u.displayName,
        role: u.role,
      });
    }
  }
  // Remove legacy DM account if it still exists
  await db.delete(usersTable).where(eq(usersTable.username, "weavekeeper_dm"));
}

let seeded = false;
async function ensureSeeded() {
  if (!seeded) {
    await seedUsers();
    seeded = true;
  }
}

router.post("/login", async (req, res) => {
  await ensureSeeded();
  const { username, password } = req.body as { username: string; password: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(sessionsTable).values({
    userId: user.id,
    token,
    expiresAt,
  });

  res.cookie("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  });
});

router.post("/logout", async (req, res) => {
  const token = req.cookies?.session;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    res.clearCookie("session");
  }
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  });
});

export default router;
