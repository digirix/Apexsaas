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
            name: 'webhook',
            displayName: 'Webhook Trigger',
            description: 'Trigger workflow when a webhook URL is called',
            configFields: [
              { name: 'webhookUrl', type: 'text', required: true, placeholder: 'Unique webhook URL will be generated', readonly: true },
              { name: 'method', type: 'select', options: ['POST', 'GET', 'PUT'], required: true, defaultValue: 'POST' },
              { name: 'authToken', type: 'text', required: false, placeholder: 'Optional authentication token' }
            ]
          },
          {
            name: 'schedule',
            displayName: 'Schedule Trigger',
            description: 'Trigger workflow on a schedule (cron expression)',
            configFields: [
              { name: 'cronExpression', type: 'text', required: true, placeholder: '0 9 * * 1-5 (Every weekday at 9 AM)' },
              { name: 'timezone', type: 'select', options: ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'], required: true, defaultValue: 'UTC' },
              { name: 'description', type: 'text', required: false, placeholder: 'Schedule description' }
            ]
          },
          {
            name: 'database_change',
            displayName: 'Database Change',
            description: 'Trigger when database records are created, updated, or deleted',
            configFields: [
              { name: 'tableName', type: 'text', required: true, placeholder: 'e.g., clients, tasks, invoices' },
              { name: 'operation', type: 'select', options: ['CREATE', 'UPDATE', 'DELETE', 'ANY'], required: true, defaultValue: 'CREATE' },
              { name: 'conditions', type: 'textarea', required: false, placeholder: 'JSON conditions: {"status": "active", "amount": {"$gt": 1000}}' }
            ]
          },
          {
            name: 'file_upload',
            displayName: 'File Upload',
            description: 'Trigger when files are uploaded to the system',
            configFields: [
              { name: 'fileTypes', type: 'text', required: false, placeholder: 'pdf,xlsx,csv (leave empty for all types)' },
              { name: 'minSize', type: 'number', required: false, placeholder: 'Minimum file size in KB' },
              { name: 'maxSize', type: 'number', required: false, placeholder: 'Maximum file size in KB' }
            ]
          },
          {
            name: 'email_received',
            displayName: 'Email Received',
            description: 'Trigger when emails are received (requires email integration)',
            configFields: [
              { name: 'fromEmail', type: 'text', required: false, placeholder: 'Filter by sender email (optional)' },
              { name: 'subject', type: 'text', required: false, placeholder: 'Filter by subject keywords (optional)' },
              { name: 'hasAttachment', type: 'select', options: ['Any', 'Yes', 'No'], required: false, defaultValue: 'Any' }
            ]
          },
          {
            name: 'api_call',
            displayName: 'External API Response',
            description: 'Trigger based on external API responses',
            configFields: [
              { name: 'apiUrl', type: 'text', required: true, placeholder: 'https://api.example.com/endpoint' },
              { name: 'method', type: 'select', options: ['GET', 'POST'], required: true, defaultValue: 'GET' },
              { name: 'headers', type: 'textarea', required: false, placeholder: '{"Authorization": "Bearer token"}' },
              { name: 'checkInterval', type: 'number', required: true, placeholder: '300', defaultValue: 300 }
            ]
          },
          {
            name: 'manual',
            displayName: 'Manual Trigger',
            description: 'Manually trigger workflow execution',
            configFields: [
              { name: 'buttonLabel', type: 'text', required: false, placeholder: 'Start Workflow', defaultValue: 'Start Workflow' },
              { name: 'requireConfirmation', type: 'select', options: ['Yes', 'No'], required: false, defaultValue: 'No' }
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
            name: "http_request",
            displayName: "HTTP Request",
            description: "Make HTTP requests to any API or webhook",
            configFields: [
              { name: "url", type: "text", required: true, placeholder: "https://api.example.com/endpoint" },
              { name: "method", type: "select", options: ["GET", "POST", "PUT", "DELETE", "PATCH"], required: true, defaultValue: "POST" },
              { name: "headers", type: "textarea", required: false, placeholder: '{"Content-Type": "application/json", "Authorization": "Bearer token"}' },
              { name: "body", type: "textarea", required: false, placeholder: '{"data": "{{trigger.data}}", "message": "Hello World"}' },
              { name: "timeout", type: "number", required: false, placeholder: "30", defaultValue: 30 }
            ]
          },
          {
            name: "database_query",
            displayName: "Database Operation",
            description: "Execute database queries (SELECT, INSERT, UPDATE, DELETE)",
            configFields: [
              { name: "operation", type: "select", options: ["SELECT", "INSERT", "UPDATE", "DELETE"], required: true, defaultValue: "INSERT" },
              { name: "tableName", type: "text", required: true, placeholder: "clients, tasks, custom_table" },
              { name: "data", type: "textarea", required: false, placeholder: '{"name": "{{trigger.name}}", "status": "active"}' },
              { name: "conditions", type: "textarea", required: false, placeholder: '{"id": "{{trigger.id}}", "status": "pending"}' },
              { name: "returnFields", type: "text", required: false, placeholder: "id,name,email (for SELECT queries)" }
            ]
          },
          {
            name: "send_email",
            displayName: "Send Email",
            description: "Send emails via SMTP or email service",
            configFields: [
              { name: "to", type: "text", required: true, placeholder: "user@example.com or {{trigger.email}}" },
              { name: "cc", type: "text", required: false, placeholder: "cc@example.com (optional)" },
              { name: "bcc", type: "text", required: false, placeholder: "bcc@example.com (optional)" },
              { name: "subject", type: "text", required: true, placeholder: "Email subject with {{variables}}" },
              { name: "body", type: "textarea", required: true, placeholder: "Email body content with {{trigger.data}}" },
              { name: "isHtml", type: "select", options: ["Yes", "No"], required: false, defaultValue: "No" }
            ]
          },
          {
            name: "file_operation",
            displayName: "File Operation",
            description: "Create, read, update, or delete files",
            configFields: [
              { name: "operation", type: "select", options: ["CREATE", "READ", "UPDATE", "DELETE", "COPY", "MOVE"], required: true, defaultValue: "CREATE" },
              { name: "filePath", type: "text", required: true, placeholder: "/path/to/file.txt or uploads/{{trigger.filename}}" },
              { name: "content", type: "textarea", required: false, placeholder: "File content or data to write" },
              { name: "encoding", type: "select", options: ["utf8", "base64", "binary"], required: false, defaultValue: "utf8" }
            ]
          },
          {
            name: "conditional_logic",
            displayName: "Conditional Logic",
            description: "Execute actions based on conditions",
            configFields: [
              { name: "condition", type: "textarea", required: true, placeholder: '{{trigger.amount}} > 1000 && {{trigger.status}} === "pending"' },
              { name: "trueActions", type: "textarea", required: false, placeholder: "JSON array of actions to execute if condition is true" },
              { name: "falseActions", type: "textarea", required: false, placeholder: "JSON array of actions to execute if condition is false" }
            ]
          },
          {
            name: "data_transformation",
            displayName: "Data Transformation",
            description: "Transform, filter, or manipulate data",
            configFields: [
              { name: "inputData", type: "textarea", required: true, placeholder: "{{trigger.data}} or custom JSON data" },
              { name: "transformScript", type: "textarea", required: true, placeholder: "JavaScript transformation logic" },
              { name: "outputVariable", type: "text", required: false, placeholder: "Name to store transformed data" }
            ]
          },
          {
            name: "delay_action",
            displayName: "Delay/Wait",
            description: "Add delays between actions",
            configFields: [
              { name: "delayType", type: "select", options: ["seconds", "minutes", "hours", "days"], required: true, defaultValue: "minutes" },
              { name: "delayAmount", type: "number", required: true, placeholder: "5" },
              { name: "description", type: "text", required: false, placeholder: "Wait description" }
            ]
          },
          {
            name: "notification",
            displayName: "Send Notification",
            description: "Send in-app notifications or alerts",
            configFields: [
              { name: "recipients", type: "text", required: true, placeholder: "user@example.com,admin@company.com" },
              { name: "title", type: "text", required: true, placeholder: "Notification title" },
              { name: "message", type: "textarea", required: true, placeholder: "Notification message with {{variables}}" },
              { name: "priority", type: "select", options: ["low", "normal", "high", "urgent"], required: false, defaultValue: "normal" },
              { name: "channel", type: "select", options: ["in-app", "email", "sms", "slack", "teams"], required: false, defaultValue: "in-app" }
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