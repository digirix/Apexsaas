import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { tasks } from "./shared/schema";
import { format } from "date-fns";
import { sql } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not defined");
  process.exit(1);
}

const queryClient = postgres(databaseUrl, { max: 1 });
const db = drizzle(queryClient);

/**
 * Add a compliance_period field to the tasks table for better tracking
 * of which time period a task belongs to
 */
async function main() {
  try {
    console.log("Adding compliance_period column to tasks table...");
    
    // Check if the compliance_period column already exists
    const checkColumn = await queryClient`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      AND column_name = 'compliance_period'
    `;
    
    if (checkColumn.length === 0) {
      // Add the compliance_period column if it doesn't exist
      await queryClient`
        ALTER TABLE tasks 
        ADD COLUMN compliance_period TEXT
      `;
      console.log("Added compliance_period column to tasks table");
      
      // Update existing tasks with appropriate compliance periods
      const allTasks = await db.select().from(tasks);
      console.log(`Found ${allTasks.length} tasks to update with compliance periods`);
      
      let updatedCount = 0;
      
      for (const task of allTasks) {
        if (task.complianceStartDate && task.complianceFrequency) {
          const startDate = new Date(task.complianceStartDate);
          let compliancePeriod = '';
          
          const frequency = task.complianceFrequency.toLowerCase();
          
          // Format period based on frequency
          if (frequency.includes('month')) {
            // Monthly format: "May 2025"
            compliancePeriod = format(startDate, 'MMMM yyyy');
          } else if (frequency.includes('quarter')) {
            // Quarterly format: "Q2 2025"
            const quarter = Math.floor(startDate.getMonth() / 3) + 1;
            compliancePeriod = `Q${quarter} ${startDate.getFullYear()}`;
          } else if (frequency.includes('annual') || frequency.includes('year')) {
            if (task.complianceDuration?.toLowerCase().includes('fiscal')) {
              // Fiscal year format: "FY 2025-2026"
              const startYear = startDate.getFullYear();
              compliancePeriod = `FY ${startYear}-${startYear + 1}`;
            } else {
              // Calendar year format: "2025"
              compliancePeriod = `${startDate.getFullYear()}`;
            }
          } else if (frequency.includes('semi') || frequency.includes('half')) {
            // Semi-annual format: "H1 2025" or "H2 2025"
            const half = startDate.getMonth() < 6 ? 1 : 2;
            compliancePeriod = `H${half} ${startDate.getFullYear()}`;
          } else if (frequency.includes('2 year')) {
            // 2-year format: "2025-2026"
            const startYear = startDate.getFullYear();
            compliancePeriod = `${startYear}-${startYear + 1}`;
          } else if (frequency.includes('3 year')) {
            // 3-year format: "2025-2027"
            const startYear = startDate.getFullYear();
            compliancePeriod = `${startYear}-${startYear + 2}`;
          } else if (frequency.includes('4 year')) {
            // 4-year format: "2025-2028"
            const startYear = startDate.getFullYear();
            compliancePeriod = `${startYear}-${startYear + 3}`;
          } else if (frequency.includes('5 year')) {
            // 5-year format: "2025-2029"
            const startYear = startDate.getFullYear();
            compliancePeriod = `${startYear}-${startYear + 4}`;
          } else if (frequency.includes('one time') || frequency.includes('once')) {
            // One-time format: "May 2025 (One-time)"
            compliancePeriod = `${format(startDate, 'MMMM yyyy')} (One-time)`;
          } else {
            // Default format for unknown frequencies
            compliancePeriod = format(startDate, 'MMMM yyyy');
          }
          
          // Update the task with the calculated compliance period
          if (compliancePeriod) {
            await db
              .update(tasks)
              .set({ compliancePeriod })
              .where(sql`${tasks.id} = ${task.id}`);
            
            updatedCount++;
            
            if (updatedCount % 10 === 0) {
              console.log(`Updated ${updatedCount} tasks so far...`);
            }
          }
        }
      }
      
      console.log(`Successfully updated ${updatedCount} tasks with compliance periods`);
    } else {
      console.log("Compliance period column already exists, skipping");
    }
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error in migration:", error);
  } finally {
    await queryClient.end();
  }
}

main();