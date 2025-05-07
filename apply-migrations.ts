import { sql } from 'drizzle-orm';
import { db, pool } from './server/db';

/**
 * Apply database migrations
 * This script is used to apply migrations to the database when schema changes
 */
async function applyMigrations() {
  console.log('Applying migrations...');

  try {
    // Add typeScriptConfig column to aiConfigurations table if it doesn't exist
    const result = await db.execute(sql`
      ALTER TABLE "ai_configurations" 
      ADD COLUMN IF NOT EXISTS "typescript_config" text
    `);
    
    console.log('Successfully added typeScriptConfig column to aiConfigurations table.');
    
    // Close the database connection
    await pool.end();
    console.log('Database connection closed.');
    
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Error applying migrations:', error);
    process.exit(1);
  }
}

// Run the migrations
applyMigrations()
  .then(() => {
    console.log('Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });