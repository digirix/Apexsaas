import { db } from '../db';
import { tenants, subscriptions, packages, users, entities, tasks, invoices } from '../../shared/schema';
import { eq, desc, count, sql } from 'drizzle-orm';

export class TenantDataService {
  
  static async getTenantList() {
    try {
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
    } catch (error) {
      console.error('Error fetching tenant list:', error);
      return [];
    }
  }
  
  static async getDashboardKPIs() {
    try {
      // Get total tenants count
      const totalTenantsResult = await db
        .select({ count: count() })
        .from(tenants);
      const totalTenants = totalTenantsResult[0]?.count || 0;

      // Get active trials
      const activeTrialsResult = await db
        .select({ count: count() })
        .from(tenants)
        .where(sql`status = 'trial' AND trial_ends_at > NOW()`);
      const activeTrials = activeTrialsResult[0]?.count || 0;

      // Get new signups in last 30 days
      const newSignupsResult = await db
        .select({ count: count() })
        .from(tenants)
        .where(sql`created_at >= NOW() - INTERVAL '30 days'`);
      const newSignups = newSignupsResult[0]?.count || 0;

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
        .limit(10);

      // Calculate MRR from active subscriptions
      const mrrResult = await db
        .select({ 
          totalMrr: sql<number>`COALESCE(SUM(CASE WHEN billing_period = 'monthly' THEN amount ELSE amount / 12 END), 0)` 
        })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active'));
      
      const mrr = mrrResult[0]?.totalMrr || 0;

      return {
        totalTenants,
        activeTrials,
        newSignups,
        mrr,
        recentTenants
      };
    } catch (error) {
      console.error('Error fetching dashboard KPIs:', error);
      // Return basic fallback data structure
      return {
        totalTenants: 0,
        activeTrials: 0,
        newSignups: 0,
        mrr: 0,
        recentTenants: []
      };
    }
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