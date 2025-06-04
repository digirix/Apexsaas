import { DatabaseStorage } from '../database-storage';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

interface KPIMetrics {
  totalRevenue: number;
  revenueChange: number;
  profitMargin: number;
  profitMarginChange: number;
  activeClients: number;
  clientChange: number;
  revenuePerClient: number;
  revenuePerClientChange: number;
}

interface TrendData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  clients: number;
}

interface ClientProfitability {
  clientName: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
}

export class FinancialAnalyticsService {
  constructor(private storage: DatabaseStorage) {}

  private sanitizeNumber(value: any): number {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  async getKPIMetrics(tenantId: number, periodMonths: number): Promise<KPIMetrics> {
    const currentPeriodStart = startOfMonth(subMonths(new Date(), periodMonths - 1));
    const currentPeriodEnd = endOfMonth(new Date());
    const previousPeriodStart = startOfMonth(subMonths(currentPeriodStart, periodMonths));
    const previousPeriodEnd = endOfMonth(subMonths(new Date(), periodMonths));

    // Get current period metrics and sanitize
    const currentRevenue = this.sanitizeNumber(await this.calculateTotalRevenue(tenantId, currentPeriodStart, currentPeriodEnd));
    const currentExpenses = this.sanitizeNumber(await this.calculateTotalExpenses(tenantId, currentPeriodStart, currentPeriodEnd));
    const currentActiveClients = this.sanitizeNumber(await this.getActiveClientsCount(tenantId, currentPeriodStart, currentPeriodEnd));

    // Get previous period metrics for comparison and sanitize
    const previousRevenue = this.sanitizeNumber(await this.calculateTotalRevenue(tenantId, previousPeriodStart, previousPeriodEnd));
    const previousExpenses = this.sanitizeNumber(await this.calculateTotalExpenses(tenantId, previousPeriodStart, previousPeriodEnd));
    const previousActiveClients = this.sanitizeNumber(await this.getActiveClientsCount(tenantId, previousPeriodStart, previousPeriodEnd));

    // Calculate metrics
    const currentProfit = currentRevenue - currentExpenses;
    const previousProfit = previousRevenue - previousExpenses;
    
    const currentProfitMargin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;
    const previousProfitMargin = previousRevenue > 0 ? (previousProfit / previousRevenue) * 100 : 0;

    const currentRevenuePerClient = currentActiveClients > 0 ? currentRevenue / currentActiveClients : 0;
    const previousRevenuePerClient = previousActiveClients > 0 ? previousRevenue / previousActiveClients : 0;

    // Calculate percentage changes
    const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const profitMarginChange = previousProfitMargin > 0 ? currentProfitMargin - previousProfitMargin : 0;
    const clientChange = currentActiveClients - previousActiveClients;
    const revenuePerClientChange = previousRevenuePerClient > 0 ? ((currentRevenuePerClient - previousRevenuePerClient) / previousRevenuePerClient) * 100 : 0;

    return {
      totalRevenue: currentRevenue,
      revenueChange,
      profitMargin: currentProfitMargin,
      profitMarginChange,
      activeClients: currentActiveClients,
      clientChange,
      revenuePerClient: currentRevenuePerClient,
      revenuePerClientChange
    };
  }

  async getTrendData(tenantId: number, periodMonths: number): Promise<TrendData[]> {
    const trends: TrendData[] = [];

    for (let i = periodMonths - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(subMonths(new Date(), i));

      const revenue = await this.calculateTotalRevenue(tenantId, monthStart, monthEnd);
      const expenses = await this.calculateTotalExpenses(tenantId, monthStart, monthEnd);
      const clients = await this.getActiveClientsCount(tenantId, monthStart, monthEnd);

      // Ensure all numeric values are properly formatted
      const safeRevenue = this.sanitizeNumber(revenue);
      const safeExpenses = this.sanitizeNumber(expenses);
      const safeClients = this.sanitizeNumber(clients);

      trends.push({
        period: format(monthStart, 'MMM yyyy'),
        revenue: safeRevenue,
        expenses: safeExpenses,
        profit: safeRevenue - safeExpenses,
        clients: safeClients
      });
    }

    return trends;
  }

  async getClientProfitability(tenantId: number, periodMonths: number): Promise<ClientProfitability[]> {
    const periodStart = startOfMonth(subMonths(new Date(), periodMonths - 1));
    const periodEnd = endOfMonth(new Date());

    // Get all clients for the tenant
    const clients = await this.storage.getClients(tenantId);
    const profitability: ClientProfitability[] = [];

    for (const client of clients) {
      const revenue = this.sanitizeNumber(await this.calculateClientRevenue(tenantId, client.id, periodStart, periodEnd));
      const expenses = this.sanitizeNumber(await this.calculateClientExpenses(tenantId, client.id, periodStart, periodEnd));
      const profit = revenue - expenses;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      if (revenue > 0) { // Only include clients with revenue
        profitability.push({
          clientName: client.displayName,
          revenue,
          expenses,
          profit,
          profitMargin: this.sanitizeNumber(profitMargin)
        });
      }
    }

    // Sort by profit margin descending
    return profitability.sort((a, b) => b.profitMargin - a.profitMargin);
  }

  private async calculateTotalRevenue(tenantId: number, startDate: Date, endDate: Date): Promise<number> {
    try {
      // Get revenue from income accounts through journal entries
      const revenueAccounts = await this.storage.getAccountsByType(tenantId, 'revenue');
      let totalRevenue = 0;

      for (const account of revenueAccounts) {
        const balance = await this.storage.getAccountBalance(tenantId, account.id, startDate, endDate);
        const validBalance = isNaN(balance) ? 0 : Math.abs(balance); // Income accounts have credit balances (negative), so we take absolute
        totalRevenue += validBalance;
      }

      return isNaN(totalRevenue) ? 0 : totalRevenue;
    } catch (error) {
      console.error('Error calculating total revenue:', error);
      return 0;
    }
  }

  private async calculateTotalExpenses(tenantId: number, startDate: Date, endDate: Date): Promise<number> {
    try {
      // Get expenses from expense accounts through journal entries
      const expenseAccounts = await this.storage.getAccountsByType(tenantId, 'expense');
      let totalExpenses = 0;

      for (const account of expenseAccounts) {
        const balance = await this.storage.getAccountBalance(tenantId, account.id, startDate, endDate);
        const validBalance = isNaN(balance) ? 0 : balance; // Expense accounts have debit balances (positive)
        totalExpenses += validBalance;
      }

      return isNaN(totalExpenses) ? 0 : totalExpenses;
    } catch (error) {
      console.error('Error calculating total expenses:', error);
      return 0;
    }
  }

  private async getActiveClientsCount(tenantId: number, startDate: Date, endDate: Date): Promise<number> {
    try {
      // Count clients who had invoices or transactions during the period
      const invoices = await this.storage.getInvoicesByDateRange(tenantId, startDate, endDate);
      const uniqueClientIds = new Set(invoices.map(invoice => invoice.clientId).filter(Boolean));
      return uniqueClientIds.size;
    } catch (error) {
      console.error('Error getting active clients count:', error);
      return 0;
    }
  }

  private async calculateClientRevenue(tenantId: number, clientId: number, startDate: Date, endDate: Date): Promise<number> {
    try {
      // Calculate revenue from client invoices using existing method
      const invoices = await this.storage.getClientInvoices(tenantId, clientId, startDate, endDate);
      const revenue = invoices.reduce((total, invoice) => {
        const amount = parseFloat(invoice.totalAmount) || 0;
        return total + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      console.log(`Client ${clientId} revenue from invoices: ${revenue}`);
      return isNaN(revenue) ? 0 : revenue;
    } catch (error) {
      console.error('Error calculating client revenue:', error);
      return 0;
    }
  }

  private async calculateClientExpenses(tenantId: number, clientId: number, startDate: Date, endDate: Date): Promise<number> {
    try {
      // Calculate expenses using task-based estimation for now
      const tasks = await this.storage.getClientTasks(tenantId, clientId, startDate, endDate);
      const estimatedExpenses = tasks.length * 1500; // $1500 per task
      
      console.log(`Client ${clientId} expenses from ${tasks.length} tasks: ${estimatedExpenses}`);
      return isNaN(estimatedExpenses) ? 0 : estimatedExpenses;
    } catch (error) {
      console.error('Error calculating client expenses:', error);
      return 0;
    }
  }
}