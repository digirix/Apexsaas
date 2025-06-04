import express from "express";
import { notificationService } from "../services/notification-service";
import { createNotificationSchema } from "@shared/schema";
import { z } from "zod";

export function setupNotificationRoutes(app: express.Application, isAuthenticated: any, requirePermission: any, storage: any) {
  // Get notifications for the current user
  app.get("/api/v1/me/notifications", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { limit, offset, unreadOnly, type } = req.query;

      const options = {
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
        unreadOnly: unreadOnly === 'true',
        type: type as string || undefined
      };

      const result = await notificationService.getNotifications({
        userId: user.id,
        tenantId: user.tenantId,
        limit: options.limit,
        offset: options.offset,
        isRead: options.unreadOnly ? false : undefined,
        types: options.type ? [options.type] : undefined
      });
      
      const notifications = result.notifications;

      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count for the current user
  app.get("/api/v1/me/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      const count = await notificationService.getUnreadNotificationCount(
        user.id,
        user.tenantId
      );

      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Mark a specific notification as read
  app.put("/api/v1/me/notifications/:notificationId/read", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const notificationId = parseInt(req.params.notificationId);

      await notificationService.markAsRead([notificationId], user.id);
      const success = true;

      if (success) {
        res.json({ message: "Notification marked as read" });
      } else {
        res.status(404).json({ message: "Notification not found" });
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read for the current user
  app.put("/api/v1/me/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;

      await notificationService.markAllAsRead(user.id, user.tenantId);
      const updatedCount = 1;

      res.json({ message: "All notifications marked as read", updatedCount });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Internal endpoint for creating notifications (used by workflow automation and other services)
  app.post("/api/v1/internal/notifications", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Validate the request body
      const validatedData = createNotificationSchema.parse({
        ...req.body,
        tenantId: user.tenantId, // Ensure tenant isolation
        createdBy: user.id // Set the creator
      });

      await NotificationService.createNotification(validatedData);

      res.json({ message: "Notification created successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
        return;
      }
      
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // Public endpoint for workflow automation to create notifications
  // This will be used by the workflow engine when executing "Send Notification" actions
  app.post("/api/v1/workflows/notifications", isAuthenticated, requirePermission(storage, "workflow-automation", "update"), async (req, res) => {
    try {
      const user = req.user as any;
      
      // Validate the request body for workflow notifications
      const validatedData = createNotificationSchema.parse({
        ...req.body,
        tenantId: user.tenantId,
        createdBy: user.id
      });

      await NotificationService.createNotification(validatedData);

      res.json({ 
        message: "Workflow notification created successfully",
        success: true 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid notification data", 
          errors: error.errors,
          success: false
        });
        return;
      }
      
      console.error("Error creating workflow notification:", error);
      res.status(500).json({ 
        message: "Failed to create workflow notification",
        success: false
      });
    }
  });

  // Test endpoint to create sample notifications
  app.post('/api/v1/notifications/test-samples', isAuthenticated, async (req, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      // Create various types of notifications to demonstrate the system
      const notifications = [
        {
          tenantId,
          userId,
          notificationType: 'TASK_ASSIGNMENT' as const,
          title: 'New Task Assigned',
          message: 'You have been assigned a new task: Review quarterly financial statements',
          severity: 'INFO' as const,
          linkUrl: '/tasks'
        },
        {
          tenantId,
          userId,
          notificationType: 'TASK_COMPLETED' as const,
          title: 'Task Completed',
          message: 'Task "Income Tax Return 2025" has been marked as completed',
          severity: 'SUCCESS' as const,
          linkUrl: '/tasks'
        },
        {
          tenantId,
          userId,
          notificationType: 'TASK_OVERDUE' as const,
          title: 'Urgent: Overdue Task',
          message: 'High priority task is now overdue: Client compliance review',
          severity: 'CRITICAL' as const,
          linkUrl: '/tasks'
        },
        {
          tenantId,
          userId,
          notificationType: 'INVOICE_CREATED' as const,
          title: 'New Invoice Created',
          message: 'Invoice #INV-2025-001 has been created for $2,500',
          severity: 'INFO' as const,
          linkUrl: '/finance/invoices'
        },
        {
          tenantId,
          userId,
          notificationType: 'CLIENT_UPDATED' as const,
          title: 'Client Information Updated',
          message: 'Client profile has been updated with new contact information',
          severity: 'INFO' as const,
          linkUrl: '/clients'
        }
      ];

      // Create all notifications
      for (const notification of notifications) {
        await storage.createNotification(notification);
      }

      res.json({ 
        message: 'Sample notifications created successfully',
        count: notifications.length
      });
    } catch (error) {
      console.error('Error creating sample notifications:', error);
      res.status(500).json({ message: 'Failed to create sample notifications' });
    }
  });

  console.log("Notification routes registered successfully");
}