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
        modules: [
          {
            name: "clients",
            displayName: "Clients Management",
            events: [
              { name: "client_created", displayName: "Client Created" },
              { name: "client_updated", displayName: "Client Updated" },
              { name: "client_status_changed", displayName: "Client Status Changed" }
            ]
          },
          {
            name: "tasks",
            displayName: "Tasks Management", 
            events: [
              { name: "task_created", displayName: "Task Created" },
              { name: "task_updated", displayName: "Task Updated" },
              { name: "task_status_changed", displayName: "Task Status Changed" },
              { name: "task_completed", displayName: "Task Completed" }
            ]
          },
          {
            name: "invoices",
            displayName: "Finance - Invoices",
            events: [
              { name: "invoice_created", displayName: "Invoice Created" },
              { name: "invoice_paid", displayName: "Invoice Paid" },
              { name: "invoice_overdue", displayName: "Invoice Overdue" }
            ]
          },
          {
            name: "entities",
            displayName: "Client Entities",
            events: [
              { name: "entity_created", displayName: "Entity Created" },
              { name: "entity_updated", displayName: "Entity Updated" }
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
            displayName: "Create Task",
            description: "Automatically create a new task",
            configFields: [
              { name: "title", type: "text", required: true, placeholder: "Task title (use {{trigger.client.name}} for variables)" },
              { name: "description", type: "textarea", required: false, placeholder: "Task description" },
              { name: "clientId", type: "variable", required: false, placeholder: "{{trigger.client.id}}" },
              { name: "assigneeId", type: "number", required: false, placeholder: "User ID to assign task" },
              { name: "dueDateOffset", type: "text", required: false, placeholder: "+7 days, +2 weeks, +1 month" },
              { name: "priority", type: "select", options: ["Low", "Medium", "High"], required: false }
            ]
          },
          {
            name: "send_notification",
            displayName: "Send Notification",
            description: "Send internal notification to users",
            configFields: [
              { name: "recipientRole", type: "text", required: false, placeholder: "Role name or user ID" },
              { name: "message", type: "textarea", required: true, placeholder: "Notification message" },
              { name: "type", type: "select", options: ["info", "success", "warning", "error"], required: false }
            ]
          },
          {
            name: "update_client_field",
            displayName: "Update Client Field",
            description: "Update a specific field on the client record",
            configFields: [
              { name: "clientId", type: "variable", required: true, placeholder: "{{trigger.client.id}}" },
              { name: "fieldName", type: "text", required: true, placeholder: "Field name to update" },
              { name: "fieldValue", type: "text", required: true, placeholder: "New field value" }
            ]
          },
          {
            name: "send_email",
            displayName: "Send Email",
            description: "Send email notification",
            configFields: [
              { name: "to", type: "text", required: true, placeholder: "{{trigger.client.email}} or email address" },
              { name: "subject", type: "text", required: true, placeholder: "Email subject" },
              { name: "body", type: "textarea", required: true, placeholder: "Email body content" }
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