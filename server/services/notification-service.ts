import { eq, and, desc, count } from "drizzle-orm";
import { db } from "../db";
import { notifications, users, type CreateNotification, type InsertNotification } from "@shared/schema";

export class NotificationService {
  /**
   * Create a notification for specific users
   */
  static async createNotification(data: CreateNotification): Promise<void> {
    const { userIds, tenantId, ...notificationData } = data;
    
    let targetUserIds: number[] = [];

    // If specific user IDs are provided, use them
    if (userIds && userIds.length > 0) {
      targetUserIds = userIds;
    }

    // If no users specified, throw error
    if (targetUserIds.length === 0) {
      throw new Error("No target users specified for notification");
    }

    // Create notification records for each user
    const notificationRecords: InsertNotification[] = targetUserIds.map(userId => ({
      tenantId,
      userId,
      ...notificationData
    }));

    await db.insert(notifications).values(notificationRecords);
    
    console.log(`Created ${notificationRecords.length} notifications for tenant ${tenantId}`);
  }

  /**
   * Get notifications for a specific user with pagination and filtering
   */
  static async getNotificationsForUser(
    userId: number, 
    tenantId: number, 
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {}
  ) {
    const { limit = 20, offset = 0, unreadOnly = false, type } = options;

    let whereConditions = and(
      eq(notifications.userId, userId),
      eq(notifications.tenantId, tenantId)
    );

    if (unreadOnly) {
      whereConditions = and(whereConditions, eq(notifications.isRead, false));
    }

    if (type) {
      whereConditions = and(whereConditions, eq(notifications.type, type as any));
    }

    const result = await db
      .select()
      .from(notifications)
      .where(whereConditions)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return result;
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
   * Mark a specific notification as read
   */
  static async markNotificationAsRead(
    notificationId: number, 
    userId: number, 
    tenantId: number
  ): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
          eq(notifications.tenantId, tenantId)
        )
      );

    return result.rowCount > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllNotificationsAsRead(userId: number, tenantId: number): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.tenantId, tenantId),
          eq(notifications.isRead, false)
        )
      );

    return result.rowCount || 0;
  }

  /**
   * Delete a notification (optional - currently unused)
   */
  static async deleteNotification(
    notificationId: number, 
    userId: number, 
    tenantId: number
  ): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
          eq(notifications.tenantId, tenantId)
        )
      );

    return result.rowCount > 0;
  }

  /**
   * Create a system notification for workflow alerts
   */
  static async createWorkflowNotification(
    tenantId: number,
    userIds: number[],
    title: string,
    message: string,
    workflowId?: number,
    createdBy?: number
  ): Promise<void> {
    await this.createNotification({
      tenantId,
      userIds,
      title,
      messageBody: message,
      type: 'WORKFLOW_ALERT',
      severity: 'INFO',
      createdBy,
      relatedModule: 'Workflows',
      relatedEntityId: workflowId?.toString(),
      linkUrl: workflowId ? `/workflow/${workflowId}` : '/workflow'
    });
  }

  /**
   * Create a task assignment notification
   */
  static async createTaskNotification(
    tenantId: number,
    assignedUserId: number,
    title: string,
    message: string,
    taskId: number,
    createdBy?: number
  ): Promise<void> {
    await this.createNotification({
      tenantId,
      userIds: [assignedUserId],
      title,
      messageBody: message,
      type: 'TASK_ASSIGNMENT',
      severity: 'INFO',
      createdBy,
      relatedModule: 'Tasks',
      relatedEntityId: taskId.toString(),
      linkUrl: `/tasks/${taskId}`
    });
  }
}