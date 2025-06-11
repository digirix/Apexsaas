import { db } from '../db';
import { auditLogs, tenants, saasAdmins } from '../../shared/schema';
import { eq, desc, and, gte, lte, count } from 'drizzle-orm';

export interface AuditLogEntry {
  id?: number;
  saasAdminId: number;
  tenantId: number | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface ImpersonationSession {
  token: string;
  saasAdminId: number;
  tenantId: number;
  expiresAt: Date;
  isActive: boolean;
  startedAt: Date;
  endedAt?: Date;
}

export class AuditService {
  /**
   * Log impersonation session start
   */
  async logImpersonationStart(
    saasAdminId: number, 
    tenantId: number, 
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        saasAdminId,
        tenantId,
        action: 'IMPERSONATION_START',
        resourceType: 'tenant',
        resourceId: tenantId.toString(),
        details: {
          impersonationToken: token,
          sessionType: 'tenant_impersonation'
        },
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        createdAt: new Date(),
      });

      console.log(`Audit: SaaS Admin ${saasAdminId} started impersonating tenant ${tenantId}`);
    } catch (error) {
      console.error('Failed to log impersonation start:', error);
      // Don't throw - audit logging should not block operations
    }
  }

  /**
   * Log impersonation session end
   */
  async logImpersonationEnd(
    saasAdminId: number,
    tenantId: number,
    token: string,
    duration: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        saasAdminId,
        tenantId,
        action: 'IMPERSONATION_END',
        resourceType: 'tenant',
        resourceId: tenantId.toString(),
        details: {
          impersonationToken: token,
          sessionDurationMinutes: Math.round(duration / 60000),
          sessionType: 'tenant_impersonation'
        },
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        createdAt: new Date(),
      });

      console.log(`Audit: SaaS Admin ${saasAdminId} ended impersonation of tenant ${tenantId} after ${Math.round(duration / 60000)} minutes`);
    } catch (error) {
      console.error('Failed to log impersonation end:', error);
    }
  }

  /**
   * Log tenant status changes
   */
  async logTenantStatusChange(
    saasAdminId: number,
    tenantId: number,
    oldStatus: string,
    newStatus: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        saasAdminId,
        tenantId,
        action: 'TENANT_STATUS_CHANGE',
        resourceType: 'tenant',
        resourceId: tenantId.toString(),
        details: {
          oldStatus,
          newStatus,
          reason: reason || 'No reason provided',
          changeType: 'status_modification'
        },
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        createdAt: new Date(),
      });

      console.log(`Audit: SaaS Admin ${saasAdminId} changed tenant ${tenantId} status from ${oldStatus} to ${newStatus}`);
    } catch (error) {
      console.error('Failed to log tenant status change:', error);
    }
  }

  /**
   * Log package management actions
   */
  async logPackageAction(
    saasAdminId: number,
    action: 'PACKAGE_CREATE' | 'PACKAGE_UPDATE' | 'PACKAGE_DELETE',
    packageId: number,
    packageData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        saasAdminId,
        tenantId: null,
        action,
        resourceType: 'package',
        resourceId: packageId.toString(),
        details: {
          packageData,
          actionType: 'package_management'
        },
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        createdAt: new Date(),
      });

      console.log(`Audit: SaaS Admin ${saasAdminId} performed ${action} on package ${packageId}`);
    } catch (error) {
      console.error('Failed to log package action:', error);
    }
  }

  /**
   * Log blog management actions
   */
  async logBlogAction(
    saasAdminId: number,
    action: 'BLOG_CREATE' | 'BLOG_UPDATE' | 'BLOG_DELETE' | 'BLOG_PUBLISH',
    postId: number,
    postData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        saasAdminId,
        tenantId: null,
        action,
        resourceType: 'blog_post',
        resourceId: postId.toString(),
        details: {
          postData,
          actionType: 'content_management'
        },
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        createdAt: new Date(),
      });

      console.log(`Audit: SaaS Admin ${saasAdminId} performed ${action} on blog post ${postId}`);
    } catch (error) {
      console.error('Failed to log blog action:', error);
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    saasAdminId: number | null,
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT',
    email: string,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        saasAdminId: saasAdminId || 0, // Use 0 for failed logins
        tenantId: null,
        action,
        resourceType: 'authentication',
        resourceId: email,
        details: {
          email,
          failureReason: failureReason || null,
          actionType: 'authentication'
        },
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        createdAt: new Date(),
      });

      console.log(`Audit: ${action} for email ${email}`);
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters: {
    saasAdminId?: number;
    tenantId?: number;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const {
        saasAdminId,
        tenantId,
        action,
        resourceType,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = filters;

      let whereConditions: any[] = [];

      if (saasAdminId) {
        whereConditions.push(eq(auditLogs.saasAdminId, saasAdminId));
      }
      if (tenantId) {
        whereConditions.push(eq(auditLogs.tenantId, tenantId));
      }
      if (action) {
        whereConditions.push(eq(auditLogs.action, action));
      }
      if (resourceType) {
        whereConditions.push(eq(auditLogs.resourceType, resourceType));
      }
      if (startDate) {
        whereConditions.push(gte(auditLogs.createdAt, startDate));
      }
      if (endDate) {
        whereConditions.push(lte(auditLogs.createdAt, endDate));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;
      const pages = Math.ceil(total / limit);

      // Get paginated logs with admin and tenant details
      const logs = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          details: auditLogs.details,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
          saasAdmin: {
            id: saasAdmins.id,
            email: saasAdmins.email,
            displayName: saasAdmins.displayName,
          },
          tenant: {
            id: tenants.id,
            companyName: tenants.companyName,
          }
        })
        .from(auditLogs)
        .leftJoin(saasAdmins, eq(auditLogs.saasAdminId, saasAdmins.id))
        .leftJoin(tenants, eq(auditLogs.tenantId, tenants.id))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages
        }
      };

    } catch (error) {
      console.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get security summary for dashboard
   */
  async getSecuritySummary(days: number = 30): Promise<{
    totalEvents: number;
    impersonationSessions: number;
    failedLogins: number;
    tenantStatusChanges: number;
    recentCriticalEvents: any[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const whereClause = gte(auditLogs.createdAt, startDate);

      // Get total events
      const totalEventsResult = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(whereClause);

      // Get impersonation sessions
      const impersonationResult = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(and(
          whereClause,
          eq(auditLogs.action, 'IMPERSONATION_START')
        ));

      // Get failed logins
      const failedLoginsResult = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(and(
          whereClause,
          eq(auditLogs.action, 'LOGIN_FAILED')
        ));

      // Get tenant status changes
      const statusChangesResult = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(and(
          whereClause,
          eq(auditLogs.action, 'TENANT_STATUS_CHANGE')
        ));

      // Get recent critical events
      const criticalEvents = await db
        .select()
        .from(auditLogs)
        .leftJoin(saasAdmins, eq(auditLogs.saasAdminId, saasAdmins.id))
        .leftJoin(tenants, eq(auditLogs.tenantId, tenants.id))
        .where(and(
          whereClause,
          // Critical events: failed logins, impersonations, tenant suspensions
          eq(auditLogs.action, 'LOGIN_FAILED')
        ))
        .orderBy(desc(auditLogs.createdAt))
        .limit(10);

      return {
        totalEvents: totalEventsResult[0]?.count || 0,
        impersonationSessions: impersonationResult[0]?.count || 0,
        failedLogins: failedLoginsResult[0]?.count || 0,
        tenantStatusChanges: statusChangesResult[0]?.count || 0,
        recentCriticalEvents: criticalEvents
      };

    } catch (error) {
      console.error('Failed to get security summary:', error);
      throw error;
    }
  }

  /**
   * Clean up old audit logs (for data retention)
   */
  async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedLogs = await db
        .delete(auditLogs)
        .where(lte(auditLogs.createdAt, cutoffDate));

      console.log(`Audit cleanup: Removed logs older than ${retentionDays} days`);
      return deletedLogs.length || 0;

    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
      throw error;
    }
  }
}

export const auditService = new AuditService();