/**
 * Migration script to create a separate auto-generated tasks table
 * and enhance compliance period handling in the database
 */
const pg = require('pg');
const { Client } = pg;
const { format } = require('date-fns');

async function main() {
  // Connect to the database
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const queryClient = new Client({ connectionString });
  await queryClient.connect();
  
  try {
    console.log('Starting migration: Creating auto-generated tasks table...');
    
    // Check if auto_generated_tasks table already exists
    const autoGenTasksTableExists = await queryClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'auto_generated_tasks'
      );
    `);
    
    if (!autoGenTasksTableExists.rows[0].exists) {
      console.log('Creating auto_generated_tasks table...');
      
      // Create the auto_generated_tasks table
      await queryClient.query(`
        CREATE TABLE auto_generated_tasks (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          is_admin BOOLEAN NOT NULL DEFAULT FALSE,
          task_type TEXT NOT NULL,
          client_id INTEGER,
          entity_id INTEGER,
          service_type_id INTEGER,
          task_category_id INTEGER,
          assignee_id INTEGER NOT NULL,
          due_date TIMESTAMP WITH TIME ZONE NOT NULL,
          status_id INTEGER NOT NULL,
          task_details TEXT,
          next_to_do TEXT,
          is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
          compliance_frequency TEXT,
          compliance_year TEXT,
          compliance_duration TEXT,
          compliance_start_date TIMESTAMP WITH TIME ZONE,
          compliance_end_date TIMESTAMP WITH TIME ZONE,
          compliance_period TEXT,
          currency TEXT,
          service_rate DOUBLE PRECISION,
          invoice_id INTEGER,
          parent_task_id INTEGER,
          needs_approval BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
      `);
      
      console.log('Successfully created auto_generated_tasks table');
      
      // Add indexes to improve performance
      console.log('Adding indexes to auto_generated_tasks table...');
      await queryClient.query(`
        CREATE INDEX auto_tasks_tenant_id_idx ON auto_generated_tasks(tenant_id);
        CREATE INDEX auto_tasks_needs_approval_idx ON auto_generated_tasks(needs_approval);
        CREATE INDEX auto_tasks_parent_task_idx ON auto_generated_tasks(parent_task_id);
      `);
      
      console.log('Successfully added indexes to auto_generated_tasks table');
    } else {
      console.log('auto_generated_tasks table already exists, skipping creation');
    }
    
    // Ensure tasks table has compliance_period column
    const compliancePeriodColumnExists = await queryClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'compliance_period'
      );
    `);
    
    if (!compliancePeriodColumnExists.rows[0].exists) {
      console.log('Adding compliance_period column to tasks table...');
      await queryClient.query(`
        ALTER TABLE tasks ADD COLUMN compliance_period TEXT;
      `);
      console.log('Successfully added compliance_period column to tasks table');
    } else {
      console.log('compliance_period column already exists in tasks table');
    }
    
    // Calculate compliance periods for existing tasks
    console.log('Calculating and updating compliance periods for existing tasks...');
    
    const tasks = await queryClient.query(`
      SELECT id, compliance_frequency, compliance_start_date, compliance_end_date
      FROM tasks
      WHERE compliance_start_date IS NOT NULL
      AND compliance_frequency IS NOT NULL
      AND (compliance_period IS NULL OR compliance_period = '');
    `);
    
    let updatedCount = 0;
    
    for (const task of tasks.rows) {
      if (task.compliance_start_date && task.compliance_frequency) {
        const startDate = new Date(task.compliance_start_date);
        let compliancePeriod = null;
        const frequency = task.compliance_frequency.toLowerCase();
        
        // Calculate compliance period based on frequency
        if (frequency.includes('month')) {
          // Monthly format: "May 2025"
          compliancePeriod = format(startDate, 'MMMM yyyy');
        } else if (frequency.includes('quarter')) {
          // Quarterly format: "Q2 2025"
          const quarter = Math.floor(startDate.getMonth() / 3) + 1;
          compliancePeriod = `Q${quarter} ${startDate.getFullYear()}`;
        } else if (frequency.includes('annual') || frequency.includes('year')) {
          if (frequency.includes('5')) {
            // 5-year format: "2025-2029"
            const startYear = startDate.getFullYear();
            compliancePeriod = `${startYear}-${startYear + 4}`;
          } else if (frequency.includes('4')) {
            // 4-year format: "2025-2028"
            const startYear = startDate.getFullYear();
            compliancePeriod = `${startYear}-${startYear + 3}`;
          } else if (frequency.includes('3')) {
            // 3-year format: "2025-2027"
            const startYear = startDate.getFullYear();
            compliancePeriod = `${startYear}-${startYear + 2}`;
          } else if (frequency.includes('2')) {
            // 2-year format: "2025-2026"
            const startYear = startDate.getFullYear();
            compliancePeriod = `${startYear}-${startYear + 1}`;
          } else {
            // Standard annual: "2025"
            compliancePeriod = `${startDate.getFullYear()}`;
          }
        } else if (frequency.includes('semi') || frequency.includes('bi-annual')) {
          // Semi-annual format: "H1 2025" or "H2 2025"
          const half = startDate.getMonth() < 6 ? 1 : 2;
          compliancePeriod = `H${half} ${startDate.getFullYear()}`;
        } else if (frequency.includes('one time') || frequency.includes('once')) {
          // One-time format: "May 2025 (One-time)"
          compliancePeriod = `${format(startDate, 'MMMM yyyy')} (One-time)`;
        } else {
          // Default format for unknown frequencies
          compliancePeriod = format(startDate, 'MMMM yyyy');
        }
        
        // Update the task with the calculated compliance period
        if (compliancePeriod) {
          await queryClient.query(`
            UPDATE tasks 
            SET compliance_period = $1
            WHERE id = $2
          `, [compliancePeriod, task.id]);
          
          updatedCount++;
          
          if (updatedCount % 10 === 0) {
            console.log(`Updated ${updatedCount} tasks so far...`);
          }
        }
      }
    }
    
    console.log(`Successfully updated ${updatedCount} tasks with compliance periods`);
    
    // Fix compliance start and end dates for precise time
    console.log('Fixing compliance date time formats...');
    
    await queryClient.query(`
      UPDATE tasks 
      SET compliance_start_date = date_trunc('day', compliance_start_date) + interval '0 second'
      WHERE compliance_start_date IS NOT NULL;
      
      UPDATE tasks 
      SET compliance_end_date = date_trunc('day', compliance_end_date) + interval '23 hours 59 minutes 59.999 seconds'
      WHERE compliance_end_date IS NOT NULL;
    `);
    
    console.log('Successfully fixed compliance date time formats');
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error in migration:', error);
  } finally {
    await queryClient.end();
  }
}

main().catch(console.error);