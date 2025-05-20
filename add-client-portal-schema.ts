import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./shared/schema";
import { boolean, serial, pgTable, text, integer, timestamp, uniqueIndex, unique } from "drizzle-orm/pg-core";

/**
 * Add client portal schema to the database
 */
async function main() {
  // Define the migration query
  const migrationQuery = `
    -- Add has_portal_access column to clients table
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS has_portal_access BOOLEAN NOT NULL DEFAULT FALSE;
    
    -- Create client_portal_access table
    CREATE TABLE IF NOT EXISTS client_portal_access (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      last_login TIMESTAMP,
      password_reset_required BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP,
      UNIQUE(tenant_id, client_id),
      UNIQUE(tenant_id, username)
    );
  `;
  
  console.log("Creating client portal tables...");
  
  // Create the client
  console.log("Connecting to database...");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);
  
  try {
    // Run the migration
    console.log("Running migration...");
    await client.unsafe(migrationQuery);
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error in migration script:", err);
  process.exit(1);
});