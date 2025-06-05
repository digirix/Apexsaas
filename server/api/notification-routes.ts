import { Router } from "express";
import { z } from "zod";
import { NotificationService } from "../services/notification-service";

const router = Router();

// Get notifications for current user
router.get("/", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { tenantId, id: userId } = user;

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
    const type = req.query.type as string;
    const severity = req.query.severity as string;
    
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const result = await NotificationService.getNotificationsForUser(userId, tenantId, {
      page,
      limit,
      filters: {
        isRead,
        type,
        severity,
        dateFrom,
        dateTo
      }
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get unread notification count
router.get("/unread-count", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { tenantId, id: userId } = user;

    const count = await NotificationService.getUnreadNotificationCount(userId, tenantId);

    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Mark notification as read
router.put("/:notificationId/read", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { tenantId, id: userId } = user;
    const notificationId = parseInt(req.params.notificationId);

    if (isNaN(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const success = await NotificationService.markNotificationAsRead(
      notificationId,
      userId,
      tenantId
    );

    if (!success) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Mark all notifications as read
router.put("/mark-all-read", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { tenantId, id: userId } = user;

    const count = await NotificationService.markAllNotificationsAsRead(userId, tenantId);

    res.json({ count });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Internal endpoint for creating notifications (for other services)
router.post("/internal/create", async (req, res) => {
  try {
    // This endpoint should be protected with service-to-service authentication
    // For now, we'll use basic validation
    
    const createSchema = z.object({
      tenantId: z.number(),
      userId: z.number().optional(),
      userIds: z.array(z.number()).optional(),
      title: z.string(),
      messageBody: z.string(),
      linkUrl: z.string().optional(),
      type: z.string(),
      severity: z.string().optional(),
      createdBy: z.number().optional(),
      relatedModule: z.string().optional(),
      relatedEntityId: z.string().optional(),
      templateVariables: z.record(z.any()).optional()
    });

    const validatedData = createSchema.parse(req.body);

    const notifications = await NotificationService.createNotification(validatedData);

    res.status(201).json({ notifications, count: notifications.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request data",
        errors: error.errors 
      });
    }

    console.error("Error creating notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create broadcast notification (admin only)
router.post("/broadcast", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if user has admin permissions
    if (!user.isSuperAdmin) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    const { tenantId, id: userId } = user;

    const broadcastSchema = z.object({
      title: z.string(),
      messageBody: z.string(),
      linkUrl: z.string().optional()
    });

    const validatedData = broadcastSchema.parse(req.body);

    await NotificationService.createBroadcastNotification(
      tenantId,
      validatedData.title,
      validatedData.messageBody,
      validatedData.linkUrl,
      userId
    );

    res.status(201).json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request data",
        errors: error.errors 
      });
    }

    console.error("Error creating broadcast notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;