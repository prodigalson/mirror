import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("mirror_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  gbrainContext: boolean("gbrain_context").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentEndpoints = pgTable("mirror_agent_endpoints", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  token: text("token"),
  sessionKey: text("session_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AgentEndpoint = typeof agentEndpoints.$inferSelect;
export type NewAgentEndpoint = typeof agentEndpoints.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const sessions = pgTable("mirror_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  mode: text("mode").notNull(),
  topic: text("topic").notNull(),
  agentEndpointId: text("agent_endpoint_id").references(() => agentEndpoints.id, {
    onDelete: "set null",
  }),
  savedToBrain: boolean("saved_to_brain").notNull().default(false),
  brainSlug: text("brain_slug"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export const messages = pgTable("mirror_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
