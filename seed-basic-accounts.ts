import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import {
  chartOfAccountsMainGroups,
  chartOfAccountsElementGroups,
  chartOfAccountsSubElementGroups,
  chartOfAccountsDetailedGroups,
  chartOfAccounts,
} from './shared/schema';

// Setup database connection
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

/**
 * Seed the basic Chart of Accounts structure
 * This includes:
 * - Main Groups (Balance Sheet, Income Statement)
 * - Element Groups (Assets, Liabilities, Equity, Revenues, Expenses)
 * - Sub-Element Groups (Current Assets, Non-Current Assets, etc.)
 * - Detailed Groups (Cash and Cash Equivalents, Accounts Receivable, etc.)
 * - Core accounts (Cash, Accounts Receivable, Sales Revenue, etc.)
 */
async function seedBasicAccounts(tenantId: number) {
  try {
    console.log('Starting Chart of Accounts seeding...');

    // 1. Main Groups
    const balanceSheetMainGroup = await db.insert(chartOfAccountsMainGroups).values({
      tenantId,
      name: 'balance_sheet',
      code: 'BS',
      description: 'Accounts that represent assets, liabilities, and equity',
      isActive: true,
    }).returning().then(rows => rows[0]);

    const incomeStatementMainGroup = await db.insert(chartOfAccountsMainGroups).values({
      tenantId,
      name: 'income_statement',
      code: 'IS',
      description: 'Accounts that represent revenue and expenses',
      isActive: true,
    }).returning().then(rows => rows[0]);

    console.log('Created main groups:', balanceSheetMainGroup.id, incomeStatementMainGroup.id);

    // 2. Element Groups
    const assetElementGroup = await db.insert(chartOfAccountsElementGroups).values({
      tenantId,
      mainGroupId: balanceSheetMainGroup.id,
      name: 'assets',
      code: 'A',
      description: 'Resources owned or controlled by the business',
      isActive: true,
    }).returning().then(rows => rows[0]);

    const liabilityElementGroup = await db.insert(chartOfAccountsElementGroups).values({
      tenantId,
      mainGroupId: balanceSheetMainGroup.id,
      name: 'liabilities',
      code: 'L',
      description: 'Obligations owed by the business',
      isActive: true,
    }).returning().then(rows => rows[0]);

    const revenueElementGroup = await db.insert(chartOfAccountsElementGroups).values({
      tenantId,
      mainGroupId: incomeStatementMainGroup.id,
      name: 'revenues',
      code: 'R',
      description: 'Income earned by the business',
      isActive: true,
    }).returning().then(rows => rows[0]);

    console.log('Created element groups:', assetElementGroup.id, liabilityElementGroup.id, revenueElementGroup.id);

    // 3. Sub-Element Groups
    const currentAssetsSubGroup = await db.insert(chartOfAccountsSubElementGroups).values({
      tenantId,
      elementGroupId: assetElementGroup.id,
      name: 'current_assets',
      displayName: 'Current Assets',
      description: 'Assets expected to be converted to cash within one year',
      isActive: true,
    }).returning().then(rows => rows[0]);

    const currentLiabilitiesSubGroup = await db.insert(chartOfAccountsSubElementGroups).values({
      tenantId,
      elementGroupId: liabilityElementGroup.id,
      name: 'current_liabilities',
      displayName: 'Current Liabilities',
      description: 'Obligations due within one year',
      isActive: true,
    }).returning().then(rows => rows[0]);

    const revenueSubGroup = await db.insert(chartOfAccountsSubElementGroups).values({
      tenantId,
      elementGroupId: revenueElementGroup.id,
      name: 'operating_revenue',
      displayName: 'Operating Revenue',
      description: 'Income from primary business activities',
      isActive: true,
    }).returning().then(rows => rows[0]);

    console.log('Created sub-element groups:', currentAssetsSubGroup.id, currentLiabilitiesSubGroup.id, revenueSubGroup.id);

    // 4. Detailed Groups
    const debtorsGroup = await db.insert(chartOfAccountsDetailedGroups).values({
      tenantId,
      subElementGroupId: currentAssetsSubGroup.id,
      name: 'trade_debtors',
      displayName: 'Trade Debtors',
      description: 'Amounts owed by customers for goods or services',
      isActive: true,
    }).returning().then(rows => rows[0]);

    const taxLiabilityGroup = await db.insert(chartOfAccountsDetailedGroups).values({
      tenantId,
      subElementGroupId: currentLiabilitiesSubGroup.id,
      name: 'tax_liabilities',
      displayName: 'Tax Liabilities',
      description: 'Taxes owed by the business',
      isActive: true,
    }).returning().then(rows => rows[0]);

    const salesRevenueGroup = await db.insert(chartOfAccountsDetailedGroups).values({
      tenantId,
      subElementGroupId: revenueSubGroup.id,
      name: 'service_revenue',
      displayName: 'Service Revenue',
      description: 'Income from services provided',
      isActive: true,
    }).returning().then(rows => rows[0]);

    console.log('Created detailed groups:', debtorsGroup.id, taxLiabilityGroup.id, salesRevenueGroup.id);

    // 5. Core Accounts
    const tradeDebtorsAccount = await db.insert(chartOfAccounts).values({
      tenantId,
      detailedGroupId: debtorsGroup.id,
      accountCode: '1200',
      accountName: 'Trade Debtors',
      accountType: 'asset',
      description: 'General accounts receivable for all clients',
      isSystemAccount: true,
      isActive: true,
      openingBalance: '0.00',
      currentBalance: '0.00',
    }).returning().then(rows => rows[0]);

    const taxLiabilityAccount = await db.insert(chartOfAccounts).values({
      tenantId,
      detailedGroupId: taxLiabilityGroup.id,
      accountCode: '2200',
      accountName: 'Tax Liability',
      accountType: 'liability',
      description: 'Taxes collected on behalf of tax authorities',
      isSystemAccount: true,
      isActive: true,
      openingBalance: '0.00',
      currentBalance: '0.00',
    }).returning().then(rows => rows[0]);

    const revenueAccount = await db.insert(chartOfAccounts).values({
      tenantId,
      detailedGroupId: salesRevenueGroup.id,
      accountCode: '4000',
      accountName: 'Service Revenue',
      accountType: 'revenue',
      description: 'Income from services provided to clients',
      isSystemAccount: true,
      isActive: true,
      openingBalance: '0.00',
      currentBalance: '0.00',
    }).returning().then(rows => rows[0]);

    console.log('Created core accounts:', tradeDebtorsAccount.id, taxLiabilityAccount.id, revenueAccount.id);

    console.log('Chart of Accounts seeding completed successfully');
    return true;
  } catch (error) {
    console.error('Error seeding Chart of Accounts:', error);
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.error('Usage: npm run seed-basic-accounts <tenantId>');
    process.exit(1);
  }

  const tenantId = parseInt(process.argv[2]);
  if (isNaN(tenantId)) {
    console.error('Invalid tenant ID');
    process.exit(1);
  }

  console.log(`Seeding basic accounts for tenant ID: ${tenantId}`);
  
  try {
    const success = await seedBasicAccounts(tenantId);
    if (success) {
      console.log('✅ Basic accounts seeded successfully');
    } else {
      console.error('❌ Failed to seed basic accounts');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

main();