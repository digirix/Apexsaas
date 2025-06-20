import { db } from '../db';
import { tenants, subscriptions, packages, users, entities, tasks, invoices } from '../../shared/schema';
import { eq, desc, count, sql } from 'drizzle-orm';

// Retry wrapper for database operations
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Database operation attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('All retry attempts failed');
}

export class TenantDataService {
  
  static async getTenantList() {
    return withRetry(async () => {
      const tenantList = await db
        .select({
          id: tenants.id,
          companyName: tenants.companyName,
          status: tenants.status,
          createdAt: tenants.createdAt,
          trialEndsAt: tenants.trialEndsAt,
          subscriptionId: tenants.subscriptionId
        })
        .from(tenants)
        .orderBy(desc(tenants.createdAt));
      
      return tenantList;
    }).catch(error => {
      console.error('Error fetching tenant list:', error);
      return [];
    });
  }
  
  static async getDashboardKPIs() {
    return withRetry(async () => {
      // Get basic tenant counts
      const tenantCounts = await db
        .select({ 
          total: count(),
          trials: sql<number>`COUNT(CASE WHEN status = 'trial' THEN 1 END)`,
          active: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`
        })
        .from(tenants);

      const counts = tenantCounts[0] || { total: 0, trials: 0, active: 0 };

      // Get recent tenants
      const recentTenants = await db
        .select({
          id: tenants.id,
          companyName: tenants.companyName,
          status: tenants.status,
          createdAt: tenants.createdAt,
        })
        .from(tenants)
        .orderBy(desc(tenants.createdAt))
        .limit(5);

      return {
        totalTenants: counts.total,
        activeTrials: counts.trials,
        newSignups: counts.trials, // Using trials as proxy for new signups
        mrr: 0, // Simplified for now
        recentTenants
      };
    }).catch(error => {
      console.error('Error fetching dashboard KPIs:', error);
      return {
        totalTenants: 0,
        activeTrials: 0,
        newSignups: 0,
        mrr: 0,
        recentTenants: []
      };
    });
  }

  static async getTenantStats() {
    try {
      // Get tenant statuses
      const statusStats = await db
        .select({
          status: tenants.status,
          count: count()
        })
        .from(tenants)
        .groupBy(tenants.status);

      // Get growth data for last 12 months
      const growthData = await db
        .select({
          month: sql<string>`TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')`,
          count: count()
        })
        .from(tenants)
        .where(sql`created_at >= NOW() - INTERVAL '12 months'`)
        .groupBy(sql`DATE_TRUNC('month', created_at)`)
        .orderBy(sql`DATE_TRUNC('month', created_at)`);

      return {
        statusStats,
        growthData
      };
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
      return {
        statusStats: [],
        growthData: []
      };
    }
  }

  static async getSystemAlerts() {
    try {
      const alerts = [];
      
      // Check for trials expiring soon
      const expiringTrials = await db
        .select({ count: count() })
        .from(tenants)
        .where(sql`status = 'trial' AND trial_ends_at <= NOW() + INTERVAL '7 days'`);
      
      if (expiringTrials[0]?.count > 0) {
        alerts.push({
          type: 'warning',
          message: `${expiringTrials[0].count} trial${expiringTrials[0].count > 1 ? 's' : ''} expiring within 7 days`
        });
      }

      // Check for failed payments
      const failedPayments = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'past_due'));
      
      if (failedPayments[0]?.count > 0) {
        alerts.push({
          type: 'error',
          message: `${failedPayments[0].count} subscription${failedPayments[0].count > 1 ? 's' : ''} with failed payments`
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error fetching system alerts:', error);
      return [];
    }
  }
}