import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  serial,
  boolean,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const apps = pgTable("apps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  githubOrg: text("github_org"),
  githubRepo: text("github_repo"),
  githubBranch: text("github_branch"),
  supabaseProjectId: text("supabase_project_id"),
  supabaseParentProjectId: text("supabase_parent_project_id"),
  neonProjectId: text("neon_project_id"),
  neonDevelopmentBranchId: text("neon_development_branch_id"),
  neonPreviewBranchId: text("neon_preview_branch_id"),
  vercelProjectId: text("vercel_project_id"),
  vercelProjectName: text("vercel_project_name"),
  vercelTeamId: text("vercel_team_id"),
  vercelDeploymentUrl: text("vercel_deployment_url"),
  installCommand: text("install_command"),
  startCommand: text("start_command"),
  chatContext: jsonb("chat_context"),
  isFavorite: boolean("is_favorite").notNull().default(false),
});

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  title: text("title"),
  initialCommitHash: text("initial_commit_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  approvalState: text("approval_state", {
    enum: ["approved", "rejected"],
  }),
  sourceCommitHash: text("source_commit_hash"),
  commitHash: text("commit_hash"),
  requestId: text("request_id"),
  maxTokensUsed: integer("max_tokens_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const versions = pgTable(
  "versions",
  {
    id: serial("id").primaryKey(),
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    commitHash: text("commit_hash").notNull(),
    neonDbTimestamp: text("neon_db_timestamp"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("versions_app_commit_unique").on(table.appId, table.commitHash),
  ]
);

export const languageModelProviders = pgTable("language_model_providers", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  apiBaseUrl: text("api_base_url").notNull(),
  envVarName: text("env_var_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const languageModels = pgTable("language_models", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  apiName: text("api_name").notNull(),
  builtinProviderId: text("builtin_provider_id"),
  customProviderId: text("custom_provider_id").references(
    () => languageModelProviders.id,
    { onDelete: "cascade" }
  ),
  description: text("description"),
  maxOutputTokens: integer("max_output_tokens"),
  contextWindow: integer("context_window"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mcpServers = pgTable("mcp_servers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  transport: text("transport").notNull(),
  command: text("command"),
  args: jsonb("args").$type<string[] | null>(),
  envJson: jsonb("env_json").$type<Record<string, string> | null>(),
  url: text("url"),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mcpToolConsents = pgTable(
  "mcp_tool_consents",
  {
    id: serial("id").primaryKey(),
    serverId: integer("server_id")
      .notNull()
      .references(() => mcpServers.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    consent: text("consent").notNull().default("ask"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique("uniq_mcp_consent").on(table.serverId, table.toolName)]
);

// User settings stored in database instead of file
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  selectedProviderId: text("selected_provider_id"),
  selectedModelApiName: text("selected_model_api_name"),
  selectedChatMode: text("selected_chat_mode"),
  telemetryConsent: text("telemetry_consent"),
  enableAutoUpdate: boolean("enable_auto_update").default(true),
  releaseChannel: text("release_channel").default("stable"),
  thinkingBudgetTokens: integer("thinking_budget_tokens"),
  zoomLevel: integer("zoom_level").default(100),
  runtimeMode: text("runtime_mode").default("local-node"),
  turboEditsVersion: text("turbo_edits_version"),
  maxChatTurns: integer("max_chat_turns"),
  // Free tier usage tracking
  freePromptCount: integer("free_prompt_count").default(0),
  // Pro status
  enableDyadPro: boolean("enable_dyad_pro").default(false),
  providerSettings: jsonb("provider_settings").$type<Record<string, any> | null>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many, one }) => ({
  apps: many(apps),
  prompts: many(prompts),
  settings: one(userSettings),
}));

export const appsRelations = relations(apps, ({ many, one }) => ({
  chats: many(chats),
  versions: many(versions),
  user: one(users, {
    fields: [apps.userId],
    references: [users.id],
  }),
}));

export const chatsRelations = relations(chats, ({ many, one }) => ({
  messages: many(messages),
  app: one(apps, {
    fields: [chats.appId],
    references: [apps.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const languageModelProvidersRelations = relations(
  languageModelProviders,
  ({ many }) => ({
    languageModels: many(languageModels),
  })
);

export const languageModelsRelations = relations(languageModels, ({ one }) => ({
  provider: one(languageModelProviders, {
    fields: [languageModels.customProviderId],
    references: [languageModelProviders.id],
  }),
}));

export const versionsRelations = relations(versions, ({ one }) => ({
  app: one(apps, {
    fields: [versions.appId],
    references: [apps.id],
  }),
}));

export const promptsRelations = relations(prompts, ({ one }) => ({
  user: one(users, {
    fields: [prompts.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

