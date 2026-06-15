import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const homebrewTable = pgTable("homebrew", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "affinity" | "item" | "background"
  name: text("name").notNull(),
  data: jsonb("data").notNull().default({}),
  published: boolean("published").notNull().default(false),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertHomebrewSchema = createInsertSchema(homebrewTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHomebrew = z.infer<typeof insertHomebrewSchema>;
export type Homebrew = typeof homebrewTable.$inferSelect;
