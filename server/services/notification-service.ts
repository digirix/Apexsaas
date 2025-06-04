import { 
  notifications, 
  notificationPreferences, 
  notificationTriggers,
  emailProviderSettings,
  emailDeliveryLogs,
  users,
  userPermissions,
  tasks,
  tenants,
  CreateNotification,
  NotificationFilter,
  InsertNotification,
  InsertNotificationPreference,
  InsertEmailDeliveryLog
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, sql, inArray, gte, lte, like, or } from 'drizzle-orm';
import { sendEmail } from './email-service';

// In-memory cache for performance optimization
class NotificationCache {
  private userPreferences: Map<string, any[]> = new Map();
  private emailProviders: Map<number, any> = new Map();
  private triggers: Map<number, any[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private isExpired(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return !expiry || Date.now() > expiry;
  }

  private setExpiry(key: string): void {
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  async getUserPreferences(userId: number): Promise<any[]> {
    const key = `user_prefs_${userId}`;
    if (!this.isExpired(key) && this.userPreferences.has(key)) {
      return this.userPreferences.get(key)!;
    }

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    this.userPreferences.set(key, prefs);
    this.setExpiry(key);
    return prefs;
  }

  async getEmailProvider(tenantId: number): Promise<any | null> {
    const key = tenantId;
    if (!this.isExpired(`email_provider_${key}`) && this.emailProviders.has(key)) {
      return this.emailProviders.get(key)!;
    }

    const provider = await db
      .select()
      .from(emailProviderSettings)
      .where(and(
        eq(emailProviderSettings.tenantId, tenantId),
        eq(emailProviderSettings.isActive, true)
      ))
      .limit(1);

    const result = provider[0] || null;
    this.emailProviders.set(key, result);
    this.setExpiry(`email_provider_${key}`);
    return result;
  }

  async getTriggers(tenantId: number): Promise<any[]> {
    const key = tenantId;
    if (!this.isExpired(`triggers_${key}`) && this.triggers.has(key)) {
      return this.triggers.get(key)!;
    }

    const triggers = await db
      .select()
      .from(notificationTriggers)
      .where(and(
        eq(notificationTriggers.tenantId, tenantId),
        eq(notificationTriggers.isActive, true)
      ));

    this.triggers.set(key, triggers);
    this.setExpiry(`triggers_${key}`);
    return triggers;
  }

  invalidateUserPreferences(userId: number): void {
    const key = `user_prefs_${userId}`;
    this.userPreferences.delete(key);
    this.cacheExpiry.delete(key);
  }

  invalidateEmailProvider(tenantId: number): void {
    const key = `email_provider_${tenantId}`;
    this.emailProviders.delete(tenantId);
    this.cacheExpiry.delete(key);
  }

  invalidateTriggers(tenantId: number): void {
    const key = `triggers_${tenantId}`;
    this.triggers.delete(tenantId);
    this.cacheExpiry.delete(key);
  }

  clear(): void {
    this.userPreferences.clear();
    this.emailProviders.clear();
    this.triggers.clear();
    this.cacheExpiry.clear();
  }
}

const cache = new NotificationCache();

export class NotificationService {
  // Create a new notification with comprehensive delivery options
  async createNotification(notificationData: CreateNotification): Promise<void> {
    const { 
      tenantId, 
      userIds, 
      roleIds, 
      departmentIds, 
      conditionalRecipients,
      deliveryChannels = ['in_app'],
      deliveryDelay = 0,
      batchDelivery = false,
      templateVariables = {},
      ...baseNotification 
    } = notificationData;

    // Resolve recipients
    const recipientIds = await this.resolveRecipients({
      tenantId,
      userIds,
      roleIds,
      departmentIds,
      conditionalRecipients
    });

    if (recipientIds.length === 0) {
      console.warn('No recipients found for notification');
      return;
    }

    // Process delivery based on delay and batching settings
    if (deliveryDelay > 0) {
      setTimeout(() => {
        this.processNotificationDelivery(
          recipientIds, 
          baseNotification, 
          deliveryChannels, 
          templateVariables,
          batchDelivery
        );
      }, deliveryDelay * 60 * 1000);
    } else {
      await this.processNotificationDelivery(
        recipientIds, 
        baseNotification, 
        deliveryChannels, 
        templateVariables,
        batchDelivery
      );
    }
  }

  // Process notification delivery to recipients
  private async processNotificationDelivery(
    recipientIds: number[],
    baseNotification: any,
    deliveryChannels: string[],
    templateVariables: Record<string, any>,
    batchDelivery: boolean
  ): Promise<void> {
    if (batchDelivery) {
      // Process in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < recipientIds.length; i += batchSize) {
        const batch = recipientIds.slice(i, i + batchSize);
        await this.deliverToBatch(batch, baseNotification, deliveryChannels, templateVariables);
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      await this.deliverToBatch(recipientIds, baseNotification, deliveryChannels, templateVariables);
    }
  }

  // Deliver notifications to a batch of recipients
  private async deliverToBatch(
    recipientIds: number[],
    baseNotification: any,
    deliveryChannels: string[],
    templateVariables: Record<string, any>
  ): Promise<void> {
    for (const userId of recipientIds) {
      // Check user preferences for each delivery channel
      const userPrefs = await cache.getUserPreferences(userId);
      const relevantPref = userPrefs.find(p => p.notificationType === baseNotification.type);

      // Create in-app notification if enabled
      if (deliveryChannels.includes('in_app') && 
          (!relevantPref || relevantPref.inAppEnabled)) {
        await this.createInAppNotification(userId, baseNotification, templateVariables);
      }

      // Send email notification if enabled
      if (deliveryChannels.includes('email') && 
          relevantPref && relevantPref.emailEnabled) {
        await this.sendEmailNotification(userId, baseNotification, templateVariables);
      }

      // SMS and Push notifications can be added here in the future
    }
  }

  // Create in-app notification
  private async createInAppNotification(
    userId: number,
    notificationData: any,
    templateVariables: Record<string, any>
  ): Promise<void> {
    const processedTitle = this.processTemplate(notificationData.title, templateVariables);
    const processedMessage = this.processTemplate(notificationData.messageBody, templateVariables);
    const processedLink = notificationData.linkUrl ? 
      this.processTemplate(notificationData.linkUrl, templateVariables) : null;

    const notification: InsertNotification = {
      tenantId: notificationData.tenantId,
      userId,
      title: processedTitle,
      messageBody: processedMessage,
      linkUrl: processedLink,
      type: notificationData.type,
      severity: notificationData.severity,
      createdBy: notificationData.createdBy,
      relatedModule: notificationData.relatedModule,
      relatedEntityId: notificationData.relatedEntityId,
    };

    await db.insert(notifications).values(notification);
  }

  // Send email notification
  private async sendEmailNotification(
    userId: number,
    notificationData: any,
    templateVariables: Record<string, any>
  ): Promise<void> {
    try {
      // Get user email
      const user = await db
        .select({ email: users.email, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user[0]?.email) {
        console.warn(`No email found for user ${userId}`);
        return;
      }

      // Get email provider for tenant
      const emailProvider = await cache.getEmailProvider(notificationData.tenantId);
      if (!emailProvider) {
        console.warn(`No active email provider for tenant ${notificationData.tenantId}`);
        return;
      }

      const processedTitle = this.processTemplate(notificationData.title, templateVariables);
      const processedMessage = this.processTemplate(notificationData.messageBody, templateVariables);

      // Send email using the email service
      const emailSent = await sendEmail(emailProvider, {
        to: user[0].email,
        subject: processedTitle,
        text: processedMessage,
        html: this.generateEmailHTML(processedTitle, processedMessage, notificationData, templateVariables)
      });

      // Log email delivery
      if (emailSent) {
        const deliveryLog: InsertEmailDeliveryLog = {
          tenantId: notificationData.tenantId,
          providerId: emailProvider.id,
          recipientEmail: user[0].email,
          subject: processedTitle,
          status: 'sent'
        };

        await db.insert(emailDeliveryLogs).values(deliveryLog);
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Process template variables in text
  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(variables[key] || ''));
    });
    return processed;
  }

  // Generate HTML email template
  private generateEmailHTML(
    title: string, 
    message: string, 
    notificationData: any, 
    templateVariables: Record<string, any>
  ): string {
    const severityColors = {
      INFO: '#3b82f6',
      SUCCESS: '#10b981',
      WARNING: '#f59e0b',
      CRITICAL: '#ef4444'
    };

    const color = severityColors[notificationData.severity] || severityColors.INFO;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="border-left: 4px solid ${color}; padding: 20px; background-color: #f8f9fa; margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0; color: ${color};">${title}</h2>
        <p style="margin: 0; font-size: 14px; color: #666;">
            ${notificationData.type.replace(/_/g, ' ')} • ${notificationData.severity}
        </p>
    </div>
    
    <div style="padding: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 20px;">${message}</p>
        
        ${notificationData.linkUrl ? `
        <div style="text-align: center; margin: 30px 0;">
            <a href="${notificationData.linkUrl}" style="background-color: ${color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Details
            </a>
        </div>
        ` : ''}
    </div>
    
    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #888;">
        <p>This is an automated notification from your accounting management system.</p>
        <p>To manage your notification preferences, please log in to your account.</p>
    </div>
</body>
</html>`;
  }

  // Resolve notification recipients based on various criteria with permission checking
  private async resolveRecipients(criteria: {
    tenantId: number;
    userIds?: number[];
    roleIds?: number[];
    departmentIds?: number[];
    conditionalRecipients?: any;
    module?: string;
    requiredPermission?: string;
  }): Promise<number[]> {
    const { tenantId, userIds, roleIds, departmentIds, conditionalRecipients, module, requiredPermission } = criteria;
    const recipientSet = new Set<number>();

    // Add specific user IDs (with permission check)
    if (userIds && userIds.length > 0) {
      for (const userId of userIds) {
        const hasPermission = await this.checkUserPermission(userId, tenantId, module, requiredPermission);
        if (hasPermission) {
          recipientSet.add(userId);
        }
      }
    }

    // Add users by admin role
    if (roleIds && roleIds.includes('admin')) {
      const adminUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.tenantId, tenantId),
          eq(users.isAdmin, true),
          eq(users.isActive, true)
        ));
      
      adminUsers.forEach(user => recipientSet.add(user.id));
    }

    // Add users by module permissions
    if (module && requiredPermission) {
      const usersWithPermission = await db
        .select({ userId: userPermissions.userId })
        .from(userPermissions)
        .innerJoin(users, eq(userPermissions.userId, users.id))
        .where(and(
          eq(userPermissions.tenantId, tenantId),
          eq(userPermissions.module, module),
          eq(users.isActive, true),
          this.getPermissionCondition(requiredPermission)
        ));

      usersWithPermission.forEach(({ userId }) => recipientSet.add(userId));
    }

    // Add users based on conditional criteria (task assignments, client relationships, etc.)
    if (conditionalRecipients) {
      const conditionalUsers = await this.resolveConditionalRecipients(tenantId, conditionalRecipients);
      conditionalUsers.forEach(userId => recipientSet.add(userId));
    }

    // If no specific recipients and no module restrictions, get all active users
    if (recipientSet.size === 0 && !module) {
      const tenantUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.tenantId, tenantId),
          eq(users.isActive, true)
        ));
      
      tenantUsers.forEach(user => recipientSet.add(user.id));
    }

    return Array.from(recipientSet);
  }

  // Check if user has specific permission for a module
  private async checkUserPermission(
    userId: number, 
    tenantId: number, 
    module?: string, 
    permission?: string
  ): Promise<boolean> {
    if (!module || !permission) return true;

    // Check if user is admin (admins have all permissions)
    const user = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId),
        eq(users.isActive, true)
      ))
      .limit(1);

    if (user[0]?.isAdmin) return true;

    // Check specific module permission
    const userPermission = await db
      .select()
      .from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.tenantId, tenantId),
        eq(userPermissions.module, module)
      ))
      .limit(1);

    if (!userPermission[0]) return false;

    const perm = userPermission[0];
    switch (permission) {
      case 'read': return perm.canRead;
      case 'create': return perm.canCreate;
      case 'update': return perm.canUpdate;
      case 'delete': return perm.canDelete;
      default: return perm.canRead; // Default to read permission
    }
  }

  // Get SQL condition for permission check
  private getPermissionCondition(permission: string) {
    switch (permission) {
      case 'create': return eq(userPermissions.canCreate, true);
      case 'update': return eq(userPermissions.canUpdate, true);
      case 'delete': return eq(userPermissions.canDelete, true);
      case 'read':
      default: return eq(userPermissions.canRead, true);
    }
  }

  // Resolve conditional recipients based on business logic
  private async resolveConditionalRecipients(tenantId: number, conditions: any): Promise<number[]> {
    const recipients: number[] = [];

    // Task-related notifications
    if (conditions.taskId) {
      const task = await db
        .select({ assignedTo: tasks.assignedTo, clientId: tasks.clientId })
        .from(tasks)
        .where(and(
          eq(tasks.id, conditions.taskId),
          eq(tasks.tenantId, tenantId)
        ))
        .limit(1);

      if (task[0]?.assignedTo) {
        recipients.push(task[0].assignedTo);
      }

      // Add client relationship managers if applicable
      if (task[0]?.clientId && conditions.includeClientManagers) {
        // This would require a client-manager relationship table
        // For now, we'll include all users with client module permissions
        const clientManagers = await db
          .select({ userId: userPermissions.userId })
          .from(userPermissions)
          .where(and(
            eq(userPermissions.tenantId, tenantId),
            eq(userPermissions.module, 'clients'),
            eq(userPermissions.canRead, true)
          ));

        clientManagers.forEach(({ userId }) => recipients.push(userId));
      }
    }

    // Client-related notifications
    if (conditions.clientId) {
      const clientUsers = await db
        .select({ userId: userPermissions.userId })
        .from(userPermissions)
        .where(and(
          eq(userPermissions.tenantId, tenantId),
          eq(userPermissions.module, 'clients'),
          eq(userPermissions.canRead, true)
        ));

      clientUsers.forEach(({ userId }) => recipients.push(userId));
    }

    // Financial notifications (invoices, payments)
    if (conditions.invoiceId || conditions.paymentId) {
      const financeUsers = await db
        .select({ userId: userPermissions.userId })
        .from(userPermissions)
        .where(and(
          eq(userPermissions.tenantId, tenantId),
          eq(userPermissions.module, 'finance'),
          eq(userPermissions.canRead, true)
        ));

      financeUsers.forEach(({ userId }) => recipients.push(userId));
    }

    return Array.from(new Set(recipients)); // Remove duplicates
  }

  // Get notifications for a user with filtering
  async getNotifications(filter: NotificationFilter): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
  }> {
    const { 
      userId, 
      tenantId, 
      types, 
      severities, 
      isRead, 
      dateFrom, 
      dateTo, 
      modules,
      limit = 50, 
      offset = 0 
    } = filter;

    // Build where conditions
    const conditions = [eq(notifications.tenantId, tenantId)];
    
    if (userId) {
      conditions.push(eq(notifications.userId, userId));
    }

    if (types && types.length > 0) {
      conditions.push(inArray(notifications.type, types as any));
    }

    if (severities && severities.length > 0) {
      conditions.push(inArray(notifications.severity, severities as any));
    }

    if (typeof isRead === 'boolean') {
      conditions.push(eq(notifications.isRead, isRead));
    }

    if (dateFrom) {
      conditions.push(gte(notifications.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(notifications.createdAt, new Date(dateTo)));
    }

    if (modules && modules.length > 0) {
      conditions.push(inArray(notifications.relatedModule, modules));
    }

    // Get notifications with pagination
    const notificationResults = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    // Get unread count for user
    const unreadResult = userId ? await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )) : [{ count: 0 }];

    return {
      notifications: notificationResults,
      total: totalResult[0]?.count || 0,
      unreadCount: unreadResult[0]?.count || 0
    };
  }

  // Mark notifications as read
  async markAsRead(notificationIds: number[], userId?: number): Promise<void> {
    const conditions = [inArray(notifications.id, notificationIds)];
    
    if (userId) {
      conditions.push(eq(notifications.userId, userId));
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(...conditions));
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: number, tenantId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.isRead, false)
      ));
  }

  // Get unread notification count for a user
  async getUnreadNotificationCount(userId: number, tenantId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.isRead, false)
      ));

    return result[0]?.count || 0;
  }

  // Update user notification preferences
  async updatePreferences(
    userId: number,
    tenantId: number,
    preferences: Partial<InsertNotificationPreference>[]
  ): Promise<void> {
    // Delete existing preferences for the user
    await db
      .delete(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.tenantId, tenantId)
      ));

    // Insert new preferences
    if (preferences.length > 0) {
      await db
        .insert(notificationPreferences)
        .values(preferences.map(pref => ({
          ...pref,
          userId,
          tenantId
        })));
    }

    // Invalidate cache
    cache.invalidateUserPreferences(userId);
  }

  // Process automatic notifications based on triggers
  async processTrigger(
    tenantId: number,
    module: string,
    event: string,
    entityData: any,
    userId?: number
  ): Promise<void> {
    const triggers = await cache.getTriggers(tenantId);
    
    const matchingTriggers = triggers.filter(trigger => 
      trigger.triggerModule === module && 
      trigger.triggerEvent === event &&
      this.evaluateTriggerConditions(trigger.triggerConditions, entityData)
    );

    for (const trigger of matchingTriggers) {
      const templateVariables = {
        ...entityData,
        user: userId ? await this.getUserInfo(userId) : null,
        timestamp: new Date().toISOString(),
        tenantId
      };

      const notificationData: CreateNotification = {
        tenantId,
        title: trigger.titleTemplate,
        messageBody: trigger.messageTemplate,
        linkUrl: trigger.linkTemplate,
        type: trigger.notificationType,
        severity: trigger.severity,
        deliveryChannels: JSON.parse(trigger.deliveryChannels || '["in_app"]'),
        deliveryDelay: trigger.deliveryDelay || 0,
        batchDelivery: trigger.batchDelivery || false,
        createdBy: userId,
        relatedModule: module,
        relatedEntityId: String(entityData.id || ''),
        templateVariables,
        ...this.parseRecipientConfig(trigger.recipientType, trigger.recipientConfig)
      };

      await this.createNotification(notificationData);
    }
  }

  // Evaluate trigger conditions
  private evaluateTriggerConditions(conditions: string | null, entityData: any): boolean {
    if (!conditions) return true;

    try {
      const conditionsObj = JSON.parse(conditions);
      // Simple condition evaluation - can be enhanced
      return Object.keys(conditionsObj).every(key => {
        const expectedValue = conditionsObj[key];
        const actualValue = entityData[key];
        
        if (typeof expectedValue === 'object' && expectedValue !== null) {
          // Handle operators like { "$gt": 100 }, { "$in": [1, 2, 3] }
          if (expectedValue.$gt !== undefined) return actualValue > expectedValue.$gt;
          if (expectedValue.$lt !== undefined) return actualValue < expectedValue.$lt;
          if (expectedValue.$in !== undefined) return expectedValue.$in.includes(actualValue);
          if (expectedValue.$ne !== undefined) return actualValue !== expectedValue.$ne;
        }
        
        return actualValue === expectedValue;
      });
    } catch {
      return true;
    }
  }

  // Parse recipient configuration with permission context
  private parseRecipientConfig(recipientType: string, recipientConfig: string): any {
    try {
      const config = JSON.parse(recipientConfig);
      
      switch (recipientType) {
        case 'specific_users':
          return { 
            userIds: config.userIds || [],
            module: config.module,
            requiredPermission: config.requiredPermission || 'read'
          };
        case 'role_based':
          return { 
            roleIds: config.roleIds || [],
            module: config.module,
            requiredPermission: config.requiredPermission || 'read'
          };
        case 'module_users':
          return {
            module: config.module,
            requiredPermission: config.requiredPermission || 'read'
          };
        case 'conditional':
          return { 
            conditionalRecipients: config,
            module: config.module,
            requiredPermission: config.requiredPermission || 'read'
          };
        case 'all_users':
          return {};
        default:
          return {};
      }
    } catch {
      return {};
    }
  }

  // Get user info for template variables
  private async getUserInfo(userId: number): Promise<any> {
    const user = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user[0] || null;
  }

  // Get notification statistics
  async getNotificationStats(tenantId: number, userId?: number): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    const conditions = [eq(notifications.tenantId, tenantId)];
    if (userId) {
      conditions.push(eq(notifications.userId, userId));
    }

    const [totalResult, unreadResult, byTypeResult, bySeverityResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(...conditions)),
      
      db.select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(...conditions, eq(notifications.isRead, false))),
      
      db.select({
        type: notifications.type,
        count: sql<number>`count(*)`
      })
        .from(notifications)
        .where(and(...conditions))
        .groupBy(notifications.type),
      
      db.select({
        severity: notifications.severity,
        count: sql<number>`count(*)`
      })
        .from(notifications)
        .where(and(...conditions))
        .groupBy(notifications.severity)
    ]);

    const byType: Record<string, number> = {};
    byTypeResult.forEach(row => {
      byType[row.type] = row.count;
    });

    const bySeverity: Record<string, number> = {};
    bySeverityResult.forEach(row => {
      bySeverity[row.severity] = row.count;
    });

    return {
      total: totalResult[0]?.count || 0,
      unread: unreadResult[0]?.count || 0,
      byType,
      bySeverity
    };
  }

  // Clear cache (useful for testing or manual cache invalidation)
  clearCache(): void {
    cache.clear();
  }
}

export const notificationService = new NotificationService();