import { eq, and, desc, count, sql } from "drizzle-orm";
import { db } from "../db";
import { notifications, users, notificationPreferences, type InsertNotification, type Notification, type NotificationPreference } from "../../shared/schema";

export interface CreateNotificationData {
  tenantId: number;
  userId?: number;
  userIds?: number[];
  title: string;
  messageBody: string;
  linkUrl?: string;
  type: string;
  severity?: string;
  createdBy?: number;
  relatedModule?: string;
  relatedEntityId?: string;
  templateVariables?: Record<string, any>;
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: string;
  severity?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface NotificationOptions {
  page?: number;
  limit?: number;
  filters?: NotificationFilters;
  sortBy?: 'createdAt' | 'readAt';
  sortOrder?: 'asc' | 'desc';
}

export class NotificationService {
  /**
   * Create a notification for one or more users
   * Only creates notifications for users who have this notification type enabled
   */
  static async createNotification(data: CreateNotificationData): Promise<Notification[]> {
    const {
      tenantId,
      userId,
      userIds,
      title,
      messageBody,
      linkUrl,
      type,
      severity = 'INFO',
      createdBy,
      relatedModule,
      relatedEntityId,
      templateVariables
    } = data;

    // Determine target user IDs
    let targetUserIds: number[] = [];
    
    if (userId) {
      targetUserIds = [userId];
    } else if (userIds && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      throw new Error('Either userId or userIds must be provided');
    }

    // Filter users based on notification preferences
    const eligibleUserIds = await this.filterUsersByPreferences(tenantId, targetUserIds, type);
    
    if (eligibleUserIds.length === 0) {
      console.log(`No users have ${type} notifications enabled. Skipping notification creation.`);
      return [];
    }

    // Create notifications for eligible users only
    const notificationsData: InsertNotification[] = eligibleUserIds.map(uid => ({
      tenantId,
      userId: uid,
      title,
      messageBody,
      linkUrl,
      type: type as any,
      severity: severity as any,
      createdBy,
      relatedModule,
      relatedEntityId,
      templateVariables: templateVariables ? JSON.stringify(templateVariables) : undefined
    }));

    const createdNotifications = await db.insert(notifications)
      .values(notificationsData)
      .returning();

    console.log(`Created ${createdNotifications.length} notifications of type ${type} for eligible users`);

    // Emit WebSocket events for real-time updates
    for (const notification of createdNotifications) {
      this.emitNotificationEvent(notification);
    }

    return createdNotifications;
  }

  /**
   * Filter users based on their notification preferences
   */
  private static async filterUsersByPreferences(
    tenantId: number, 
    userIds: number[], 
    notificationType: string
  ): Promise<number[]> {
    try {
      console.log(`DEBUG: Filtering users for notification type ${notificationType} in tenant ${tenantId}`);
      console.log(`DEBUG: Target user IDs: ${userIds.join(', ')}`);
      
      // Get notification preferences for all users
      const preferences = await db.select()
        .from(notificationPreferences)
        .where(and(
          eq(notificationPreferences.tenantId, tenantId),
          eq(notificationPreferences.notificationType, notificationType as any)
        ));

      console.log(`DEBUG: Found ${preferences.length} preferences for type ${notificationType}`);
      preferences.forEach(pref => {
        console.log(`DEBUG: User ${pref.userId} has ${notificationType} preference: enabled=${pref.isEnabled}`);
      });

      // Create a map of user preferences
      const userPreferencesMap = new Map<number, boolean>();
      preferences.forEach(pref => {
        userPreferencesMap.set(pref.userId, pref.isEnabled);
      });

      // Filter users: include only those with enabled preferences or no preferences (default enabled)
      const eligibleUsers = userIds.filter(userId => {
        const hasPreference = userPreferencesMap.has(userId);
        if (hasPreference) {
          const isEnabled = userPreferencesMap.get(userId) === true;
          console.log(`DEBUG: User ${userId} has explicit preference: enabled=${isEnabled}`);
          return isEnabled;
        } else {
          // If no preference exists, default to enabled (this handles new users)
          console.log(`DEBUG: User ${userId} has no explicit preference, defaulting to enabled`);
          return true;
        }
      });

      console.log(`DEBUG: Notification ${notificationType}: ${eligibleUsers.length}/${userIds.length} users eligible`);
      console.log(`DEBUG: Eligible users: ${eligibleUsers.join(', ')}`);
      return eligibleUsers;
    } catch (error) {
      console.error('Error filtering users by preferences:', error);
      // If there's an error, fall back to all users to avoid breaking notifications
      return userIds;
    }
  }

