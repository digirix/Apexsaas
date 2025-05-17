/**
 * task-approval.ts
 * 
 * This module provides an improved implementation for approving auto-generated tasks
 * and converting them to regular tasks in the task management system.
 * 
 * The key improvement is that when an auto-generated task is approved, only that specific
 * task instance is moved to the Tasks module while other instances remain in the 
 * Auto Generated Tasks module.
 */

import { IStorage } from "./storage";
import { format, endOfMonth, endOfQuarter, lastDayOfYear } from "date-fns";
import { Task, InsertTask } from "@shared/schema";

/**
 * Approve a specific auto-generated task and convert it to a regular task
 * 
 * This is a completely rewritten implementation that ensures:
 * 1. Only the specific approved task (by ID) is moved to the Tasks Module
 * 2. Multiple instances of the same template task are handled correctly
 * 3. The approved task is properly tracked in the database
 * 
 * @param storage - The data storage implementation
 * @param taskId - The ID of the specific auto-generated task to approve
 * @param tenantId - The tenant ID for security validation
 * @returns A boolean indicating success or failure
 */
/**
 * Calculate the correct compliance end date based on the frequency and start date.
 * This ensures dates are properly handled with the correct time (23:59:59.999 for end dates).
 * 
 * @param startDate - The compliance start date
 * @param frequency - The compliance frequency (monthly, quarterly, etc.)
 * @returns The calculated end date with correct time
 */
function calculateComplianceEndDate(startDate: Date, frequency: string): Date {
  const lowerFrequency = frequency.toLowerCase();
  let endDate: Date;
  
  if (lowerFrequency.includes('quarter')) {
    // For quarterly, get the end of the quarter
    endDate = endOfQuarter(startDate);
  } else if (lowerFrequency.includes('annual') || lowerFrequency.includes('year')) {
    if (lowerFrequency.includes('5')) {
      // 5-year period
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 5);
      endDate = new Date(endDate.getFullYear(), 11, 31); // December 31st
    } else if (lowerFrequency.includes('4')) {
      // 4-year period
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 4);
      endDate = new Date(endDate.getFullYear(), 11, 31); // December 31st
    } else if (lowerFrequency.includes('3')) {
      // 3-year period
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 3);
      endDate = new Date(endDate.getFullYear(), 11, 31); // December 31st
    } else if (lowerFrequency.includes('2')) {
      // 2-year period
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 2);
      endDate = new Date(endDate.getFullYear(), 11, 31); // December 31st
    } else {
      // Regular annual period
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate = new Date(endDate.getFullYear(), 11, 31); // December 31st
    }
  } else if (lowerFrequency.includes('semi') || lowerFrequency.includes('bi-annual')) {
    // Semi-annual/bi-annual: 6 months
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6);
    endDate = endOfMonth(endDate);
  } else if (lowerFrequency.includes('one time') || lowerFrequency.includes('once')) {
    // One-time: use the same date (adjust if needed)
    endDate = new Date(startDate);
  } else {
    // Default for monthly and other frequencies: end of the month
    endDate = endOfMonth(startDate);
  }
  
  // Ensure end time is set to end of day
  endDate.setHours(23, 59, 59, 999);
  return endDate;
}

/**
 * Calculate the compliance period text format based on the frequency and dates.
 * 
 * @param startDate - The compliance start date
 * @param endDate - The compliance end date 
 * @param frequency - The compliance frequency (monthly, quarterly, etc.)
 * @returns Formatted compliance period string (e.g., "May 2025", "Q2 2025", "2025", etc.)
 */
function calculateCompliancePeriod(startDate: Date, endDate: Date, frequency: string): string {
  const lowerFrequency = frequency.toLowerCase();
  
  if (lowerFrequency.includes('quarter')) {
    // Quarterly format: "Q2 2025"
    const quarter = Math.floor(startDate.getMonth() / 3) + 1;
    return `Q${quarter} ${startDate.getFullYear()}`;
  } else if (lowerFrequency.includes('annual') || lowerFrequency.includes('year')) {
    if (lowerFrequency.includes('5')) {
      // 5-year format: "2025-2029"
      const startYear = startDate.getFullYear();
      return `${startYear}-${startYear + 4}`;
    } else if (lowerFrequency.includes('4')) {
      // 4-year format: "2025-2028"
      const startYear = startDate.getFullYear();
      return `${startYear}-${startYear + 3}`;
    } else if (lowerFrequency.includes('3')) {
      // 3-year format: "2025-2027"
      const startYear = startDate.getFullYear();
      return `${startYear}-${startYear + 2}`;
    } else if (lowerFrequency.includes('2')) {
      // 2-year format: "2025-2026"
      const startYear = startDate.getFullYear();
      return `${startYear}-${startYear + 1}`;
    } else {
      // Standard annual: "2025"
      return `${startDate.getFullYear()}`;
    }
  } else if (lowerFrequency.includes('semi') || lowerFrequency.includes('bi-annual')) {
    // Semi-annual format: "H1 2025" or "H2 2025"
    const half = startDate.getMonth() < 6 ? 1 : 2;
    return `H${half} ${startDate.getFullYear()}`;
  } else if (lowerFrequency.includes('one time') || lowerFrequency.includes('once')) {
    // One-time format: "May 2025 (One-time)"
    return `${format(startDate, 'MMMM yyyy')} (One-time)`;
  } else {
    // Monthly format: "May 2025"
    return format(startDate, 'MMMM yyyy');
  }
}

