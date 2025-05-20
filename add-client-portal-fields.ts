import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { boolean, pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  // Get database URL from environment variables
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  // Connect to database
  const sql_client = neon(databaseUrl);
  const db = drizzle(sql_client);

  // Add hasPortalAccess column to clients table if it doesn't exist
  console.log("Adding hasPortalAccess column to clients table...");
  try {
    await db.execute(sql`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS has_portal_access boolean DEFAULT false
    `);
    console.log("hasPortalAccess column added to clients table");
  } catch (error) {
    console.error("Error adding hasPortalAccess column to clients table:", error);
  }

  // Create client portal access table if it doesn't exist
  console.log("Creating client portal access table...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_portal_access (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        password_reset_required BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);
    console.log("Client portal access table created");
    
    // Add unique constraint on username and tenant_id
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'unique_username_tenant'
        ) THEN
          ALTER TABLE client_portal_access
          ADD CONSTRAINT unique_username_tenant UNIQUE (username, tenant_id);
        END IF;
      END $$;
    `);
    console.log("Added unique constraint on username and tenant_id");
    
  } catch (error) {
    console.error("Error creating client portal access table:", error);
  }

  // Create client portal sessions table if it doesn't exist
  console.log("Creating client portal sessions table...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_portal_sessions (
        sid TEXT PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `);
    console.log("Client portal sessions table created");
    
    // Add index on expire field
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'client_portal_sessions_expire_idx'
        ) THEN
          CREATE INDEX IF NOT EXISTS client_portal_sessions_expire_idx ON client_portal_sessions (expire);
        END IF;
      END $$;
    `);
    console.log("Added index on expire field in client portal sessions table");
    
  } catch (error) {
    console.error("Error creating client portal sessions table:", error);
  }

  console.log("Database migration completed successfully");
}

main()
  .then(() => {
    console.log("Script execution complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Script execution failed:", err);
    process.exit(1);
  });