import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Type definition for MySQL connection parameters
export type MySQLConnectionParams = {
  host: string;
  port?: string;
  user: string;
  password?: string;
  database: string;
};

// Function to create and return MySQL connection
export async function createMySQLConnection(connectionParams?: MySQLConnectionParams) {
  try {
    // Use provided connection parameters or fall back to environment variables
    const params = connectionParams || {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    };
    
    // Check if we have the required connection details
    if (!params.host || !params.user || !params.database) {
      console.error('MySQL connection details not found in environment variables or parameters');
      return null;
    }

    // Create MySQL connection pool
    const poolConnection = mysql.createPool({
      host: params.host,
      port: parseInt(params.port || '3306'),
      user: params.user,
      password: params.password || '',
      database: params.database,
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
export async function checkMySQLConnection(connectionParams?: MySQLConnectionParams) {
  try {
    // Use provided connection parameters or fall back to environment variables
    const params = connectionParams || {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    };
    
    // Check if we have the required connection details
    if (!params.host || !params.user || !params.database) {
      return {
        connected: false,
        message: 'MySQL connection details not configured'
      };
    }

    const connection = await mysql.createConnection({
      host: params.host,
      port: parseInt(params.port || '3306'),
      user: params.user,
      password: params.password || '',
      database: params.database
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