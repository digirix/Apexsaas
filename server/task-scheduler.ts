import { IStorage } from "./storage";
import { Task, InsertTask } from "@shared/schema";
import { addMonths, addDays, format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subDays } from "date-fns";

const DEFAULT_LEAD_DAYS = 14; // Default lead time for generating recurring tasks

/**
 * TaskScheduler is responsible for generating recurring tasks
 * based on their frequency and compliance periods
 */
export class TaskScheduler {
  private storage: IStorage;
  private leadDaysOverride: number | null;
  
  constructor(storage: IStorage, leadDaysOverride: number | null = null) {
    this.storage = storage;
    this.leadDaysOverride = leadDaysOverride;
  }
  
  /**
   * Generate upcoming recurring tasks for all tenants
   * This should be run periodically (e.g., daily) to create tasks for upcoming periods
   */
  public async generateUpcomingRecurringTasks(): Promise<void> {
    try {
      // Get all tenants
      const tenants = Array.from(await this.getAllTenants());
      
      for (const tenant of tenants) {
        await this.generateRecurringTasksForTenant(tenant.id);
      }
      
      console.log(`Recurring task generation completed for ${tenants.length} tenants`);
    } catch (error) {
      console.error("Error generating recurring tasks:", error);
    }
  }
  
  /**
   * Generate recurring tasks for a specific tenant
   */
  public async generateRecurringTasksForTenant(tenantId: number): Promise<void> {
    try {
      // If we have a lead days override (for manual generation), use that value
      // Otherwise get the auto generate days setting or use default
      let leadDays: number;
      
      if (this.leadDaysOverride !== null) {
        // Use the override (typically 0 for manual generation to force immediate creation)
        leadDays = this.leadDaysOverride;
        console.log(`Using override lead days: ${leadDays} for tenant ${tenantId}`);
      } else {
        // Get setting from database
        const autoGenerateSetting = await this.storage.getTenantSetting(tenantId, "auto_generate_task_days");
        leadDays = autoGenerateSetting ? parseInt(autoGenerateSetting.value) : DEFAULT_LEAD_DAYS;
        console.log(`Using configured lead days: ${leadDays} for tenant ${tenantId}`);
      }
      
      // Get all recurring tasks for this tenant
      const allTasks = await this.storage.getTasks(tenantId);
      const recurringTasks = allTasks.filter(task => task.isRecurring);
      
      if (recurringTasks.length === 0) {
        console.log(`No recurring tasks found for tenant ${tenantId}`);
      } else {
        console.log(`Found ${recurringTasks.length} recurring tasks for tenant ${tenantId}`);
      }
      
      // Check each recurring task
      for (const task of recurringTasks) {
        try {
          await this.processRecurringTask(task, leadDays);
        } catch (error) {
          console.error(`Error processing recurring task ${task.id}:`, error);
          // Continue with next task instead of stopping the entire process
        }
      }
      
      console.log(`Generated recurring tasks for tenant ${tenantId}`);
    } catch (error) {
      console.error(`Error generating recurring tasks for tenant ${tenantId}:`, error);
    }
  }
  
