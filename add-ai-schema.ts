import { db } from "./server/db";
import * as schema from "./shared/schema";

async function main() {
  try {
    console.log("Adding AI assistant customizations table to database...");

    // Push schema to database
    await db.execute(/*sql*/`
      -- Create AI personality enum
      DO $$ BEGIN
          CREATE TYPE ai_personality AS ENUM ('Professional', 'Friendly', 'Technical', 'Concise', 'Detailed');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      -- Create AI specialization enum
      DO $$ BEGIN
          CREATE TYPE ai_specialization AS ENUM ('General', 'Accounting', 'Tax', 'Audit', 'Finance', 'Compliance');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      -- Create AI response length enum
      DO $$ BEGIN
          CREATE TYPE ai_response_length AS ENUM ('Detailed', 'Brief', 'Standard');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      -- Create AI tone enum
      DO $$ BEGIN
          CREATE TYPE ai_tone AS ENUM ('Formal', 'Neutral', 'Casual');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      -- Create AI assistant customizations table
      CREATE TABLE IF NOT EXISTS ai_assistant_customizations (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL DEFAULT 'My Assistant',
          personality ai_personality NOT NULL DEFAULT 'Professional',
          specialization ai_specialization NOT NULL DEFAULT 'General',
          response_length ai_response_length NOT NULL DEFAULT 'Standard',
          tone ai_tone NOT NULL DEFAULT 'Neutral',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(tenant_id, user_id)
      );
    `);

    console.log("AI assistant customizations table added successfully!");
  } catch (error) {
    console.error("Error adding AI assistant customizations table:", error);
  }
}

main().catch(console.error);