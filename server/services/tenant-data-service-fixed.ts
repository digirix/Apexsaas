import { db } from '../db';
import { tenants, subscriptions, packages, users, entities, tasks, invoices } from '../../shared/schema';
import { eq, desc, count, sql, and, ilike } from 'drizzle-orm';

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

  static async getTenantListPaginated(page: number = 1, limit: number = 10, search: string = '', status: string = 'all') {
    try {
      console.log(`Fetching paginated tenant list - Page: ${page}, Limit: ${limit}, Search: '${search}', Status: '${status}'`);
      
      const offset = (page - 1) * limit;
      
      // Build the base query
      let query = db.select({
        id: tenants.id,
        companyName: tenants.companyName,
        status: tenants.status,
        createdAt: tenants.createdAt,
        trialEndsAt: tenants.trialEndsAt,
        subscriptionId: tenants.subscriptionId,
        userCount: sql<number>`0`, // Placeholder for now
        entityCount: sql<number>`0`, // Placeholder for now
        packageName: sql<string>`null` // Placeholder for now
      }).from(tenants);

      // Apply filters
      const conditions = [];
      
      if (search) {
        conditions.push(ilike(tenants.companyName, `%${search}%`));
      }
      
      if (status !== 'all') {
        conditions.push(eq(tenants.status, status));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Get total count for pagination
      const countQuery = db.select({ count: count() }).from(tenants);
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }
      
      const [totalResult] = await countQuery;
      const total = totalResult?.count || 0;
      
      // Get paginated results
      const tenantList = await query
        .orderBy(desc(tenants.createdAt))
        .limit(limit)
        .offset(offset);
      
      const totalPages = Math.ceil(total / limit);
      
      console.log(`Successfully fetched ${tenantList.length} tenants (page ${page}/${totalPages})`);
      
      return {
        tenants: tenantList,
        pagination: {
          total,
          page,
          limit,
          pages: totalPages
        }
      };
    } catch (error) {
      console.error('Error fetching paginated tenant list:', error);
      return {
        tenants: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0
        }
      };
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