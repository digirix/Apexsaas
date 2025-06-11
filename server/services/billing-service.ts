import { db } from '../db';
import { 
  tenants, 
  subscriptions, 
  packages, 
  users, 
  entities, 
  saasSettings 
} from '../../shared/schema';
import { eq, and, count, sql } from 'drizzle-orm';

export interface UsageReport {
  tenantId: number;
  userCount: number;
  entityCount: number;
  packageLimits: {
    maxUsers?: number;
    maxEntities?: number;
  };
  overageUsers: number;
  overageEntities: number;
  overageCharges: {
    userCharges: number;
    entityCharges: number;
    totalOverage: number;
  };
}

export interface BillingCycle {
  tenantId: number;
  subscriptionId: number;
  periodStart: Date;
  periodEnd: Date;
  baseAmount: number;
  overageAmount: number;
  totalAmount: number;
  lineItems: BillingLineItem[];
}

export interface BillingLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'base_subscription' | 'user_overage' | 'entity_overage';
}

export class BillingService {
  /**
   * Calculate usage-based billing for a specific tenant
   */
  async calculateTenantUsage(tenantId: number): Promise<UsageReport> {
    try {
      // Get tenant's current subscription and package
      const subscription = await db
        .select({
          id: subscriptions.id,
          packageId: subscriptions.packageId,
          package: {
            id: packages.id,
            name: packages.name,
            limitsJson: packages.limitsJson,
          }
        })
        .from(subscriptions)
        .leftJoin(packages, eq(subscriptions.packageId, packages.id))
        .where(and(
          eq(subscriptions.tenantId, tenantId),
          eq(subscriptions.status, 'active')
        ))
        .limit(1);

      if (!subscription || subscription.length === 0) {
        throw new Error(`No active subscription found for tenant ${tenantId}`);
      }

      const packageLimits = subscription[0].package?.limitsJson || {};

      // Count active users for this tenant
      const userCountResult = await db
        .select({ count: count() })
        .from(users)
        .where(and(
          eq(users.tenantId, tenantId),
          eq(users.isActive, true)
        ));

      // Count entities for this tenant
      const entityCountResult = await db
        .select({ count: count() })
        .from(entities)
        .where(eq(entities.tenantId, tenantId));

      const userCount = userCountResult[0]?.count || 0;
      const entityCount = entityCountResult[0]?.count || 0;

      // Calculate overages
      const maxUsers = packageLimits.maxUsers === -1 ? Infinity : (packageLimits.maxUsers || 0);
      const maxEntities = packageLimits.maxEntities === -1 ? Infinity : (packageLimits.maxEntities || 0);

      const overageUsers = Math.max(0, userCount - maxUsers);
      const overageEntities = Math.max(0, entityCount - maxEntities);

      // Get pricing settings
      const settings = await this.getSaasSettings();
      const userPrice = parseFloat(settings.pricePerUserPerMonth || '0');
      const entityPrice = parseFloat(settings.pricePerEntityPerMonth || '0');

      const overageCharges = {
        userCharges: overageUsers * userPrice,
        entityCharges: overageEntities * entityPrice,
        totalOverage: (overageUsers * userPrice) + (overageEntities * entityPrice)
      };

      return {
        tenantId,
        userCount,
        entityCount,
        packageLimits: {
          maxUsers: packageLimits.maxUsers,
          maxEntities: packageLimits.maxEntities,
        },
        overageUsers,
        overageEntities,
        overageCharges
      };

    } catch (error) {
      console.error(`Error calculating usage for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Generate billing cycle data for all active tenants
   */
  async generateBillingCycles(periodStart: Date, periodEnd: Date): Promise<BillingCycle[]> {
    try {
      // Get all active subscriptions
      const activeSubscriptions = await db
        .select({
          id: subscriptions.id,
          tenantId: subscriptions.tenantId,
          packageId: subscriptions.packageId,
          package: {
            name: packages.name,
            monthlyPrice: packages.monthlyPrice,
          }
        })
        .from(subscriptions)
        .leftJoin(packages, eq(subscriptions.packageId, packages.id))
        .where(eq(subscriptions.status, 'active'));

      const billingCycles: BillingCycle[] = [];

      for (const subscription of activeSubscriptions) {
        try {
          const usage = await this.calculateTenantUsage(subscription.tenantId);
          const baseAmount = parseFloat(subscription.package?.monthlyPrice || '0');
          
          const lineItems: BillingLineItem[] = [
            {
              description: `${subscription.package?.name} - Monthly Subscription`,
              quantity: 1,
              unitPrice: baseAmount,
              totalPrice: baseAmount,
              type: 'base_subscription'
            }
          ];

          // Add overage charges if any
          if (usage.overageUsers > 0) {
            const settings = await this.getSaasSettings();
            const userPrice = parseFloat(settings.pricePerUserPerMonth || '0');
            
            lineItems.push({
              description: `Additional Users (${usage.overageUsers} over limit)`,
              quantity: usage.overageUsers,
              unitPrice: userPrice,
              totalPrice: usage.overageCharges.userCharges,
              type: 'user_overage'
            });
          }

          if (usage.overageEntities > 0) {
            const settings = await this.getSaasSettings();
            const entityPrice = parseFloat(settings.pricePerEntityPerMonth || '0');
            
            lineItems.push({
              description: `Additional Entities (${usage.overageEntities} over limit)`,
              quantity: usage.overageEntities,
              unitPrice: entityPrice,
              totalPrice: usage.overageCharges.entityCharges,
              type: 'entity_overage'
            });
          }

          billingCycles.push({
            tenantId: subscription.tenantId,
            subscriptionId: subscription.id,
            periodStart,
            periodEnd,
            baseAmount,
            overageAmount: usage.overageCharges.totalOverage,
            totalAmount: baseAmount + usage.overageCharges.totalOverage,
            lineItems
          });

        } catch (error) {
          console.error(`Error generating billing cycle for tenant ${subscription.tenantId}:`, error);
          // Continue with other tenants even if one fails
        }
      }

      return billingCycles;

    } catch (error) {
      console.error('Error generating billing cycles:', error);
      throw error;
    }
  }

  /**
   * Preview upcoming billing for a specific tenant
   */
  async previewTenantBilling(tenantId: number): Promise<BillingCycle | null> {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const cycles = await this.generateBillingCycles(periodStart, periodEnd);
      return cycles.find(cycle => cycle.tenantId === tenantId) || null;

    } catch (error) {
      console.error(`Error previewing billing for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Check if tenant is over their package limits
   */
  async checkTenantLimits(tenantId: number): Promise<{
    isOverLimit: boolean;
    userOverage: number;
    entityOverage: number;
    warnings: string[];
  }> {
    try {
      const usage = await this.calculateTenantUsage(tenantId);
      const warnings: string[] = [];

      if (usage.overageUsers > 0) {
        warnings.push(`${usage.overageUsers} users over package limit`);
      }

      if (usage.overageEntities > 0) {
        warnings.push(`${usage.overageEntities} entities over package limit`);
      }

      return {
        isOverLimit: usage.overageUsers > 0 || usage.overageEntities > 0,
        userOverage: usage.overageUsers,
        entityOverage: usage.overageEntities,
        warnings
      };

    } catch (error) {
      console.error(`Error checking limits for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get SaaS settings for billing calculations
   */
  private async getSaasSettings() {
    // For now, return default settings. In production, this would fetch from saasSettings table
    return {
      usageBasedPricingEnabled: true,
      pricePerUserPerMonth: '15.00',
      pricePerEntityPerMonth: '5.00',
      billingCycleDay: 1,
      trialPeriodDays: 14,
      defaultCurrency: 'USD'
    };
  }

  /**
   * Calculate Monthly Recurring Revenue (MRR)
   */
  async calculateMRR(): Promise<number> {
    try {
      const activeSubscriptions = await db
        .select({
          monthlyPrice: packages.monthlyPrice,
        })
        .from(subscriptions)
        .leftJoin(packages, eq(subscriptions.packageId, packages.id))
        .where(eq(subscriptions.status, 'active'));

      const baseMRR = activeSubscriptions.reduce((total, sub) => {
        return total + parseFloat(sub.monthlyPrice || '0');
      }, 0);

      // Add estimated usage-based revenue (simplified calculation)
      const allTenants = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.status, 'active'));

      let usageRevenue = 0;
      for (const tenant of allTenants) {
        try {
          const usage = await this.calculateTenantUsage(tenant.id);
          usageRevenue += usage.overageCharges.totalOverage;
        } catch (error) {
          // Skip tenants with calculation errors
          continue;
        }
      }

      return baseMRR + usageRevenue;

    } catch (error) {
      console.error('Error calculating MRR:', error);
      return 0;
    }
  }

  /**
   * Generate usage report for all tenants
   */
  async generateUsageReport(): Promise<UsageReport[]> {
    try {
      const allTenants = await db
        .select({ 
          id: tenants.id,
          companyName: tenants.companyName 
        })
        .from(tenants);

      const reports: UsageReport[] = [];

      for (const tenant of allTenants) {
        try {
          const usage = await this.calculateTenantUsage(tenant.id);
          reports.push(usage);
        } catch (error) {
          console.error(`Failed to generate usage report for tenant ${tenant.id}:`, error);
          // Continue with other tenants
        }
      }

      return reports;

    } catch (error) {
      console.error('Error generating usage report:', error);
      throw error;
    }
  }
}

export const billingService = new BillingService();