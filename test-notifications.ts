import { DatabaseStorage } from './server/database-storage';
import { NotificationService } from './server/services/notification-service';

async function testNotifications() {
  const storage = new DatabaseStorage();
  
  // Test Task Assignment Notification
  console.log('Creating task assignment notification...');
  
  try {
    await NotificationService.createNotification(storage, {
      tenantId: 5,
      userId: 5,
      notificationType: 'TASK_ASSIGNMENT',
      title: 'New Task Assigned',
      message: 'You have been assigned a new task: Review quarterly financial statements',
      severity: 'INFO',
      linkUrl: '/tasks/299'
    });
    
    console.log('Task assignment notification created successfully');
    
    // Test Task Completion Notification
    await NotificationService.createNotification(storage, {
      tenantId: 5,
      userId: 5,
      notificationType: 'TASK_COMPLETED',
      title: 'Task Completed',
      message: 'Task "Income Tax Return 2025" has been marked as completed',
      severity: 'SUCCESS',
      linkUrl: '/tasks/298'
    });
    
    console.log('Task completion notification created successfully');
    
    // Test High Priority Task Notification
    await NotificationService.createNotification(storage, {
      tenantId: 5,
      userId: 5,
      notificationType: 'TASK_OVERDUE',
      title: 'Urgent: Overdue Task',
      message: 'High priority task is now overdue: Client compliance review',
      severity: 'CRITICAL',
      linkUrl: '/tasks/299'
    });
    
    console.log('High priority notification created successfully');
    
    // Test Invoice Notification
    await NotificationService.createNotification(storage, {
      tenantId: 5,
      userId: 5,
      notificationType: 'INVOICE_CREATED',
      title: 'New Invoice Created',
      message: 'Invoice #INV-2025-001 has been created for $2,500',
      severity: 'INFO',
      linkUrl: '/finance/invoices'
    });
    
    console.log('Invoice notification created successfully');
    
    console.log('All test notifications created! Check the notification center to see them in action.');
    
  } catch (error) {
    console.error('Error creating notifications:', error);
  }
}

testNotifications();