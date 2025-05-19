import * as pg from 'pg';

// Create a connection to the database
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function createTestTasks() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create a parent recurring task
    const parentResult = await client.query(`
      INSERT INTO tasks (
        tenant_id, is_admin, task_type, client_id, entity_id, service_type_id,
        task_category_id, assignee_id, due_date, status_id, task_details,
        next_to_do, is_recurring, compliance_frequency, compliance_year,
        compliance_duration, compliance_start_date, compliance_end_date,
        compliance_period, currency, service_rate, is_auto_generated, 
        parent_task_id, needs_approval
      ) VALUES (
        5, false, 'Regular', 4, 3, 1, 
        2, 5, '2025-05-31 23:59:59.999', 2, 'Parent Recurring Task',
        '', true, 'Monthly', '2025', '', 
        '2025-05-01 00:00:00.001', '2025-05-31 23:59:59.999',
        'May 2025', 'PKR', 100, false, 
        null, false
      )
      RETURNING id
    `);
    const parentId = parentResult.rows[0].id;
    console.log(`Created parent task with ID: ${parentId}`);

    // Create auto-generated task that needs approval
    const childResult = await client.query(`
      INSERT INTO tasks (
        tenant_id, is_admin, task_type, client_id, entity_id, service_type_id,
        task_category_id, assignee_id, due_date, status_id, task_details,
        next_to_do, is_recurring, compliance_frequency, compliance_year,
        compliance_duration, compliance_start_date, compliance_end_date,
        compliance_period, currency, service_rate, is_auto_generated, 
        parent_task_id, needs_approval
      ) VALUES (
        5, false, 'Regular', 4, 3, 1,
        2, 5, '2025-06-30 23:59:59.999', 2, 'Auto-Generated Task',
        '', false, 'Monthly', '2025', '',
        '2025-06-01 00:00:00.001', '2025-06-30 23:59:59.999',
        'June 2025', 'PKR', 100, true,
        $1, true
      )
      RETURNING id
    `, [parentId]);
    const childId = childResult.rows[0].id;
    console.log(`Created auto-generated task with ID: ${childId}`);

    console.log('Test tasks created successfully');
  } catch (error) {
    console.error('Error creating test tasks:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

createTestTasks();