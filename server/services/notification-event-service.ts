import { notificationService } from './notification-service';
import { IStorage } from '../storage';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { notificationTriggers, notifications } from '@shared/schema';

export interface NotificationEvent {
  tenantId: number;
  module: string;
  event: string;
  entityData: any;
  userId?: number;
  metadata?: any;
}

class NotificationEventService {
  // Process a notification event based on configured triggers
  async processEvent(eventKey: string, eventData: any): Promise<void> {
    try {
      const [module, event] = eventKey.split('.');
      console.log(`[NotificationEvent] Processing event: ${eventKey}`, {
        tenantId: eventData.tenantId,
        taskId: eventData.taskId,
        userId: eventData.userId
      });

      // Find matching notification triggers for this event
      const triggers = await db
        .select()
        .from(notificationTriggers)
        .where(
          and(
            eq(notificationTriggers.tenantId, eventData.tenantId),
            eq(notificationTriggers.triggerModule, module),
            eq(notificationTriggers.triggerEvent, event),
            eq(notificationTriggers.isActive, true)
          )
        );

      console.log(`[NotificationEvent] Found ${triggers.length} triggers for ${eventKey}`);

      // Process each trigger
      for (const trigger of triggers) {
        try {
          await this.executeTrigger(trigger, eventData);
        } catch (triggerError) {
          console.error(`[NotificationEvent] Failed to execute trigger ${trigger.id}:`, triggerError);
        }
      }

      console.log(`[NotificationEvent] Event processed: ${eventKey}`);
    } catch (error) {
      console.error(`[NotificationEvent] Failed to process event ${eventKey}:`, error);
    }
  }

  // Execute a specific notification trigger
  private async executeTrigger(trigger: any, eventData: any): Promise<void> {
    console.log(`[NotificationEvent] Executing trigger: ${trigger.name}`);

    // Parse recipient configuration
    const recipientConfig = JSON.parse(trigger.recipientConfig || '{}');
    const deliveryChannels = JSON.parse(trigger.deliveryChannels || '[]');

    // Determine recipients based on trigger configuration
    const recipients = await this.resolveRecipients(trigger, eventData, recipientConfig);

    console.log(`[NotificationEvent] Resolved ${recipients.length} recipients for trigger ${trigger.name}`);

    // Create notifications for each recipient
    for (const recipientId of recipients) {
      // Skip if recipient is the current user and excludeCurrentUser is true
      if (recipientConfig.excludeCurrentUser && recipientId === eventData.userId) {
        continue;
      }

      try {
        // Process message template
        const processedTitle = this.processTemplate(trigger.titleTemplate, eventData);
        const processedMessage = this.processTemplate(trigger.messageTemplate, eventData);
        const processedLink = trigger.linkTemplate ? this.processTemplate(trigger.linkTemplate, eventData) : null;

        // Create the notification
        await db.insert(notifications).values({
          tenantId: eventData.tenantId,
          userId: recipientId,
          title: processedTitle,
          messageBody: processedMessage,
          linkUrl: processedLink,
          type: trigger.notificationType,
          severity: trigger.severity,
          createdBy: eventData.userId || trigger.createdBy,
          relatedModule: trigger.triggerModule,
          relatedEntityId: eventData.taskId?.toString() || null,
          isRead: false
        });

        console.log(`[NotificationEvent] Created notification for user ${recipientId}: ${processedTitle}`);
      } catch (notifError) {
        console.error(`[NotificationEvent] Failed to create notification for user ${recipientId}:`, notifError);
      }
    }
  }

  // Resolve recipients based on trigger configuration
  private async resolveRecipients(trigger: any, eventData: any, recipientConfig: any): Promise<number[]> {
    const recipients: Set<number> = new Set();

    // Handle different recipient types
    if (trigger.recipientType === 'task_assignee' || trigger.recipientType === 'task_stakeholders') {
      // Include the assignee if specified
      if (recipientConfig.includeAssignee && eventData.assigneeId) {
        recipients.add(eventData.assigneeId);
      }

      // Include new assignee for assignment events
      if (recipientConfig.includeNewAssignee && eventData.newAssigneeId) {
        recipients.add(eventData.newAssigneeId);
      }

      // Include task creator if specified
      if (recipientConfig.includeCreator) {
        // For now, we'll include the user who created the notification trigger
        // In a full implementation, you'd track task creators
        recipients.add(trigger.createdBy);
      }
    }

    return Array.from(recipients);
  }

