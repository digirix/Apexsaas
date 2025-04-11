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
  
  constructor(storage: IStorage) {
    this.storage = storage;
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
      // Get lead days setting for this tenant, or use default
      const leadDaysSetting = await this.storage.getTenantSetting(tenantId, "recurring_task_lead_days");
      const leadDays = leadDaysSetting ? parseInt(leadDaysSetting.value) : DEFAULT_LEAD_DAYS;
      
      // Get all recurring tasks for this tenant
      const allTasks = await this.storage.getTasks(tenantId);
      const recurringTasks = allTasks.filter(task => task.isRecurring);
      
      // Check each recurring task
      for (const task of recurringTasks) {
        await this.processRecurringTask(task, leadDays);
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
    // Skip processing if task doesn't have compliance information
    if (!task.complianceFrequency || !task.complianceDuration) {
      return;
    }
    
    // Calculate the next compliance period
    const nextPeriod = this.calculateNextCompliancePeriod(
      task.complianceFrequency, 
      task.complianceDuration,
      new Date() // Current date as reference
    );
    
    if (!nextPeriod) {
      return; // Skip if we couldn't calculate the next period
    }
    
    const { startDate, endDate } = nextPeriod;
    
    // Check if the task for this period already exists
    const existingTasks = await this.storage.getTasks(
      task.tenantId,
      task.clientId || undefined,
      task.entityId || undefined,
      task.isAdmin
    );
    
    const periodExists = existingTasks.some(existingTask => {
      // Check if this task matches the recurring template and period
      return existingTask.taskCategoryId === task.taskCategoryId &&
        existingTask.serviceTypeId === task.serviceTypeId &&
        existingTask.complianceStartDate?.getTime() === startDate.getTime() &&
        existingTask.complianceEndDate?.getTime() === endDate.getTime();
    });
    
    // If the task doesn't exist and is within the lead time, create it
    if (!periodExists) {
      const dueDate = this.calculateDueDate(endDate);
      const leadTimeThreshold = addDays(dueDate, -leadDays);
      const now = new Date();
      
      if (now >= leadTimeThreshold) {
        await this.createRecurringTaskInstance(task, startDate, endDate, dueDate);
      }
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
        taskDetails: templateTask.taskDetails,
        nextToDo: templateTask.nextToDo,
        isRecurring: false, // New instance is not recurring itself
        complianceFrequency: templateTask.complianceFrequency,
        complianceYear: format(startDate, 'yyyy'),
        complianceDuration: templateTask.complianceDuration,
        complianceStartDate: startDate,
        complianceEndDate: endDate,
        currency: templateTask.currency,
        serviceRate: templateTask.serviceRate,
      };
      
      // Create the new task
      await this.storage.createTask(newTaskData);
      console.log(`Created recurring task instance for period ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
    } catch (error) {
      console.error("Error creating recurring task instance:", error);
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
      const currentYear = referenceDate.getFullYear();
      let startDate: Date, endDate: Date;
      
      switch (frequency.toLowerCase()) {
        case 'monthly':
          // For monthly, the next period is the next month
          const nextMonth = addMonths(startOfMonth(referenceDate), 1);
          startDate = startOfMonth(nextMonth);
          endDate = endOfMonth(nextMonth);
          break;
          
        case 'quarterly':
          // For quarterly, calculate based on quarters (Q1, Q2, Q3, Q4)
          const currentQuarter = Math.floor(referenceDate.getMonth() / 3);
          const nextQuarterStartMonth = (currentQuarter + 1) % 4 * 3;
          
          // If we're already in Q4, move to Q1 of next year
          const nextQuarterYear = currentQuarter === 3 ? currentYear + 1 : currentYear;
          const nextQuarterDate = new Date(nextQuarterYear, nextQuarterStartMonth, 1);
          
          startDate = startOfQuarter(nextQuarterDate);
          endDate = endOfQuarter(nextQuarterDate);
          break;
          
        case 'yearly':
        case 'annual':
          // For yearly, use the next calendar year
          startDate = new Date(currentYear + 1, 0, 1); // Jan 1 of next year
          endDate = new Date(currentYear + 1, 11, 31); // Dec 31 of next year
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