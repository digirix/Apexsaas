import { db } from './server/db';

async function addSaasSchema() {
  console.log('Adding SaaS-level database schema...');

  try {
    // Create SaaS admin users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS saas_admins (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'owner',
        display_name TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP
      );
    `);
    console.log('✓ Created saas_admins table');

    // Create packages table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS packages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        monthly_price DECIMAL(10,2),
        annual_price DECIMAL(10,2),
        limits_json JSONB,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_publicly_visible BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created packages table');

    // Create subscriptions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        package_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        current_period_start TIMESTAMP NOT NULL,
        current_period_end TIMESTAMP NOT NULL,
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created subscriptions table');

    // Create blog_posts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        featured_image_url TEXT,
        seo_title TEXT,
        seo_description TEXT,
        published_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created blog_posts table');

    // Update tenants table to match new schema
    await db.execute(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS company_name TEXT,
      ADD COLUMN IF NOT EXISTS primary_admin_user_id INTEGER,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial',
      ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS subscription_id INTEGER,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);
    console.log('✓ Updated tenants table schema');

    // Migrate existing data if name column exists
    const nameColumnExists = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'name';
    `);

    if (nameColumnExists.rows && nameColumnExists.rows.length > 0) {
      await db.execute(`
        UPDATE tenants 
        SET company_name = name 
        WHERE company_name IS NULL AND name IS NOT NULL;
      `);
      console.log('✓ Migrated tenant names to company_name');
    }

    // Add foreign key constraints (PostgreSQL doesn't support IF NOT EXISTS for constraints)
    try {
      await db.execute(`
        ALTER TABLE subscriptions 
        ADD CONSTRAINT fk_subscription_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id);
      `);
    } catch (e) {
      console.log('Constraint fk_subscription_tenant may already exist');
    }

    try {
      await db.execute(`
        ALTER TABLE subscriptions 
        ADD CONSTRAINT fk_subscription_package 
        FOREIGN KEY (package_id) REFERENCES packages(id);
      `);
    } catch (e) {
      console.log('Constraint fk_subscription_package may already exist');
    }

    try {
      await db.execute(`
        ALTER TABLE blog_posts 
        ADD CONSTRAINT fk_blog_post_author 
        FOREIGN KEY (author_id) REFERENCES saas_admins(id);
      `);
    } catch (e) {
      console.log('Constraint fk_blog_post_author may already exist');
    }
    console.log('✓ Added foreign key constraints');

    // Create a default SaaS admin user
    const existingAdmin = await db.execute(`
      SELECT id FROM saas_admins WHERE email = 'admin@firmrix.com' LIMIT 1;
    `);

    if (!existingAdmin.rows || existingAdmin.rows.length === 0) {
      // Using bcrypt to hash password
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await db.execute(`
        INSERT INTO saas_admins (email, password_hash, display_name, role)
        VALUES ('admin@firmrix.com', '${hashedPassword}', 'System Administrator', 'owner');
      `);
      console.log('✓ Created default SaaS admin user (admin@firmrix.com / admin123)');
    }

    // Create default packages
    const existingPackages = await db.execute(`
      SELECT id FROM packages LIMIT 1;
    `);

    if (!existingPackages.rows || existingPackages.rows.length === 0) {
      await db.execute(`
        INSERT INTO packages (name, description, monthly_price, annual_price, limits_json, is_publicly_visible)
        VALUES 
        ('Starter', 'Perfect for small accounting firms just getting started', 49.00, 490.00, '{"maxUsers": 3, "maxEntities": 25, "modules": ["Tasks", "Clients"], "aiAccess": false}', true),
        ('Professional', 'Comprehensive solution for growing practices', 99.00, 990.00, '{"maxUsers": 10, "maxEntities": 100, "modules": ["Tasks", "Clients", "Finance", "Reports"], "aiAccess": true}', true),
        ('Enterprise', 'Full-featured platform for large firms', 199.00, 1990.00, '{"maxUsers": -1, "maxEntities": -1, "modules": ["Tasks", "Clients", "Finance", "Reports", "Workflow", "AI"], "aiAccess": true}', true);
      `);
      console.log('✓ Created default packages');
    }

    console.log('SaaS schema migration completed successfully!');
  } catch (error) {
    console.error('Error adding SaaS schema:', error);
    throw error;
  }
}

addSaasSchema().catch(console.error);