  // Process template variables
  private processTemplate(template: string, eventData: any): string {
    let processed = template;

    // Replace common variables
    processed = processed.replace(/{{taskDetails}}/g, eventData.taskDetails || `Task #${eventData.taskId}`);
    processed = processed.replace(/{{id}}/g, eventData.taskId?.toString() || '');
    processed = processed.replace(/{{taskId}}/g, eventData.taskId?.toString() || '');

    return processed;
  }

  // Emit a notification event that triggers configured notifications
  async emitEvent(event: NotificationEvent): Promise<void> {
    try {
      console.log(`[NotificationEvent] Emitting event: ${event.module}.${event.event}`, {
        tenantId: event.tenantId,
        entityId: event.entityData?.id,
        userId: event.userId
      });

      // Process the event through the notification service trigger system
      await notificationService.processTrigger(
        event.tenantId,
        event.module,
        event.event,
        event.entityData,
        event.userId
      );

      console.log(`[NotificationEvent] Event processed: ${event.module}.${event.event}`);
    } catch (error) {
      console.error(`[NotificationEvent] Failed to process event ${event.module}.${event.event}:`, error);
    }
  }

  // Task-related events
  async emitTaskEvent(
    tenantId: number,
    eventType: 'created' | 'updated' | 'completed' | 'assigned' | 'status_changed',
    taskData: any,
    userId?: number,
    previousData?: any
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'tasks',
      event: eventType,
      entityData: {
        ...taskData,
        previousData
      },
      userId
    };

