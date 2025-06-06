import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixNotificationPreferencesSchema() {
  console.log('Fixing notification preferences schema...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Drop the old table if it exists
    console.log('Dropping old notification_preferences table...');
    await db.execute(sql`DROP TABLE IF EXISTS notification_preferences CASCADE`);

    // Create the correct notification_preferences table
    console.log('Creating corrected notification_preferences table...');
    await db.execute(sql`
      CREATE TABLE notification_preferences (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type notification_type NOT NULL,
        is_enabled BOOLEAN DEFAULT true NOT NULL,
        delivery_channels TEXT DEFAULT '["in_app"]' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(tenant_id, user_id, notification_type)
      )
    `);

    // Create indexes for better performance
    console.log('Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant_user 
      ON notification_preferences(tenant_id, user_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_notification_preferences_type 
      ON notification_preferences(notification_type)
    `);

    console.log('Notification preferences schema fixed successfully');
  } catch (error) {
    console.error('Error fixing notification preferences schema:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the fix
fixNotificationPreferencesSchema()
  .then(() => {
    console.log('Schema fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Schema fix failed:', error);
    process.exit(1);
  });