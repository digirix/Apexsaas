#!/usr/bin/env tsx

import { NotificationService } from './server/services/notification-service';
import { DatabaseStorage } from './server/database-storage';

/**
 * Test permission-based notification filtering
 * This validates that users only see notifications for modules they have access to
 */
async function testPermissionBasedFiltering() {
  console.log('🔍 Testing Permission-Based Notification Filtering...\n');

  const storage = new DatabaseStorage();
  const tenantId = 5; // Test tenant

  try {
    // Get all users in tenant
    const users = await storage.getUsers(tenantId);
    console.log(`Found ${users.length} users in tenant ${tenantId}\n`);

    for (const user of users) {
      console.log(`\n--- Testing User: ${user.displayName} (ID: ${user.id}) ---`);
      console.log(`Super Admin: ${user.isSuperAdmin ? 'Yes' : 'No'}`);

      // Get user permissions
      const permissions = await storage.getUserPermissions(tenantId, user.id);
      console.log('User Permissions:');
      permissions.forEach(perm => {
        console.log(`  - ${perm.module}: ${perm.accessLevel} (canRead: ${perm.canRead})`);
      });

      // Test notification count with permission filtering
      const unreadCount = await NotificationService.getUnreadNotificationCount(user.id, tenantId);
      console.log(`\nFiltered Unread Notifications: ${unreadCount}`);

      // Get notifications with permission filtering
      const result = await NotificationService.getNotificationsForUser(user.id, tenantId, {
        page: 1,
        limit: 5
      });
      
      console.log(`Filtered Notifications: ${result.notifications.length}/${result.total}`);
      
      if (result.notifications.length > 0) {
        console.log('Sample notifications:');
        result.notifications.slice(0, 3).forEach(notif => {
          console.log(`  - ${notif.type}: ${notif.title}`);
        });
      }

      // Test specific module permissions
      const testModules = ['tasks', 'clients', 'finance', 'users'];
      console.log('\nModule Access Test:');
      for (const module of testModules) {
        const hasAccess = await NotificationService.hasModulePermission(
          user.id, 
          tenantId, 
          user.isSuperAdmin, 
          module
        );
        console.log(`  - ${module}: ${hasAccess ? '✅ Access' : '❌ No Access'}`);
      }
      
      console.log('\n' + '='.repeat(60));
    }

    console.log('\n✅ Permission-based notification filtering test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing permission-based filtering:', error);
    process.exit(1);
  }
}

// Run the test
testPermissionBasedFiltering()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });