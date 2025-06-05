import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function fixNotificationSchema() {
  console.log('Fixing notification schema...');

  try {
    // First, check if we need to drop and recreate the notification_triggers table
    console.log('Dropping existing notification_triggers table...');
    await db.execute(sql`DROP TABLE IF EXISTS notification_triggers CASCADE`);

    // Create the notification_triggers table with proper enum types
    console.log('Creating notification_triggers table with proper enum types...');
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

    // Check if notifications table exists and has correct schema
    console.log('Checking notifications table schema...');
    const notificationsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      )
    `);

    if (notificationsTableExists.rows[0].exists) {
      console.log('Updating notifications table to use enum types...');
      
      // Add new columns with enum types
      await db.execute(sql`
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS type_new notification_type,
        ADD COLUMN IF NOT EXISTS severity_new notification_severity DEFAULT 'INFO'
      `);

      // Migrate existing data to enum columns
      await db.execute(sql`
        UPDATE notifications 
        SET 
          type_new = CASE 
            WHEN type = 'TASK_ASSIGNMENT' THEN 'TASK_ASSIGNMENT'::notification_type
            WHEN type = 'TASK_COMPLETED' THEN 'TASK_COMPLETED'::notification_type
            WHEN type = 'TASK_STATUS_CHANGED' THEN 'TASK_STATUS_CHANGED'::notification_type
            WHEN type = 'CLIENT_UPDATE' THEN 'CLIENT_UPDATED'::notification_type
            WHEN type = 'WORKFLOW_ALERT' THEN 'WORKFLOW_ALERT'::notification_type
            WHEN type = 'SYSTEM_ALERT' THEN 'SYSTEM_ALERT'::notification_type
            ELSE 'CUSTOM'::notification_type
          END,
          severity_new = CASE 
            WHEN severity = 'INFO' THEN 'INFO'::notification_severity
            WHEN severity = 'WARNING' THEN 'WARNING'::notification_severity
            WHEN severity = 'CRITICAL' THEN 'CRITICAL'::notification_severity
            WHEN severity = 'SUCCESS' THEN 'SUCCESS'::notification_severity
            ELSE 'INFO'::notification_severity
          END
        WHERE type_new IS NULL
      `);

      // Drop old columns and rename new ones
      await db.execute(sql`
        ALTER TABLE notifications 
        DROP COLUMN IF EXISTS type,
        DROP COLUMN IF EXISTS severity
      `);

      await db.execute(sql`
        ALTER TABLE notifications 
        RENAME COLUMN type_new TO type,
        RENAME COLUMN severity_new TO severity
      `);

      // Make the columns NOT NULL
      await db.execute(sql`
        ALTER TABLE notifications 
        ALTER COLUMN type SET NOT NULL,
        ALTER COLUMN severity SET NOT NULL
      `);
    }

    console.log('Notification schema fix completed successfully');
    return true;

  } catch (error) {
    console.error('Error fixing notification schema:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixNotificationSchema()
    .then(() => {
      console.log('Notification schema fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Notification schema fix failed:', error);
      process.exit(1);
    });
}

export { fixNotificationSchema };