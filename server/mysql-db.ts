import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Function to create and return MySQL connection
export async function createMySQLConnection() {
  try {
    // Check if we have MySQL connection details
    if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_DATABASE) {
      console.error('MySQL connection details not found in environment variables');
      return null;
    }

    // Create MySQL connection pool
    const poolConnection = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test the connection
    try {
      const connection = await poolConnection.getConnection();
      console.log('MySQL Database connection successful');
      connection.release();
      
      // Create Drizzle instance with MySQL connection
      const mysqlDb = drizzle(poolConnection, { schema });
      return mysqlDb;
    } catch (error) {
      console.error('Error connecting to MySQL database:', error);
      return null;
    }
  } catch (error) {
    console.error('Error setting up MySQL connection:', error);
    return null;
  }
}

// Function to check MySQL connection status
export async function checkMySQLConnection() {
  try {
    if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_DATABASE) {
      return {
        connected: false,
        message: 'MySQL connection details not configured'
      };
    }

    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE
    });

    await connection.execute('SELECT 1');
    await connection.end();
    
    return {
      connected: true,
      message: 'Successfully connected to MySQL database'
    };
  } catch (error) {
    return {
      connected: false,
      message: `Failed to connect to MySQL: ${error.message}`
    };
  }
}