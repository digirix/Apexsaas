import { NotificationService } from './notification-service';
import { storage } from '../storage';

/**
 * Comprehensive notification triggers for all notification types
 * Each trigger respects user preferences before creating notifications
 */
export class ComprehensiveNotificationTriggers {

  // Task-related notification triggers
  static async triggerTaskAssignment(tenantId: number, taskId: number, assignedUserId: number, assignedBy: number) {
    const task = await storage.getTask(taskId, tenantId);
    if (!task) return;

    await NotificationService.createNotification({
      tenantId,
      userId: assignedUserId,
      title: 'New Task Assigned',
      messageBody: `You have been assigned a new task: ${task.title}`,
      linkUrl: `/tasks/${taskId}`,
      type: 'TASK_ASSIGNMENT',
      severity: 'INFO',
      createdBy: assignedBy,
      relatedModule: 'tasks',
      relatedEntityId: taskId.toString()
    });
  }

  static async triggerTaskUpdate(tenantId: number, taskId: number, updatedBy: number) {
    const task = await storage.getTask(taskId, tenantId);
    if (!task) return;

    // Notify assignee if different from updater
    if (task.assignedUserId && task.assignedUserId !== updatedBy) {
      await NotificationService.createNotification({
        tenantId,
        userId: task.assignedUserId,
        title: 'Task Updated',
        messageBody: `Task "${task.title}" has been updated`,
        linkUrl: `/tasks/${taskId}`,
        type: 'TASK_UPDATE',
        severity: 'INFO',
        createdBy: updatedBy,
        relatedModule: 'tasks',
        relatedEntityId: taskId.toString()
      });
    }
  }

  static async triggerTaskCompleted(tenantId: number, taskId: number, completedBy: number) {
    const task = await storage.getTask(taskId, tenantId);
    if (!task) return;

    // Get all users who should be notified about task completion
    const users = await storage.getUsers(tenantId);
    const targetUserIds = users.filter(u => u.id !== completedBy).map(u => u.id);

    await NotificationService.createNotification({
      tenantId,
      userIds: targetUserIds,
      title: 'Task Completed',
      messageBody: `Task "${task.title}" has been completed`,
      linkUrl: `/tasks/${taskId}`,
      type: 'TASK_COMPLETED',
      severity: 'SUCCESS',
      createdBy: completedBy,
      relatedModule: 'tasks',
      relatedEntityId: taskId.toString()
    });
  }

  static async triggerTaskDueSoon(tenantId: number, taskId: number) {
    const task = await storage.getTask(taskId, tenantId);
    if (!task || !task.assignedUserId) return;

    await NotificationService.createNotification({
      tenantId,
      userId: task.assignedUserId,
      title: 'Task Due Soon',
      messageBody: `Task "${task.title}" is due soon`,
      linkUrl: `/tasks/${taskId}`,
      type: 'TASK_DUE_SOON',
      severity: 'WARNING',
      relatedModule: 'tasks',
      relatedEntityId: taskId.toString()
    });
  }

  static async triggerTaskOverdue(tenantId: number, taskId: number) {
    const task = await storage.getTask(taskId, tenantId);
    if (!task || !task.assignedUserId) return;

    await NotificationService.createNotification({
      tenantId,
      userId: task.assignedUserId,
      title: 'Task Overdue',
      messageBody: `Task "${task.title}" is overdue`,
      linkUrl: `/tasks/${taskId}`,
      type: 'TASK_OVERDUE',
      severity: 'CRITICAL',
      relatedModule: 'tasks',
      relatedEntityId: taskId.toString()
    });
  }

  static async triggerTaskStatusChanged(tenantId: number, taskId: number, newStatus: string, changedBy: number) {
    const task = await storage.getTask(taskId, tenantId);
    if (!task) return;

    const targetUserIds = [task.assignedUserId, task.createdBy].filter(id => id && id !== changedBy) as number[];

    if (targetUserIds.length > 0) {
      await NotificationService.createNotification({
        tenantId,
        userIds: targetUserIds,
        title: 'Task Status Changed',
        messageBody: `Task "${task.title}" status changed to ${newStatus}`,
        linkUrl: `/tasks/${taskId}`,
        type: 'TASK_STATUS_CHANGED',
        severity: 'INFO',
        createdBy: changedBy,
        relatedModule: 'tasks',
        relatedEntityId: taskId.toString()
      });
    }
  }

  static async triggerTaskApproved(tenantId: number, taskId: number, approvedBy: number) {
    const task = await storage.getTask(taskId, tenantId);
    if (!task || !task.assignedUserId) return;

    await NotificationService.createNotification({
      tenantId,
      userId: task.assignedUserId,
      title: 'Task Approved',
      messageBody: `Your task "${task.title}" has been approved`,
      linkUrl: `/tasks/${taskId}`,
      type: 'TASK_APPROVED',
      severity: 'SUCCESS',
      createdBy: approvedBy,
      relatedModule: 'tasks',
      relatedEntityId: taskId.toString()
    });
  }

  static async triggerTaskRejected(tenantId: number, taskId: number, rejectedBy: number, reason?: string) {
    const task = await storage.getTask(taskId, tenantId);
    if (!task || !task.assignedUserId) return;

    await NotificationService.createNotification({
      tenantId,
      userId: task.assignedUserId,
      title: 'Task Rejected',
      messageBody: `Your task "${task.title}" has been rejected${reason ? `: ${reason}` : ''}`,
      linkUrl: `/tasks/${taskId}`,
      type: 'TASK_REJECTED',
      severity: 'WARNING',
      createdBy: rejectedBy,
      relatedModule: 'tasks',
      relatedEntityId: taskId.toString()
    });
  }

  // Client-related notification triggers
  static async triggerClientCreated(tenantId: number, clientId: number, createdBy: number) {
    const client = await storage.getClient(clientId, tenantId);
    if (!client) return;

    const users = await storage.getUsers(tenantId);
    const targetUserIds = users.filter(u => u.id !== createdBy).map(u => u.id);

    await NotificationService.createNotification({
      tenantId,
      userIds: targetUserIds,
      title: 'New Client Added',
      messageBody: `New client "${client.displayName}" has been added`,
      linkUrl: `/clients/${clientId}`,
      type: 'CLIENT_CREATED',
      severity: 'INFO',
      createdBy: createdBy,
      relatedModule: 'clients',
      relatedEntityId: clientId.toString()
    });
  }

  static async triggerClientUpdated(tenantId: number, clientId: number, updatedBy: number) {
    const client = await storage.getClient(clientId, tenantId);
    if (!client) return;

    const users = await storage.getUsers(tenantId);
    const targetUserIds = users.filter(u => u.id !== updatedBy).map(u => u.id);

    await NotificationService.createNotification({
      tenantId,
      userIds: targetUserIds,
      title: 'Client Updated',
      messageBody: `Client "${client.displayName}" information has been updated`,
      linkUrl: `/clients/${clientId}`,
      type: 'CLIENT_UPDATED',
      severity: 'INFO',
      createdBy: updatedBy,
      relatedModule: 'clients',
      relatedEntityId: clientId.toString()
    });
  }

  // Invoice-related notification triggers
  static async triggerInvoiceGenerated(tenantId: number, invoiceId: number, generatedBy: number) {
    const invoice = await storage.getInvoice(invoiceId, tenantId);
    if (!invoice) return;

    const users = await storage.getUsers(tenantId);
    const targetUserIds = users.filter(u => u.id !== generatedBy).map(u => u.id);

    await NotificationService.createNotification({
      tenantId,
      userIds: targetUserIds,
      title: 'Invoice Generated',
      messageBody: `Invoice #${invoice.invoiceNumber} has been generated`,
      linkUrl: `/invoices/${invoiceId}`,
      type: 'INVOICE_GENERATED',
      severity: 'INFO',
      createdBy: generatedBy,
      relatedModule: 'invoices',
      relatedEntityId: invoiceId.toString()
    });
  }

  static async triggerInvoicePaid(tenantId: number, invoiceId: number, paidBy?: number) {
    const invoice = await storage.getInvoice(invoiceId, tenantId);
    if (!invoice) return;

    const users = await storage.getUsers(tenantId);
    const targetUserIds = users.map(u => u.id);

    await NotificationService.createNotification({
      tenantId,
      userIds: targetUserIds,
      title: 'Invoice Paid',
      messageBody: `Invoice #${invoice.invoiceNumber} has been paid`,
      linkUrl: `/invoices/${invoiceId}`,
      type: 'INVOICE_PAID',
      severity: 'SUCCESS',
      createdBy: paidBy,
      relatedModule: 'invoices',
      relatedEntityId: invoiceId.toString()
    });
  }

  static async triggerInvoiceOverdue(tenantId: number, invoiceId: number) {
    const invoice = await storage.getInvoice(invoiceId, tenantId);
    if (!invoice) return;

    const users = await storage.getUsers(tenantId);
    const targetUserIds = users.map(u => u.id);

    await NotificationService.createNotification({
      tenantId,
      userIds: targetUserIds,
      title: 'Invoice Overdue',
      messageBody: `Invoice #${invoice.invoiceNumber} is overdue`,
      linkUrl: `/invoices/${invoiceId}`,
      type: 'INVOICE_OVERDUE',
      severity: 'CRITICAL',
      relatedModule: 'invoices',
      relatedEntityId: invoiceId.toString()
    });
  }

  // User-related notification triggers
  static async triggerUserCreated(tenantId: number, userId: number, createdBy: number) {
    const user = await storage.getUser(userId);
    if (!user) return;

    const users = await storage.getUsers(tenantId);
    const targetUserIds = users.filter(u => u.id !== createdBy && u.id !== userId).map(u => u.id);

    await NotificationService.createNotification({
      tenantId,
      userIds: targetUserIds,
      title: 'New User Added',
      messageBody: `New user "${user.displayName}" has been added to the system`,
      linkUrl: `/users/${userId}`,
      type: 'USER_CREATED',
      severity: 'INFO',
      createdBy: createdBy,
      relatedModule: 'users',
      relatedEntityId: userId.toString()
    });
  }

  static async triggerUserDeactivated(tenantId: number, userId: number, deactivatedBy: number) {
    const user = await storage.getUser(userId);
    if (!user) return;

    const users = await storage.getUsers(tenantId);
    const targetUserIds = users.filter(u => u.id !== deactivatedBy && u.id !== userId).map(u => u.id);

    await NotificationService.createNotification({
      tenantId,
      userIds: targetUserIds,
      title: 'User Deactivated',
      messageBody: `User "${user.displayName}" has been deactivated`,
      linkUrl: `/users/${userId}`,
      type: 'USER_DEACTIVATED',
      severity: 'WARNING',
      createdBy: deactivatedBy,
      relatedModule: 'users',
      relatedEntityId: userId.toString()
    });
  }

  // System notification triggers
  static async triggerSystemMaintenance(tenantId: number, message: string, scheduledTime?: Date) {
    const users = await storage.getUsers(tenantId);
    const targetUserIds = users.map(u => u.id);

    await NotificationService.createNotification({
      tenantId,
      userIds: targetUserIds,
      title: 'System Maintenance',
      messageBody: message,
      type: 'SYSTEM_MAINTENANCE',
      severity: 'WARNING',
      relatedModule: 'system'
    });
  }

  static async triggerSecurityAlert(tenantId: number, message: string, severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'WARNING') {
    const users = await storage.getUsers(tenantId);
    const targetUserIds = users.map(u => u.id);

    await NotificationService.createNotification({
      tenantId,
      userIds: targetUserIds,
      title: 'Security Alert',
      messageBody: message,
      type: 'SECURITY_ALERT',
      severity,
      relatedModule: 'security'
    });
  }

  static async triggerBroadcast(tenantId: number, title: string, message: string, createdBy: number) {
    const users = await storage.getUsers(tenantId);
    const targetUserIds = users.filter(u => u.id !== createdBy).map(u => u.id);

    await NotificationService.createNotification({
      tenantId,
      userIds: targetUserIds,
      title,
      messageBody: message,
      type: 'BROADCAST',
      severity: 'INFO',
      createdBy,
      relatedModule: 'system'
    });
  }
}