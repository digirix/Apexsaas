import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function finalNotificationFix() {
  console.log('Starting final notification system fix...');

  try {
    // Step 1: Add missing enum values to the notification_type enum
    console.log('Adding missing enum values...');
    
    await db.execute(sql`
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'TASK_STATUS_CHANGED';
    `);
    
    await db.execute(sql`
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CLIENT_CREATED';
    `);
    
    await db.execute(sql`
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ENTITY_CREATED';
    `);
    
    await db.execute(sql`
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INVOICE_CREATED';
    `);

    console.log('Enum values added successfully');

    // Step 2: Clear and recreate notification triggers with correct enum values
    console.log('Creating notification triggers...');
    
    await db.execute(sql`DELETE FROM notification_triggers`);
    
    const triggers = [
      {
        tenantId: 5,
        name: 'Task Status Changed',
        description: 'Notify when task status changes',
        triggerModule: 'tasks',
        triggerEvent: 'status_changed',
        notificationType: 'TASK_STATUS_CHANGED',
        severity: 'INFO',
        titleTemplate: 'Task Status Updated',
        messageTemplate: 'Task "{{taskDetails}}" status has been changed',
        linkTemplate: '/tasks/{{id}}',
        recipientType: 'task_assignee',
        recipientConfig: JSON.stringify({
          includeAssignee: true,
          excludeCurrentUser: true
        }),
        deliveryChannels: JSON.stringify(['in_app']),
        createdBy: 5
      },
      {
        tenantId: 5,
        name: 'Task Assignment',
        description: 'Notify when task is assigned',
        triggerModule: 'tasks',
        triggerEvent: 'assigned',
        notificationType: 'TASK_ASSIGNMENT',
        severity: 'INFO',
        titleTemplate: 'New Task Assigned',
        messageTemplate: 'You have been assigned task: "{{taskDetails}}"',
        linkTemplate: '/tasks/{{id}}',
        recipientType: 'task_assignee',
        recipientConfig: JSON.stringify({
          includeNewAssignee: true,
          excludeCurrentUser: true
        }),
        deliveryChannels: JSON.stringify(['in_app']),
        createdBy: 5
      },
      {
        tenantId: 5,
        name: 'Task Completion',
        description: 'Notify when task is completed',
        triggerModule: 'tasks',
        triggerEvent: 'completed',
        notificationType: 'TASK_COMPLETED',
        severity: 'INFO',
        titleTemplate: 'Task Completed',
        messageTemplate: 'Task "{{taskDetails}}" has been completed',
        linkTemplate: '/tasks/{{id}}',
        recipientType: 'task_stakeholders',
        recipientConfig: JSON.stringify({
          includeCreator: true,
          includeAssignee: true,
          excludeCurrentUser: true
        }),
        deliveryChannels: JSON.stringify(['in_app']),
        createdBy: 5
      }
    ];

    for (const trigger of triggers) {
      await db.execute(sql`
        INSERT INTO notification_triggers (
          tenant_id, name, description, trigger_module, trigger_event, 
          trigger_conditions, notification_type, severity, title_template, 
          message_template, link_template, recipient_type, recipient_config, 
          delivery_channels, delivery_delay, batch_delivery, is_active, created_by
        ) VALUES (
          ${trigger.tenantId}, ${trigger.name}, ${trigger.description}, 
          ${trigger.triggerModule}, ${trigger.triggerEvent}, NULL, 
          ${trigger.notificationType}::notification_type, 
          ${trigger.severity}::notification_severity, ${trigger.titleTemplate}, 
          ${trigger.messageTemplate}, ${trigger.linkTemplate}, 
          ${trigger.recipientType}, ${trigger.recipientConfig}, 
          ${trigger.deliveryChannels}, 0, false, true, ${trigger.createdBy}
        )
      `);
    }

    console.log('Notification triggers created successfully');

    // Step 3: Create a test notification to verify the system works
    console.log('Creating test notification...');
    
    await db.execute(sql`
      INSERT INTO notifications (
        tenant_id, user_id, title, message_body, link_url, 
        type, severity, created_by, related_module
      ) VALUES (
        5, 5, 'Real-time Notifications Active', 
        'The notification system has been successfully configured and is now working with your notification settings.',
        '/settings/notifications', 'SYSTEM_MESSAGE'::notification_type, 
        'INFO'::notification_severity, 5, 'System'
      )
    `);

    console.log('Test notification created successfully');
    console.log('Final notification system fix completed');
    return true;

  } catch (error) {
    console.error('Error in final notification fix:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  finalNotificationFix()
    .then(() => {
      console.log('Final notification fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Final notification fix failed:', error);
      process.exit(1);
    });
}

export { finalNotificationFix };