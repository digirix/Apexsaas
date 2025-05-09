import { db } from './server/db';
import { sql } from 'drizzle-orm';

/**
 * Add updatedAt column to tasks table
 * This is necessary for tracking when tasks were last updated,
 * particularly useful for showing approval times in the History tab
 */
async function main() {
  console.log('Adding updatedAt column to tasks table...');
  
  try {
    // Check if column already exists to avoid errors
    const columnCheckResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'updated_at'
    `);
    
    if (columnCheckResult.rows.length === 0) {
      // Add updated_at column
      await db.execute(sql`
        ALTER TABLE tasks 
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('Successfully added updated_at column to tasks table');
    } else {
      console.log('Column updated_at already exists in tasks table');
    }
    
  } catch (error) {
    console.error('Error adding updated_at column:', error);
    process.exit(1);
  }
  
  console.log('Migration completed successfully');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });