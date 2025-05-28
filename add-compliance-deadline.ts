import { db } from "./server/db";

async function main() {
  try {
    console.log("Adding compliance deadline column to tasks table...");

    // Execute SQL to add compliance deadline column
    await db.execute(/*sql*/`
      -- Add compliance deadline column to tasks table
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS compliance_deadline TIMESTAMP DEFAULT NULL;
    `);

    console.log("Compliance deadline column added successfully!");
  } catch (error) {
    console.error("Error adding compliance deadline column:", error);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);