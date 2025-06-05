import { storage } from '../storage';

export class SimpleNotificationService {
  private storage: typeof storage;

  constructor(storageInstance: typeof storage) {
    this.storage = storageInstance;
  }

  async createTaskNotification(params: {
    tenantId: number;
    userId: number;
    type: 'TASK_ASSIGNMENT' | 'TASK_UPDATE' | 'TASK_COMPLETED' | 'TASK_STATUS_CHANGED';
    title: string;
    message: string;
    taskId: number;
    currentUserId?: number;
  }) {
    try {
      // Don't send notification to the user who performed the action
      if (params.currentUserId && params.userId === params.currentUserId) {
        return;
      }

      await this.storage.createNotification({
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        severity: 'INFO',
        linkUrl: `/tasks/${params.taskId}`,
        isRead: false
      });

      console.log(`Notification created: ${params.type} for user ${params.userId}`);
    } catch (error) {
      console.error('Error creating task notification:', error);
    }
  }

  async handleTaskStatusChange(taskId: number, oldTask: any, newTask: any, currentUserId: number) {
    if (!oldTask || !newTask || oldTask.statusId === newTask.statusId) {
      return;
    }

    try {
      // Get task statuses to show meaningful names
      const oldStatus = await this.storage.getTaskStatus(oldTask.statusId, newTask.tenantId);
      const newStatus = await this.storage.getTaskStatus(newTask.statusId, newTask.tenantId);

      // Notify assignee about status change
      if (newTask.assigneeId && newTask.assigneeId !== currentUserId) {
        await this.createTaskNotification({
          tenantId: newTask.tenantId,
          userId: newTask.assigneeId,
          type: 'TASK_STATUS_CHANGED',
          title: 'Task Status Updated',
          message: `Task "${newTask.taskDetails}" status changed from "${oldStatus?.name || 'Unknown'}" to "${newStatus?.name || 'Unknown'}"`,
          taskId: taskId,
          currentUserId
        });
      }

      // Check if task was completed
      if (newStatus?.name?.toLowerCase().includes('completed') || newStatus?.name?.toLowerCase().includes('done')) {
        await this.handleTaskCompletion(taskId, newTask, currentUserId);
      }
    } catch (error) {
      console.error('Error handling task status change notification:', error);
    }
  }

  async handleTaskAssignment(taskId: number, task: any, currentUserId: number) {
    if (!task.assigneeId || task.assigneeId === currentUserId) {
      return;
    }

    try {
      await this.createTaskNotification({
        tenantId: task.tenantId,
        userId: task.assigneeId,
        type: 'TASK_ASSIGNMENT',
        title: 'New Task Assigned',
        message: `You have been assigned task: "${task.taskDetails}"`,
        taskId: taskId,
        currentUserId
      });
    } catch (error) {
      console.error('Error handling task assignment notification:', error);
    }
  }

  async handleTaskCompletion(taskId: number, task: any, currentUserId: number) {
    try {
      // Get all users in tenant who might be interested (managers, supervisors)
      const users = await this.storage.getUsers(task.tenantId);
      const notifyUsers = users.filter(user => 
        user.id !== currentUserId && 
        (user.isSuperAdmin || user.designationId) // Notify admins and users with designations
      );

      for (const user: any of notifyUsers) {
        await this.createTaskNotification({
          tenantId: task.tenantId,
          userId: user.id,
          type: 'TASK_COMPLETED',
          title: 'Task Completed',
          message: `Task "${task.taskDetails}" has been completed`,
          taskId: taskId,
          currentUserId
        });
      }
    } catch (error) {
      console.error('Error handling task completion notification:', error);
    }
  }

  async handleTaskUpdate(taskId: number, oldTask: any, newTask: any, currentUserId: number) {
    try {
      // Handle status changes
      if (oldTask.statusId !== newTask.statusId) {
        await this.handleTaskStatusChange(taskId, oldTask, newTask, currentUserId);
      }

      // Handle assignment changes
      if (oldTask.assigneeId !== newTask.assigneeId && newTask.assigneeId) {
        await this.handleTaskAssignment(taskId, newTask, currentUserId);
      }

      // Handle other significant updates
      const hasSignificantChanges = 
        oldTask.taskDetails !== newTask.taskDetails ||
        oldTask.dueDate?.getTime() !== newTask.dueDate?.getTime() ||
        oldTask.clientId !== newTask.clientId;

      if (hasSignificantChanges && newTask.assigneeId && newTask.assigneeId !== currentUserId) {
        await this.createTaskNotification({
          tenantId: newTask.tenantId,
          userId: newTask.assigneeId,
          type: 'TASK_UPDATE',
          title: 'Task Updated',
          message: `Task "${newTask.taskDetails}" has been updated`,
          taskId: taskId,
          currentUserId
        });
      }
    } catch (error) {
      console.error('Error handling task update notification:', error);
    }
  }
}