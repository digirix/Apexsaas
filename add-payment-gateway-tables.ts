import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { 
  stripeConfigurations, 
  paypalConfigurations, 
  meezanBankConfigurations, 
  bankAlfalahConfigurations 
} from './shared/schema.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function addPaymentGatewayTables() {
  console.log('Adding payment gateway configuration tables...');
  
  try {
    // Create Stripe configurations table
    await client`
      CREATE TABLE IF NOT EXISTS stripe_configurations (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        is_test_mode BOOLEAN DEFAULT TRUE NOT NULL,
        public_key TEXT NOT NULL,
        secret_key TEXT NOT NULL,
        webhook_secret TEXT,
        currency TEXT DEFAULT 'PKR' NOT NULL,
        display_name TEXT DEFAULT 'Stripe' NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP,
        UNIQUE(tenant_id)
      );
    `;
    
    // Create PayPal configurations table
    await client`
      CREATE TABLE IF NOT EXISTS paypal_configurations (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        is_test_mode BOOLEAN DEFAULT TRUE NOT NULL,
        client_id TEXT NOT NULL,
        client_secret TEXT NOT NULL,
        mode TEXT DEFAULT 'sandbox' NOT NULL,
        currency TEXT DEFAULT 'USD' NOT NULL,
        display_name TEXT DEFAULT 'PayPal' NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP,
        UNIQUE(tenant_id)
      );
    `;
    
    // Create Meezan Bank configurations table
    await client`
      CREATE TABLE IF NOT EXISTS meezan_bank_configurations (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        is_test_mode BOOLEAN DEFAULT TRUE NOT NULL,
        merchant_id TEXT NOT NULL,
        merchant_key TEXT NOT NULL,
        api_url TEXT NOT NULL,
        currency TEXT DEFAULT 'PKR' NOT NULL,
        display_name TEXT DEFAULT 'Meezan Bank' NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP,
        UNIQUE(tenant_id)
      );
    `;
    
    // Create Bank Alfalah configurations table
    await client`
      CREATE TABLE IF NOT EXISTS bank_alfalah_configurations (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        is_test_mode BOOLEAN DEFAULT TRUE NOT NULL,
        merchant_id TEXT NOT NULL,
        merchant_key TEXT NOT NULL,
        api_url TEXT NOT NULL,
        currency TEXT DEFAULT 'PKR' NOT NULL,
        display_name TEXT DEFAULT 'Bank Alfalah' NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP,
        UNIQUE(tenant_id)
      );
    `;

    console.log('Payment gateway tables created successfully');
  } catch (error) {
    console.error('Error creating payment gateway tables:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
addPaymentGatewayTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

export { addPaymentGatewayTables };