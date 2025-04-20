import { db } from "./server/db";
import * as schema from "./shared/schema";
import { eq } from "drizzle-orm";

type TenantId = number;

async function seedStandardChartOfAccounts(tenantId: TenantId) {
  console.log(`Seeding standard Chart of Accounts for tenant ${tenantId}...`);

  try {
    // 1. Create Main Groups
    const balanceSheetGroup = await db.insert(schema.chartOfAccountsMainGroups)
      .values({
        tenantId,
        name: 'balance_sheet',
        code: 'BS',
        description: 'Balance Sheet accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    const profitLossGroup = await db.insert(schema.chartOfAccountsMainGroups)
      .values({
        tenantId,
        name: 'profit_and_loss',
        code: 'PL',
        description: 'Profit and Loss accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    console.log('Main groups created');

    // 2. Create Element Groups under Main Groups
    // Balance Sheet Element Groups
    const assetsGroup = await db.insert(schema.chartOfAccountsElementGroups)
      .values({
        tenantId,
        mainGroupId: balanceSheetGroup.id,
        name: 'assets',
        code: 'BS-A',
        description: 'Asset accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    const liabilitiesGroup = await db.insert(schema.chartOfAccountsElementGroups)
      .values({
        tenantId,
        mainGroupId: balanceSheetGroup.id,
        name: 'liabilities',
        code: 'BS-L',
        description: 'Liability accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    const equityGroup = await db.insert(schema.chartOfAccountsElementGroups)
      .values({
        tenantId,
        mainGroupId: balanceSheetGroup.id,
        name: 'equity',
        code: 'BS-E',
        description: 'Equity accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    // Profit & Loss Element Groups
    const incomesGroup = await db.insert(schema.chartOfAccountsElementGroups)
      .values({
        tenantId,
        mainGroupId: profitLossGroup.id,
        name: 'incomes',
        code: 'PL-I',
        description: 'Income accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    const expensesGroup = await db.insert(schema.chartOfAccountsElementGroups)
      .values({
        tenantId,
        mainGroupId: profitLossGroup.id,
        name: 'expenses',
        code: 'PL-E',
        description: 'Expense accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    console.log('Element groups created');

    // 3. Create Sub Element Groups under Element Groups
    // Asset Sub Element Groups
    const currentAssetsGroup = await db.insert(schema.chartOfAccountsSubElementGroups)
      .values({
        tenantId,
        elementGroupId: assetsGroup.id,
        name: 'current_assets',
        code: 'BS-A-CA',
        description: 'Current asset accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    const nonCurrentAssetsGroup = await db.insert(schema.chartOfAccountsSubElementGroups)
      .values({
        tenantId,
        elementGroupId: assetsGroup.id,
        name: 'non_current_assets',
        code: 'BS-A-NCA',
        description: 'Non-current asset accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    // Liability Sub Element Groups
    const currentLiabilitiesGroup = await db.insert(schema.chartOfAccountsSubElementGroups)
      .values({
        tenantId,
        elementGroupId: liabilitiesGroup.id,
        name: 'current_liabilities',
        code: 'BS-L-CL',
        description: 'Current liability accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    const nonCurrentLiabilitiesGroup = await db.insert(schema.chartOfAccountsSubElementGroups)
      .values({
        tenantId,
        elementGroupId: liabilitiesGroup.id,
        name: 'non_current_liabilities',
        code: 'BS-L-NCL',
        description: 'Non-current liability accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    // Equity Sub Element Groups
    const capitalGroup = await db.insert(schema.chartOfAccountsSubElementGroups)
      .values({
        tenantId,
        elementGroupId: equityGroup.id,
        name: 'capital',
        code: 'BS-E-C',
        description: 'Capital accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    const reservesGroup = await db.insert(schema.chartOfAccountsSubElementGroups)
      .values({
        tenantId,
        elementGroupId: equityGroup.id,
        name: 'reserves',
        code: 'BS-E-R',
        description: 'Reserves accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    // Income Sub Element Groups
    const salesGroup = await db.insert(schema.chartOfAccountsSubElementGroups)
      .values({
        tenantId,
        elementGroupId: incomesGroup.id,
        name: 'sales',
        code: 'PL-I-S',
        description: 'Sales accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    const serviceRevenueGroup = await db.insert(schema.chartOfAccountsSubElementGroups)
      .values({
        tenantId,
        elementGroupId: incomesGroup.id,
        name: 'service_revenue',
        code: 'PL-I-SR',
        description: 'Service revenue accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    // Expense Sub Element Groups
    const costOfSalesGroup = await db.insert(schema.chartOfAccountsSubElementGroups)
      .values({
        tenantId,
        elementGroupId: expensesGroup.id,
        name: 'cost_of_sales',
        code: 'PL-E-COS',
        description: 'Cost of sales accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    const costOfServiceGroup = await db.insert(schema.chartOfAccountsSubElementGroups)
      .values({
        tenantId,
        elementGroupId: expensesGroup.id,
        name: 'cost_of_service_revenue',
        code: 'PL-E-COSR',
        description: 'Cost of service revenue accounts',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    console.log('Sub element groups created');

    // 4. Create Detailed Groups under Sub Element Groups
    // Current Assets Detailed Groups
    const cashAndBankGroup = await db.insert(schema.chartOfAccountsDetailedGroups)
      .values({
        tenantId,
        subElementGroupId: currentAssetsGroup.id,
        name: 'cash_bank_balances',
        code: 'BS-A-CA-CB',
        description: 'Cash and bank balances',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    const tradeDebtorsGroup = await db.insert(schema.chartOfAccountsDetailedGroups)
      .values({
        tenantId,
        subElementGroupId: currentAssetsGroup.id,
        name: 'trade_debtors',
        code: 'BS-A-CA-TD',
        description: 'Trade debtors',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    // Non-Current Assets Detailed Groups
    const propertyGroup = await db.insert(schema.chartOfAccountsDetailedGroups)
      .values({
        tenantId,
        subElementGroupId: nonCurrentAssetsGroup.id,
        name: 'property_plant_equipment',
        code: 'BS-A-NCA-PPE',
        description: 'Property, plant and equipment',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    // Current Liabilities Detailed Groups
    const tradeCreditors = await db.insert(schema.chartOfAccountsDetailedGroups)
      .values({
        tenantId,
        subElementGroupId: currentLiabilitiesGroup.id,
        name: 'trade_creditors',
        code: 'BS-L-CL-TC',
        description: 'Trade creditors',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    // Capital Detailed Groups
    const ownersCapital = await db.insert(schema.chartOfAccountsDetailedGroups)
      .values({
        tenantId,
        subElementGroupId: capitalGroup.id,
        name: 'owners_capital',
        code: 'BS-E-C-OC',
        description: 'Owner\'s capital',
        isActive: true
      })
      .returning()
      .then(rows => rows[0]);

    console.log('Detailed groups created');

    // 5. Create basic chart of accounts (AC Heads)
    // Cash and Bank Accounts
    await db.insert(schema.chartOfAccounts)
      .values({
        tenantId,
        detailedGroupId: cashAndBankGroup.id,
        accountCode: '1001',
        accountName: 'Main Bank Account',
        accountType: 'asset',
        description: 'Main operating bank account',
        isSystemAccount: true,
        isActive: true
      });

    await db.insert(schema.chartOfAccounts)
      .values({
        tenantId,
        detailedGroupId: cashAndBankGroup.id,
        accountCode: '1002',
        accountName: 'Petty Cash',
        accountType: 'asset',
        description: 'Petty cash for small expenses',
        isSystemAccount: true,
        isActive: true
      });

    // Accounts Receivable
    await db.insert(schema.chartOfAccounts)
      .values({
        tenantId,
        detailedGroupId: tradeDebtorsGroup.id,
        accountCode: '1101',
        accountName: 'Accounts Receivable',
        accountType: 'asset',
        description: 'Money owed by clients',
        isSystemAccount: true,
        isActive: true
      });

    // Fixed Assets
    await db.insert(schema.chartOfAccounts)
      .values({
        tenantId,
        detailedGroupId: propertyGroup.id,
        accountCode: '1201',
        accountName: 'Office Equipment',
        accountType: 'asset',
        description: 'Office equipment and furniture',
        isSystemAccount: true,
        isActive: true
      });

    // Accounts Payable
    await db.insert(schema.chartOfAccounts)
      .values({
        tenantId,
        detailedGroupId: tradeCreditors.id,
        accountCode: '2001',
        accountName: 'Accounts Payable',
        accountType: 'liability',
        description: 'Money owed to suppliers',
        isSystemAccount: true,
        isActive: true
      });

    // Owner's Equity
    await db.insert(schema.chartOfAccounts)
      .values({
        tenantId,
        detailedGroupId: ownersCapital.id,
        accountCode: '3001',
        accountName: 'Owner\'s Capital',
        accountType: 'equity',
        description: 'Owner\'s equity in the business',
        isSystemAccount: true,
        isActive: true
      });

    console.log('Basic chart of accounts created');

    console.log(`Chart of Accounts seeded successfully for tenant ${tenantId}`);
    return true;
  } catch (error) {
    console.error(`Error seeding Chart of Accounts for tenant ${tenantId}:`, error);
    return false;
  }
}

async function main() {
  try {
    // Get all tenants
    const tenants = await db.select().from(schema.tenants);
    
    if (tenants.length === 0) {
      console.log("No tenants found in database.");
      return;
    }

    console.log(`Found ${tenants.length} tenants.`);

    // Seed chart of accounts for each tenant
    for (const tenant of tenants) {
      await seedStandardChartOfAccounts(tenant.id);
    }

    console.log("Chart of Accounts seeded for all tenants.");
  } catch (error) {
    console.error("Error in main function:", error);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);