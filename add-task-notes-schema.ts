#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function addTaskNotesSchema() {
  console.log('🔧 Adding task notes schema...');

  try {
    // Create task_notes table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS task_notes (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        is_system_note BOOLEAN DEFAULT FALSE NOT NULL,
        action TEXT,
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create indexes for better performance
    await db.execute(`
      CREATE INDEX IF NOT EXISTS task_notes_task_id_idx ON task_notes(task_id);
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS task_notes_tenant_id_idx ON task_notes(tenant_id);
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS task_notes_user_id_idx ON task_notes(user_id);
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS task_notes_created_at_idx ON task_notes(created_at);
    `);

    console.log('✅ Task notes schema added successfully!');
  } catch (error) {
    console.error('❌ Error adding task notes schema:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
addTaskNotesSchema()
  .then(() => {
    console.log('🎉 Task notes schema migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });