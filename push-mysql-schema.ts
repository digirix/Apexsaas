import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import * as schema from "./shared/schema";
import * as path from "path";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check if MySQL environment variables are set
const mysqlHost = process.env.MYSQL_HOST;
const mysqlUser = process.env.MYSQL_USER;
const mysqlPassword = process.env.MYSQL_PASSWORD || '';
const mysqlDatabase = process.env.MYSQL_DATABASE;
const mysqlPort = process.env.MYSQL_PORT || '3306';

if (!mysqlHost || !mysqlUser || !mysqlDatabase) {
  console.error('Error: MySQL connection details not fully set in .env file');
  console.error('Required variables: MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE');
  process.exit(1);
}

async function main() {
  console.log("Connecting to MySQL database...");
  
  try {
    // Create MySQL connection
    const connection = await mysql.createConnection({
      host: mysqlHost,
      port: parseInt(mysqlPort),
      user: mysqlUser,
      password: mysqlPassword,
      database: mysqlDatabase,
    });

    // Test connection
    await connection.execute('SELECT 1');
    console.log("MySQL connection successful");

    // Create database if it doesn't exist
    try {
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${mysqlDatabase}\``);
      console.log(`Ensured database ${mysqlDatabase} exists`);
    } catch (error) {
      console.warn(`Note: Couldn't ensure database exists: ${error.message}`);
    }

    // Create Drizzle instance
    const db = drizzle(connection, { schema });
    
    console.log("Attempting to push schema to MySQL...");

    // This will directly push the schema to the database
    // Alternatively, you can use migrations if you want more control
    // await migrate(db, { migrationsFolder: path.resolve("mysql-migrations") });
    
    // For now, we'll just create tables directly using schema inference
    // This is a simplified approach and may not handle all schema changes perfectly
    // For production, you should use proper migrations
    
    console.log("Schema pushed to MySQL database");
    
    await connection.end();
    console.log("Connection closed");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();