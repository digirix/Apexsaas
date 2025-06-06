import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

async function addNotificationPreferencesSchema() {
  console.log('Adding notification preferences schema...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Create notification_preferences table
    console.log('Creating notification_preferences table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_preferences (
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

    console.log('Notification preferences schema added successfully');
    return true;

  } catch (error) {
    console.error('Error adding notification preferences schema:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  addNotificationPreferencesSchema()
    .then(() => {
      console.log('Schema update completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Schema update failed:', error);
      process.exit(1);
    });
}

export { addNotificationPreferencesSchema };