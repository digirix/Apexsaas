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
    try {
      console.log('Fetching tenant list with optimized query...');
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
        .orderBy(desc(tenants.createdAt))
        .limit(100); // Limit results to prevent large queries
      
      console.log(`Successfully fetched ${tenantList.length} tenants`);
      return tenantList;
    } catch (error) {
      console.error('Error fetching tenant list:', error);
      return [];
    }
  }
  
  static async getDashboardKPIs() {
    try {
      console.log('Fetching dashboard KPIs with optimized queries...');
      
      // Simplified tenant count query
      const tenantCounts = await db
        .select({ 
          total: count()
        })
        .from(tenants);
      
      const totalTenants = tenantCounts[0]?.total || 0;
      
      console.log(`Successfully fetched KPIs - Total tenants: ${totalTenants}`);
      
      return {
        totalTenants: totalTenants,
        activeTrials: 0, // Simplified for now to avoid complex queries
        newSignups: 0,   // Simplified for now
        monthlyRevenue: 0 // Simplified for now
      };
    } catch (error) {
      console.error('Error fetching dashboard KPIs:', error);
      return {
        totalTenants: 0,
        activeTrials: 0,
        newSignups: 0,
        monthlyRevenue: 0
      };
    }
  }

  static async getTenantStats() {
    try {
      console.log('Fetching tenant stats...');
      
      const statusStats = await db
        .select({
          status: tenants.status,
          count: count()
        })
        .from(tenants)
        .groupBy(tenants.status);

      return {
        byStatus: statusStats,
        totalActive: statusStats.find(s => s.status === 'active')?.count || 0,
        totalTrial: statusStats.find(s => s.status === 'trial')?.count || 0
      };
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
      return {
        byStatus: [],
        totalActive: 0,
        totalTrial: 0
      };
    }
  }

  static async getSystemAlerts() {
    try {
      console.log('Fetching system alerts...');
      
      // Simplified alerts - just return empty for now to avoid complex queries
      return [];
    } catch (error) {
      console.error('Error fetching system alerts:', error);
      return [];
    }
  }
}