  /**
   * Process a single recurring task and create new instances if needed
   */
  private async processRecurringTask(task: Task, leadDays: number): Promise<void> {
    // Skip processing if task doesn't have compliance frequency
    if (!task.complianceFrequency) {
      console.log(`Skipping task ${task.id} - Missing frequency. Frequency: ${task.complianceFrequency}, Duration: ${task.complianceDuration}`);
      return;
    }
    
    // Initialize duration to empty string if not provided
    const duration = task.complianceDuration || '';
    
    console.log(`Processing recurring task ${task.id}: ${task.taskDetails || 'No details'}. Frequency: ${task.complianceFrequency}, Start: ${task.complianceStartDate}, End: ${task.complianceEndDate}`);
    
    // Calculate the next compliance period
    const nextPeriod = this.calculateNextCompliancePeriod(
      task.complianceFrequency, 
      task.complianceDuration || '',
      new Date() // Current date as reference
    );
    
    if (!nextPeriod) {
      console.log(`No next period calculated for task ${task.id}`);
      return; // Skip if we couldn't calculate the next period
    }
    
    const { startDate, endDate } = nextPeriod;
    console.log(`Next period for task ${task.id}: Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);
    
    // Check if the task for this period already exists in the auto-generated tasks
    // We only care about auto-generated tasks that need approval or already-approved
    // tasks that haven't been completed yet
    const existingTasks = await this.storage.getTasks(
      task.tenantId,
      task.clientId || undefined,
      task.entityId || undefined,
      task.isAdmin
    );
    
    const periodExists = existingTasks.some(existingTask => {
      // Check if this task matches the recurring template, period,
      // and is an auto-generated task that needs approval
      // or is already in the tasks module for this period
      const matches = 
        existingTask.taskCategoryId === task.taskCategoryId &&
        existingTask.serviceTypeId === task.serviceTypeId &&
        existingTask.complianceStartDate?.getTime() === startDate.getTime() &&
        existingTask.complianceEndDate?.getTime() === endDate.getTime() &&
        (
          // Either it's an auto-generated task waiting for approval
          (existingTask.isAutoGenerated && existingTask.needsApproval) || 
          // Or it's an active task created for this period
          (!existingTask.isAutoGenerated && existingTask.isRecurring)
        );
      
      if (matches) {
        console.log(`Task for period already exists: Existing task ID ${existingTask.id} (auto-generated: ${existingTask.isAutoGenerated}, needs approval: ${existingTask.needsApproval})`);
      }
      
      return matches;
    });
    
    // If the task doesn't exist and is within the lead time, create it
    if (!periodExists) {
      const dueDate = this.calculateDueDate(endDate);
      // Note: For monthly tasks that should be generated every month, we'll 
      // bypass the lead time check to ensure they're always generated when requested
      const now = new Date();
      
      // Always generate if it's a manually triggered generation (lead time = 0)
      // or if it's a monthly task with today's date past the end of previous month
      const shouldForceGenerate = leadDays === 0 || 
                                 (task.complianceFrequency?.toLowerCase() === 'monthly' &&
                                  now.getDate() > 5); // Generate if we're past the 5th day of the month
      
      if (shouldForceGenerate) {
        console.log(`Forcing task generation for task ${task.id} - Manual generation or monthly task past month start`);
        await this.createRecurringTaskInstance(task, startDate, endDate, dueDate);
      } else {
        const leadTimeThreshold = addDays(dueDate, -leadDays);
        console.log(`Lead time check for task ${task.id}: Now: ${now.toISOString()}, Lead threshold: ${leadTimeThreshold.toISOString()}, Due date: ${dueDate.toISOString()}`);
        
        if (now >= leadTimeThreshold) {
          console.log(`Creating new task instance for task ${task.id}`);
          await this.createRecurringTaskInstance(task, startDate, endDate, dueDate);
        } else {
          console.log(`Not creating task yet - current date ${now.toISOString()} is before lead time threshold ${leadTimeThreshold.toISOString()}`);
        }
      }
    } else {
      console.log(`Not creating task - period already exists for task ${task.id}`);
    }
  }
  
  /**
   * Create a new instance of a recurring task for a specific period
   */
  private async createRecurringTaskInstance(
    templateTask: Task, 
    startDate: Date, 
    endDate: Date,
    dueDate: Date
  ): Promise<void> {
    try {
      // Get the "New" status (rank 1) for this tenant
      const statuses = await this.storage.getTaskStatuses(templateTask.tenantId);
      const newStatus = statuses.find(status => status.rank === 1);
      
      if (!newStatus) {
        console.error(`No "New" status (rank 1) found for tenant ${templateTask.tenantId}`);
        return;
      }
      
      // Check if auto-approval setting is enabled
      const autoApproveTasksSetting = await this.storage.getTenantSetting(
        templateTask.tenantId, 
        "auto_approve_recurring_tasks"
      );
      
      const needsApproval = !autoApproveTasksSetting || 
                            autoApproveTasksSetting.value.toLowerCase() !== "true";
      
      // Set a descriptive task name based on the compliance period
      let taskDetails = templateTask.taskDetails || '';
      
      // If no task details exist, generate a default description
      if (!taskDetails) {
        const serviceName = templateTask.serviceTypeId 
          ? (await this.getServiceName(templateTask.tenantId, templateTask.serviceTypeId)) || 'Service'
          : 'Task';
        
        taskDetails = `${serviceName} - ${templateTask.complianceFrequency} compliance for period ${format(startDate, 'MMM yyyy')} to ${format(endDate, 'MMM yyyy')}`;
      }
      
      // Prepare the new task data
      const newTaskData: InsertTask = {
        tenantId: templateTask.tenantId,
        isAdmin: templateTask.isAdmin,
        taskType: templateTask.taskType,
        clientId: templateTask.clientId || undefined,
        entityId: templateTask.entityId || undefined,
        serviceTypeId: templateTask.serviceTypeId || undefined,
        taskCategoryId: templateTask.taskCategoryId || undefined,
        assigneeId: templateTask.assigneeId,
        dueDate: dueDate,
        statusId: newStatus.id,
        taskDetails: taskDetails,
        nextToDo: templateTask.nextToDo,
        isRecurring: false, // New instance is not recurring itself
        complianceFrequency: templateTask.complianceFrequency,
        complianceYear: format(startDate, 'yyyy'),
        complianceDuration: templateTask.complianceDuration,
        complianceStartDate: startDate,
        complianceEndDate: endDate,
        currency: templateTask.currency,
        serviceRate: templateTask.serviceRate,
        // New tracking fields
        isAutoGenerated: true,
        parentTaskId: templateTask.id,
        needsApproval: needsApproval,
      };
      
      // Create the new task
      await this.storage.createTask(newTaskData);
      console.log(`Created recurring task instance for period ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')} ${needsApproval ? '(needs approval)' : '(auto-approved)'}`);
    } catch (error) {
      console.error("Error creating recurring task instance:", error);
    }
  }
  
