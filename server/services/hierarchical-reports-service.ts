import { db } from '../db.js';
import { 
  chartOfAccounts, 
  chartOfAccountsDetailedGroups,
  chartOfAccountsSubElementGroups,
  chartOfAccountsElementGroups,
  chartOfAccountsMainGroups,
  journalEntries,
  journalEntryLines
} from '../../shared/schema.js';
import { eq, and, sum, sql } from 'drizzle-orm';

export interface HierarchicalNode {
  name: string;
  amount: string;
  children?: { [key: string]: HierarchicalNode };
}

export interface HierarchicalReport {
  [key: string]: HierarchicalNode;
}

export class HierarchicalReportsService {
  
  async generateBalanceSheetReport(tenantId: number): Promise<{
    assetsHierarchy: HierarchicalReport;
    liabilitiesHierarchy: HierarchicalReport;
    equityHierarchy: HierarchicalReport;
    totalAssets: string;
    totalLiabilities: string;
    totalEquity: string;
  }> {
    try {
      // Get account balances with hierarchy information
      const accountBalances = await this.getAccountBalancesWithHierarchy(tenantId);
      
      // Build hierarchical structures
      const assetsHierarchy = this.buildHierarchy(accountBalances.filter(acc => acc.elementGroupName === 'assets'));
      const liabilitiesHierarchy = this.buildHierarchy(accountBalances.filter(acc => acc.elementGroupName === 'liabilities'));
      const equityHierarchy = this.buildHierarchy(accountBalances.filter(acc => acc.elementGroupName === 'equity'));
      
      // Calculate totals
      const totalAssets = this.calculateHierarchyTotal(assetsHierarchy);
      const totalLiabilities = this.calculateHierarchyTotal(liabilitiesHierarchy);
      const totalEquity = this.calculateHierarchyTotal(equityHierarchy);
      
      return {
        assetsHierarchy,
        liabilitiesHierarchy,
        equityHierarchy,
        totalAssets: totalAssets.toString(),
        totalLiabilities: totalLiabilities.toString(),
        totalEquity: totalEquity.toString()
      };
    } catch (error) {
      console.error('Error generating balance sheet report:', error);
      throw new Error('Failed to generate balance sheet report');
    }
  }

  async generateProfitLossReport(tenantId: number): Promise<{
    incomeHierarchy: HierarchicalReport;
    expenseHierarchy: HierarchicalReport;
    totalIncome: string;
    totalExpenses: string;
    netProfit: string;
  }> {
    try {
      // Get account balances with hierarchy information
      const accountBalances = await this.getAccountBalancesWithHierarchy(tenantId);
      
      // Build hierarchical structures for P&L
      const incomeHierarchy = this.buildHierarchy(accountBalances.filter(acc => acc.elementGroupName === 'incomes'));
      const expenseHierarchy = this.buildHierarchy(accountBalances.filter(acc => acc.elementGroupName === 'expenses'));
      
      // Calculate totals
      const totalIncome = this.calculateHierarchyTotal(incomeHierarchy);
      const totalExpenses = this.calculateHierarchyTotal(expenseHierarchy);
      const netProfit = totalIncome - totalExpenses;
      
      return {
        incomeHierarchy,
        expenseHierarchy,
        totalIncome: totalIncome.toString(),
        totalExpenses: totalExpenses.toString(),
        netProfit: netProfit.toString()
      };
    } catch (error) {
      console.error('Error generating profit and loss report:', error);
      throw new Error('Failed to generate profit and loss report');
    }
  }

  private async getAccountBalancesWithHierarchy(tenantId: number): Promise<any[]> {
    try {
      // Get accounts with their hierarchical structure
      const accounts = await db
        .select({
          accountId: chartOfAccounts.id,
          accountName: chartOfAccounts.accountName,
          accountCode: chartOfAccounts.accountCode,
          accountType: chartOfAccounts.accountType,
          detailedGroupName: chartOfAccountsDetailedGroups.name,
          subElementGroupName: chartOfAccountsSubElementGroups.name,
          elementGroupName: chartOfAccountsElementGroups.name,
          mainGroupName: chartOfAccountsMainGroups.name
        })
        .from(chartOfAccounts)
        .leftJoin(chartOfAccountsDetailedGroups, eq(chartOfAccounts.detailedGroupId, chartOfAccountsDetailedGroups.id))
        .leftJoin(chartOfAccountsSubElementGroups, eq(chartOfAccountsDetailedGroups.subElementGroupId, chartOfAccountsSubElementGroups.id))
        .leftJoin(chartOfAccountsElementGroups, eq(chartOfAccountsSubElementGroups.elementGroupId, chartOfAccountsElementGroups.id))
        .leftJoin(chartOfAccountsMainGroups, eq(chartOfAccountsElementGroups.mainGroupId, chartOfAccountsMainGroups.id))
        .where(and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.isActive, true)
        ));

