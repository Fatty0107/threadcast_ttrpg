import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rollsTable = pgTable("gameplay_rolls", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  requestId: text("request_id").notNull(),
  characterId: integer("character_id"),
  castId: uuid("cast_id"),
  leadCharacterId: integer("lead_character_id"),
  tensionContribution: integer("tension_contribution"),
  contributedString: text("contributed_string"),
  contributedMode: text("contributed_mode"),
  sourceRollId: integer("source_roll_id"),
  parentRollId: integer("parent_roll_id"),
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
}, table => [
  uniqueIndex("gameplay_rolls_user_request_unique").on(table.userId, table.requestId),
  uniqueIndex("gameplay_rolls_source_unique").on(table.sourceRollId),
]);

export const collaborativeCastsTable = pgTable("collaborative_casts", {
  id: uuid("id").primaryKey(),
  leadCharacterId: integer("lead_character_id").notNull(),
  leadUserId: integer("lead_user_id").notNull(),
  participantIds: integer("participant_ids").array().notNull(),
  effect: text("effect").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRollSchema = createInsertSchema(rollsTable).omit({ id: true, createdAt: true });
export type InsertRoll = z.infer<typeof insertRollSchema>;
export type Roll = typeof rollsTable.$inferSelect;