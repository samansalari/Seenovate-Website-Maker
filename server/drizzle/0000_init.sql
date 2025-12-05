-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT,
  "name" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Prompts table
CREATE TABLE IF NOT EXISTS "prompts" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Apps table
CREATE TABLE IF NOT EXISTS "apps" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "github_org" TEXT,
  "github_repo" TEXT,
  "github_branch" TEXT,
  "supabase_project_id" TEXT,
  "supabase_parent_project_id" TEXT,
  "neon_project_id" TEXT,
  "neon_development_branch_id" TEXT,
  "neon_preview_branch_id" TEXT,
  "vercel_project_id" TEXT,
  "vercel_project_name" TEXT,
  "vercel_team_id" TEXT,
  "vercel_deployment_url" TEXT,
  "install_command" TEXT,
  "start_command" TEXT,
  "chat_context" JSONB,
  "is_favorite" BOOLEAN NOT NULL DEFAULT FALSE
);

-- Chats table
CREATE TABLE IF NOT EXISTS "chats" (
  "id" SERIAL PRIMARY KEY,
  "app_id" INTEGER NOT NULL REFERENCES "apps"("id") ON DELETE CASCADE,
  "title" TEXT,
  "initial_commit_hash" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS "messages" (
  "id" SERIAL PRIMARY KEY,
  "chat_id" INTEGER NOT NULL REFERENCES "chats"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('user', 'assistant')),
  "content" TEXT NOT NULL,
  "approval_state" TEXT CHECK ("approval_state" IN ('approved', 'rejected')),
  "source_commit_hash" TEXT,
  "commit_hash" TEXT,
  "request_id" TEXT,
  "max_tokens_used" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Versions table
CREATE TABLE IF NOT EXISTS "versions" (
  "id" SERIAL PRIMARY KEY,
  "app_id" INTEGER NOT NULL REFERENCES "apps"("id") ON DELETE CASCADE,
  "commit_hash" TEXT NOT NULL,
  "neon_db_timestamp" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("app_id", "commit_hash")
);

-- Language model providers table
CREATE TABLE IF NOT EXISTS "language_model_providers" (
  "id" TEXT PRIMARY KEY,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "api_base_url" TEXT NOT NULL,
  "env_var_name" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Language models table
CREATE TABLE IF NOT EXISTS "language_models" (
  "id" SERIAL PRIMARY KEY,
  "display_name" TEXT NOT NULL,
  "api_name" TEXT NOT NULL,
  "builtin_provider_id" TEXT,
  "custom_provider_id" TEXT REFERENCES "language_model_providers"("id") ON DELETE CASCADE,
  "description" TEXT,
  "max_output_tokens" INTEGER,
  "context_window" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- MCP servers table
CREATE TABLE IF NOT EXISTS "mcp_servers" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "transport" TEXT NOT NULL,
  "command" TEXT,
  "args" JSONB,
  "env_json" JSONB,
  "url" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- MCP tool consents table
CREATE TABLE IF NOT EXISTS "mcp_tool_consents" (
  "id" SERIAL PRIMARY KEY,
  "server_id" INTEGER NOT NULL REFERENCES "mcp_servers"("id") ON DELETE CASCADE,
  "tool_name" TEXT NOT NULL,
  "consent" TEXT NOT NULL DEFAULT 'ask',
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("server_id", "tool_name")
);

-- User settings table
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "selected_provider_id" TEXT,
  "selected_model_api_name" TEXT,
  "selected_chat_mode" TEXT,
  "telemetry_consent" TEXT,
  "enable_auto_update" BOOLEAN DEFAULT TRUE,
  "release_channel" TEXT DEFAULT 'stable',
  "thinking_budget_tokens" INTEGER,
  "zoom_level" INTEGER DEFAULT 100,
  "runtime_mode" TEXT DEFAULT 'local-node',
  "turbo_edits_version" TEXT,
  "max_chat_turns" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_apps_user_id" ON "apps"("user_id");
CREATE INDEX IF NOT EXISTS "idx_chats_app_id" ON "chats"("app_id");
CREATE INDEX IF NOT EXISTS "idx_messages_chat_id" ON "messages"("chat_id");
CREATE INDEX IF NOT EXISTS "idx_prompts_user_id" ON "prompts"("user_id");
CREATE INDEX IF NOT EXISTS "idx_versions_app_id" ON "versions"("app_id");

