import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function addIsAdminField() {
  try {
    console.log('Adding isAdmin column to users table...');
    
    // Add the isAdmin column with default value false
    await client`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;
    `;
    
    console.log('Successfully added isAdmin column to users table');
    
  } catch (error) {
    console.error('Error adding isAdmin field:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
addIsAdminField()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });