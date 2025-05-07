import { db } from '../db';
import { and, eq, lt, gt, gte, lte, like, desc, sql, sum, count, max, min, avg } from 'drizzle-orm';
import { 
  clients, 
  entities, 
  invoices, 
  tasks, 
  users, 
  payments, 
  journalEntries, 
  chartOfAccounts,
  invoiceItems
} from '@shared/schema';

/**
 * Data Analysis Service
 * This service provides advanced analytics and calculation functions
 * that the AI assistant can use to analyze tenant data
 */

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  outstandingInvoices: number;
  totalPaid: number;
  averageInvoiceAmount: number;
}

interface ClientPerformance {
  clientId: number;
  clientName: string;
  totalInvoiced: number;
  totalPaid: number;
  outstandingAmount: number;
  invoiceCount: number;
  entityCount: number;
}

/**
 * Get a summary of key financial metrics for a tenant
 */
export const getFinancialSummary = async (tenantId: number): Promise<FinancialSummary> => {
  try {
    // Get total revenue (using paid invoices)
    const revenueResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${invoices.totalAmount}::numeric), 0)`
      })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.status, 'paid')
      ));
    
    // Get total expenses (placeholder for now)
    const expensesResult = [{ total: '0' }];
    
    // Get outstanding invoices
    const outstandingResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${invoices.amountDue}::numeric), 0)`
      })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        sql`${invoices.status} IN ('draft', 'sent', 'overdue')`
      ));
    
    // Get total received payments
    const paymentsResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${payments.amount}::numeric), 0)`
      })
      .from(payments)
      .where(eq(payments.tenantId, tenantId));
    
    // Get average invoice amount
    const avgInvoiceResult = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${invoices.totalAmount}::numeric), 0)`
      })
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId));
    
    // Calculate net income
    const totalRevenue = parseFloat(revenueResult[0]?.total || '0');
    const totalExpenses = parseFloat(expensesResult[0]?.total || '0');
    const netIncome = totalRevenue - totalExpenses;
    
    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      outstandingInvoices: parseFloat(outstandingResult[0]?.total || '0'),
      totalPaid: parseFloat(paymentsResult[0]?.total || '0'),
      averageInvoiceAmount: parseFloat(avgInvoiceResult[0]?.avg || '0')
    };
  } catch (error) {
    console.error('Error calculating financial summary:', error);
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      outstandingInvoices: 0,
      totalPaid: 0,
      averageInvoiceAmount: 0
    };
  }
};

/**
 * Get performance metrics for all clients
 */
export const getClientPerformance = async (tenantId: number): Promise<ClientPerformance[]> => {
  try {
    // Get client data with invoice totals
    const clientPerformance = await db
      .select({
        clientId: clients.id,
        clientName: clients.name,
        totalInvoiced: sql<string>`COALESCE(SUM(${invoices.totalAmount}::numeric), 0)`,
        unpaidAmount: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} IN ('draft', 'sent', 'overdue') THEN ${invoices.amountDue}::numeric ELSE 0 END), 0)`,
        invoiceCount: sql<number>`COUNT(DISTINCT ${invoices.id})`,
        entityCount: sql<number>`COUNT(DISTINCT ${entities.id})`
      })
      .from(clients)
      .leftJoin(invoices, eq(invoices.clientId, clients.id))
      .leftJoin(entities, eq(entities.clientId, clients.id))
      .where(eq(clients.tenantId, tenantId))
      .groupBy(clients.id, clients.name);
    
    // Get payment totals by client
    const clientPayments = await db
      .select({
        clientId: clients.id,
        paidAmount: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`
      })
      .from(clients)
      .leftJoin(invoices, eq(invoices.clientId, clients.id))
      .leftJoin(payments, eq(payments.invoiceId, invoices.id))
      .where(eq(clients.tenantId, tenantId))
      .groupBy(clients.id);
    
    // Create a map of client ID to paid amount
    const paidAmountMap = new Map<number, number>();
    clientPayments.forEach(payment => {
      paidAmountMap.set(payment.clientId, parseFloat(payment.paidAmount));
    });
    
    // Combine the data
    return clientPerformance.map(client => ({
      clientId: client.clientId,
      clientName: client.clientName,
      totalInvoiced: parseFloat(client.totalInvoiced),
      totalPaid: paidAmountMap.get(client.clientId) || 0,
      outstandingAmount: parseFloat(client.unpaidAmount),
      invoiceCount: client.invoiceCount,
      entityCount: client.entityCount
    }));
  } catch (error) {
    console.error('Error calculating client performance:', error);
    return [];
  }
};

/**
 * Run a custom SQL calculation based on the query
 * This allows for flexible analytics capabilities
 */
export const runAnalyticalQuery = async (
  tenantId: number, 
  query: string
): Promise<{ result: string, error?: string }> => {
  try {
    // Determine what kind of analysis is needed based on the query
    const lowerQuery = query.toLowerCase();
    
    // Financial analysis
    if (
      lowerQuery.includes('profit margin') || 
      lowerQuery.includes('profitability') ||
      lowerQuery.includes('net income') ||
      lowerQuery.includes('profit and loss')
    ) {
      const summary = await getFinancialSummary(tenantId);
      
      // Calculate profit margin
      const profitMargin = summary.totalRevenue > 0 
        ? (summary.netIncome / summary.totalRevenue * 100).toFixed(2)
        : '0';
      
      return {
        result: `
Financial Summary:
- Total Revenue: $${summary.totalRevenue.toFixed(2)}
- Total Expenses: $${summary.totalExpenses.toFixed(2)}
- Net Income: $${summary.netIncome.toFixed(2)}
- Profit Margin: ${profitMargin}%
- Outstanding Invoices: $${summary.outstandingInvoices.toFixed(2)}
- Total Payments Received: $${summary.totalPaid.toFixed(2)}
- Average Invoice Amount: $${summary.averageInvoiceAmount.toFixed(2)}
        `.trim()
      };
    }
    
    // Client analysis
    if (
      lowerQuery.includes('client performance') || 
      lowerQuery.includes('best client') ||
      lowerQuery.includes('top client') ||
      lowerQuery.includes('client analysis')
    ) {
      const performances = await getClientPerformance(tenantId);
      
      if (performances.length === 0) {
        return { result: 'No client data available for analysis.' };
      }
      
      // Sort by total invoiced amount
      performances.sort((a, b) => b.totalInvoiced - a.totalInvoiced);
      
      const topClients = performances.slice(0, 5);
      
      let result = 'Client Performance Analysis:\n';
      topClients.forEach((client, index) => {
        result += `\n${index + 1}. ${client.clientName}\n`;
        result += `   - Total Invoiced: $${client.totalInvoiced.toFixed(2)}\n`;
        result += `   - Total Paid: $${client.totalPaid.toFixed(2)}\n`;
        result += `   - Outstanding: $${client.outstandingAmount.toFixed(2)}\n`;
        result += `   - Invoice Count: ${client.invoiceCount}\n`;
        result += `   - Payment Rate: ${client.totalInvoiced > 0 
          ? (client.totalPaid / client.totalInvoiced * 100).toFixed(2)
          : 0}%\n`;
      });
      
      return { result };
    }
    
    // For other types of analysis, return a generic message
    return {
      result: 'I can perform various financial analyses for you. Try asking about profit margins, client performance, or outstanding invoices.',
      error: 'Specific analysis type not implemented.'
    };
  } catch (error) {
    console.error('Error in analytical query:', error);
    return {
      result: 'Unable to complete the analysis at this time.',
      error: error.message
    };
  }
};

/**
 * Calculate aging of accounts receivable
 */
export const calculateAccountsReceivableAging = async (tenantId: number): Promise<string> => {
  try {
    const today = new Date();
    
    const invoicesData = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        clientId: invoices.clientId,
        clientName: clients.name,
        amount: invoices.totalAmount,
        amountDue: invoices.amountDue,
        dueDate: invoices.dueDate,
        status: invoices.status
      })
      .from(invoices)
      .leftJoin(clients, eq(clients.id, invoices.clientId))
      .where(and(
        eq(invoices.tenantId, tenantId),
        sql`${invoices.status} IN ('sent', 'overdue')`,
        sql`${invoices.amountDue}::numeric > 0`
      ));
    
    // Define the aging buckets
    const current: number = 0;
    const days30: number = 0;
    const days60: number = 0;
    const days90: number = 0;
    const over90: number = 0;
    
    let aging = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      over90: 0,
      total: 0
    };
    
    // Calculate the aging for each invoice
    invoicesData.forEach(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const amountDue = parseFloat(invoice.amountDue);
      
      aging.total += amountDue;
      
      if (daysPastDue <= 0) {
        aging.current += amountDue;
      } else if (daysPastDue <= 30) {
        aging.days30 += amountDue;
      } else if (daysPastDue <= 60) {
        aging.days60 += amountDue;
      } else if (daysPastDue <= 90) {
        aging.days90 += amountDue;
      } else {
        aging.over90 += amountDue;
      }
    });
    
    // Format the result
    return `
Accounts Receivable Aging:
- Current: $${aging.current.toFixed(2)} (${aging.total > 0 ? (aging.current / aging.total * 100).toFixed(2) : 0}%)
- 1-30 Days: $${aging.days30.toFixed(2)} (${aging.total > 0 ? (aging.days30 / aging.total * 100).toFixed(2) : 0}%)
- 31-60 Days: $${aging.days60.toFixed(2)} (${aging.total > 0 ? (aging.days60 / aging.total * 100).toFixed(2) : 0}%)
- 61-90 Days: $${aging.days90.toFixed(2)} (${aging.total > 0 ? (aging.days90 / aging.total * 100).toFixed(2) : 0}%)
- Over 90 Days: $${aging.over90.toFixed(2)} (${aging.total > 0 ? (aging.over90 / aging.total * 100).toFixed(2) : 0}%)
- Total Outstanding: $${aging.total.toFixed(2)}
    `.trim();
  } catch (error) {
    console.error('Error calculating AR aging:', error);
    return 'Unable to calculate accounts receivable aging at this time.';
  }
};

