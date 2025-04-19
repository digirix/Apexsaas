import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import ws from 'ws';
import * as schema from './shared/schema';

// Required for Neon serverless
neonConfig.webSocketConstructor = ws;

// Main migration function
async function main() {
  console.log('Starting database schema update...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable not set');
    process.exit(1);
  }
  
  try {
    // Connect to the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    
    console.log('Connected to database. Applying schema...');
    
    // Check if designations table exists
    try {
      const designationsResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'designations'
        );
      `);
      
      const tableExists = designationsResult.rows[0].exists;
      
      if (!tableExists) {
        console.log('Creating designations table...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "designations" (
            "id" SERIAL PRIMARY KEY,
            "tenant_id" INTEGER NOT NULL,
            "name" TEXT NOT NULL,
            "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
            CONSTRAINT "designations_tenant_id_name_unique" UNIQUE("tenant_id", "name")
          );
        `);
        console.log('Designations table created successfully');
      } else {
        console.log('Designations table already exists');
      }
      
      // Check if departments table exists
      const departmentsResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'departments'
        );
      `);
      
      const deptTableExists = departmentsResult.rows[0].exists;
      
      if (!deptTableExists) {
        console.log('Creating departments table...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "departments" (
            "id" SERIAL PRIMARY KEY,
            "tenant_id" INTEGER NOT NULL,
            "name" TEXT NOT NULL,
            "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
            CONSTRAINT "departments_tenant_id_name_unique" UNIQUE("tenant_id", "name")
          );
        `);
        console.log('Departments table created successfully');
      } else {
        console.log('Departments table already exists');
      }
      
    } catch (error) {
      console.error('Error checking or creating tables:', error);
    }
    
    console.log('Database schema update completed');
    
    // Close the connection
    await pool.end();
    
  } catch (error) {
    console.error('Error during schema migration:', error);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);