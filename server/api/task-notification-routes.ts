import express from 'express';
import { z } from 'zod';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { notificationTriggers, notificationPreferences, tenantSettings } from '@shared/schema';
import { notificationService } from '../services/notification-service';

const router = express.Router();

// Task Assignment Notification Settings Schema
const taskNotificationSettingsSchema = z.object({
  taskAssignmentNotifications: z.object({
    email: z.boolean(),
    inApp: z.boolean(),
    delay: z.number().default(0)
  }),
  statusChangeNotifications: z.object({
    email: z.boolean(),
    inApp: z.boolean(),
    delay: z.number().default(0)
  }),
  completionNotifications: z.object({
    email: z.boolean(),
    inApp: z.boolean(),
    delay: z.number().default(0)
  }),
  recipients: z.object({
    assignedUser: z.boolean().default(true),
    taskCreator: z.boolean().default(true),
    clientManagers: z.boolean().default(true),
    administrators: z.boolean().default(true)
  }),
  timing: z.object({
    batchNotifications: z.boolean().default(false),
    respectQuietHours: z.boolean().default(true)
  }),
  prioritySettings: z.object({
    highPriorityEmail: z.boolean().default(true),
    highPriorityApp: z.boolean().default(true),
    overdueEmail: z.boolean().default(true),
    overdueApp: z.boolean().default(true)
  })
});

// Template Settings Schema
const taskTemplateSchema = z.object({
  assignmentTemplate: z.string(),
  statusChangeTemplate: z.string(),
  completionTemplate: z.string()
});

