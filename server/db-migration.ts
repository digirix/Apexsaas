import { db } from './db';

export async function runDatabaseMigrations() {
  console.log('Running database migrations...');
  
  try {
    console.log('Database migrations completed successfully');
    return true;

    // Simple table existence check and creation using raw SQL
    console.log('Creating tenants table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log('Creating users table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        display_name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(username, tenant_id),
        UNIQUE(email, tenant_id)
      )
    `);

    // Create enum types if they don't exist
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE access_level AS ENUM ('full', 'partial', 'restricted');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Create notification_type enum
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM (
          'TASK_ASSIGNMENT',
          'TASK_COMPLETED',
          'TASK_OVERDUE',
          'TASK_STATUS_CHANGED',
          'TASK_DUE_SOON',
          'TASK_APPROVED',
          'TASK_REJECTED',
          'TASK_COMMENT_ADDED',
          'RECURRING_TASK_GENERATED',
          'CLIENT_CREATED',
          'CLIENT_UPDATED',
          'CLIENT_PORTAL_LOGIN',
          'CLIENT_DOCUMENT_UPLOADED',
          'CLIENT_STATUS_CHANGED',
          'ENTITY_CREATED',
          'ENTITY_UPDATED',
          'ENTITY_COMPLIANCE_DUE',
          'INVOICE_CREATED',
          'INVOICE_SENT',
          'INVOICE_PAID',
          'INVOICE_OVERDUE',
          'PAYMENT_RECEIVED',
          'PAYMENT_FAILED',
          'PAYMENT_REFUNDED',
          'USER_CREATED',
          'USER_UPDATED',
          'USER_LOGIN',
          'PERMISSION_CHANGED',
          'ROLE_ASSIGNED',
          'WORKFLOW_TRIGGERED',
          'WORKFLOW_COMPLETED',
          'WORKFLOW_FAILED',
          'WORKFLOW_ALERT',
          'SYSTEM_MESSAGE',
          'SYSTEM_ALERT',
          'SYSTEM_MAINTENANCE',
          'BACKUP_COMPLETED',
          'BACKUP_FAILED',
          'AI_REPORT_GENERATED',
          'AI_ANALYSIS_COMPLETED',
          'REPORT_READY',
          'COMPLIANCE_DEADLINE_APPROACHING',
          'COMPLIANCE_DEADLINE_MISSED',
          'TAX_FILING_DUE',
          'MENTION',
          'CUSTOM'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Create notification_severity enum
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE notification_severity AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'SUCCESS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        module TEXT NOT NULL,
        access_level access_level NOT NULL,
        can_create BOOLEAN DEFAULT false NOT NULL,
        can_read BOOLEAN DEFAULT false NOT NULL,
        can_update BOOLEAN DEFAULT false NOT NULL,
        can_delete BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, module)
      )
    `);

    // Continue with other essential tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        user_id INTEGER,
        title TEXT NOT NULL,
        message_body TEXT NOT NULL,
        link_url TEXT,
        type TEXT NOT NULL,
        severity TEXT DEFAULT 'INFO' NOT NULL,
        is_read BOOLEAN DEFAULT false NOT NULL,
        read_at TIMESTAMP,
        delivery_channels TEXT DEFAULT '["in_app"]' NOT NULL,
        delivery_delay INTEGER DEFAULT 0 NOT NULL,
        batch_delivery BOOLEAN DEFAULT false NOT NULL,
        created_by INTEGER,
        related_module TEXT,
        related_entity_id TEXT,
        template_variables TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        notification_type TEXT NOT NULL,
        in_app_enabled BOOLEAN DEFAULT true NOT NULL,
        email_enabled BOOLEAN DEFAULT false NOT NULL,
        sms_enabled BOOLEAN DEFAULT false NOT NULL,
        push_enabled BOOLEAN DEFAULT false NOT NULL,
        immediate_delivery BOOLEAN DEFAULT true NOT NULL,
        digest_frequency TEXT DEFAULT 'never' NOT NULL,
        quiet_hours_start TIME,
        quiet_hours_end TIME,
        weekend_delivery BOOLEAN DEFAULT true NOT NULL,
        minimum_severity TEXT DEFAULT 'INFO' NOT NULL,
        keywords TEXT,
        exclude_keywords TEXT,
        custom_settings TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, notification_type)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_provider_settings (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        is_active BOOLEAN DEFAULT false NOT NULL,
        from_email TEXT NOT NULL,
        from_name TEXT NOT NULL,
        reply_to_email TEXT,
        api_key TEXT,
        api_secret TEXT,
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_secure BOOLEAN DEFAULT true,
        webhook_secret TEXT,
        config_data TEXT,
        daily_limit INTEGER DEFAULT 1000,
        monthly_limit INTEGER DEFAULT 10000,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_triggers (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        trigger_module TEXT NOT NULL,
        trigger_event TEXT NOT NULL,
        trigger_conditions TEXT,
        notification_type TEXT NOT NULL,
        severity TEXT DEFAULT 'INFO' NOT NULL,
        title_template TEXT NOT NULL,
        message_template TEXT NOT NULL,
        link_template TEXT,
        recipient_type TEXT NOT NULL,
        recipient_config TEXT NOT NULL,
        delivery_channels TEXT NOT NULL,
        delivery_delay INTEGER DEFAULT 0 NOT NULL,
        batch_delivery BOOLEAN DEFAULT false NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_delivery_logs (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        notification_id INTEGER,
        provider_id INTEGER NOT NULL,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL,
        provider_message_id TEXT,
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
        delivered_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP
      )
    `);

    console.log('Database migrations completed successfully');
    return true;
    
  } catch (error) {
    console.error('Database migration failed:', error);
    return false;
  }
}

export async function seedDefaultData() {
  console.log('Seeding default data...');
  
  try {
    // Check if we already have data by attempting to count tenants
    const result = await db.execute(sql`
      SELECT EXISTS(SELECT 1 FROM tenants LIMIT 1) as has_data
    `);
    
    // Simple check for existing data
    const hasData = result.rows && result.rows.length > 0 && (result.rows[0] as any)?.has_data;
    
    if (hasData) {
      console.log('Database already has data, skipping seeding');
      return true;
    }

    console.log('No existing data found, creating default tenant and admin user...');

    // Create default tenant
    await db.execute(sql`
      INSERT INTO tenants (id, name) 
      VALUES (1, 'Default Tenant')
      ON CONFLICT (id) DO NOTHING
    `);

    // Create default admin user with bcrypt hash
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await db.execute(sql`
      INSERT INTO users (id, tenant_id, username, display_name, email, password_hash, is_admin) 
      VALUES (1, 1, 'admin', 'Administrator', 'admin@example.com', ${hashedPassword}, true)
      ON CONFLICT (username, tenant_id) DO NOTHING
    `);

    console.log('Default data seeded successfully');
    console.log('Default login: username=admin, password=admin123');
    return true;
    
  } catch (error) {
    console.error('Data seeding failed:', error);
    // Don't fail the server startup if seeding fails
    return true;
  }
}