  /**
   * Retrieve service name for better task descriptions
   */
  private async getServiceName(tenantId: number, serviceTypeId: number): Promise<string | undefined> {
    try {
      const service = await this.storage.getServiceType(serviceTypeId, tenantId);
      return service?.name;
    } catch (error) {
      console.error("Error fetching service name:", error);
      return undefined;
    }
  }
  
  /**
   * Get all tasks that need approval (generated tasks marked as needing approval)
   */
  public async getTasksNeedingApproval(tenantId: number): Promise<Task[]> {
    try {
      const allTasks = await this.storage.getTasks(tenantId);
      return allTasks.filter(task => task.isAutoGenerated && task.needsApproval);
    } catch (error) {
      console.error("Error fetching tasks needing approval:", error);
      return [];
    }
  }
  
  /**
   * Get task history (previously approved auto-generated tasks)
   */
  public async getTaskHistory(tenantId: number): Promise<Task[]> {
    try {
      const allTasks = await this.storage.getTasks(tenantId);
      return allTasks.filter(task => 
        task.isAutoGenerated && 
        !task.needsApproval && 
        task.parentTaskId !== null
      );
    } catch (error) {
      console.error("Error fetching task history:", error);
      return [];
    }
  }
  
  /**
   * Approve a generated task (remove approval flag)
   * When approved, creates a regular task in the Tasks module
   * and marks the original parent task as non-recurring
   */
  public async approveTask(taskId: number, tenantId: number): Promise<boolean> {
    try {
      const task = await this.storage.getTask(taskId, tenantId);
      
      if (!task || !task.isAutoGenerated || !task.needsApproval) {
        return false;
      }
      
      // First, update the auto-generated task to no longer need approval
      const update = {
        needsApproval: false
      };
      
      const updated = await this.storage.updateTask(taskId, update);
      
      if (!updated) {
        return false;
      }
      
      // Next, create a new regular task based on this auto-generated task
      // This will be visible in the main Tasks module
      const regularTaskData: InsertTask = {
        tenantId: task.tenantId,
        isAdmin: task.isAdmin,
        taskType: task.taskType,
        clientId: task.clientId || undefined,
        entityId: task.entityId || undefined,
        serviceTypeId: task.serviceTypeId || undefined,
        taskCategoryId: task.taskCategoryId || undefined,
        assigneeId: task.assigneeId,
        dueDate: new Date(task.dueDate), // Ensure this is a Date object
        statusId: task.statusId,
        taskDetails: task.taskDetails || '',
        nextToDo: task.nextToDo || '',
        isRecurring: true, // Set the new task as recurring
        complianceFrequency: task.complianceFrequency || '',
        complianceYear: task.complianceYear || '',
        complianceDuration: task.complianceDuration || '',
        // Convert null to undefined and ensure Date objects
        complianceStartDate: task.complianceStartDate ? new Date(task.complianceStartDate) : undefined,
        complianceEndDate: task.complianceEndDate ? new Date(task.complianceEndDate) : undefined,
        currency: task.currency || '',
        serviceRate: task.serviceRate || 0,
        isAutoGenerated: false, // This is now a regular task
        parentTaskId: task.id, // Link to the auto-generated task for history
      };
      
      await this.storage.createTask(regularTaskData);
      
      // If this task has a parent task (the original recurring task),
      // update it to no longer be recurring
      if (task.parentTaskId) {
        const parentTask = await this.storage.getTask(task.parentTaskId, tenantId);
        
        if (parentTask && parentTask.isRecurring) {
          // Update the original parent task to no longer be recurring
          // as the newly created task will now be the source of future recurrences
          await this.storage.updateTask(parentTask.id, {
            isRecurring: false
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error approving task:", error);
      return false;
    }
  }
  
  /**
   * Approve all pending tasks for a tenant
   */
  public async approveAllPendingTasks(tenantId: number): Promise<number> {
    try {
      const pendingTasks = await this.getTasksNeedingApproval(tenantId);
      let approvedCount = 0;
      
      for (const task of pendingTasks) {
        const success = await this.approveTask(task.id, tenantId);
        if (success) approvedCount++;
      }
      
      return approvedCount;
    } catch (error) {
      console.error("Error approving all pending tasks:", error);
      return 0;
    }
  }
  
  /**
   * Reject a generated task (delete it)
   */
  public async rejectTask(taskId: number, tenantId: number): Promise<boolean> {
    try {
      const task = await this.storage.getTask(taskId, tenantId);
      
      if (!task || !task.isAutoGenerated || !task.needsApproval) {
        return false;
      }
      
      // Delete the task
      return await this.storage.deleteTask(taskId, tenantId);
    } catch (error) {
      console.error("Error rejecting task:", error);
      return false;
    }
  }
  
  /**
   * Set a task to active (sets activatedAt timestamp)
   */
  public async activateTask(taskId: number, tenantId: number): Promise<boolean> {
    try {
      const task = await this.storage.getTask(taskId, tenantId);
      
      if (!task || !task.isAutoGenerated) {
        return false;
      }
      
      // Get the "In Progress" status for this tenant (typically rank 2 or 3)
      const statuses = await this.storage.getTaskStatuses(tenantId);
      const inProgressStatus = statuses.find(status => status.name.toLowerCase().includes('progress') || status.rank === 2);
      
      if (!inProgressStatus) {
        console.error(`No suitable "In Progress" status found for tenant ${tenantId}`);
        return false;
      }
      
      // Update the task to be active and change its status
      const update = {
        isCanceled: false,
        activatedAt: new Date(),
        // Use undefined instead of null for Date field to avoid type errors
        canceledAt: undefined,
        statusId: inProgressStatus.id
      };
      
      const updated = await this.storage.updateTask(taskId, update);
      return !!updated;
    } catch (error) {
      console.error("Error activating task:", error);
      return false;
    }
  }
  
  /**
   * Cancel a task (sets isCanceled flag and canceledAt timestamp)
   */
  public async cancelTask(taskId: number, tenantId: number): Promise<boolean> {
    try {
      const task = await this.storage.getTask(taskId, tenantId);
      
      if (!task || !task.isAutoGenerated) {
        return false;
      }
      
      // Get the "Canceled" status for this tenant
      const statuses = await this.storage.getTaskStatuses(tenantId);
      const canceledStatus = statuses.find(status => 
        status.name.toLowerCase().includes('cancel') || 
        status.name.toLowerCase().includes('archived')
      );
      
      if (!canceledStatus) {
        console.error(`No "Canceled" status found for tenant ${tenantId}`);
        return false;
      }
      
      // Update the task to be canceled and change its status
      const update = {
        isCanceled: true,
        canceledAt: new Date(),
        statusId: canceledStatus.id
      };
      
      const updated = await this.storage.updateTask(taskId, update);
      return !!updated;
    } catch (error) {
      console.error("Error canceling task:", error);
      return false;
    }
  }
  
  /**
   * Resume a previously canceled task
   */
  public async resumeTask(taskId: number, tenantId: number): Promise<boolean> {
    try {
      const task = await this.storage.getTask(taskId, tenantId);
      
      if (!task || !task.isAutoGenerated || !task.isCanceled) {
        return false;
      }
      
      // Get the "In Progress" status for this tenant
      const statuses = await this.storage.getTaskStatuses(tenantId);
      const inProgressStatus = statuses.find(status => status.name.toLowerCase().includes('progress') || status.rank === 2);
      
      if (!inProgressStatus) {
        console.error(`No suitable "In Progress" status found for tenant ${tenantId}`);
        return false;
      }
      
      // Update the task to be no longer canceled and change its status
      const update = {
        isCanceled: false,
        canceledAt: undefined, // Use undefined instead of null for Date field
        activatedAt: new Date(),
        statusId: inProgressStatus.id
      };
      
      const updated = await this.storage.updateTask(taskId, update);
      return !!updated;
    } catch (error) {
      console.error("Error resuming task:", error);
      return false;
    }
  }
  
  /**
   * Permanently delete a task
   */
  public async deleteTask(taskId: number, tenantId: number): Promise<boolean> {
    try {
      const task = await this.storage.getTask(taskId, tenantId);
      
      if (!task || !task.isAutoGenerated) {
        return false;
      }
      
      // Delete the task
      return await this.storage.deleteTask(taskId, tenantId);
    } catch (error) {
      console.error("Error deleting task:", error);
      return false;
    }
  }
  
  /**
   * Calculate the next compliance period based on frequency and duration
   */
  private calculateNextCompliancePeriod(
    frequency: string, 
    duration: string,
    referenceDate: Date
  ): { startDate: Date; endDate: Date } | null {
    try {
      console.log(`Calculating next period for frequency: ${frequency}, duration: ${duration}, reference date: ${referenceDate.toISOString()}`);
      const currentYear = referenceDate.getFullYear();
      const currentMonth = referenceDate.getMonth();
      let startDate: Date, endDate: Date;
      
      switch (frequency.toLowerCase()) {
        case 'daily':
          // For daily, the next period is tomorrow
          const nextDay = addDays(referenceDate, 1);
          startDate = new Date(nextDay.setHours(0, 0, 0, 0));
          // End date is the same day at 23:59:59.999
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
          
        case 'weekly':
          // For weekly, the next period is the next 7 days
          const tomorrow = addDays(referenceDate, 1);
          startDate = new Date(tomorrow.setHours(0, 0, 0, 0));
          // End date is the 6th day after start (7 days total) at 23:59:59.999
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
          
        case 'biweekly':
          // For biweekly, the next period is the next 14 days
          const dayAfterTomorrow = addDays(referenceDate, 1);
          startDate = new Date(dayAfterTomorrow.setHours(0, 0, 0, 0));
          // End date is the 13th day after start (14 days total) at 23:59:59.999
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 13);
          endDate.setHours(23, 59, 59, 999);
          break;
          
        case 'monthly':
          // For monthly, handle special cases based on the duration
          if (duration.toLowerCase() === 'previous') {
            // Previous month
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            startDate = new Date(prevMonthYear, prevMonth, 1); // First day of previous month
            // Last day of previous month at 23:59:59.999
            endDate = new Date(currentYear, currentMonth, 0);
            endDate.setHours(23, 59, 59, 999);
          } else {
            // Get current month (for handling completed periods)
            const currentMonthStart = new Date(currentYear, currentMonth, 1);
            const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
            currentMonthEnd.setHours(23, 59, 59, 999);
            
            // Check if we're in the current month or past it
            const today = new Date();
            
            // If today is past the middle of the month, we should generate for next month
            // Otherwise, we should still generate for the current month (if it doesn't exist)
            if (today.getDate() > 15) {
              // Next month
              startDate = new Date(currentYear, currentMonth + 1, 1);
              // Last day of next month at 23:59:59.999
              endDate = new Date(currentYear, currentMonth + 2, 0);
              endDate.setHours(23, 59, 59, 999);
              
              console.log(`Monthly task - Using NEXT month: ${startDate.toDateString()} to ${endDate.toDateString()}`);
            } else {
              // Current month
              startDate = currentMonthStart;
              endDate = currentMonthEnd;
              
              console.log(`Monthly task - Using CURRENT month: ${startDate.toDateString()} to ${endDate.toDateString()}`);
            }
          }
          break;
          
        case 'quarterly':
          // For quarterly, calculate based on quarters (Q1, Q2, Q3, Q4)
          const currentQuarter = Math.floor(currentMonth / 3);
          const nextQuarterStartMonth = (currentQuarter + 1) % 4 * 3;
          
          // If we're already in Q4, move to Q1 of next year
          const nextQuarterYear = currentQuarter === 3 ? currentYear + 1 : currentYear;
          
          // First day of next quarter
          startDate = new Date(nextQuarterYear, nextQuarterStartMonth, 1);
          
          // Last day of next quarter at 23:59:59.999
          // Add 3 months to the start date, then go back 1 day
          endDate = new Date(nextQuarterYear, nextQuarterStartMonth + 3, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
          
        case 'semi-annual':
        case 'biannual':
          // For semi-annual, divide the year into two periods (Jan-Jun, Jul-Dec)
          const currentHalf = currentMonth < 6 ? 0 : 1;
          const nextHalfStartMonth = currentHalf === 0 ? 6 : 0;
          const nextHalfYear = currentHalf === 1 ? currentYear + 1 : currentYear;
          
          // First day of next half-year
          startDate = new Date(nextHalfYear, nextHalfStartMonth, 1);
          
          // Last day of next half-year at 23:59:59.999
          // Add 6 months to the start date, then go back 1 day
          endDate = new Date(nextHalfYear, nextHalfStartMonth + 6, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
          
        case 'yearly':
        case 'annual':
          // For yearly compliance, handle special cases based on the duration
          if (duration.toLowerCase() === 'fy' || duration.toLowerCase() === 'fiscal year') {
            // Fiscal year - assuming fiscal year starts in July
            // This can be customized based on the country or organization's fiscal year
            const currentFY = currentMonth >= 6 ? currentYear : currentYear - 1;
            const nextFY = currentFY + 1;
            
            // July 1st of next fiscal year
            startDate = new Date(nextFY, 6, 1);
            
            // June 30th of year after next fiscal year at 23:59:59.999
            endDate = new Date(nextFY + 1, 6, 0);
            endDate.setHours(23, 59, 59, 999);
          } else {
            // Calendar year (default)
            // January 1st of next year
            startDate = new Date(currentYear + 1, 0, 1);
            
            // December 31st of next year at 23:59:59.999
            endDate = new Date(currentYear + 1, 11, 31);
            endDate.setHours(23, 59, 59, 999);
          }
          break;
          
        default:
          console.warn(`Unsupported frequency: ${frequency}`);
          return null;
      }
      
      return { startDate, endDate };
    } catch (error) {
      console.error("Error calculating next compliance period:", error);
      return null;
    }
  }
  
  /**
   * Calculate due date (typically end of period or slightly before)
   */
  private calculateDueDate(endDate: Date): Date {
    // Due date is typically a few days before the end of the period
    // This can be customized based on business rules
    return subDays(endDate, 5);
  }
  
  /**
   * Helper to get all tenants from storage
   */
  private async getAllTenants(): Promise<Tenant[]> {
    // This is a simplification - in a real implementation,
    // we would need a method to retrieve all tenants
    const result: Tenant[] = [];
    
    // Start with tenant ID 1 and try incrementing
    // This is a workaround since our storage interface doesn't
    // provide a way to get all tenants
    for (let i = 1; i <= 100; i++) {
      const tenant = await this.storage.getTenant(i);
      if (tenant) {
        result.push(tenant);
      }
    }
    
    return result;
  }
}

// Helper type for Tenant since we're using it internally
interface Tenant {
  id: number;
  name: string;
  createdAt: Date;
}