/**
 * Analyze budget vs actual performance
 */
export const analyzeBudgetPerformance = async (tenantId: number): Promise<string> => {
  try {
    // Current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = now.getFullYear();
    
    // We'll use a placeholder for budgets since they don't exist in the schema yet
    const budgetData = [];
    
    // Get actual data from journal entries
    const actualData = await db
      .select({
        accountId: journalEntries.accountId,
        totalAmount: sql<string>`SUM(${journalEntries.amount}::numeric)`
      })
      .from(journalEntries)
      .where(and(
        eq(journalEntries.tenantId, tenantId),
        sql`EXTRACT(MONTH FROM ${journalEntries.entryDate}) = ${currentMonth}`,
        sql`EXTRACT(YEAR FROM ${journalEntries.entryDate}) = ${currentYear}`
      ))
      .groupBy(journalEntries.accountId);
    
    // Create a map of account ID to actual amount
    const actualMap = new Map<number, number>();
    actualData.forEach(item => {
      actualMap.set(item.accountId, parseFloat(item.totalAmount));
    });
    
    // Compare budget vs actual
    let result = `Budget vs Actual Analysis for ${now.toLocaleString('default', { month: 'long' })} ${currentYear}:\n\n`;
    
    if (budgetData.length === 0) {
      return 'No budget data found for the current month.';
    }
    
    // Since we're using an empty budget array, this won't execute
    
    return result.trim();
  } catch (error) {
    console.error('Error analyzing budget performance:', error);
    return 'Unable to analyze budget performance at this time.';
  }
};

/**
 * Main function to analyze tenant data based on the query
 */
export const analyzeTenantData = async (tenantId: number, query: string): Promise<string> => {
  const lowerQuery = query.toLowerCase();
  
  try {
    // Financial summary analysis
    if (
      lowerQuery.includes('financial') ||
      lowerQuery.includes('summary') ||
      lowerQuery.includes('profit') ||
      lowerQuery.includes('revenue') ||
      lowerQuery.includes('expense')
    ) {
      const summary = await getFinancialSummary(tenantId);
      return `
Financial Summary Analysis:
- Total Revenue: $${summary.totalRevenue.toFixed(2)}
- Total Expenses: $${summary.totalExpenses.toFixed(2)}
- Net Income: $${summary.netIncome.toFixed(2)}
- Profit Margin: ${summary.totalRevenue > 0 
        ? (summary.netIncome / summary.totalRevenue * 100).toFixed(2)
        : '0'}%
- Outstanding Invoices: $${summary.outstandingInvoices.toFixed(2)}
- Total Payments Received: $${summary.totalPaid.toFixed(2)}
- Average Invoice Amount: $${summary.averageInvoiceAmount.toFixed(2)}
      `.trim();
    }
    
    // Client performance analysis
    if (
      lowerQuery.includes('client') ||
      lowerQuery.includes('customer') ||
      lowerQuery.includes('best performing')
    ) {
      const clientPerformance = await getClientPerformance(tenantId);
      if (clientPerformance.length === 0) {
        return 'No client data available for analysis.';
      }
      
      // Sort clients by total invoiced
      clientPerformance.sort((a, b) => b.totalInvoiced - a.totalInvoiced);
      
      let result = 'Client Performance Analysis:\n\n';
      clientPerformance.slice(0, 5).forEach((client, index) => {
        result += `${index + 1}. ${client.clientName}\n`;
        result += `   - Total Invoiced: $${client.totalInvoiced.toFixed(2)}\n`;
        result += `   - Total Paid: $${client.totalPaid.toFixed(2)}\n`;
        result += `   - Outstanding: $${client.outstandingAmount.toFixed(2)}\n`;
        result += `   - Payment Rate: ${client.totalInvoiced > 0 
          ? (client.totalPaid / client.totalInvoiced * 100).toFixed(2)
          : '0'}%\n\n`;
      });
      
      return result.trim();
    }
    
    // Accounts receivable aging
    if (
      lowerQuery.includes('aging') ||
      lowerQuery.includes('accounts receivable') ||
      lowerQuery.includes('ar aging') ||
      lowerQuery.includes('outstanding invoices')
    ) {
      return await calculateAccountsReceivableAging(tenantId);
    }
    
    // Budget analysis
    if (
      lowerQuery.includes('budget') ||
      lowerQuery.includes('forecast') ||
      lowerQuery.includes('variance')
    ) {
      return await analyzeBudgetPerformance(tenantId);
    }
    
    // General analytical query
    return (await runAnalyticalQuery(tenantId, query)).result;
    
  } catch (error) {
    console.error('Error analyzing tenant data:', error);
    return 'I encountered an error while analyzing the data. Please try a different type of analysis or contact support.';
  }
};