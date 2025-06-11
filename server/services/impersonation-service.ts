import { db } from '../db';
import { auditLogs, tenants, users, saasAdmins } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface ImpersonationSession {
  token: string;
  saasAdminId: number;
  tenantId: number;
  expiresAt: Date;
  isActive: boolean;
  startedAt: Date;
  endedAt?: Date;
}

// In-memory storage for impersonation sessions (in production, use Redis)
const impersonationSessions = new Map<string, ImpersonationSession>();

export class ImpersonationService {
  /**
   * Start an impersonation session
   */
  async startImpersonation(
    saasAdminId: number,
    tenantId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; expiresAt: Date; loginUrl: string }> {
    try {
      // Verify tenant exists and is not suspended
      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant.length) {
        throw new Error('Tenant not found');
      }

      if (tenant[0].status === 'suspended' || tenant[0].status === 'cancelled') {
        throw new Error('Cannot impersonate suspended or cancelled tenant');
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Create session
      const session: ImpersonationSession = {
        token,
        saasAdminId,
        tenantId,
        expiresAt,
        isActive: true,
        startedAt: new Date(),
      };

      impersonationSessions.set(token, session);

      // Log the impersonation start
      await this.logImpersonationEvent(
        saasAdminId,
        tenantId,
        'IMPERSONATION_START',
        { token, expiresAt },
        ipAddress,
        userAgent
      );

      return {
        token,
        expiresAt,
        loginUrl: `/impersonate?token=${token}`,
      };

    } catch (error) {
      console.error('Impersonation start error:', error);
      throw error;
    }
  }

  /**
   * Validate and consume an impersonation token
   */
  async validateImpersonationToken(token: string): Promise<{
    isValid: boolean;
    tenantId?: number;
    saasAdminId?: number;
    superAdminUserId?: number;
  }> {
    try {
      const session = impersonationSessions.get(token);

      if (!session) {
        return { isValid: false };
      }

      // Check if token is expired
      if (new Date() > session.expiresAt || !session.isActive) {
        impersonationSessions.delete(token);
        return { isValid: false };
      }

      // Find the tenant's super admin user
      const superAdmin = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.tenantId, session.tenantId),
          eq(users.isSuperAdmin, true)
        ))
        .limit(1);

      if (!superAdmin.length) {
        return { isValid: false };
      }

      // Mark session as consumed (single use)
      session.isActive = false;
      impersonationSessions.set(token, session);

      return {
        isValid: true,
        tenantId: session.tenantId,
        saasAdminId: session.saasAdminId,
        superAdminUserId: superAdmin[0].id,
      };

    } catch (error) {
      console.error('Token validation error:', error);
      return { isValid: false };
    }
  }

  /**
   * End an impersonation session
   */
  async endImpersonation(
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const session = impersonationSessions.get(token);

      if (session) {
        session.isActive = false;
        session.endedAt = new Date();
        impersonationSessions.set(token, session);

        // Log the impersonation end
        await this.logImpersonationEvent(
          session.saasAdminId,
          session.tenantId,
          'IMPERSONATION_END',
          { endedAt: session.endedAt },
          ipAddress,
          userAgent
        );
      }

    } catch (error) {
      console.error('End impersonation error:', error);
    }
  }

  /**
   * Get active impersonation session info
   */
  getImpersonationInfo(token: string): ImpersonationSession | null {
    const session = impersonationSessions.get(token);
    
    if (!session || !session.isActive || new Date() > session.expiresAt) {
      return null;
    }

    return session;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    
    for (const [token, session] of impersonationSessions.entries()) {
      if (now > session.expiresAt) {
        impersonationSessions.delete(token);
      }
    }
  }

  /**
   * Log impersonation events for audit trail
   */
  private async logImpersonationEvent(
    saasAdminId: number,
    tenantId: number,
    action: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db
        .insert(auditLogs)
        .values({
          saasAdminId,
          tenantId,
          action,
          resourceType: 'tenant',
          resourceId: tenantId.toString(),
          details,
          ipAddress,
          userAgent,
        });
    } catch (error) {
      console.error('Failed to log impersonation event:', error);
    }
  }

  /**
   * Get impersonation audit logs for a tenant
   */
  async getImpersonationAuditLogs(tenantId: number, limit: number = 50): Promise<any[]> {
    try {
      const logs = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          details: auditLogs.details,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
          adminName: saasAdmins.displayName,
          adminEmail: saasAdmins.email,
        })
        .from(auditLogs)
        .leftJoin(saasAdmins, eq(auditLogs.saasAdminId, saasAdmins.id))
        .where(and(
          eq(auditLogs.tenantId, tenantId),
          eq(auditLogs.resourceType, 'tenant')
        ))
        .orderBy(auditLogs.createdAt)
        .limit(limit);

      return logs;

    } catch (error) {
      console.error('Failed to fetch impersonation audit logs:', error);
      return [];
    }
  }
}

export const impersonationService = new ImpersonationService();

// Clean up expired sessions every 5 minutes
setInterval(() => {
  impersonationService.cleanupExpiredSessions();
}, 5 * 60 * 1000);