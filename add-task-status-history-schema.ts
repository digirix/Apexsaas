import { db } from './server/db';
import { sql } from 'drizzle-orm';

/**
 * Add task status history tracking table
 * This will track all status changes for tasks to show time spent in each status
 */
async function addTaskStatusHistorySchema() {
  console.log('Creating task_status_history table...');
  
  try {
    // Check if table already exists
    const tableCheckResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'task_status_history'
    `);
    
    if (tableCheckResult.rows.length === 0) {
      // Create task_status_history table
      await db.execute(sql`
        CREATE TABLE task_status_history (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          from_status_id INTEGER REFERENCES task_statuses(id),
          to_status_id INTEGER NOT NULL REFERENCES task_statuses(id),
          changed_by_user_id INTEGER REFERENCES users(id),
          changed_at TIMESTAMP DEFAULT NOW() NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      
      // Create indexes for better performance
      await db.execute(sql`
        CREATE INDEX idx_task_status_history_task_id ON task_status_history(task_id);
      `);
      
      await db.execute(sql`
        CREATE INDEX idx_task_status_history_tenant_id ON task_status_history(tenant_id);
      `);
      
      await db.execute(sql`
        CREATE INDEX idx_task_status_history_changed_at ON task_status_history(changed_at);
      `);
      
      console.log('Successfully created task_status_history table with indexes');
      
      // Populate initial history for existing tasks
      await db.execute(sql`
        INSERT INTO task_status_history (tenant_id, task_id, to_status_id, changed_at, notes)
        SELECT 
          tenant_id, 
          id as task_id, 
          status_id as to_status_id,
          created_at as changed_at,
          'Initial status on task creation' as notes
        FROM tasks
        WHERE status_id IS NOT NULL
      `);
      
      console.log('Populated initial status history for existing tasks');
      
    } else {
      console.log('Table task_status_history already exists');
    }
    
  } catch (error) {
    console.error('Error creating task_status_history table:', error);
    process.exit(1);
  }
  
  console.log('Task status history schema setup completed successfully');
}

addTaskStatusHistorySchema()
  .catch((err) => {
    console.error('Schema setup failed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });