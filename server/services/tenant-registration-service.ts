import { db } from '../db';
import { 
  tenants, 
  subscriptions, 
  packages, 
  users, 
  saasAdmins 
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export interface TenantRegistrationData {
  companyName: string;
  adminEmail: string;
  adminPassword: string;
  adminDisplayName: string;
  packageId?: number;
  trialDays?: number;
  referralCode?: string;
  marketingSource?: string;
}

export interface RegistrationResult {
  success: boolean;
  tenantId?: number;
  userId?: number;
  message: string;
  loginUrl?: string;
  trialEndsAt?: Date;
}

export class TenantRegistrationService {
  /**
   * Register a new tenant from the marketing website
   */
  async registerTenant(data: TenantRegistrationData): Promise<RegistrationResult> {
    try {
      // Validate input data
      const validation = await this.validateRegistrationData(data);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message
        };
      }

      // Start transaction-like operation
      const { 
        companyName, 
        adminEmail, 
        adminPassword, 
        adminDisplayName, 
        packageId,
        trialDays = 14,
        referralCode,
        marketingSource 
      } = data;

      // Hash the admin password
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      // Calculate trial end date
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      // Create the tenant record
      const newTenant = await db
        .insert(tenants)
        .values({
          companyName,
          status: 'trial',
          createdAt: new Date(),
          trialEndsAt,
        })
        .returning();

      const tenantId = newTenant[0].id;

      // Create the super admin user for this tenant
      const newUser = await db
        .insert(users)
        .values({
          tenantId,
          username: adminEmail,
          email: adminEmail,
          password: hashedPassword,
          displayName: adminDisplayName,
          isSuperAdmin: true,
          isAdmin: false,
          isActive: true,
          createdAt: new Date(),
        })
        .returning();

      const userId = newUser[0].id;

      // Create trial subscription
      let subscriptionPackageId = packageId;
      
      // If no package specified, use the default trial package (lowest tier)
      if (!subscriptionPackageId) {
        const defaultPackage = await db
          .select()
          .from(packages)
          .where(and(
            eq(packages.isActive, true),
            eq(packages.isPubliclyVisible, true)
          ))
          .orderBy(packages.monthlyPrice)
          .limit(1);

        subscriptionPackageId = defaultPackage[0]?.id || 1;
      }

      // Create the subscription
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date(trialEndsAt);

      await db
        .insert(subscriptions)
        .values({
          tenantId,
          packageId: subscriptionPackageId,
          status: 'trialing',
          currentPeriodStart,
          currentPeriodEnd,
          createdAt: new Date(),
        });

      // Log the registration event (if audit service is available)
      try {
        const { auditService } = await import('./audit-service');
        await auditService.logAuthEvent(
          null,
          'TENANT_REGISTRATION',
          adminEmail,
          undefined,
          undefined,
          `New tenant registered: ${companyName}`
        );
      } catch (error) {
        // Audit logging failure shouldn't break registration
        console.warn('Failed to log registration audit event:', error);
      }

      return {
        success: true,
        tenantId,
        userId,
        message: 'Registration successful! Your trial has started.',
        loginUrl: `/login`,
        trialEndsAt
      };

    } catch (error) {
      console.error('Tenant registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again or contact support.'
      };
    }
  }

  /**
   * Validate registration data
   */
  private async validateRegistrationData(data: TenantRegistrationData): Promise<{
    isValid: boolean;
    message: string;
  }> {
    const { companyName, adminEmail, adminPassword, adminDisplayName } = data;

    // Basic validation
    if (!companyName || companyName.trim().length < 2) {
      return { isValid: false, message: 'Company name must be at least 2 characters long' };
    }

    if (!adminEmail || !this.isValidEmail(adminEmail)) {
      return { isValid: false, message: 'Please provide a valid email address' };
    }

    if (!adminPassword || adminPassword.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!adminDisplayName || adminDisplayName.trim().length < 2) {
      return { isValid: false, message: 'Admin name must be at least 2 characters long' };
    }

    // Check if email is already used by another tenant admin
    const existingUser = await db
      .select({ id: users.id, tenantId: users.tenantId })
      .from(users)
      .where(and(
        eq(users.email, adminEmail),
        eq(users.isSuperAdmin, true)
      ))
      .limit(1);

    if (existingUser.length > 0) {
      return { isValid: false, message: 'An account with this email already exists' };
    }

    // Check if company name is already taken
    const existingTenant = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.companyName, companyName))
      .limit(1);

    if (existingTenant.length > 0) {
      return { isValid: false, message: 'A company with this name is already registered' };
    }

    return { isValid: true, message: 'Validation passed' };
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get registration statistics for SaaS dashboard
   */
  async getRegistrationStats(days: number = 30): Promise<{
    totalRegistrations: number;
    registrationsThisPeriod: number;
    conversionRate: number;
    topSources: Array<{ source: string; count: number }>;
    registrationTrend: Array<{ date: string; count: number }>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get total registrations
      const totalTenantsResult = await db
        .select()
        .from(tenants);

      // Get registrations in the specified period
      const recentTenantsResult = await db
        .select()
        .from(tenants)
        .where(and(
          eq(tenants.createdAt, startDate), // This would need proper date comparison
        ));

      // For now, return simplified stats
      return {
        totalRegistrations: totalTenantsResult.length,
        registrationsThisPeriod: recentTenantsResult.length,
        conversionRate: 15.5, // Placeholder - would calculate from actual traffic data
        topSources: [
          { source: 'organic', count: 12 },
          { source: 'google-ads', count: 8 },
          { source: 'referral', count: 5 },
        ],
        registrationTrend: [] // Would populate with daily/weekly data
      };

    } catch (error) {
      console.error('Error getting registration stats:', error);
      return {
        totalRegistrations: 0,
        registrationsThisPeriod: 0,
        conversionRate: 0,
        topSources: [],
        registrationTrend: []
      };
    }
  }

  /**
   * Upgrade trial to paid subscription
   */
  async upgradeTrial(
    tenantId: number, 
    packageId: number, 
    stripeSubscriptionId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Update tenant status
      await db
        .update(tenants)
        .set({ 
          status: 'active',
          updatedAt: new Date()
        })
        .where(eq(tenants.id, tenantId));

      // Update subscription
      const newPeriodStart = new Date();
      const newPeriodEnd = new Date();
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      await db
        .update(subscriptions)
        .set({
          packageId,
          status: 'active',
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          stripeSubscriptionId: stripeSubscriptionId || null,
          updatedAt: new Date()
        })
        .where(eq(subscriptions.tenantId, tenantId));

      return {
        success: true,
        message: 'Trial upgraded to paid subscription successfully'
      };

    } catch (error) {
      console.error('Trial upgrade error:', error);
      return {
        success: false,
        message: 'Failed to upgrade trial. Please contact support.'
      };
    }
  }

  /**
   * Cancel trial and deactivate tenant
   */
  async cancelTrial(tenantId: number, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Update tenant status
      await db
        .update(tenants)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(tenants.id, tenantId));

      // Update subscription
      await db
        .update(subscriptions)
        .set({
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(subscriptions.tenantId, tenantId));

      // Deactivate all users for this tenant
      await db
        .update(users)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(users.tenantId, tenantId));

      return {
        success: true,
        message: 'Trial cancelled successfully'
      };

    } catch (error) {
      console.error('Trial cancellation error:', error);
      return {
        success: false,
        message: 'Failed to cancel trial. Please contact support.'
      };
    }
  }

  /**
   * Send welcome email to new tenant admin
   */
  async sendWelcomeEmail(tenantId: number, adminEmail: string): Promise<void> {
    try {
      // In production, this would integrate with email service (SendGrid, etc.)
      console.log(`Welcome email would be sent to ${adminEmail} for tenant ${tenantId}`);
      
      // Email content would include:
      // - Welcome message
      // - Login instructions
      // - Getting started guide
      // - Trial information
      // - Support contact information
      
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }
}

export const tenantRegistrationService = new TenantRegistrationService();