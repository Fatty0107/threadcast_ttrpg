import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rollsTable = pgTable("gameplay_rolls", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  requestId: text("request_id").notNull(),
  characterId: integer("character_id"),
  playerName: text("player_name").notNull(),
  characterName: text("character_name").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  mode: text("mode").notNull(),
  diceSides: integer("dice_sides").notNull(),
  d1: integer("d1").notNull(),
  d2: integer("d2"),
  extraDice: jsonb("extra_dice").$type<{ sides: number; value: number }[]>().notNull().default([]),
  modifier: integer("modifier").notNull(),
  multiplier: integer("multiplier").notNull(),
  finalDie: integer("final_die").notNull(),
  total: integer("total").notNull(),
  dc: integer("dc"),
  isBreak: integer("is_break").notNull(),
  isMisfire: integer("is_misfire").notNull(),
  outcome: text("outcome").notNull(),
  diceName: text("dice_name").notNull(),
  diceColor: text("dice_color").notNull(),
  deliveryStatus: text("delivery_status").notNull().default("disabled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [uniqueIndex("gameplay_rolls_user_request_unique").on(table.userId, table.requestId)]);

export const insertRollSchema = createInsertSchema(rollsTable).omit({ id: true, createdAt: true });
export type InsertRoll = z.infer<typeof insertRollSchema>;
export type Roll = typeof rollsTable.$inferSelect;