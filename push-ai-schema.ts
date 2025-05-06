import { db } from "./server/db";
import * as schema from "./shared/ai-schema";

async function main() {
  try {
    console.log("Applying AI schema to database...");

    // Create AI provider enum
    await db.execute(/*sql*/`
      -- AI Provider enum
      DO $$ BEGIN
          CREATE TYPE ai_provider AS ENUM ('Google', 'OpenAI', 'Anthropic');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create AI-related tables
    await db.execute(/*sql*/`
      -- AI Configurations table
      CREATE TABLE IF NOT EXISTS ai_configurations (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        provider ai_provider NOT NULL,
        model TEXT NOT NULL,
        api_key TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- AI Chat Conversations table
      CREATE TABLE IF NOT EXISTS ai_chat_conversations (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- AI Chat Messages table
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        message TEXT,
        response TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- AI Task Suggestions table
      CREATE TABLE IF NOT EXISTS ai_task_suggestions (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        entity_id INTEGER NOT NULL,
        suggestions JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- AI Compliance Analysis table
      CREATE TABLE IF NOT EXISTS ai_compliance_analyses (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        entity_id INTEGER NOT NULL,
        analysis TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- AI Document Analysis table
      CREATE TABLE IF NOT EXISTS ai_document_analyses (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        document_type TEXT NOT NULL,
        document_hash TEXT NOT NULL,
        extracted_info JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- AI Learning Data table
      CREATE TABLE IF NOT EXISTS ai_learning_data (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        data_type TEXT NOT NULL,
        data JSONB NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log("AI schema applied successfully!");
  } catch (error) {
    console.error("Error applying AI schema:", error);
  }
}

main().catch(console.error);