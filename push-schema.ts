import { db } from "./server/db";
import * as schema from "./shared/schema";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  try {
    console.log("Applying schema to database...");

    // Push schema to database
    await db.execute(/*sql*/`
      -- Main Groups enum
      DO $$ BEGIN
          CREATE TYPE main_group AS ENUM ('balance_sheet', 'profit_and_loss');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      -- Element Groups enum
      DO $$ BEGIN
          CREATE TYPE element_group AS ENUM ('equity', 'liabilities', 'assets', 'incomes', 'expenses');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      -- Sub Element Groups enum
      DO $$ BEGIN
          CREATE TYPE sub_element_group AS ENUM (
              'capital', 'share_capital', 'reserves', 
              'non_current_liabilities', 'current_liabilities',
              'non_current_assets', 'current_assets',
              'sales', 'service_revenue',
              'cost_of_sales', 'cost_of_service_revenue', 'purchase_returns',
              'custom'
          );
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      -- Detailed Groups enum
      DO $$ BEGIN
          CREATE TYPE detailed_group AS ENUM (
              'owners_capital',
              'long_term_loans',
              'short_term_loans', 'trade_creditors', 'accrued_charges', 'other_payables',
              'property_plant_equipment', 'intangible_assets',
              'stock_in_trade', 'trade_debtors', 'advances_prepayments', 'other_receivables', 'cash_bank_balances',
              'custom'
          );
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      -- Create tables if they don't exist
      CREATE TABLE IF NOT EXISTS chart_of_accounts_main_groups (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name main_group NOT NULL,
          code TEXT NOT NULL,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP,
          UNIQUE(tenant_id, name),
          UNIQUE(tenant_id, code)
      );

      CREATE TABLE IF NOT EXISTS chart_of_accounts_element_groups (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          main_group_id INTEGER NOT NULL REFERENCES chart_of_accounts_main_groups(id) ON DELETE CASCADE,
          name element_group NOT NULL,
          code TEXT NOT NULL,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP,
          UNIQUE(tenant_id, main_group_id, name),
          UNIQUE(tenant_id, code)
      );

      CREATE TABLE IF NOT EXISTS chart_of_accounts_sub_element_groups (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          element_group_id INTEGER NOT NULL REFERENCES chart_of_accounts_element_groups(id) ON DELETE CASCADE,
          name sub_element_group NOT NULL,
          custom_name TEXT,
          code TEXT NOT NULL,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP,
          UNIQUE(tenant_id, code)
      );

      CREATE TABLE IF NOT EXISTS chart_of_accounts_detailed_groups (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          sub_element_group_id INTEGER NOT NULL REFERENCES chart_of_accounts_sub_element_groups(id) ON DELETE CASCADE,
          name detailed_group NOT NULL,
          custom_name TEXT,
          code TEXT NOT NULL,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP,
          UNIQUE(tenant_id, code)
      );

      -- Modify chart of accounts table if it exists, otherwise create it
      DO $$ 
      BEGIN
          IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chart_of_accounts') THEN
              -- Table exists, add new columns
              BEGIN
                  ALTER TABLE chart_of_accounts 
                  ADD COLUMN IF NOT EXISTS detailed_group_id INTEGER REFERENCES chart_of_accounts_detailed_groups(id) ON DELETE CASCADE,
                  ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id),
                  ADD COLUMN IF NOT EXISTS entity_id INTEGER REFERENCES entities(id),
                  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
                  ADD COLUMN IF NOT EXISTS is_system_account BOOLEAN NOT NULL DEFAULT FALSE,
                  ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                  ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00;
              EXCEPTION
                  WHEN duplicate_column THEN 
                  -- Do nothing, column already exists
              END;
          ELSE
              -- Table doesn't exist, create it
              CREATE TABLE chart_of_accounts (
                  id SERIAL PRIMARY KEY,
                  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                  detailed_group_id INTEGER REFERENCES chart_of_accounts_detailed_groups(id) ON DELETE CASCADE,
                  account_code TEXT NOT NULL,
                  account_name TEXT NOT NULL,
                  account_type account_type NOT NULL,
                  description TEXT,
                  client_id INTEGER REFERENCES clients(id),
                  entity_id INTEGER REFERENCES entities(id),
                  user_id INTEGER REFERENCES users(id),
                  is_system_account BOOLEAN NOT NULL DEFAULT FALSE,
                  opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                  is_active BOOLEAN NOT NULL DEFAULT TRUE,
                  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                  updated_at TIMESTAMP,
                  UNIQUE(tenant_id, account_code),
                  UNIQUE(tenant_id, account_name)
              );
          END IF;
      END $$;
    `);

    console.log("Schema applied successfully!");
  } catch (error) {
    console.error("Error applying schema:", error);
  }
}

main().catch(console.error);