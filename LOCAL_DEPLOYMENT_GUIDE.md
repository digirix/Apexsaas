# Local Deployment Guide

## Automatic Database Setup

This application now includes automatic database migration and setup. When you start the server, it will:

1. **Automatically create all required database tables**
2. **Seed default data including admin user**
3. **Handle database schema updates**

## Prerequisites

1. **Node.js** (version 18 or higher)
2. **PostgreSQL** database running locally or remotely
3. **Database connection string** in the correct format

## Environment Setup

Create a `.env` file in the root directory with your database connection:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name
SESSION_SECRET=your_secure_session_secret_here
```

Replace the placeholders with your actual database credentials:
- `username`: Your PostgreSQL username
- `password`: Your PostgreSQL password
- `localhost:5432`: Your PostgreSQL host and port
- `your_database_name`: The name of your database

## Installation and Startup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

The application will automatically:
- Connect to your database
- Create all necessary tables
- Set up the default admin user
- Start the server on port 5000

## Default Login Credentials

After the first startup, you can log in with:
- **Username:** `admin`
- **Password:** `admin123`

## What Happens During Startup

The server automatically runs these steps:

1. **Database Migration:** Creates all required tables including:
   - User management tables
   - Notification system tables
   - Financial management tables
   - Task management tables
   - Client portal tables

2. **Data Seeding:** Creates:
   - Default tenant
   - Admin user account
   - Basic system data

3. **Service Initialization:** Starts all application services

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify your PostgreSQL server is running
2. Check your DATABASE_URL in the .env file
3. Ensure the database exists (create it if needed):
   ```sql
   CREATE DATABASE your_database_name;
   ```

### Permission Issues

If you encounter permission errors:
1. Ensure your database user has CREATE privileges
2. Grant necessary permissions:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE your_database_name TO username;
   ```

### Port Conflicts

If port 5000 is in use:
1. The application will automatically try the next available port
2. Check the console output for the actual port being used

## Application Features

Once deployed, you'll have access to:

- **Staff Portal:** Complete accounting management system
- **Client Portal:** Client-facing interface
- **Notification System:** Real-time and email notifications
- **AI Assistant:** AI-powered assistance features
- **Financial Management:** Invoicing, payments, journal entries
- **Task Management:** Task tracking and automation
- **Compliance Calendar:** Deadline tracking
- **Reporting:** Financial and operational reports

## Security Notes

For production deployment:
1. Change the default admin password immediately
2. Use a strong SESSION_SECRET
3. Configure proper SSL/TLS
4. Set up proper firewall rules
5. Use environment-specific configuration

## Support

The application includes comprehensive error handling and logging. Check the console output for detailed information about any issues during startup or operation.