import { db } from './server/db';

async function addTaskIdToInvoices() {
  try {
    console.log('Adding task_id column to invoices table...');
    
    // Add the task_id column to the invoices table
    await db.execute(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS task_id INTEGER;
    `);
    
    console.log('Successfully added task_id column to invoices table');
    
    // Update existing invoices with task_id from their invoice_id reference in tasks table
    console.log('Updating existing invoices with task_id values...');
    
    await db.execute(`
      UPDATE invoices 
      SET task_id = tasks.id 
      FROM tasks 
      WHERE tasks.invoice_id = invoices.id;
    `);
    
    console.log('Successfully updated existing invoices with task_id values');
    
  } catch (error) {
    console.error('Error adding task_id to invoices:', error);
    throw error;
  }
}

addTaskIdToInvoices()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });