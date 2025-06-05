import { NotificationService } from "../services/notification-service";

/**
 * Helper functions for creating common notifications throughout the application
 */

export class NotificationHelpers {
  /**
   * Create task assignment notification
   */
  static async notifyTaskAssignment(
    tenantId: number,
    assigneeId: number,
    taskTitle: string,
    taskId: number,
    assignedBy?: number
  ) {
    await NotificationService.createTaskNotification(
      tenantId,
      assigneeId,
      `New task assigned: ${taskTitle}`,
      `You have been assigned a new task: ${taskTitle}`,
      taskId,
      assignedBy
    );
  }

  /**
   * Create task completion notification
   */
  static async notifyTaskCompletion(
    tenantId: number,
    creatorId: number,
    taskTitle: string,
    taskId: number,
    completedBy: number
  ) {
    await NotificationService.createNotification({
      tenantId,
      userId: creatorId,
      title: `Task completed: ${taskTitle}`,
      messageBody: `Your task "${taskTitle}" has been completed.`,
      linkUrl: `/tasks/${taskId}`,
      type: 'TASK_COMPLETED',
      severity: 'SUCCESS',
      createdBy: completedBy,
      relatedModule: 'Tasks',
      relatedEntityId: taskId.toString()
    });
  }

  /**
   * Create workflow approval notification
   */
  static async notifyWorkflowApproval(
    tenantId: number,
    approverIds: number[],
    workflowName: string,
    workflowId: string,
    linkUrl?: string
  ) {
    await NotificationService.createNotification({
      tenantId,
      userIds: approverIds,
      title: `Approval required: ${workflowName}`,
      messageBody: `A workflow requires your approval: ${workflowName}`,
      linkUrl: linkUrl || `/workflows/${workflowId}`,
      type: 'WORKFLOW_APPROVAL',
      severity: 'WARNING',
      relatedModule: 'Workflows',
      relatedEntityId: workflowId
    });
  }

  /**
   * Create client message notification
   */
  static async notifyClientMessage(
    tenantId: number,
    recipientIds: number[],
    clientName: string,
    messageSubject: string,
    clientId: number
  ) {
    await NotificationService.createNotification({
      tenantId,
      userIds: recipientIds,
      title: `Message from ${clientName}`,
      messageBody: `${clientName} sent a message: ${messageSubject}`,
      linkUrl: `/clients/${clientId}/messages`,
      type: 'CLIENT_MESSAGE',
      severity: 'INFO',
      relatedModule: 'Clients',
      relatedEntityId: clientId.toString()
    });
  }

  /**
   * Create invoice payment notification
   */
  static async notifyInvoicePayment(
    tenantId: number,
    creatorId: number,
    invoiceNumber: string,
    amount: string,
    invoiceId: number
  ) {
    await NotificationService.createNotification({
      tenantId,
      userId: creatorId,
      title: `Invoice paid: ${invoiceNumber}`,
      messageBody: `Invoice ${invoiceNumber} has been paid - Amount: $${amount}`,
      linkUrl: `/finance/invoices/${invoiceId}`,
      type: 'INVOICE_PAID',
      severity: 'SUCCESS',
      relatedModule: 'Finance',
      relatedEntityId: invoiceId.toString()
    });
  }

  /**
   * Create system alert notification
   */
  static async notifySystemAlert(
    tenantId: number,
    message: string,
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' = 'WARNING',
    linkUrl?: string
  ) {
    // Get all admin users for the tenant
    // This would need to be implemented based on your user roles system
    await NotificationService.createBroadcastNotification(
      tenantId,
      'System Alert',
      message,
      linkUrl
    );
  }
}