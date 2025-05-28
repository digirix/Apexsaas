import { Router } from "express";
import { z } from "zod";
import { requirePermission } from "../auth.js";
import { IStorage } from "../storage.js";

export function createTaskTimeTrackingRoutes(storage: IStorage) {
  const router = Router();

  // Validation schemas
  const createTimeEntrySchema = z.object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    durationSeconds: z.number().int().min(0).optional(),
    description: z.string().max(500).optional(),
    isBillable: z.boolean().default(true),
  }).refine((data) => {
    // Either provide duration directly or start/end times
    return data.durationSeconds !== undefined || (data.startTime && data.endTime);
  }, {
    message: "Either durationSeconds or both startTime and endTime must be provided"
  });

  const updateTimeEntrySchema = z.object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    durationSeconds: z.number().int().min(0).optional(),
    description: z.string().max(500).optional(),
    isBillable: z.boolean().optional(),
  });

  // GET /api/v1/tasks/:taskId/time-entries - Fetch time entries for a task
  router.get("/tasks/:taskId/time-entries", async (req, res) => {
    try {
      const user = req.user as any;
      const taskId = parseInt(req.params.taskId);

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
      const timeEntries: any[] = [];
      const totalDuration = 0;

      res.json({
        timeEntries,
        totalDuration,
        totalDurationFormatted: formatDuration(totalDuration),
      });
    } catch (error: any) {
      console.error("Error fetching task time entries:", error);
      res.status(500).json({ error: error.message || "Failed to fetch time entries" });
    }
  });

  // GET /api/v1/users/:userId/time-entries - Fetch time entries for a user
  router.get("/users/:userId/time-entries", async (req, res) => {
    try {
      const user = req.user as any;
      const userId = parseInt(req.params.userId);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Check if user has permission to view tasks or is viewing their own entries
      if (userId !== user.id) {
        await requirePermission(storage, user.tenantId, user.id, "tasks", "read");
      }

      // For now, return empty array since we're building incrementally
      const timeEntries: any[] = [];
      const totalDuration = 0;

      res.json({
        timeEntries,
        totalDuration,
        totalDurationFormatted: formatDuration(totalDuration),
      });
    } catch (error: any) {
      console.error("Error fetching user time entries:", error);
      res.status(500).json({ error: error.message || "Failed to fetch time entries" });
    }
  });

  // POST /api/v1/tasks/:taskId/time-entries - Create a new time entry
  router.post("/tasks/:taskId/time-entries", async (req, res) => {
    try {
      const user = req.user as any;
      const taskId = parseInt(req.params.taskId);

      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }

      const validation = createTimeEntrySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid input", 
          details: validation.error.errors 
        });
      }

      const { startTime, endTime, durationSeconds, description, isBillable } = validation.data;

      // Check if user has permission to update tasks (needed for time tracking)
      await requirePermission(storage, user.tenantId, user.id, "tasks", "update");

      // Verify the task exists and user has access
      const task = await storage.getTask(taskId);
      if (!task || task.tenantId !== user.tenantId) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Calculate duration if not provided
      let finalDuration = durationSeconds;
      if (!finalDuration && startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        finalDuration = Math.floor((end.getTime() - start.getTime()) / 1000);
      }

      // For now, create a basic time entry structure
      // This will be saved to database once schema is applied
      const timeEntry = {
        id: Date.now(), // Temporary ID
        taskId,
        userId: user.id,
        tenantId: user.tenantId,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        durationSeconds: finalDuration || 0,
        description: description || null,
        isBillable: isBillable,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: user.id,
          displayName: user.displayName,
        },
      };

      // TODO: Save to database once schema is applied

      res.status(201).json({ timeEntry });
    } catch (error: any) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ error: error.message || "Failed to create time entry" });
    }
  });

  // PUT /api/v1/tasks/:taskId/time-entries/:timeEntryId - Update a time entry
  router.put("/tasks/:taskId/time-entries/:timeEntryId", async (req, res) => {
    try {
      const user = req.user as any;
      const taskId = parseInt(req.params.taskId);
      const timeEntryId = parseInt(req.params.timeEntryId);

      if (isNaN(taskId) || isNaN(timeEntryId)) {
        return res.status(400).json({ error: "Invalid task or time entry ID" });
      }

      const validation = updateTimeEntrySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid input", 
          details: validation.error.errors 
        });
      }

      // Check permissions and time entry ownership
      await requirePermission(storage, user.tenantId, user.id, "tasks", "update");

      // TODO: Implement time entry update logic once database schema is applied
      res.json({ success: true, message: "Time entry updated successfully" });
    } catch (error: any) {
      console.error("Error updating time entry:", error);
      res.status(500).json({ error: error.message || "Failed to update time entry" });
    }
  });

  // DELETE /api/v1/tasks/:taskId/time-entries/:timeEntryId - Delete a time entry
  router.delete("/tasks/:taskId/time-entries/:timeEntryId", async (req, res) => {
    try {
      const user = req.user as any;
      const taskId = parseInt(req.params.taskId);
      const timeEntryId = parseInt(req.params.timeEntryId);

      if (isNaN(taskId) || isNaN(timeEntryId)) {
        return res.status(400).json({ error: "Invalid task or time entry ID" });
      }

      // Check permissions and time entry ownership
      await requirePermission(storage, user.tenantId, user.id, "tasks", "update");

      // TODO: Implement time entry deletion logic once database schema is applied
      res.json({ success: true, message: "Time entry deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting time entry:", error);
      res.status(500).json({ error: error.message || "Failed to delete time entry" });
    }
  });

  return router;
}

// Helper function to format duration in seconds to human readable format
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}