  /**
   * Get notifications for a specific user with pagination and filtering
   */
  static async getNotificationsForUser(
    userId: number,
    tenantId: number,
    options: NotificationOptions = {}
  ): Promise<{ notifications: Notification[]; total: number; hasMore: boolean }> {
    const {
      page = 1,
      limit = 20,
      filters = {},
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions = and(
      eq(notifications.userId, userId),
      eq(notifications.tenantId, tenantId)
    );

    if (filters.isRead !== undefined) {
      whereConditions = and(whereConditions, eq(notifications.isRead, filters.isRead));
    }

    if (filters.type) {
      whereConditions = and(whereConditions, eq(notifications.type, filters.type as any));
    }

    if (filters.severity) {
      whereConditions = and(whereConditions, eq(notifications.severity, filters.severity as any));
    }

    if (filters.dateFrom) {
      whereConditions = and(whereConditions, sql`${notifications.createdAt} >= ${filters.dateFrom}`);
    }

    if (filters.dateTo) {
      whereConditions = and(whereConditions, sql`${notifications.createdAt} <= ${filters.dateTo}`);
    }

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(notifications)
      .where(whereConditions);

    const total = totalResult[0]?.count || 0;

    // Get notifications
    const orderColumn = sortBy === 'readAt' ? notifications.readAt : notifications.createdAt;
    const orderDirection = sortOrder === 'asc' ? orderColumn : desc(orderColumn);

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(whereConditions)
      .orderBy(orderDirection)
      .limit(limit)
      .offset(offset);

    const hasMore = offset + userNotifications.length < total;

    return {
      notifications: userNotifications,
      total,
      hasMore
    };
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadNotificationCount(userId: number, tenantId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.tenantId, tenantId),
          eq(notifications.isRead, false)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Mark a notification as read
   */
  static async markNotificationAsRead(
    notificationId: number,
    userId: number,
    tenantId: number
  ): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
          eq(notifications.tenantId, tenantId)
        )
      )
      .returning();

    return result.length > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllNotificationsAsRead(userId: number, tenantId: number): Promise<number> {
    const result = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.tenantId, tenantId),
          eq(notifications.isRead, false)
        )
      )
      .returning();

    return result.length;
  }

  /**
   * Create task assignment notification
   */
  static async createTaskNotification(
    tenantId: number,
    assigneeId: number,
    title: string,
    message: string,
    taskId: number,
    createdBy?: number
  ): Promise<void> {
    await this.createNotification({
      tenantId,
      userId: assigneeId,
      title,
      messageBody: message,
      linkUrl: `/tasks/${taskId}`,
      type: 'TASK_ASSIGNMENT',
      severity: 'INFO',
      createdBy,
      relatedModule: 'Tasks',
      relatedEntityId: taskId.toString()
    });
  }

  /**
   * Create mention notification
   */
  static async createMentionNotification(
    tenantId: number,
    mentionedUserId: number,
    title: string,
    message: string,
    linkUrl: string,
    createdBy?: number
  ): Promise<void> {
    await this.createNotification({
      tenantId,
      userId: mentionedUserId,
      title,
      messageBody: message,
      linkUrl,
      type: 'MENTION',
      severity: 'INFO',
      createdBy,
      relatedModule: 'Tasks'
    });
  }

  /**
   * Create broadcast notification for all users in tenant
   */
  static async createBroadcastNotification(
    tenantId: number,
    title: string,
    message: string,
    linkUrl?: string,
    createdBy?: number
  ): Promise<void> {
    // Get all users in the tenant
    const tenantUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    const userIds = tenantUsers.map(user => user.id);

    if (userIds.length > 0) {
      await this.createNotification({
        tenantId,
        userIds,
        title,
        messageBody: message,
        linkUrl,
        type: 'BROADCAST',
        severity: 'INFO',
        createdBy
      });
    }
  }

  /**
   * Emit WebSocket event for real-time notification
   */
  private static emitNotificationEvent(notification: Notification): void {
    // This will be implemented when WebSocket is set up
    // For now, we'll just log it
    console.log(`New notification for user ${notification.userId}:`, notification.title);
  }

  /**
   * Process @mentions in text and create notifications
   */
  static async processMentions(
    text: string,
    tenantId: number,
    contextTitle: string,
    contextUrl: string,
    createdBy?: number
  ): Promise<void> {
    const mentionRegex = /@(\w+)/g;
    const mentions = text.match(mentionRegex);

    if (!mentions) return;

    // Extract usernames (remove @ symbol)
    const usernames = mentions.map(mention => mention.substring(1));

    // Find users by username/displayName
    const mentionedUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          sql`LOWER(${users.displayName}) = ANY(${usernames.map(u => u.toLowerCase())})`
        )
      );

    // Create mention notifications
    for (const user of mentionedUsers) {
      await this.createMentionNotification(
        tenantId,
        user.id,
        `You were mentioned in ${contextTitle}`,
        `You were mentioned in: ${contextTitle}`,
        contextUrl,
        createdBy
      );
    }
  }
}