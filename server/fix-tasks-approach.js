/**
 * This script updates the approach to use a single tasks table and ensures
 * compliance_period fields are properly saved.
 * 
 * Changes:
 * 1. Makes sure compliance_period is calculated and saved for all tasks
 * 2. Simplifies the task management to use a single table
 */

const { format } = require('date-fns');
const { db, tasks } = require('./db');

/**
 * Calculate compliance period based on frequency and start date
 */
function calculateCompliancePeriod(frequency, startDate) {
  if (!frequency || !startDate) {
    return null;
  }
  
  const frequencyLower = frequency.toLowerCase();
  
  // Calculate compliance period based on frequency
  if (frequencyLower.includes('month')) {
    // Monthly format: "May 2025"
    return format(startDate, 'MMMM yyyy');
  } else if (frequencyLower.includes('quarter')) {
    // Quarterly format: "Q2 2025"
    const quarter = Math.floor(startDate.getMonth() / 3) + 1;
    return `Q${quarter} ${startDate.getFullYear()}`;
  } else if (frequencyLower.includes('annual') || frequencyLower.includes('year')) {
    if (frequencyLower.includes('5')) {
      // 5-year format: "2025-2029"
      const startYear = startDate.getFullYear();
      return `${startYear}-${startYear + 4}`;
    } else if (frequencyLower.includes('4')) {
      // 4-year format: "2025-2028"
      const startYear = startDate.getFullYear();
      return `${startYear}-${startYear + 3}`;
    } else if (frequencyLower.includes('3')) {
      // 3-year format: "2025-2027"
      const startYear = startDate.getFullYear();
      return `${startYear}-${startYear + 2}`;
    } else if (frequencyLower.includes('2')) {
      // 2-year format: "2025-2026"
      const startYear = startDate.getFullYear();
      return `${startYear}-${startYear + 1}`;
    } else {
      // Standard annual: "2025"
      return `${startDate.getFullYear()}`;
    }
  } else if (frequencyLower.includes('semi') || frequencyLower.includes('bi-annual')) {
    // Semi-annual format: "H1 2025" or "H2 2025"
    const half = startDate.getMonth() < 6 ? 1 : 2;
    return `H${half} ${startDate.getFullYear()}`;
  } else if (frequencyLower.includes('one time') || frequencyLower.includes('once')) {
    // One-time format: "May 2025 (One-time)"
    return `${format(startDate, 'MMMM yyyy')} (One-time)`;
  } else {
    // Default format for unknown frequencies
    return format(startDate, 'MMMM yyyy');
  }
}

// This function can be used to update existing tasks with missing compliance_period values
async function updateTasksWithMissingCompliancePeriods() {
  try {
    // Find all tasks with missing compliance periods
    const tasks = await db.select().from(tasks)
      .where(and(
        isNotNull(tasks.complianceStartDate),
        isNotNull(tasks.complianceFrequency),
        or(
          isNull(tasks.compliancePeriod),
          eq(tasks.compliancePeriod, '')
        )
      ));
      
    console.log(`Found ${tasks.length} tasks with missing compliance periods`);
    
    for (const task of tasks) {
      if (task.complianceStartDate && task.complianceFrequency) {
        const compliancePeriod = calculateCompliancePeriod(
          task.complianceFrequency,
          new Date(task.complianceStartDate)
        );
        
        if (compliancePeriod) {
          await db.update(tasks)
            .set({ compliancePeriod })
            .where(eq(tasks.id, task.id));
            
          console.log(`Updated task ${task.id} with compliance period ${compliancePeriod}`);
        }
      }
    }
    
    console.log('Finished updating tasks with missing compliance periods');
  } catch (error) {
    console.error('Error updating compliance periods:', error);
  }
}

module.exports = {
  calculateCompliancePeriod,
  updateTasksWithMissingCompliancePeriods
};