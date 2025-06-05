import { NotificationService } from "./services/notification-service";

/**
 * Test script to create sample notifications for development/testing
 */
async function createTestNotifications() {
  console.log('Creating test notifications...');

  try {
    // Create a few sample notifications for testing
    const testNotifications = [
      {
        tenantId: 2, // Adjust based on your test tenant
        userId: 1,   // Adjust based on your test user
        title: "Welcome to the new notification system",
        messageBody: "This is a test notification to verify the system is working correctly.",
        type: "SYSTEM_ALERT",
        severity: "INFO",
        linkUrl: "/dashboard"
      },
      {
        tenantId: 2,
        userId: 1,
        title: "New task assigned",
        messageBody: "You have been assigned a new task: Review quarterly reports",
        type: "TASK_ASSIGNMENT", 
        severity: "INFO",
        linkUrl: "/tasks/123"
      },
      {
        tenantId: 2,
        userId: 1,
        title: "Invoice payment received",
        messageBody: "Payment received for Invoice #INV-001 - Amount: $1,500.00",
        type: "INVOICE_PAID",
        severity: "SUCCESS",
        linkUrl: "/finance/invoices/1"
      }
    ];

    for (const notification of testNotifications) {
      await NotificationService.createNotification(notification);
      console.log(`Created notification: ${notification.title}`);
    }

    console.log('Test notifications created successfully!');
  } catch (error) {
    console.error('Error creating test notifications:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestNotifications()
    .then(() => {
      console.log('Test notification creation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test notification creation failed:', error);
      process.exit(1);
    });
}

export { createTestNotifications };