/**
 * Approve a specific auto-generated task and create exactly one corresponding regular task.
 * 
 * This function guarantees a one-to-one relationship between approved auto tasks and regular tasks
 * by implementing multiple layers of safety checks.
 * 
 * @param storage - Data storage interface
 * @param taskId - ID of the auto-generated task to approve
 * @param tenantId - Tenant ID for security validation
 * @returns Promise<boolean> - Success or failure of the approval operation
 */
export async function approveTask(
  storage: IStorage, 
  taskId: number, 
  tenantId: number
): Promise<boolean> {
  try {
    console.log(`\n[TASK-APPROVAL] Starting approval for task ${taskId}, tenant ${tenantId}`);
    
    // -----------------------------------------------------------------------
    // Step 1: Get and validate the auto-generated task
    // -----------------------------------------------------------------------
    const task = await storage.getTask(taskId, tenantId);
    
    if (!task) {
      console.error(`[TASK-APPROVAL] Task ID ${taskId} not found`);
      return false;
    }
    
    if (!task.isAutoGenerated) {
      console.error(`[TASK-APPROVAL] Task ${taskId} is not auto-generated`);
      return false;
    }
    
    if (!task.needsApproval) {
      console.error(`[TASK-APPROVAL] Task ${taskId} already processed (needsApproval=false)`);
      return false;
    }
    
    // Log basic task information for debugging
    console.log(`[TASK-APPROVAL] Processing: ${task.taskType || 'Unknown'} | Client ${task.clientId} | ${task.compliancePeriod || 'No period'}`);
    
    // -----------------------------------------------------------------------
    // Step 2: Lock the task immediately to prevent duplicate processing
    // This is critical to prevent race conditions
    // -----------------------------------------------------------------------
    console.log(`[TASK-APPROVAL] Locking task ${taskId} (setting needsApproval=false)`);
    await storage.updateTask(taskId, {
      needsApproval: false,
      updatedAt: new Date()
    });
    
    // -----------------------------------------------------------------------
    // Step 3: Double-check for existing regular tasks with this auto task as parent
    // -----------------------------------------------------------------------
    console.log(`[TASK-APPROVAL] Checking for existing regular tasks with parent ${taskId}`);
    const allTasks = await storage.getTasks(tenantId);
    
    const existingRegularTasks = allTasks.filter(t => 
      !t.isAutoGenerated && // Must be a regular task
      t.parentTaskId === taskId // Must have THIS specific auto task as direct parent
    );
    
    if (existingRegularTasks.length > 0) {
      console.log(`[TASK-APPROVAL] Found ${existingRegularTasks.length} existing regular task(s) - not creating another`);
      return true; // Task is already processed successfully
    }
    
    // -----------------------------------------------------------------------
    // Step 4: Determine if this is the latest compliance period
    // -----------------------------------------------------------------------
    const isOneTime = task.complianceFrequency?.toLowerCase()?.includes('one') || false;
    let isLatestPeriod = true;
    
    if (!isOneTime && task.parentTaskId && task.complianceEndDate) {
      const thisEndDate = new Date(task.complianceEndDate);
      console.log(`[TASK-APPROVAL] This task end date: ${thisEndDate.toISOString()}`);
      
      // Find all other auto-generated tasks from the same template
      const siblingTasks = allTasks.filter(t => 
        t.isAutoGenerated && 
        t.parentTaskId === task.parentTaskId && 
        t.id !== task.id // Not this task
      );
      
      console.log(`[TASK-APPROVAL] Found ${siblingTasks.length} sibling tasks to check`);
      
      // Check if any sibling has a later compliance period
      for (const sibling of siblingTasks) {
        if (sibling.complianceEndDate) {
          const siblingEndDate = new Date(sibling.complianceEndDate);
          console.log(`[TASK-APPROVAL] Sibling task ${sibling.id} end date: ${siblingEndDate.toISOString()}`);
          
          if (siblingEndDate > thisEndDate) {
            isLatestPeriod = false;
            console.log(`[TASK-APPROVAL] Found later period: ${sibling.compliancePeriod || 'unknown'}`);
            break;
          }
        }
      }
    }
    
    console.log(`[TASK-APPROVAL] Is latest period: ${isLatestPeriod}`);
    
    // -----------------------------------------------------------------------
    // Step 5: Fix compliance dates and calculate proper compliance period
    // -----------------------------------------------------------------------
    console.log(`[TASK-APPROVAL] Fixing compliance dates and calculating compliance period`);
    
    // Get/validate start date
    let correctStartDate: Date | null = null;
    let correctEndDate: Date | null = null; 
    let compliancePeriod: string | null = null;
    
    // Process compliance dates if available
    if (task.complianceStartDate && task.complianceFrequency) {
      // Convert to proper date objects
      correctStartDate = new Date(task.complianceStartDate);
      
      // Calculate the correct end date based on frequency and start date
      correctEndDate = calculateComplianceEndDate(correctStartDate, task.complianceFrequency);
      
      // Ensure the correct end time (23:59:59.999)
      correctEndDate.setHours(23, 59, 59, 999);
      
      // Calculate the compliance period format
      compliancePeriod = calculateCompliancePeriod(
        correctStartDate,
        correctEndDate,
        task.complianceFrequency
      );
      
      console.log(`[TASK-APPROVAL] Fixed dates - Start: ${correctStartDate.toISOString()}, End: ${correctEndDate.toISOString()}`);
      console.log(`[TASK-APPROVAL] Calculated compliance period: ${compliancePeriod}`);
    } else {
      console.log(`[TASK-APPROVAL] Cannot fix compliance dates - missing start date or frequency`);
      // Fall back to original values
      correctStartDate = task.complianceStartDate ? new Date(task.complianceStartDate) : null;
      correctEndDate = task.complianceEndDate ? new Date(task.complianceEndDate) : null;
      compliancePeriod = task.compliancePeriod || null;
    }
    
    // -----------------------------------------------------------------------
    // Step 6: Create exactly ONE new regular task
    // -----------------------------------------------------------------------
    console.log(`[TASK-APPROVAL] Creating ONE regular task`);
    
    // Verify required fields are present
    if (!task.tenantId || !task.assigneeId || !task.dueDate || !task.statusId) {
      console.error(`[TASK-APPROVAL] Missing required fields for task creation`);
      return false;
    }
    
    // Create the new regular task with carefully copied fields
    const newTaskData = {
      // Basic information
      tenantId: task.tenantId,
      isAdmin: task.isAdmin || false,
      taskType: task.taskType || 'Regular',
      clientId: task.clientId,
      entityId: task.entityId,
      serviceTypeId: task.serviceTypeId,
      taskCategoryId: task.taskCategoryId,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate,
      statusId: task.statusId,
      taskDetails: task.taskDetails || '',
      nextToDo: task.nextToDo || '',
      
      // Critical relationship fields
      parentTaskId: task.id, // Direct link to THIS auto task
      isAutoGenerated: false, // This is now a regular task
      needsApproval: false, // Regular tasks don't need approval
      
      // Set recurring flag based on period check
      isRecurring: !isOneTime && isLatestPeriod,
      
      // Use corrected compliance date fields
      complianceFrequency: task.complianceFrequency,
      complianceYear: task.complianceYear,
      complianceDuration: task.complianceDuration,
      complianceStartDate: correctStartDate,
      complianceEndDate: correctEndDate,
      compliancePeriod: compliancePeriod,
      
      // Copy financial information
      currency: task.currency,
      serviceRate: task.serviceRate,
      invoiceId: task.invoiceId,
      
      // Metadata
      createdAt: new Date()
    };
    
    console.log(`[TASK-APPROVAL] Creating regular task with isRecurring=${newTaskData.isRecurring}`);
    
    try {
      // Create exactly ONE regular task
      const newTask = await storage.createTask(newTaskData as any);
      console.log(`[TASK-APPROVAL] Successfully created regular task ID: ${newTask.id}`);
      
      // Update the original template task if needed
      if (isLatestPeriod && task.parentTaskId) {
        console.log(`[TASK-APPROVAL] Updating original template task ${task.parentTaskId}`);
        await storage.updateTask(task.parentTaskId, {
          isRecurring: false,
          updatedAt: new Date()
        });
      }
      
      return true;
    } catch (error) {
      console.error(`[TASK-APPROVAL] Error creating regular task:`, error);
      return false;
    }
  } catch (error) {
    console.error(`[TASK-APPROVAL] Unexpected error:`, error);
    return false;
  }
}