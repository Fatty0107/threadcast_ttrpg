import { boolean, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const weavekeeperBestiaryTable = pgTable("weavekeeper_bestiary", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  level: integer("level").notNull(),
  sheet: jsonb("sheet").notNull().default({}),
  isSeed: boolean("is_seed").notNull().default(true),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [uniqueIndex("weavekeeper_bestiary_slug_unique").on(table.slug)]);

export type WeavekeeperBestiaryEntry = typeof weavekeeperBestiaryTable.$inferSelect;