    await this.emitEvent(event);
  }

  // Client-related events
  async emitClientEvent(
    tenantId: number,
    eventType: 'created' | 'updated' | 'deleted',
    clientData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'clients',
      event: eventType,
      entityData: clientData,
      userId
    };

    await this.emitEvent(event);
  }

  // Entity-related events
  async emitEntityEvent(
    tenantId: number,
    eventType: 'created' | 'updated' | 'deleted',
    entityData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'entities',
      event: eventType,
      entityData,
      userId
    };

    await this.emitEvent(event);
  }

  // Invoice-related events
  async emitInvoiceEvent(
    tenantId: number,
    eventType: 'created' | 'sent' | 'paid' | 'overdue',
    invoiceData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'finance',
      event: `invoice_${eventType}`,
      entityData: invoiceData,
      userId
    };

    await this.emitEvent(event);
  }

  // Payment-related events
  async emitPaymentEvent(
    tenantId: number,
    eventType: 'received' | 'failed' | 'refunded',
    paymentData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'finance',
      event: `payment_${eventType}`,
      entityData: paymentData,
      userId
    };

    await this.emitEvent(event);
  }

  // User-related events
  async emitUserEvent(
    tenantId: number,
    eventType: 'created' | 'updated' | 'login' | 'permission_changed',
    userData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'users',
      event: eventType,
      entityData: userData,
      userId
    };

    await this.emitEvent(event);
  }

  // System-related events
  async emitSystemEvent(
    tenantId: number,
    eventType: 'maintenance' | 'backup_completed' | 'backup_failed' | 'alert',
    systemData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'system',
      event: eventType,
      entityData: systemData,
      userId
    };

    await this.emitEvent(event);
  }

  private async processTrigger(trigger: any, event: NotificationEvent): Promise<void> {
    try {
      console.log(`Processing trigger: ${trigger.name} for event: ${event.module}:${event.event}`);
      
      // Resolve recipients based on trigger configuration
      const recipients = await this.resolveRecipients(trigger, event);
      console.log(`Resolved ${recipients.length} recipients for trigger: ${trigger.name}`);
      
      if (recipients.length === 0) {
        console.log(`No recipients found for trigger: ${trigger.name}`);
        return;
      }
      
      // Process templates
      const title = this.processTemplate(trigger.titleTemplate, event.entityData);
      const message = this.processTemplate(trigger.messageTemplate, event.entityData);
      const linkUrl = this.processTemplate(trigger.linkTemplate, event.entityData);
      
      // Create notifications for each recipient
      const { storage } = await import('../storage');
      
      for (const recipientId of recipients) {
        await storage.createNotification({
          tenantId: event.tenantId,
          userId: recipientId,
          notificationType: trigger.notificationType,
          title,
          message,
          severity: trigger.severity,
          linkUrl,
          metadata: {
            triggerName: trigger.name,
            triggerId: trigger.id,
            originalEvent: event
          }
        });
      }
      
      console.log(`Created ${recipients.length} notifications for trigger: ${trigger.name}`);
      
    } catch (error) {
      console.error(`Error processing trigger ${trigger.name}:`, error);
    }
  }

  private async resolveRecipients(trigger: any, event: NotificationEvent): Promise<number[]> {
    const config = trigger.recipientConfig ? JSON.parse(trigger.recipientConfig) : {};
    const recipients: Set<number> = new Set();
    
    try {
      switch (trigger.recipientType) {
        case 'task_assignee':
          await this.resolveTaskRecipients(recipients, event, config);
          break;
          
        case 'task_stakeholders':
          await this.resolveTaskStakeholders(recipients, event, config);
          break;
          
        case 'role_based':
          await this.resolveRoleBasedRecipients(recipients, event, config);
          break;
          
        case 'specific_users':
          await this.resolveSpecificUsers(recipients, event, config);
          break;
          
        case 'all_users':
          await this.resolveAllUsers(recipients, event, config);
          break;
          
        default:
          console.warn(`Unknown recipient type: ${trigger.recipientType}`);
      }
      
      // Apply exclusions
      if (config.excludeCurrentUser && event.userId) {
        recipients.delete(event.userId);
      }
      
      return Array.from(recipients);
      
    } catch (error) {
      console.error('Error resolving recipients:', error);
      return [];
    }
  }

  private async resolveTaskRecipients(recipients: Set<number>, event: NotificationEvent, config: any): Promise<void> {
    const taskData = event.entityData;
    
    if (config.includeAssignee && taskData.assigneeId) {
      recipients.add(taskData.assigneeId);
    }
    
    if (config.includeNewAssignee && taskData.newAssignee) {
      recipients.add(taskData.newAssignee);
    }
    
    if (config.includeCreator && taskData.createdBy) {
      recipients.add(taskData.createdBy);
    }
  }

  private async resolveTaskStakeholders(recipients: Set<number>, event: NotificationEvent, config: any): Promise<void> {
    const taskData = event.entityData;
    
    // Include assignee
    if (taskData.assigneeId) {
      recipients.add(taskData.assigneeId);
    }
    
    // Include creator
    if (taskData.createdBy) {
      recipients.add(taskData.createdBy);
    }
    
    // Include supervisors/managers (simplified - add all admin users)
    if (config.includeSupervisors !== false) {
      const { storage } = await import('../storage');
      try {
        const adminUsers = await storage.getUsers(event.tenantId);
        // For now, include all users as potential supervisors
        // This can be refined based on actual role/permission system
        adminUsers.forEach(user => {
          if (user.isSuperAdmin) {
            recipients.add(user.id);
          }
        });
      } catch (error) {
        console.error('Error getting admin users:', error);
      }
    }
  }

  private async resolveRoleBasedRecipients(recipients: Set<number>, event: NotificationEvent, config: any): Promise<void> {
    const { storage } = await import('../storage');
    
    try {
      // Get all users and filter based on roles/permissions
      const users = await storage.getUsers(event.tenantId);
      
      // For now, include admin users as they have broad permissions
      users.forEach(user => {
        if (user.isSuperAdmin) {
          recipients.add(user.id);
        }
      });
      
      // If no specific criteria matched, ensure at least one admin gets notified
      if (recipients.size === 0) {
        const adminUser = users.find(user => user.isSuperAdmin);
        if (adminUser) {
          recipients.add(adminUser.id);
        }
      }
    } catch (error) {
      console.error('Error resolving role-based recipients:', error);
    }
  }

  private async resolveSpecificUsers(recipients: Set<number>, event: NotificationEvent, config: any): Promise<void> {
    if (config.userIds && Array.isArray(config.userIds)) {
      config.userIds.forEach((userId: number) => recipients.add(userId));
    }
  }

  private async resolveAllUsers(recipients: Set<number>, event: NotificationEvent, config: any): Promise<void> {
    const { storage } = await import('../storage');
    try {
      const users = await storage.getUsers(event.tenantId);
      users.forEach(user => recipients.add(user.id));
    } catch (error) {
      console.error('Error getting all users:', error);
    }
  }

  private processTemplate(template: string, data: any): string {
    if (!template || !data) return template || '';
    
    let result = template;
    
    // Replace {{property}} placeholders with actual data
    result = result.replace(/\{\{(\w+)\}\}/g, (match, property) => {
      return data[property] || match;
    });
    
    return result;
  }
}

export const NotificationEventService = new NotificationEventService();
export const notificationEventService = new NotificationEventService();