import 'dotenv/config';
import { db } from './server/db';

async function main() {
  try {
    console.log('Adding new fields to tasks table...');
    
    // Add isCanceled field
    await db.execute(
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_canceled BOOLEAN NOT NULL DEFAULT false`
    );
    console.log('Added is_canceled field');
    
    // Add canceledAt field
    await db.execute(
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP`
    );
    console.log('Added canceled_at field');
    
    // Add activatedAt field
    await db.execute(
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP`
    );
    console.log('Added activated_at field');
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();