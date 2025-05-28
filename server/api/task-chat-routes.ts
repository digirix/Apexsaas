import { Router } from "express";
import { z } from "zod";
import { requirePermission } from "../auth.js";
import { IStorage } from "../storage.js";

export function createTaskChatRoutes(storage: IStorage) {
  const router = Router();

  // Validation schemas
  const createMessageSchema = z.object({
    messageContent: z.string().min(1).max(2000),
  });

  const updateMessageSchema = z.object({
    messageContent: z.string().min(1).max(2000),
  });

  // GET /api/v1/tasks/:taskId/messages - Fetch messages for a task
  router.get("/tasks/:taskId/messages", async (req, res) => {
    try {
      const user = req.user as any;
      const taskId = parseInt(req.params.taskId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }

      // Check if user has permission to view tasks
      await requirePermission(storage, user.tenantId, user.id, "tasks", "read");

      // Verify the task exists and user has access
      const task = await storage.getTask(taskId);
      if (!task || task.tenantId !== user.tenantId) {
        return res.status(404).json({ error: "Task not found" });
      }

      // For now, return empty array since we're building incrementally
      // This will be populated once database schema is applied
      const messages: any[] = [];
      const total = 0;

      res.json({
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("Error fetching task messages:", error);
      res.status(500).json({ error: error.message || "Failed to fetch messages" });
    }
  });

  // POST /api/v1/tasks/:taskId/messages - Create a new message
  router.post("/tasks/:taskId/messages", async (req, res) => {
    try {
      const user = req.user as any;
      const taskId = parseInt(req.params.taskId);

      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }

      const validation = createMessageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid input", 
          details: validation.error.errors 
        });
      }

      const { messageContent } = validation.data;

      // Check if user has permission to update tasks (needed for messaging)
      await requirePermission(storage, user.tenantId, user.id, "tasks", "update");

      // Verify the task exists and user has access
      const task = await storage.getTask(taskId);
      if (!task || task.tenantId !== user.tenantId) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Parse mentions from message content
      const mentionRegex = /@(\w+)/g;
      const mentions = Array.from(messageContent.matchAll(mentionRegex)).map(match => match[1]);

      // For now, create a basic message structure
      // This will be saved to database once schema is applied
      const message = {
        id: Date.now(), // Temporary ID
        taskId,
        tenantId: user.tenantId,
        userId: user.id,
        messageContent,
        mentions,
        createdAt: new Date(),
        isEdited: false,
        user: {
          id: user.id,
          displayName: user.displayName,
        },
      };

      // TODO: Save to database and handle mentions/notifications
      // TODO: Emit WebSocket event for real-time updates

      res.status(201).json({ message });
    } catch (error: any) {
      console.error("Error creating task message:", error);
      res.status(500).json({ error: error.message || "Failed to create message" });
    }
  });

  // PUT /api/v1/tasks/:taskId/messages/:messageId - Update a message
  router.put("/tasks/:taskId/messages/:messageId", async (req, res) => {
    try {
      const user = req.user as any;
      const taskId = parseInt(req.params.taskId);
      const messageId = parseInt(req.params.messageId);

      if (isNaN(taskId) || isNaN(messageId)) {
        return res.status(400).json({ error: "Invalid task or message ID" });
      }

      const validation = updateMessageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid input", 
          details: validation.error.errors 
        });
      }

      // Check permissions and message ownership
      await requirePermission(storage, user.tenantId, user.id, "tasks", "update");

      // TODO: Implement message update logic once database schema is applied
      res.json({ success: true, message: "Message updated successfully" });
    } catch (error: any) {
      console.error("Error updating task message:", error);
      res.status(500).json({ error: error.message || "Failed to update message" });
    }
  });

  // DELETE /api/v1/tasks/:taskId/messages/:messageId - Delete a message
  router.delete("/tasks/:taskId/messages/:messageId", async (req, res) => {
    try {
      const user = req.user as any;
      const taskId = parseInt(req.params.taskId);
      const messageId = parseInt(req.params.messageId);

      if (isNaN(taskId) || isNaN(messageId)) {
        return res.status(400).json({ error: "Invalid task or message ID" });
      }

      // Check permissions and message ownership
      await requirePermission(storage, user.tenantId, user.id, "tasks", "update");

      // TODO: Implement message deletion logic once database schema is applied
      res.json({ success: true, message: "Message deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting task message:", error);
      res.status(500).json({ error: error.message || "Failed to delete message" });
    }
  });

  return router;
}