import { db } from "./server/db";

async function main() {
  try {
    console.log("Adding missing columns to tasks table...");

    // Execute SQL to add missing columns to the tasks table
    await db.execute(/*sql*/`
      -- Add missing columns to tasks table
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS is_canceled BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP DEFAULT NULL;
    `);

    console.log("Tasks table schema updated successfully!");
  } catch (error) {
    console.error("Error updating tasks table schema:", error);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);