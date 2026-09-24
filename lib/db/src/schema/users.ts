import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

type DicePreferencesData = {
  sets: {
    id: string;
    name: string;
    bodyColor: string;
    inkColor: string;
    edgeColor: string;
    finish: "matte" | "polished" | "glass";
    motif: "plain" | "weave" | "stars" | "etched";
  }[];
  selectedId: string | null;
};

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("player"),
  dicePreferences: jsonb("dice_preferences")
    .$type<DicePreferencesData>()
    .notNull()
    .default({ sets: [], selectedId: null }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
