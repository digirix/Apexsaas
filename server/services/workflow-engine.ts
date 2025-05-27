import { DatabaseStorage } from '../database-storage';
import { db } from '../db';
import {
  workflows,
  workflowTriggers,
  workflowActions,
  workflowExecutionLogs,
  workflowActionExecutions,
  WorkflowTrigger,
  WorkflowAction,
  WorkflowExecutionLog,
  InsertWorkflowExecutionLog,
  InsertWorkflowActionExecution,
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface WorkflowEvent {
  module: string;
  event: string;
  data: any;
  tenantId: number;
  userId?: number;
}

export interface ActionContext {
  triggerData: any;
  tenantId: number;
  userId?: number;
  storage: DatabaseStorage;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTimeMs: number;
}

export class WorkflowEngine {
  private storage: DatabaseStorage;
  private actionHandlers: Map<string, (config: any, context: ActionContext) => Promise<ActionResult>>;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    this.actionHandlers = new Map();
    this.initializeActionHandlers();
  }

  private initializeActionHandlers() {
    // Register all action handlers
    this.actionHandlers.set('create_task', this.handleCreateTask.bind(this));
    this.actionHandlers.set('update_task', this.handleUpdateTask.bind(this));
    this.actionHandlers.set('send_notification', this.handleSendNotification.bind(this));
    this.actionHandlers.set('update_client_field', this.handleUpdateClientField.bind(this));
    this.actionHandlers.set('create_invoice', this.handleCreateInvoice.bind(this));
    this.actionHandlers.set('send_email', this.handleSendEmail.bind(this));
    this.actionHandlers.set('call_webhook', this.handleCallWebhook.bind(this));
    this.actionHandlers.set('update_entity_field', this.handleUpdateEntityField.bind(this));
    this.actionHandlers.set('assign_user', this.handleAssignUser.bind(this));
  }

  // Main method to process workflow events
  async processEvent(event: WorkflowEvent): Promise<void> {
    try {
      console.log(`Workflow Engine: Processing event ${event.event} for module ${event.module} in tenant ${event.tenantId}`);

      // Find active workflows with matching triggers
      const matchingTriggers = await this.findMatchingTriggers(event);

      if (matchingTriggers.length === 0) {
        console.log(`Workflow Engine: No matching triggers found for event ${event.event} in module ${event.module}`);
        return;
      }

      // Execute each matching workflow
      for (const trigger of matchingTriggers) {
        await this.executeWorkflow(trigger, event);
      }
    } catch (error) {
      console.error('Workflow Engine: Error processing event:', error);
    }
  }

  private async findMatchingTriggers(event: WorkflowEvent): Promise<(WorkflowTrigger & { workflow: any })[]> {
    const matchingTriggers = await db
      .select({
        trigger: workflowTriggers,
        workflow: workflows,
      })
      .from(workflowTriggers)
      .leftJoin(workflows, eq(workflowTriggers.workflowId, workflows.id))
      .where(
        and(
          eq(workflowTriggers.tenantId, event.tenantId),
          eq(workflowTriggers.triggerModule, event.module),
          eq(workflowTriggers.triggerEvent, event.event as any),
          eq(workflowTriggers.isActive, true),
          eq(workflows.isActive, true),
          eq(workflows.status, 'active')
        )
      );

    // Filter by trigger conditions if specified
    const filteredTriggers = [];
    for (const row of matchingTriggers) {
      const trigger = row.trigger;
      const workflow = row.workflow;

      if (trigger.triggerConditions) {
        const conditionsMet = await this.evaluateConditions(
          JSON.parse(trigger.triggerConditions),
          event.data
        );
        if (conditionsMet) {
          filteredTriggers.push({ ...trigger, workflow });
        }
      } else {
        filteredTriggers.push({ ...trigger, workflow });
      }
    }

    return filteredTriggers;
  }

  private async evaluateConditions(conditions: any, eventData: any): Promise<boolean> {
    try {
      // Simple condition evaluation
      // Format: { field: "client.status", operator: "equals", value: "Active" }
      if (conditions.field && conditions.operator && conditions.value !== undefined) {
        const fieldValue = this.getNestedValue(eventData, conditions.field);
        
        switch (conditions.operator) {
          case 'equals':
            return fieldValue === conditions.value;
          case 'not_equals':
            return fieldValue !== conditions.value;
          case 'contains':
            return fieldValue?.toString().includes(conditions.value);
          case 'starts_with':
            return fieldValue?.toString().startsWith(conditions.value);
          case 'ends_with':
            return fieldValue?.toString().endsWith(conditions.value);
          case 'greater_than':
            return Number(fieldValue) > Number(conditions.value);
          case 'less_than':
            return Number(fieldValue) < Number(conditions.value);
          default:
            return true;
        }
      }

      // Handle array of conditions with AND/OR logic
      if (Array.isArray(conditions)) {
        return conditions.every(condition => this.evaluateConditions(condition, eventData));
      }

      return true;
    } catch (error) {
      console.error('Workflow Engine: Error evaluating conditions:', error);
      return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async executeWorkflow(trigger: WorkflowTrigger & { workflow: any }, event: WorkflowEvent): Promise<void> {
    const startTime = Date.now();
    let executionStatus: 'success' | 'failed' | 'in_progress' = 'in_progress';
    let errorMessage: string | undefined;
    const actionLogs: any[] = [];

    try {
      console.log(`Workflow Engine: Executing workflow ${trigger.workflow.name} (ID: ${trigger.workflowId})`);

      // Get workflow actions
      const actions = await this.storage.db
        .select()
        .from(workflowActions)
        .where(
          and(
            eq(workflowActions.workflowId, trigger.workflowId),
            eq(workflowActions.tenantId, event.tenantId),
            eq(workflowActions.isActive, true)
          )
        )
        .orderBy(workflowActions.sequenceOrder);

      // Execute actions in sequence
      for (const action of actions) {
        const actionResult = await this.executeAction(action, event);
        actionLogs.push({
          actionId: action.id,
          actionType: action.actionType,
          success: actionResult.success,
          data: actionResult.data,
          error: actionResult.error,
          executionTimeMs: actionResult.executionTimeMs,
        });

        // If action fails and we want to stop on failure, break
        if (!actionResult.success) {
          console.error(`Workflow Engine: Action ${action.actionType} failed:`, actionResult.error);
          // For now, continue with other actions even if one fails
        }
      }

      executionStatus = actionLogs.every(log => log.success) ? 'success' : 'failed';
    } catch (error) {
      console.error('Workflow Engine: Error executing workflow:', error);
      executionStatus = 'failed';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    // Log execution
    const executionTime = Date.now() - startTime;
    await this.logExecution({
      tenantId: event.tenantId,
      workflowId: trigger.workflowId,
      triggerId: trigger.id,
      triggerEventData: JSON.stringify(event.data),
      executionStatus,
      actionLogs: JSON.stringify(actionLogs),
      errorMessage,
      executionTimeMs: executionTime,
    });
  }

  private async executeAction(action: WorkflowAction, event: WorkflowEvent): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      const handler = this.actionHandlers.get(action.actionType);
      if (!handler) {
        throw new Error(`No handler found for action type: ${action.actionType}`);
      }

      const actionConfig = JSON.parse(action.actionConfiguration);
      const processedConfig = this.processTemplateVariables(actionConfig, event.data);

      const context: ActionContext = {
        triggerData: event.data,
        tenantId: event.tenantId,
        userId: event.userId,
        storage: this.storage,
      };

      const result = await handler(processedConfig, context);
      
      return {
        ...result,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  private processTemplateVariables(config: any, triggerData: any): any {
    const processValue = (value: any): any => {
      if (typeof value === 'string') {
        // Replace template variables like {{trigger.client.name}}
        return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
          if (path.startsWith('trigger.')) {
            const dataPath = path.substring(8); // Remove 'trigger.' prefix
            return this.getNestedValue(triggerData, dataPath) || match;
          }
          return match;
        });
      } else if (Array.isArray(value)) {
        return value.map(processValue);
      } else if (typeof value === 'object' && value !== null) {
        const processed: any = {};
        for (const [key, val] of Object.entries(value)) {
          processed[key] = processValue(val);
        }
        return processed;
      }
      return value;
    };

    return processValue(config);
  }

  // Action Handlers
  private async handleCreateTask(config: any, context: ActionContext): Promise<ActionResult> {
    try {
      // Import task types
      const { tasks, insertTaskSchema } = await import('@shared/schema');
      
      const taskData = {
        tenantId: context.tenantId,
        title: config.title || 'Automated Task',
        description: config.description || '',
        clientId: config.clientId,
        entityId: config.entityId,
        taskCategoryId: config.taskCategoryId,
        assigneeId: config.assigneeId,
        dueDateOffset: config.dueDateOffset || '+7 days',
        priority: config.priority || 'Medium',
        status: config.status || 'Pending',
        isRevenue: config.isRevenue || false,
      };

      // Parse due date offset
      if (config.dueDateOffset) {
        const match = config.dueDateOffset.match(/([+-])(\d+)\s*(days?|weeks?|months?)/);
        if (match) {
          const [, sign, amount, unit] = match;
          const days = parseInt(amount) * (unit.startsWith('week') ? 7 : unit.startsWith('month') ? 30 : 1);
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (sign === '+' ? days : -days));
          taskData.dueDateOffset = dueDate.toISOString();
        }
      }

      // Create task using the storage interface
      const createdTask = await context.storage.createTask(taskData);

      return {
        success: true,
        data: createdTask,
        executionTimeMs: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task',
        executionTimeMs: 0,
      };
    }
  }

  private async handleUpdateTask(config: any, context: ActionContext): Promise<ActionResult> {
    try {
      const taskId = config.taskId;
      const updates = config.updates || {};

      if (!taskId) {
        throw new Error('Task ID is required for update task action');
      }

      // Update task using the storage interface
      const updatedTask = await context.storage.updateTask(taskId, updates);

      return {
        success: true,
        data: updatedTask,
        executionTimeMs: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task',
        executionTimeMs: 0,
      };
    }
  }

  private async handleSendNotification(config: any, context: ActionContext): Promise<ActionResult> {
    try {
      // For now, just log the notification
      // In the future, this could integrate with your notification system
      console.log('Workflow Notification:', {
        to: config.recipientRole || config.recipientId,
        message: config.message,
        type: config.type || 'info',
      });

      return {
        success: true,
        data: { notificationSent: true },
        executionTimeMs: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
        executionTimeMs: 0,
      };
    }
  }

  private async handleUpdateClientField(config: any, context: ActionContext): Promise<ActionResult> {
    try {
      const clientId = config.clientId;
      const fieldName = config.fieldName;
      const fieldValue = config.fieldValue;

      if (!clientId || !fieldName) {
        throw new Error('Client ID and field name are required');
      }

      const updateData = { [fieldName]: fieldValue };
      const updatedClient = await context.storage.updateClient(clientId, updateData);

      return {
        success: true,
        data: updatedClient,
        executionTimeMs: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update client field',
        executionTimeMs: 0,
      };
    }
  }

  private async handleCreateInvoice(config: any, context: ActionContext): Promise<ActionResult> {
    try {
      // This would integrate with your invoice creation logic
      console.log('Workflow: Create Invoice action triggered', config);

      return {
        success: true,
        data: { invoiceCreated: true },
        executionTimeMs: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invoice',
        executionTimeMs: 0,
      };
    }
  }

  private async handleSendEmail(config: any, context: ActionContext): Promise<ActionResult> {
    try {
      // This would integrate with your email service
      console.log('Workflow: Send Email action triggered', {
        to: config.to,
        subject: config.subject,
        body: config.body,
      });

      return {
        success: true,
        data: { emailSent: true },
        executionTimeMs: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
        executionTimeMs: 0,
      };
    }
  }

  private async handleCallWebhook(config: any, context: ActionContext): Promise<ActionResult> {
    try {
      const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(config.payload),
      });

      const responseData = await response.json();

      return {
        success: response.ok,
        data: responseData,
        executionTimeMs: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to call webhook',
        executionTimeMs: 0,
      };
    }
  }

  private async handleUpdateEntityField(config: any, context: ActionContext): Promise<ActionResult> {
    try {
      const entityId = config.entityId;
      const fieldName = config.fieldName;
      const fieldValue = config.fieldValue;

      if (!entityId || !fieldName) {
        throw new Error('Entity ID and field name are required');
      }

      const updateData = { [fieldName]: fieldValue };
      const updatedEntity = await context.storage.updateEntity(entityId, updateData);

      return {
        success: true,
        data: updatedEntity,
        executionTimeMs: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update entity field',
        executionTimeMs: 0,
      };
    }
  }

  private async handleAssignUser(config: any, context: ActionContext): Promise<ActionResult> {
    try {
      // This would handle user assignment logic
      console.log('Workflow: Assign User action triggered', config);

      return {
        success: true,
        data: { userAssigned: true },
        executionTimeMs: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign user',
        executionTimeMs: 0,
      };
    }
  }

  private async logExecution(logData: InsertWorkflowExecutionLog): Promise<void> {
    try {
      await this.storage.db.insert(workflowExecutionLogs).values(logData);
    } catch (error) {
      console.error('Workflow Engine: Failed to log execution:', error);
    }
  }

  // Public method to manually trigger a workflow (for testing)
  async triggerWorkflow(workflowId: number, testData: any): Promise<void> {
    try {
      const workflow = await this.storage.db
        .select()
        .from(workflows)
        .where(eq(workflows.id, workflowId))
        .limit(1);

      if (workflow.length === 0) {
        throw new Error('Workflow not found');
      }

      const triggers = await this.storage.db
        .select()
        .from(workflowTriggers)
        .where(eq(workflowTriggers.workflowId, workflowId))
        .limit(1);

      if (triggers.length === 0) {
        throw new Error('No triggers found for workflow');
      }

      const event: WorkflowEvent = {
        module: triggers[0].triggerModule,
        event: triggers[0].triggerEvent,
        data: testData,
        tenantId: workflow[0].tenantId,
      };

      await this.executeWorkflow({ ...triggers[0], workflow: workflow[0] }, event);
    } catch (error) {
      console.error('Workflow Engine: Failed to trigger workflow manually:', error);
      throw error;
    }
  }
}

// Global workflow engine instance
let workflowEngineInstance: WorkflowEngine | null = null;

export function getWorkflowEngine(storage: DatabaseStorage): WorkflowEngine {
  if (!workflowEngineInstance) {
    workflowEngineInstance = new WorkflowEngine(storage);
  }
  return workflowEngineInstance;
}

// Event emitter function for other modules to use
export async function emitWorkflowEvent(
  module: string,
  event: string,
  data: any,
  tenantId: number,
  userId?: number,
  storage?: DatabaseStorage
): Promise<void> {
  if (!storage) {
    console.warn('Workflow Engine: No storage provided, skipping event emission');
    return;
  }

  const engine = getWorkflowEngine(storage);
  await engine.processEvent({
    module,
    event,
    data,
    tenantId,
    userId,
  });
}