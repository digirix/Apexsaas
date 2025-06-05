import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function fixNotificationSimple() {
  console.log('Fixing notification schema (simple approach)...');

  try {
    // Drop the problematic notification_triggers table completely
    console.log('Dropping notification_triggers table...');
    await db.execute(sql`DROP TABLE IF EXISTS notification_triggers CASCADE`);

    // Clear existing notifications to avoid enum conflicts
    console.log('Clearing existing notifications...');
    await db.execute(sql`DELETE FROM notifications`);

    // Recreate notification_triggers table with proper enum
    console.log('Creating notification_triggers table with enum types...');
    await db.execute(sql`
      CREATE TABLE notification_triggers (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        trigger_module TEXT NOT NULL,
        trigger_event TEXT NOT NULL,
        trigger_conditions TEXT,
        notification_type notification_type NOT NULL,
        severity notification_severity DEFAULT 'INFO' NOT NULL,
        title_template TEXT NOT NULL,
        message_template TEXT NOT NULL,
        link_template TEXT,
        recipient_type TEXT NOT NULL,
        recipient_config TEXT NOT NULL,
        delivery_channels TEXT NOT NULL,
        delivery_delay INTEGER DEFAULT 0 NOT NULL,
        batch_delivery BOOLEAN DEFAULT false NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Update notifications table to use enum types (drop and recreate columns)
    console.log('Updating notifications table schema...');
    
    // Drop existing type and severity columns
    await db.execute(sql`
      ALTER TABLE notifications 
      DROP COLUMN IF EXISTS type,
      DROP COLUMN IF EXISTS severity
    `);

    // Add new columns with enum types
    await db.execute(sql`
      ALTER TABLE notifications 
      ADD COLUMN type notification_type NOT NULL DEFAULT 'CUSTOM',
      ADD COLUMN severity notification_severity NOT NULL DEFAULT 'INFO'
    `);

    console.log('Notification schema fix completed successfully');
    return true;

  } catch (error) {
    console.error('Error fixing notification schema:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixNotificationSimple()
    .then(() => {
      console.log('Notification schema fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Notification schema fix failed:', error);
      process.exit(1);
    });
}

export { fixNotificationSimple };