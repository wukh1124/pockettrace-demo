import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ==========================================
// 1. Better Auth 桌表
// ==========================================

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ==========================================
// 2. 業務領域桌表 (PocketTrace)
// ==========================================

export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text("name"),
  summary: text("summary"),
  destination: text("destination"),
  startDate: integer("start_date", { mode: "timestamp_ms" }),
  endDate: integer("end_date", { mode: "timestamp_ms" }),
  status: text("status", { enum: ["planning", "confirmed", "completed"] }).default("planning"),
  coverImage: text("cover_image"),
  itinerary: text("itinerary", { mode: "json" }), // Store JSON stringified
  flights: text("flights", { mode: "json" }),     // Store JSON stringified
  isPublic: integer("is_public", { mode: "boolean" }).default(false),
  shareToken: text("share_token").unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text("title"),
  content: text("content"),
  tags: text("tags", { mode: "json" }), // Store JSON stringified
  isPinned: integer("is_pinned", { mode: "boolean" }).default(false),
  isPublic: integer("is_public", { mode: "boolean" }).default(false),
  isArchived: integer("is_archived", { mode: "boolean" }).default(false),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  shareEnabled: integer("share_enabled", { mode: "boolean" }).default(false),
  shareToken: text("share_token").unique(),
  shareExpiresAt: integer("share_expires_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const userRelations = relations(user, ({ one, many }) => ({
  trips: many(trips),
  notes: many(notes),
  chatSessions: many(chatSessions),
  settings: one(userSettings),
  apps: many(apps),
  subscriptions: many(subscriptions),
}));

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  model: text("model").default(""),
  chatTone: text("chat_tone").default("normal"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(user, {
    fields: [userSettings.userId],
    references: [user.id],
  }),
}));

export const tripRelations = relations(trips, ({ one }) => ({
  user: one(user, {
    fields: [trips.userId],
    references: [user.id],
  }),
}));

export const noteRelations = relations(notes, ({ one }) => ({
  owner: one(user, {
    fields: [notes.ownerId],
    references: [user.id],
  }),
}));

// ==========================================
// 2.5 Apps & Subscriptions
// ==========================================

export const apps = sqliteTable("apps", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  icon: text("icon"), // optional icon name or url
  orderIndex: integer("order_index").default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const appRelations = relations(apps, ({ one }) => ({
  user: one(user, {
    fields: [apps.userId],
    references: [user.id],
  }),
}));

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  price: real("price").notNull(),
  currency: text("currency").default("HKD").notNull(),
  cycle: text("cycle", { enum: ["monthly", "yearly"] }).default("monthly").notNull(),
  nextBillingDate: integer("next_billing_date", { mode: "timestamp_ms" }),
  url: text("url"),
  color: text("color"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
  user: one(user, {
    fields: [subscriptions.userId],
    references: [user.id],
  }),
}));

// ==========================================
// 3. AI 聊天功能 (Chat)
// ==========================================

export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  model: text("model").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text("role", { enum: ["user", "ai", "system"] }).notNull(),
  content: text("content").notNull(),
  images: text("images", { mode: "json" }), // Store list of image URLs or base64
  model: text("model"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const chatSessionRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(user, {
    fields: [chatSessions.userId],
    references: [user.id],
  }),
  messages: many(chatMessages),
  tokenUsages: many(aiTokenUsage),
}));

export const chatMessageRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const aiTokenUsage = sqliteTable("ai_token_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  sessionId: text("session_id")
    .references(() => chatSessions.id, { onDelete: 'set null' }),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  inputCost: real("input_cost").notNull().default(0), // 美元
  outputCost: real("output_cost").notNull().default(0), // 美元
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const aiTokenUsageRelations = relations(aiTokenUsage, ({ one }) => ({
  user: one(user, {
    fields: [aiTokenUsage.userId],
    references: [user.id],
  }),
  session: one(chatSessions, {
    fields: [aiTokenUsage.sessionId],
    references: [chatSessions.id],
  }),
}));

// ==========================================
// 4. AI 記錄日誌 (Logs)
// ==========================================

export const aiLogs = sqliteTable("ai_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: 'set null' }),
  type: text("type").notNull(), // 'trip_generation', 'cover_generation', 'chat'
  model: text("model").notNull(),
  prompt: text("prompt"),
  systemInstruction: text("system_instruction"),
  response: text("response"), // JSON string or simple text
  error: text("error"),
  latencyMs: integer("latency_ms"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const aiLogsRelations = relations(aiLogs, ({ one }) => ({
  user: one(user, {
    fields: [aiLogs.userId],
    references: [user.id],
  }),
}));

