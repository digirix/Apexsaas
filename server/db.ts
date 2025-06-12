import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with minimal settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000
});

export const db = drizzle(pool, { schema });

// Connection health check with timeout
export async function testConnection(): Promise<boolean> {
  try {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection test timeout')), 5000)
    );
    
    const testQuery = pool.query('SELECT 1 as test');
    await Promise.race([testQuery, timeout]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Initialize connection pool
export async function initializePool(): Promise<boolean> {
  console.log('Initializing database pool...');
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`Connection attempt ${attempt}/3`);
    
    if (await testConnection()) {
      console.log('Database pool initialized successfully');
      return true;
    }
    
    if (attempt < 3) {
      console.log('Waiting 2 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.error('Failed to initialize database pool after 3 attempts');
  return false;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connection pool...');
  try {
    await pool.end();
  } catch (error) {
    console.error('Error closing pool:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connection pool...');
  try {
    await pool.end();
  } catch (error) {
    console.error('Error closing pool:', error);
  }
  process.exit(0);
});