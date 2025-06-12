import { db, pool } from './db';
import { sql } from 'drizzle-orm';

export async function testDatabaseConnection(retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Database connection test attempt ${attempt}/${retries}`);
      
      // Set a shorter timeout for the test
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection test timeout')), 5000);
      });
      
      const testQuery = db.execute(sql`SELECT 1 as test`);
      
      await Promise.race([testQuery, timeout]);
      console.log(`Database connection test successful on attempt ${attempt}`);
      return true;
    } catch (error) {
      console.log(`Database connection test failed on attempt ${attempt}:`, error.message);
      
      if (attempt < retries) {
        console.log(`Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.error('All database connection test attempts failed');
  return false;
}

export async function warmupConnectionPool(): Promise<void> {
  console.log('Warming up database connection pool...');
  
  try {
    // Create a few connections to warm up the pool
    const warmupPromises = Array(3).fill(0).map(async (_, i) => {
      try {
        await db.execute(sql`SELECT ${i + 1} as warmup`);
        console.log(`Pool warmup connection ${i + 1} successful`);
      } catch (error) {
        console.log(`Pool warmup connection ${i + 1} failed:`, error.message);
      }
    });
    
    await Promise.allSettled(warmupPromises);
    console.log('Database connection pool warmup completed');
  } catch (error) {
    console.error('Error during connection pool warmup:', error);
  }
}

export async function getPoolStats(): Promise<any> {
  try {
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  } catch (error) {
    console.error('Error getting pool stats:', error);
    return null;
  }
}