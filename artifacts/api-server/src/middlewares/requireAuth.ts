import { Request, Response, NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, gt } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  (req as any).user = user;
  next();
}

export async function requireWeavekeeper(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    const user = (req as any).user;
    if (user?.role !== "weavekeeper") {
      res.status(403).json({ error: "Weavekeeper access required" });
      return;
    }
    next();
  });
}
