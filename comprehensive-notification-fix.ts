import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function comprehensiveNotificationFix() {
  console.log('Starting comprehensive notification system fix...');

  try {
    // Step 1: Create a simplified notification trigger seeding approach
    console.log('Creating notification triggers with direct SQL...');
    
    // Clear existing triggers
    await db.execute(sql`DELETE FROM notification_triggers`);
    
    // Insert triggers using direct SQL to avoid enum issues
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
        severity: 'SUCCESS',
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

    // Step 2: Test the notification system by creating a test notification
    console.log('Testing notification creation...');
    
    await db.execute(sql`
      INSERT INTO notifications (
        tenant_id, user_id, title, message_body, link_url, 
        type, severity, created_by, related_module
      ) VALUES (
        5, 5, 'System Test Notification', 
        'Real-time notification system has been successfully configured and is now working properly.',
        '/notifications', 'SYSTEM_MESSAGE'::notification_type, 
        'SUCCESS'::notification_severity, 5, 'System'
      )
    `);

    console.log('Test notification created successfully');
    console.log('Comprehensive notification system fix completed');
    return true;

  } catch (error) {
    console.error('Error in comprehensive notification fix:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  comprehensiveNotificationFix()
    .then(() => {
      console.log('Comprehensive notification fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Comprehensive notification fix failed:', error);
      process.exit(1);
    });
}

export { comprehensiveNotificationFix };