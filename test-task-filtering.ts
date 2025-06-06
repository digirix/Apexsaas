import { DatabaseStorage } from './server/database-storage';

async function testTaskFiltering() {
  const storage = new DatabaseStorage();
  
  console.log('=== Testing Task Filtering ===');
  
  // Get user 5 (super admin)
  const user = await storage.getUser(5);
  console.log('User 5 data:', JSON.stringify(user, null, 2));
  console.log('isSuperAdmin type:', typeof user?.isSuperAdmin);
  console.log('isSuperAdmin value:', user?.isSuperAdmin);
  console.log('isSuperAdmin === true:', user?.isSuperAdmin === true);
  console.log('isSuperAdmin == true:', user?.isSuperAdmin == true);
  
  // Get tasks
  const tasks = await storage.getTasks(5); // tenant 5
  console.log('Tasks found:', tasks.length);
  tasks.forEach(task => {
    console.log(`Task ${task.id}: ${task.taskDetails} (Assignee: ${task.assigneeId})`);
  });
  
  // Test filtering logic
  const userId = 5;
  const isSuperAdmin = user?.isSuperAdmin;
  console.log('\n=== Testing Filtering Logic ===');
  console.log('User ID:', userId);
  console.log('isSuperAdmin:', isSuperAdmin);
  console.log('!isSuperAdmin:', !isSuperAdmin);
  
  if (!isSuperAdmin) {
    const filteredTasks = tasks.filter(task => task.assigneeId === userId);
    console.log('Filtered tasks (regular user):', filteredTasks.length);
  } else {
    console.log('Super admin - no filtering applied');
  }
}

testTaskFiltering().catch(console.error);