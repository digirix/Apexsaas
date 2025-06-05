import { db } from './db';
import { notificationTriggers } from '@shared/schema';

export async function seedNotificationTriggers() {
  console.log('Seeding notification triggers...');

  try {
    // Check if triggers already exist
    const existingTriggers = await db.select().from(notificationTriggers).limit(1);
    if (existingTriggers.length > 0) {
      console.log('Notification triggers already exist, skipping seed');
      return;
    }

    const triggers = [
      // Task-related triggers
      {
        tenantId: 5, // Default tenant for demonstration
        name: 'Task Status Changed',
        description: 'Notify when task status changes',
        triggerModule: 'tasks',
        triggerEvent: 'status_changed',
        triggerConditions: null,
        notificationType: 'TASK_STATUS_CHANGED' as const,
        severity: 'INFO' as const,
        titleTemplate: 'Task Status Updated',
        messageTemplate: 'Task "{{taskDetails}}" status changed from {{previousStatus}} to {{newStatus}}',
        linkTemplate: '/tasks/{{id}}',
        recipientType: 'task_assignee',
        recipientConfig: JSON.stringify({
          includeAssignee: true,
          includeCreator: true,
          excludeCurrentUser: true
        }),
        deliveryChannels: JSON.stringify(['in_app', 'email']),
        deliveryDelay: 0,
        batchDelivery: false,
        isActive: true,
        createdBy: 5
      },
      {
        tenantId: 5,
        name: 'Task Assignment',
        description: 'Notify when task is assigned to someone',
        triggerModule: 'tasks',
        triggerEvent: 'assigned',
        triggerConditions: null,
        notificationType: 'TASK_ASSIGNMENT' as const,
        severity: 'INFO' as const,
        titleTemplate: 'New Task Assigned',
        messageTemplate: 'You have been assigned task: "{{taskDetails}}"',
        linkTemplate: '/tasks/{{id}}',
        recipientType: 'task_assignee',
        recipientConfig: JSON.stringify({
          includeNewAssignee: true,
          excludeCurrentUser: true
        }),
        deliveryChannels: JSON.stringify(['in_app', 'email']),
        deliveryDelay: 0,
        batchDelivery: false,
        isActive: true,
        createdBy: 5
      },
      {
        tenantId: 5,
        name: 'Task Completion',
        description: 'Notify when task is completed',
        triggerModule: 'tasks',
        triggerEvent: 'completed',
        triggerConditions: null,
        notificationType: 'TASK_COMPLETED' as const,
        severity: 'SUCCESS' as const,
        titleTemplate: 'Task Completed',
        messageTemplate: 'Task "{{taskDetails}}" has been completed',
        linkTemplate: '/tasks/{{id}}',
        recipientType: 'task_stakeholders',
        recipientConfig: JSON.stringify({
          includeCreator: true,
          includeAssignee: true,
          excludeCurrentUser: true
        }),
        deliveryChannels: JSON.stringify(['in_app', 'email']),
        deliveryDelay: 0,
        batchDelivery: false,
        isActive: true,
        createdBy: 5
      },
      {
        tenantId: 5,
        name: 'Task Updated',
        description: 'Notify when task details are updated',
        triggerModule: 'tasks',
        triggerEvent: 'updated',
        triggerConditions: null,
        notificationType: 'TASK_STATUS_CHANGED' as const,
        severity: 'INFO' as const,
        titleTemplate: 'Task Updated',
        messageTemplate: 'Task "{{taskDetails}}" has been updated',
        linkTemplate: '/tasks/{{id}}',
        recipientType: 'task_assignee',
        recipientConfig: JSON.stringify({
          includeAssignee: true,
          excludeCurrentUser: true
        }),
        deliveryChannels: JSON.stringify(['in_app']),
        deliveryDelay: 0,
        batchDelivery: true,
        isActive: true,
        createdBy: 5
      },
      // Client-related triggers
      {
        tenantId: 5,
        name: 'Client Created',
        description: 'Notify when new client is created',
        triggerModule: 'clients',
        triggerEvent: 'created',
        triggerConditions: null,
        notificationType: 'CLIENT_CREATED' as const,
        severity: 'INFO' as const,
        titleTemplate: 'New Client Added',
        messageTemplate: 'New client "{{displayName}}" has been added to the system',
        linkTemplate: '/clients/{{id}}',
        recipientType: 'role_based',
        recipientConfig: JSON.stringify({
          roles: ['admin', 'manager'],
          permissions: ['clients:read']
        }),
        deliveryChannels: JSON.stringify(['in_app']),
        deliveryDelay: 0,
        batchDelivery: false,
        isActive: true,
        createdBy: 5
      },
      // Entity-related triggers
      {
        tenantId: 5,
        name: 'Entity Created',
        description: 'Notify when new entity is created',
        triggerModule: 'entities',
        triggerEvent: 'created',
        triggerConditions: null,
        notificationType: 'ENTITY_CREATED' as const,
        severity: 'INFO' as const,
        titleTemplate: 'New Entity Added',
        messageTemplate: 'New entity "{{name}}" has been created',
        linkTemplate: '/entities/{{id}}',
        recipientType: 'role_based',
        recipientConfig: JSON.stringify({
          roles: ['admin', 'manager'],
          permissions: ['entities:read']
        }),
        deliveryChannels: JSON.stringify(['in_app']),
        deliveryDelay: 0,
        batchDelivery: false,
        isActive: true,
        createdBy: 5
      },
      // Invoice-related triggers
      {
        tenantId: 5,
        name: 'Invoice Created',
        description: 'Notify when new invoice is created',
        triggerModule: 'finance',
        triggerEvent: 'invoice_created',
        triggerConditions: null,
        notificationType: 'INVOICE_CREATED' as const,
        severity: 'INFO' as const,
        titleTemplate: 'New Invoice Created',
        messageTemplate: 'Invoice {{invoiceNumber}} has been created for {{clientName}}',
        linkTemplate: '/finance/invoices/{{id}}',
        recipientType: 'role_based',
        recipientConfig: JSON.stringify({
          roles: ['admin', 'accountant'],
          permissions: ['finance:read']
        }),
        deliveryChannels: JSON.stringify(['in_app', 'email']),
        deliveryDelay: 0,
        batchDelivery: false,
        isActive: true,
        createdBy: 5
      }
    ];

    await db.insert(notificationTriggers).values(triggers);
    console.log(`Seeded ${triggers.length} notification triggers`);

  } catch (error) {
    console.error('Error seeding notification triggers:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedNotificationTriggers()
    .then(() => {
      console.log('Notification triggers seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Notification triggers seeding failed:', error);
      process.exit(1);
    });
}