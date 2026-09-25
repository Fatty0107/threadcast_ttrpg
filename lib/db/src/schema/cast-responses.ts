import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const castResponsesTable = pgTable("cast_responses", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull(),
  requestId: text("request_id").notNull(),
  response: jsonb("response").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [uniqueIndex("cast_responses_user_request_unique").on(table.userId, table.requestId)]);

export type CastResponse = typeof castResponsesTable.$inferSelect;