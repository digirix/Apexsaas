import { defineConfig } from "drizzle-kit";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check if MySQL environment variables are set
const mysqlHost = process.env.MYSQL_HOST;
const mysqlUser = process.env.MYSQL_USER;
const mysqlPassword = process.env.MYSQL_PASSWORD || '';
const mysqlDatabase = process.env.MYSQL_DATABASE;
const mysqlPort = process.env.MYSQL_PORT || '3306';

// Check if required MySQL variables are set
if (!mysqlHost || !mysqlUser || !mysqlDatabase) {
  console.warn('MySQL configuration variables not fully set in .env file');
  console.warn('Required variables: MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE');
}

export default defineConfig({
  out: "./mysql-migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql2",
  dbCredentials: {
    host: mysqlHost || 'localhost',
    user: mysqlUser || 'root',
    password: mysqlPassword,
    database: mysqlDatabase || 'accounting_platform',
    port: parseInt(mysqlPort),
  },
});