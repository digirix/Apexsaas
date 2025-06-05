import { NotificationService } from '../services/notification-service';
import { IStorage } from '../storage';

interface TaskNotificationContext {
  taskId: number;
  tenantId: number;
  currentUserId: number;
  assigneeId?: number;
  previousAssigneeId?: number;
  statusId?: number;
  previousStatusId?: number;
  taskDetails: string;
  clientId?: number;
  entityId?: number;
}

export class TaskNotificationIntegration {
  constructor(
    private storage: IStorage
  ) {}

  async handleTaskCreated(context: TaskNotificationContext) {
    const { taskId, tenantId, currentUserId, assigneeId, taskDetails } = context;

    // Only send notification if task is assigned to someone other than the creator
    if (assigneeId && assigneeId !== currentUserId) {
      try {
        const assignee = await this.storage.getUser(assigneeId, tenantId);
        if (assignee) {
          await this.notificationService.createNotification({
            tenantId,
            userId: assigneeId,
            title: 'New Task Assigned',
            messageBody: `You have been assigned a new task: "${taskDetails}"`,
            type: 'TASK_ASSIGNMENT',
            severity: 'INFO',
            linkUrl: `/tasks/${taskId}`,
            deliveryChannels: ['in_app'],
            createdBy: currentUserId,
            relatedModule: 'tasks',
            relatedEntityId: taskId
          });
        }
      } catch (error) {
        console.error('Failed to send task assignment notification:', error);
      }
    }
  }

  async handleTaskUpdated(context: TaskNotificationContext) {
    const { 
      taskId, 
      tenantId, 
      currentUserId, 
      assigneeId, 
      previousAssigneeId, 
      statusId,
      previousStatusId,
      taskDetails 
    } = context;

    // Handle assignee change
    if (assigneeId !== previousAssigneeId) {
      // Notify new assignee
      if (assigneeId && assigneeId !== currentUserId) {
        try {
          const assignee = await this.storage.getUser(assigneeId);
          if (assignee) {
            await NotificationService.createNotification({
              tenantId,
              userId: assigneeId,
              title: 'Task Assigned to You',
              messageBody: `You have been assigned to task: "${taskDetails}"`,
              type: 'TASK_ASSIGNMENT',
              severity: 'INFO',
              linkUrl: `/tasks/${taskId}`,
              deliveryChannels: ['in_app'],
              createdBy: currentUserId,
              relatedModule: 'tasks',
              relatedEntityId: taskId
            });
          }
        } catch (error) {
          console.error('Failed to send task reassignment notification:', error);
        }
      }

      // Notify previous assignee about removal (if different from current user)
      if (previousAssigneeId && previousAssigneeId !== currentUserId && previousAssigneeId !== assigneeId) {
        try {
          const previousAssignee = await this.storage.getUser(previousAssigneeId);
          if (previousAssignee) {
            await NotificationService.createNotification({
              tenantId,
              userId: previousAssigneeId,
              title: 'Task Reassigned',
              messageBody: `Task "${taskDetails}" has been reassigned to someone else`,
              type: 'TASK_UPDATE',
              severity: 'INFO',
              linkUrl: `/tasks/${taskId}`,
              deliveryChannels: ['in_app'],
              createdBy: currentUserId,
              relatedModule: 'tasks',
              relatedEntityId: taskId
            });
          }
        } catch (error) {
          console.error('Failed to send task reassignment notification:', error);
        }
      }
    }

    // Handle status change
    if (statusId !== previousStatusId && statusId && previousStatusId) {
      try {
        const [currentStatus, previousStatus] = await Promise.all([
          this.storage.getTaskStatus(statusId, tenantId),
          this.storage.getTaskStatus(previousStatusId, tenantId)
        ]);

        if (currentStatus && previousStatus && assigneeId && assigneeId !== currentUserId) {
          const assignee = await this.storage.getUser(assigneeId);
          if (assignee) {
            await NotificationService.createNotification({
              tenantId,
              userId: assigneeId,
              title: 'Task Status Updated',
              messageBody: `Task "${taskDetails}" status changed from "${previousStatus.name}" to "${currentStatus.name}"`,
              type: 'TASK_UPDATE',
              severity: 'INFO',
              linkUrl: `/tasks/${taskId}`,
              deliveryChannels: ['in_app'],
              createdBy: currentUserId,
              relatedModule: 'tasks',
              relatedEntityId: taskId
            });
          }
        }

        // Check if task is completed
        if (currentStatus?.name.toLowerCase() === 'completed') {
          await this.handleTaskCompleted(context);
        }
      } catch (error) {
        console.error('Failed to send task status change notification:', error);
      }
    }
  }

  async handleTaskCompleted(context: TaskNotificationContext) {
    const { taskId, tenantId, currentUserId, assigneeId, taskDetails } = context;

    // Notify task creator if different from completer and assignee
    try {
      const task = await this.storage.getTask(taskId, tenantId);
      if (task && task.assigneeId && task.assigneeId !== currentUserId) {
        // Also try to find the task creator/manager
        // For now, we'll notify the assignee if they didn't complete it themselves
        const assignee = await this.storage.getUser(task.assigneeId);
        if (assignee) {
          await NotificationService.createNotification({
            tenantId,
            userId: task.assigneeId,
            title: 'Task Completed',
            messageBody: `Task "${taskDetails}" has been marked as completed`,
            type: 'TASK_COMPLETED',
            severity: 'SUCCESS',
            linkUrl: `/tasks/${taskId}`,
            deliveryChannels: ['in_app'],
            createdBy: currentUserId,
            relatedModule: 'tasks',
            relatedEntityId: taskId
          });
        }
      }
    } catch (error) {
      console.error('Failed to send task completion notification:', error);
    }
  }

  async handleTaskDeleted(context: TaskNotificationContext) {
    const { taskId, tenantId, currentUserId, assigneeId, taskDetails } = context;

    // Notify assignee if task is deleted by someone else
    if (assigneeId && assigneeId !== currentUserId) {
      try {
        const assignee = await this.storage.getUser(assigneeId, tenantId);
        if (assignee) {
          await this.notificationService.createNotification({
            tenantId,
            userId: assigneeId,
            title: 'Task Deleted',
            messageBody: `Task "${taskDetails}" has been deleted`,
            type: 'TASK_UPDATE',
            severity: 'WARNING',
            linkUrl: '/tasks',
            deliveryChannels: ['in_app'],
            createdBy: currentUserId,
            relatedModule: 'tasks',
            relatedEntityId: taskId
          });
        }
      } catch (error) {
        console.error('Failed to send task deletion notification:', error);
      }
    }
  }
}