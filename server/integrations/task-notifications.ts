import { NotificationService } from "../services/notification-service";

/**
 * Integration layer for creating notifications when tasks are modified
 */
export class TaskNotifications {
  /**
   * Create notification when a task is assigned to a user
   */
  static async notifyTaskAssignment(
    tenantId: number,
    taskId: number,
    taskTitle: string,
    assigneeId: number,
    assignedBy: number
  ) {
    if (assigneeId === assignedBy) {
      // Don't notify if user assigns task to themselves
      return;
    }

    await NotificationService.createNotification({
      tenantId,
      userId: assigneeId,
      title: `New task assigned: ${taskTitle}`,
      messageBody: `You have been assigned a new task: "${taskTitle}"`,
      linkUrl: `/tasks/${taskId}`,
      type: 'TASK_ASSIGNMENT',
      severity: 'INFO',
      createdBy: assignedBy,
      relatedModule: 'Tasks',
      relatedEntityId: taskId.toString()
    });
  }

  /**
   * Create notification when task status changes
   */
  static async notifyTaskStatusChange(
    tenantId: number,
    taskId: number,
    taskTitle: string,
    oldStatus: string,
    newStatus: string,
    assigneeId: number,
    updatedBy: number
  ) {
    if (assigneeId === updatedBy) {
      // Don't notify if user updates their own task
      return;
    }

    let severity: 'INFO' | 'SUCCESS' | 'WARNING' = 'INFO';
    let title = `Task status updated: ${taskTitle}`;
    let message = `Task "${taskTitle}" status changed from ${oldStatus} to ${newStatus}`;

    if (newStatus.toLowerCase() === 'completed') {
      severity = 'SUCCESS';
      title = `Task completed: ${taskTitle}`;
      message = `Your task "${taskTitle}" has been completed`;
    }

    await NotificationService.createNotification({
      tenantId,
      userId: assigneeId,
      title,
      messageBody: message,
      linkUrl: `/tasks/${taskId}`,
      type: 'TASK_UPDATE',
      severity,
      createdBy: updatedBy,
      relatedModule: 'Tasks',
      relatedEntityId: taskId.toString()
    });
  }
}