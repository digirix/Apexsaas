import { ComprehensiveNotificationTriggers } from './server/services/comprehensive-notification-triggers';

/**
 * Test the notification preference system by triggering a CLIENT_CREATED notification
 * This will help us see the debug logs and identify why re-enabled preferences aren't working
 */
async function testNotificationPreferences() {
  console.log('Testing notification preferences system...');
  
  try {
    // Test CLIENT_CREATED notification for tenant 5, user 5 (we know this preference is enabled)
    await ComprehensiveNotificationTriggers.triggerClientCreated(5, 4, 5); // existing client ID, created by user 5
    
    console.log('CLIENT_CREATED notification trigger completed successfully');
  } catch (error) {
    console.error('Error testing notification preferences:', error);
  }
}

if (require.main === module) {
  testNotificationPreferences()
    .then(() => {
      console.log('Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}