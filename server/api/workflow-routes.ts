import type { Express } from "express";
import { requirePermission } from "../middleware/permissions";
import { db } from "../db";
import { 
  workflows, 
  workflowTriggers, 
  workflowActions, 
  workflowExecutionLogs,
  workflowTemplates,
  insertWorkflowSchema,
  insertWorkflowTriggerSchema,
  insertWorkflowActionSchema,
  completeWorkflowSchema
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export function registerWorkflowRoutes(app: Express, storage: any) {
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Get all workflows for tenant
  app.get("/api/v1/workflows", isAuthenticated, requirePermission(storage, "workflow-automation", "read"), async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      const tenantWorkflows = await db
        .select({
          id: workflows.id,
          name: workflows.name,
          description: workflows.description,
          status: workflows.status,
          isActive: workflows.isActive,
          createdAt: workflows.createdAt,
          updatedAt: workflows.updatedAt
        })
        .from(workflows)
        .where(eq(workflows.tenantId, tenantId))
        .orderBy(desc(workflows.updatedAt));

      res.json(tenantWorkflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ message: "Failed to fetch workflows" });
    }
  });

  // Get workflow details with triggers and actions
  app.get("/api/v1/workflows/:id", isAuthenticated, requirePermission(storage, "workflow-automation", "read"), async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const workflowId = parseInt(req.params.id);

      // Get workflow
      const workflow = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, workflowId), eq(workflows.tenantId, tenantId)))
        .limit(1);

      if (workflow.length === 0) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      // Get triggers
      const triggers = await db
        .select()
        .from(workflowTriggers)
        .where(eq(workflowTriggers.workflowId, workflowId));

      // Get actions
      const actions = await db
        .select()
        .from(workflowActions)
        .where(eq(workflowActions.workflowId, workflowId))
        .orderBy(workflowActions.sequenceOrder);

      res.json({
        workflow: workflow[0],
        triggers,
        actions
      });
    } catch (error) {
      console.error("Error fetching workflow details:", error);
      res.status(500).json({ message: "Failed to fetch workflow details" });
    }
  });

  // Create workflow
  app.post("/api/v1/workflows", isAuthenticated, requirePermission(storage, "workflow-automation", "create"), async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = (req.user as any).id;

      const validatedData = completeWorkflowSchema.parse(req.body);

      // Create workflow
      const [newWorkflow] = await db
        .insert(workflows)
        .values({
          ...validatedData.workflow,
          tenantId,
          createdBy: userId
        })
        .returning();

      // Create triggers
      if (validatedData.triggers.length > 0) {
        await db.insert(workflowTriggers).values(
          validatedData.triggers.map(trigger => ({
            ...trigger,
            tenantId,
            workflowId: newWorkflow.id
          }))
        );
      }

      // Create actions
      if (validatedData.actions.length > 0) {
        await db.insert(workflowActions).values(
          validatedData.actions.map(action => ({
            ...action,
            tenantId,
            workflowId: newWorkflow.id
          }))
        );
      }

      res.status(201).json(newWorkflow);
    } catch (error) {
      console.error("Error creating workflow:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create workflow" });
    }
  });

  // Update workflow
  app.put("/api/v1/workflows/:id", isAuthenticated, requirePermission(storage, "workflow-automation", "update"), async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = (req.user as any).id;
      const workflowId = parseInt(req.params.id);

      const validatedData = completeWorkflowSchema.parse(req.body);

      // Update workflow
      const [updatedWorkflow] = await db
        .update(workflows)
        .set({
          ...validatedData.workflow,
          updatedBy: userId,
          updatedAt: new Date()
        })
        .where(and(eq(workflows.id, workflowId), eq(workflows.tenantId, tenantId)))
        .returning();

      if (!updatedWorkflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      // Delete existing triggers and actions
      await db.delete(workflowTriggers).where(eq(workflowTriggers.workflowId, workflowId));
      await db.delete(workflowActions).where(eq(workflowActions.workflowId, workflowId));

      // Create new triggers
      if (validatedData.triggers.length > 0) {
        await db.insert(workflowTriggers).values(
          validatedData.triggers.map(trigger => ({
            ...trigger,
            tenantId,
            workflowId
          }))
        );
      }

      // Create new actions
      if (validatedData.actions.length > 0) {
        await db.insert(workflowActions).values(
          validatedData.actions.map(action => ({
            ...action,
            tenantId,
            workflowId
          }))
        );
      }

      res.json(updatedWorkflow);
    } catch (error) {
      console.error("Error updating workflow:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update workflow" });
    }
  });

  // Delete workflow
  app.delete("/api/v1/workflows/:id", isAuthenticated, requirePermission(storage, "workflow-automation", "delete"), async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const workflowId = parseInt(req.params.id);

      // Delete triggers and actions first
      await db.delete(workflowTriggers).where(eq(workflowTriggers.workflowId, workflowId));
      await db.delete(workflowActions).where(eq(workflowActions.workflowId, workflowId));

      // Delete workflow
      const result = await db
        .delete(workflows)
        .where(and(eq(workflows.id, workflowId), eq(workflows.tenantId, tenantId)));

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      res.status(500).json({ message: "Failed to delete workflow" });
    }
  });

  // Get workflow execution logs
  app.get("/api/v1/workflows/:id/logs", isAuthenticated, requirePermission(storage, "workflow-automation", "read"), async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const workflowId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;

      const logs = await db
        .select()
        .from(workflowExecutionLogs)
        .where(and(
          eq(workflowExecutionLogs.workflowId, workflowId),
          eq(workflowExecutionLogs.tenantId, tenantId)
        ))
        .orderBy(desc(workflowExecutionLogs.executedAt))
        .limit(limit);

      res.json(logs);
    } catch (error) {
      console.error("Error fetching workflow logs:", error);
      res.status(500).json({ message: "Failed to fetch workflow logs" });
    }
  });

  // Get available trigger modules and events
  app.get("/api/v1/workflows/config/triggers", isAuthenticated, requirePermission(storage, "workflow-automation", "read"), async (req, res) => {
    try {
      const triggerConfig = {
        types: [
          {
            name: 'task_deadline',
            displayName: 'Task Deadline Approaching',
            description: 'Trigger when task deadlines are approaching or overdue',
            category: 'Task Management',
            configFields: [
              { name: 'timeframe', type: 'select', options: ['1 day', '3 days', '1 week', '2 weeks'], required: true, defaultValue: '3 days' },
              { name: 'taskType', type: 'select', options: ['All Tasks', 'Tax Returns', 'Compliance Filings', 'Review Tasks', 'Client Meetings'], required: false, defaultValue: 'All Tasks' },
              { name: 'clientCategory', type: 'select', options: ['All Clients', 'High Priority', 'Large Entities', 'New Clients'], required: false, defaultValue: 'All Clients' },
              { name: 'assignedUser', type: 'text', required: false, placeholder: 'Filter by assigned user (optional)' }
            ]
          },
          {
            name: 'task_status_change',
            displayName: 'Task Status Changed',
            description: 'Trigger when task status changes (created, in progress, completed)',
            category: 'Task Management',
            configFields: [
              { name: 'fromStatus', type: 'select', options: ['Any', 'Not Started', 'In Progress', 'Under Review', 'Completed'], required: false, defaultValue: 'Any' },
              { name: 'toStatus', type: 'select', options: ['Not Started', 'In Progress', 'Under Review', 'Completed'], required: true, defaultValue: 'Completed' },
              { name: 'taskCategory', type: 'select', options: ['All Tasks', 'Compliance', 'Tax Preparation', 'Reviews', 'Meetings'], required: false, defaultValue: 'All Tasks' }
            ]
          },
          {
            name: 'client_document_upload',
            displayName: 'Client Document Uploaded',
            description: 'Trigger when clients upload documents to their portal',
            category: 'Document Management',
            configFields: [
              { name: 'documentTypes', type: 'text', required: false, placeholder: 'pdf,xlsx,csv,png,jpg (leave empty for all)' },
              { name: 'minFileSize', type: 'number', required: false, placeholder: 'Minimum file size in MB' },
              { name: 'clientType', type: 'select', options: ['All Clients', 'Corporate', 'Individual', 'Partnership'], required: false, defaultValue: 'All Clients' },
              { name: 'requiresReview', type: 'select', options: ['Yes', 'No', 'Auto-detect'], required: false, defaultValue: 'Auto-detect' }
            ]
          },
          {
            name: 'compliance_deadline',
            displayName: 'Compliance Deadline Alert',
            description: 'Trigger based on regulatory compliance deadlines',
            category: 'Compliance',
            configFields: [
              { name: 'jurisdiction', type: 'select', options: ['All Jurisdictions', 'Federal', 'State', 'Local', 'International'], required: false, defaultValue: 'All Jurisdictions' },
              { name: 'alertDays', type: 'select', options: ['7 days', '14 days', '30 days', '60 days'], required: true, defaultValue: '14 days' },
              { name: 'filingType', type: 'select', options: ['All Filings', 'Tax Returns', 'Annual Reports', 'Quarterly Reports', 'VAT Returns'], required: false, defaultValue: 'All Filings' },
              { name: 'entityType', type: 'select', options: ['All Entities', 'Corporation', 'LLC', 'Partnership', 'Individual'], required: false, defaultValue: 'All Entities' }
            ]
          },
          {
            name: 'recurring_schedule',
            displayName: 'Recurring Schedule',
            description: 'Trigger workflow on a regular schedule for routine operations',
            category: 'Automation',
            configFields: [
              { name: 'frequency', type: 'select', options: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annually'], required: true, defaultValue: 'Monthly' },
              { name: 'dayOfWeek', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: false },
              { name: 'timeOfDay', type: 'time', required: true, defaultValue: '09:00' },
              { name: 'timezone', type: 'select', options: ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London'], required: true, defaultValue: 'America/New_York' }
            ]
          },
          {
            name: 'client_portal_activity',
            displayName: 'Client Portal Activity',
            description: 'Trigger when clients access their portal or perform specific actions',
            category: 'Client Management',
            configFields: [
              { name: 'activityType', type: 'select', options: ['Login', 'Document Download', 'Message Sent', 'Invoice Viewed', 'Payment Made'], required: true, defaultValue: 'Login' },
              { name: 'clientType', type: 'select', options: ['All Clients', 'New Clients', 'VIP Clients', 'Inactive Clients'], required: false, defaultValue: 'All Clients' },
              { name: 'timeWindow', type: 'select', options: ['Immediate', '1 hour', '4 hours', '24 hours'], required: false, defaultValue: 'Immediate' }
            ]
          },
          {
            name: 'manual_trigger',
            displayName: 'Manual Trigger',
            description: 'Manually start workflow when needed',
            category: 'Manual',
            configFields: [
              { name: 'buttonLabel', type: 'text', required: false, placeholder: 'Start Process', defaultValue: 'Start Process' },
              { name: 'confirmationMessage', type: 'text', required: false, placeholder: 'Are you sure you want to start this workflow?' },
              { name: 'accessLevel', type: 'select', options: ['All Users', 'Managers Only', 'Admins Only'], required: false, defaultValue: 'All Users' }
            ]
          }
        ]
      };

      res.json(triggerConfig);
    } catch (error) {
      console.error("Error fetching trigger config:", error);
      res.status(500).json({ message: "Failed to fetch trigger configuration" });
    }
  });

  // Get available action types
  app.get("/api/v1/workflows/config/actions", isAuthenticated, requirePermission(storage, "workflow-automation", "read"), async (req, res) => {
    try {
      const actionConfig = {
        types: [
          {
            name: "create_task",
            displayName: "Create Follow-up Task",
            description: "Automatically create new tasks based on workflow triggers",
            category: "Task Management",
            configFields: [
              { name: "taskTitle", type: "text", required: true, placeholder: "Review {{client.name}} compliance documents" },
              { name: "taskDescription", type: "textarea", required: false, placeholder: "Detailed task description with context" },
              { name: "assignToUser", type: "select", options: ["Trigger User", "Manager", "Compliance Team", "Tax Team", "Specific User"], required: true, defaultValue: "Trigger User" },
              { name: "specificUser", type: "text", required: false, placeholder: "user@example.com (if Specific User selected)" },
              { name: "dueDateOffset", type: "select", options: ["Same Day", "1 Day", "3 Days", "1 Week", "2 Weeks", "1 Month"], required: true, defaultValue: "3 Days" },
              { name: "priority", type: "select", options: ["Low", "Medium", "High", "Critical"], required: true, defaultValue: "Medium" },
              { name: "taskCategory", type: "select", options: ["Compliance Review", "Tax Preparation", "Client Follow-up", "Document Review", "Quality Control"], required: true, defaultValue: "Compliance Review" }
            ]
          },
          {
            name: "send_email",
            displayName: "Send Email Communication",
            description: "Send automated emails to clients, staff, or external parties",
            category: "Communication",
            configFields: [
              { name: "recipientType", type: "select", options: ["Client", "Assigned Staff", "Manager", "Compliance Team", "Custom Email"], required: true, defaultValue: "Client" },
              { name: "customEmail", type: "text", required: false, placeholder: "custom@example.com (if Custom Email selected)" },
              { name: "emailTemplate", type: "select", options: ["Custom", "Deadline Reminder", "Document Request", "Task Completion", "Compliance Alert"], required: true, defaultValue: "Custom" },
              { name: "subject", type: "text", required: true, placeholder: "Important: {{task.title}} deadline approaching" },
              { name: "emailBody", type: "textarea", required: true, placeholder: "Dear {{client.name}},\n\nThis is a reminder about..." },
              { name: "includeAttachments", type: "select", options: ["None", "Related Documents", "Compliance Checklist", "Tax Forms"], required: false, defaultValue: "None" },
              { name: "urgent", type: "select", options: ["Normal", "High Priority", "Urgent"], required: false, defaultValue: "Normal" }
            ]
          },
          {
            name: "update_status",
            displayName: "Update Status/Progress",
            description: "Update the status of tasks, clients, or entities",
            category: "Data Management",
            configFields: [
              { name: "updateType", type: "select", options: ["Task Status", "Client Status", "Entity Status", "Compliance Status"], required: true, defaultValue: "Task Status" },
              { name: "newStatus", type: "text", required: true, placeholder: "e.g., In Review, Completed, Needs Attention" },
              { name: "addNotes", type: "textarea", required: false, placeholder: "Optional notes about the status change" },
              { name: "notifyStakeholders", type: "select", options: ["No", "Assigned User", "Team", "Client"], required: false, defaultValue: "Assigned User" },
              { name: "updatePriority", type: "select", options: ["Keep Current", "Low", "Medium", "High", "Critical"], required: false, defaultValue: "Keep Current" }
            ]
          },
          {
            name: "generate_report",
            displayName: "Generate Compliance Report",
            description: "Create automated reports and documents",
            category: "Document Generation",
            configFields: [
              { name: "reportType", type: "select", options: ["Compliance Summary", "Task Progress", "Deadline Report", "Client Status", "Custom Report"], required: true, defaultValue: "Compliance Summary" },
              { name: "reportFormat", type: "select", options: ["PDF", "Excel", "CSV", "Word"], required: true, defaultValue: "PDF" },
              { name: "includeData", type: "select", options: ["Current Period", "Last 30 Days", "Last Quarter", "Year to Date", "Custom Range"], required: true, defaultValue: "Current Period" },
              { name: "recipients", type: "text", required: false, placeholder: "Email addresses to send report (optional)" },
              { name: "saveLocation", type: "text", required: false, placeholder: "File path to save report (optional)" }
            ]
          },
          {
            name: "schedule_followup",
            displayName: "Schedule Follow-up Action",
            description: "Schedule future actions or reminders",
            category: "Planning",
            configFields: [
              { name: "followupAction", type: "select", options: ["Send Reminder", "Create Task", "Generate Report", "Check Status"], required: true, defaultValue: "Send Reminder" },
              { name: "scheduleTime", type: "select", options: ["1 Day", "3 Days", "1 Week", "2 Weeks", "1 Month", "Custom"], required: true, defaultValue: "1 Week" },
              { name: "customDays", type: "number", required: false, placeholder: "Days from now (if Custom selected)" },
              { name: "condition", type: "text", required: false, placeholder: "Only execute if condition is met (optional)" },
              { name: "reminderMessage", type: "textarea", required: false, placeholder: "Custom message for the follow-up" }
            ]
          },
          {
            name: "api_integration",
            displayName: "External API Call",
            description: "Integrate with external accounting or compliance systems",
            category: "Integration",
            configFields: [
              { name: "apiProvider", type: "select", options: ["QuickBooks", "Xero", "Custom API", "Government Portal", "Bank API"], required: true, defaultValue: "Custom API" },
              { name: "apiEndpoint", type: "text", required: true, placeholder: "https://api.example.com/endpoint" },
              { name: "httpMethod", type: "select", options: ["GET", "POST", "PUT", "DELETE"], required: true, defaultValue: "POST" },
              { name: "authType", type: "select", options: ["Bearer Token", "API Key", "OAuth", "Basic Auth"], required: true, defaultValue: "Bearer Token" },
              { name: "requestData", type: "textarea", required: false, placeholder: "JSON data to send (for POST/PUT)" },
              { name: "responseAction", type: "select", options: ["Save to Database", "Send Email", "Create Task", "Log Only"], required: false, defaultValue: "Log Only" }
            ]
          },
          {
            name: "conditional_branch",
            displayName: "Conditional Logic",
            description: "Execute different actions based on conditions",
            category: "Logic",
            configFields: [
              { name: "conditionType", type: "select", options: ["Task Amount", "Client Type", "Due Date", "Status", "Custom"], required: true, defaultValue: "Due Date" },
              { name: "operator", type: "select", options: ["Greater Than", "Less Than", "Equal To", "Contains", "Not Equal"], required: true, defaultValue: "Less Than" },
              { name: "compareValue", type: "text", required: true, placeholder: "Value to compare against" },
              { name: "trueAction", type: "select", options: ["Send Email", "Create Task", "Update Status", "Generate Report"], required: true, defaultValue: "Send Email" },
              { name: "falseAction", type: "select", options: ["Send Email", "Create Task", "Update Status", "Do Nothing"], required: false, defaultValue: "Do Nothing" }
            ]
          },
          {
            name: "data_sync",
            displayName: "Data Synchronization",
            description: "Sync data between systems or update records",
            category: "Data Management",
            configFields: [
              { name: "syncType", type: "select", options: ["Client Data", "Task Data", "Financial Data", "Compliance Data"], required: true, defaultValue: "Client Data" },
              { name: "sourceSystem", type: "select", options: ["Internal Database", "External API", "File Import", "Manual Entry"], required: true, defaultValue: "Internal Database" },
              { name: "targetSystem", type: "select", options: ["Internal Database", "External API", "File Export", "Email Report"], required: true, defaultValue: "Internal Database" },
              { name: "syncFields", type: "textarea", required: true, placeholder: "JSON mapping of fields to sync" },
              { name: "conflictResolution", type: "select", options: ["Overwrite", "Skip", "Merge", "Manual Review"], required: false, defaultValue: "Skip" }
            ]
          },
          {
            name: "wait_delay",
            displayName: "Wait/Delay Action",
            description: "Add delays between workflow actions",
            category: "Control",
            configFields: [
              { name: "delayType", type: "select", options: ["Fixed Time", "Business Days", "Until Date", "Until Condition"], required: true, defaultValue: "Fixed Time" },
              { name: "delayAmount", type: "number", required: false, placeholder: "Number of units to wait" },
              { name: "delayUnit", type: "select", options: ["Minutes", "Hours", "Days", "Weeks"], required: false, defaultValue: "Hours" },
              { name: "waitCondition", type: "text", required: false, placeholder: "Condition to wait for (if Until Condition)" },
              { name: "maxWaitTime", type: "number", required: false, placeholder: "Maximum time to wait (hours)" }
            ]
          }
        ]
      };

      res.json(actionConfig);
    } catch (error) {
      console.error("Error fetching action config:", error);
      res.status(500).json({ message: "Failed to fetch action configuration" });
    }
  });

  // Test workflow manually
  app.post("/api/v1/workflows/:id/test", isAuthenticated, requirePermission(storage, "workflow-automation", "update"), async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const workflowId = parseInt(req.params.id);
      const testData = req.body.testData || {};

      // For now, just return success - workflow engine integration would go here
      res.json({ 
        success: true, 
        message: "Workflow test triggered successfully",
        testData 
      });
    } catch (error) {
      console.error("Error testing workflow:", error);
      res.status(500).json({ message: "Failed to test workflow" });
    }
  });

  // Get workflow templates
  app.get("/api/v1/workflow-templates", isAuthenticated, requirePermission(storage, "workflow-automation", "read"), async (req, res) => {
    try {
      const templates = await db
        .select()
        .from(workflowTemplates)
        .where(eq(workflowTemplates.isActive, true))
        .orderBy(workflowTemplates.name);

      res.json(templates);
    } catch (error) {
      console.error("Error fetching workflow templates:", error);
      res.status(500).json({ message: "Failed to fetch workflow templates" });
    }
  });
}