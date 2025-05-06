import { IStorage } from "./storage";
import { DatabaseStorage } from "./database-storage";
import { MySQLStorage } from "./mysql-storage";
import { createMySQLConnection } from "./mysql-db";
import { db } from "./db";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Database factory to create the appropriate storage implementation
 * based on configuration settings.
 */
export class DatabaseFactory {
  /**
   * Create a database storage instance based on the configured database type
   * 
   * @param preferMySQL Whether to prefer MySQL if available
   * @returns An instance of IStorage (either PostgreSQL or MySQL)
   */
  static async createStorage(preferMySQL: boolean = false): Promise<IStorage> {
    // If MySQL is preferred and configured, try to use it first
    if (preferMySQL) {
      try {
        console.log("Attempting to connect to MySQL database...");
        const mysqlDb = await createMySQLConnection();
        
        if (mysqlDb) {
          console.log("Using MySQL as primary database");
          return new MySQLStorage(mysqlDb);
        } else {
          console.log("MySQL connection failed, falling back to PostgreSQL");
        }
      } catch (error) {
        console.error("Error connecting to MySQL, falling back to PostgreSQL:", error);
      }
    }
    
    // Use PostgreSQL as default or fallback
    console.log("Using PostgreSQL as primary database");
    return new DatabaseStorage(db);
  }

  /**
   * Create database storage based on the DATABASE_TYPE environment variable
   * 
   * @returns An instance of IStorage
   */
  static async createStorageFromEnv(): Promise<IStorage> {
    const dbType = process.env.DATABASE_TYPE || 'postgres';
    const preferMySQL = dbType.toLowerCase() === 'mysql';
    return await DatabaseFactory.createStorage(preferMySQL);
  }
}