// Get current task notification settings
router.get('/settings', async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get current settings from tenant_settings
    const settings = await db
      .select()
      .from(tenantSettings)
      .where(and(
        eq(tenantSettings.tenantId, user.tenantId),
        eq(tenantSettings.settingKey, 'task_notification_settings')
      ))
      .limit(1);

    const defaultSettings = {
      taskAssignmentNotifications: { email: false, inApp: true, delay: 0 },
      statusChangeNotifications: { email: false, inApp: true, delay: 0 },
      completionNotifications: { email: true, inApp: true, delay: 0 },
      recipients: {
        assignedUser: true,
        taskCreator: true,
        clientManagers: true,
        administrators: true
      },
      timing: {
        batchNotifications: false,
        respectQuietHours: true
      },
      prioritySettings: {
        highPriorityEmail: true,
        highPriorityApp: true,
        overdueEmail: true,
        overdueApp: true
      }
    };

    const currentSettings = settings[0] 
      ? JSON.parse(settings[0].settingValue)
      : defaultSettings;

    res.json(currentSettings);
  } catch (error) {
    console.error('Error fetching task notification settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update task notification settings
router.put('/settings', async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const validatedSettings = taskNotificationSettingsSchema.parse(req.body);

    // Upsert settings
    await db
      .insert(tenantSettings)
      .values({
        tenantId: user.tenantId,
        settingKey: 'task_notification_settings',
        settingValue: JSON.stringify(validatedSettings)
      })
      .onConflictDoUpdate({
        target: [tenantSettings.tenantId, tenantSettings.settingKey],
        set: {
          settingValue: JSON.stringify(validatedSettings),
          updatedAt: new Date()
        }
      });

    // Update or create notification triggers for task events
    await updateTaskNotificationTriggers(user.tenantId, validatedSettings, user.id);

    res.json({ message: 'Task notification settings updated successfully' });
  } catch (error) {
    console.error('Error updating task notification settings:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Get task notification templates
router.get('/templates', async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const settings = await db
      .select()
      .from(tenantSettings)
      .where(and(
        eq(tenantSettings.tenantId, user.tenantId),
        eq(tenantSettings.settingKey, 'task_notification_templates')
      ))
      .limit(1);

    const defaultTemplates = {
      assignmentTemplate: "Hello {{assignee_name}}, you have been assigned a new task: {{task_title}}. Due date: {{due_date}}. Priority: {{priority}}.",
      statusChangeTemplate: "Task '{{task_title}}' has been updated. Status changed from {{old_status}} to {{new_status}} by {{updated_by}}.",
      completionTemplate: "Great news! Task '{{task_title}}' has been completed by {{completed_by}} on {{completion_date}}."
    };

    const templates = settings[0] 
      ? JSON.parse(settings[0].settingValue)
      : defaultTemplates;

    res.json(templates);
  } catch (error) {
    console.error('Error fetching task notification templates:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update task notification templates
router.put('/templates', async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const validatedTemplates = taskTemplateSchema.parse(req.body);

    await db
      .insert(tenantSettings)
      .values({
        tenantId: user.tenantId,
        settingKey: 'task_notification_templates',
        settingValue: JSON.stringify(validatedTemplates)
      })
      .onConflictDoUpdate({
        target: [tenantSettings.tenantId, tenantSettings.settingKey],
        set: {
          settingValue: JSON.stringify(validatedTemplates),
          updatedAt: new Date()
        }
      });

    res.json({ message: 'Task notification templates updated successfully' });
  } catch (error) {
    console.error('Error updating task notification templates:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

// Test task notification
router.post('/test', async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { type } = req.body;

    const testData = {
      task_title: 'Test Task for Notification',
      assignee_name: user.displayName,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      priority: 'High',
      client_name: 'Test Client',
      old_status: 'In Progress',
      new_status: 'Completed',
      updated_by: user.displayName,
      completed_by: user.displayName,
      completion_date: new Date().toLocaleDateString()
    };

    let notificationType;
    switch (type) {
      case 'assignment':
        notificationType = 'TASK_ASSIGNMENT';
        break;
      case 'status':
        notificationType = 'TASK_STATUS_CHANGED';
        break;
      case 'completion':
        notificationType = 'TASK_COMPLETED';
        break;
      default:
        return res.status(400).json({ message: 'Invalid test type' });
    }

    await notificationService.createNotification({
      tenantId: user.tenantId,
      userIds: [user.id],
      title: 'Test Notification',
      messageBody: `This is a test ${type} notification.`,
      type: notificationType,
      severity: 'INFO',
      deliveryChannels: ['in_app', 'email'],
      createdBy: user.id,
      templateVariables: testData
    });

    res.json({ message: 'Test notification sent successfully' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to update notification triggers
async function updateTaskNotificationTriggers(tenantId: number, settings: any, userId: number) {
  const triggers = [
    {
      name: 'Task Assignment Notification',
      module: 'tasks',
      event: 'assigned',
      type: 'TASK_ASSIGNMENT',
      channels: []
    },
    {
      name: 'Task Status Change Notification',
      module: 'tasks', 
      event: 'status_changed',
      type: 'TASK_STATUS_CHANGED',
      channels: []
    },
    {
      name: 'Task Completion Notification',
      module: 'tasks',
      event: 'completed', 
      type: 'TASK_COMPLETED',
      channels: []
    }
  ];

  // Build delivery channels based on settings
  if (settings.taskAssignmentNotifications.inApp) triggers[0].channels.push('in_app');
  if (settings.taskAssignmentNotifications.email) triggers[0].channels.push('email');

  if (settings.statusChangeNotifications.inApp) triggers[1].channels.push('in_app');
  if (settings.statusChangeNotifications.email) triggers[1].channels.push('email');

  if (settings.completionNotifications.inApp) triggers[2].channels.push('in_app');
  if (settings.completionNotifications.email) triggers[2].channels.push('email');

  // Create or update triggers
  for (const trigger of triggers) {
    if (trigger.channels.length > 0) {
      await db
        .insert(notificationTriggers)
        .values({
          tenantId,
          name: trigger.name,
          triggerModule: trigger.module,
          triggerEvent: trigger.event,
          notificationType: trigger.type,
          severity: 'INFO',
          titleTemplate: `{{task_title}} - ${trigger.name}`,
          messageTemplate: `Task notification for {{task_title}}`,
          recipientType: 'conditional',
          recipientConfig: JSON.stringify({
            module: 'tasks',
            requiredPermission: 'read',
            includeAssignee: true,
            includeCreator: settings.recipients.taskCreator,
            includeClientManagers: settings.recipients.clientManagers,
            includeAdmins: settings.recipients.administrators
          }),
          deliveryChannels: JSON.stringify(trigger.channels),
          deliveryDelay: settings.timing.batchNotifications ? 300 : 0, // 5 minutes if batching
          batchDelivery: settings.timing.batchNotifications,
          isActive: true,
          createdBy: userId
        })
        .onConflictDoUpdate({
          target: [notificationTriggers.tenantId, notificationTriggers.name],
          set: {
            deliveryChannels: JSON.stringify(trigger.channels),
            deliveryDelay: settings.timing.batchNotifications ? 300 : 0,
            batchDelivery: settings.timing.batchNotifications,
            recipientConfig: JSON.stringify({
              module: 'tasks',
              requiredPermission: 'read',
              includeAssignee: true,
              includeCreator: settings.recipients.taskCreator,
              includeClientManagers: settings.recipients.clientManagers,
              includeAdmins: settings.recipients.administrators
            }),
            updatedAt: new Date()
          }
        });
    }
  }
}

export { router as taskNotificationRoutes };
export default router;