      // Calculate balances for each account from journal entries
      const accountsWithBalances = await Promise.all(
        accounts.map(async (account) => {
          const balance = await this.calculateAccountBalance(account.accountId, tenantId, account.accountType);
          return {
            ...account,
            balance: balance
          };
        })
      );

      // Filter out accounts with zero balances
      return accountsWithBalances.filter(account => account.balance !== 0);
    } catch (error) {
      console.error('Error getting account balances with hierarchy:', error);
      throw error;
    }
  }

  private async calculateAccountBalance(accountId: number, tenantId: number, accountType?: string): Promise<number> {
    try {
      // Get account type if not provided
      if (!accountType) {
        const accountInfo = await db
          .select({ accountType: chartOfAccounts.accountType })
          .from(chartOfAccounts)
          .where(eq(chartOfAccounts.id, accountId))
          .limit(1);
        accountType = accountInfo[0]?.accountType;
      }

      // Get the sum of debits and credits for this account
      const balanceQuery = await db
        .select({
          totalDebits: sum(journalEntryLines.debitAmount),
          totalCredits: sum(journalEntryLines.creditAmount)
        })
        .from(journalEntryLines)
        .leftJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(and(
          eq(journalEntryLines.accountId, accountId),
          eq(journalEntries.tenantId, tenantId),
          eq(journalEntries.isPosted, true)
        ));

      const result = balanceQuery[0];
      const totalDebits = parseFloat(result.totalDebits || '0');
      const totalCredits = parseFloat(result.totalCredits || '0');

      // Apply proper accounting sign conventions based on account type
      switch (accountType) {
        case 'asset':
        case 'expense':
          // Assets and Expenses: Debit increases, Credit decreases
          // Normal balance is DEBIT (positive when debits > credits)
          return totalDebits - totalCredits;
          
        case 'liability':
        case 'equity':
        case 'revenue':
          // Liabilities, Equity, Revenue: Credit increases, Debit decreases
          // Normal balance is CREDIT (positive when credits > debits)
          return totalCredits - totalDebits;
          
        default:
          // Default to standard debit-credit calculation
          return totalDebits - totalCredits;
      }
    } catch (error) {
      console.error('Error calculating account balance:', error);
      return 0;
    }
  }

  private buildHierarchy(accounts: any[]): HierarchicalReport {
    const hierarchy: HierarchicalReport = {};

    accounts.forEach(account => {
      const mainGroupName = account.mainGroupName || 'Uncategorized';
      const elementGroupName = account.elementGroupName || 'Uncategorized';
      const subElementGroupName = account.subElementGroupName || 'Uncategorized';
      const detailedGroupName = account.detailedGroupName || 'Uncategorized';
      const accountName = `${account.accountName} (${account.accountCode})`;

      // Initialize main group
      if (!hierarchy[mainGroupName]) {
        hierarchy[mainGroupName] = {
          name: mainGroupName,
          amount: '0',
          children: {}
        };
      }

      // Initialize element group
      if (!hierarchy[mainGroupName].children![elementGroupName]) {
        hierarchy[mainGroupName].children![elementGroupName] = {
          name: elementGroupName,
          amount: '0',
          children: {}
        };
      }

      // Initialize sub element group
      if (!hierarchy[mainGroupName].children![elementGroupName].children![subElementGroupName]) {
        hierarchy[mainGroupName].children![elementGroupName].children![subElementGroupName] = {
          name: subElementGroupName,
          amount: '0',
          children: {}
        };
      }

      // Initialize detailed group
      if (!hierarchy[mainGroupName].children![elementGroupName].children![subElementGroupName].children![detailedGroupName]) {
        hierarchy[mainGroupName].children![elementGroupName].children![subElementGroupName].children![detailedGroupName] = {
          name: detailedGroupName,
          amount: '0',
          children: {}
        };
      }

      // Add account
      hierarchy[mainGroupName].children![elementGroupName].children![subElementGroupName].children![detailedGroupName].children![accountName] = {
        name: accountName,
        amount: account.balance.toString()
      };
    });

    // Calculate totals bottom-up
    this.calculateHierarchyTotals(hierarchy);

    return hierarchy;
  }

  private calculateHierarchyTotals(hierarchy: HierarchicalReport): void {
    Object.values(hierarchy).forEach(node => {
      if (node.children && Object.keys(node.children).length > 0) {
        this.calculateHierarchyTotals(node.children);
        node.amount = this.calculateHierarchyTotal(node.children).toString();
      }
    });
  }

  private calculateHierarchyTotal(hierarchy: HierarchicalReport): number {
    let total = 0;
    
    Object.values(hierarchy).forEach(node => {
      if (node.children && Object.keys(node.children).length > 0) {
        total += this.calculateHierarchyTotal(node.children);
      } else {
        total += parseFloat(node.amount || '0');
      }
    });

    return total;
  }
}