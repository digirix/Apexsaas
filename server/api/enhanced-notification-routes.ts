import { Router } from 'express';
import { z } from 'zod';
import { 
  emailProviderSettings,
  notificationPreferences,
  notificationTriggers,
  emailDeliveryLogs,
  createNotificationSchema,
  notificationFilterSchema,
  insertEmailProviderSettingSchema,
  insertNotificationPreferenceSchema,
  insertNotificationTriggerSchema
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { notificationService } from '../services/notification-service';
import { validateEmailProvider } from '../services/email-service';

export const enhancedNotificationRoutes = Router();

// Email Provider Settings Routes
enhancedNotificationRoutes.get('/email-providers', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const providers = await db
      .select()
      .from(emailProviderSettings)
      .where(eq(emailProviderSettings.tenantId, req.user.tenantId))
      .orderBy(desc(emailProviderSettings.createdAt));

    // Don't expose sensitive data
    const sanitizedProviders = providers.map(provider => ({
      ...provider,
      apiKey: provider.apiKey ? '***' : null,
      apiSecret: provider.apiSecret ? '***' : null
    }));

    res.json(sanitizedProviders);
  } catch (error) {
    console.error('Error fetching email providers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

enhancedNotificationRoutes.post('/email-providers', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const providerData = insertEmailProviderSettingSchema.parse({
      ...req.body,
      tenantId: req.user.tenantId
    });

    // Validate provider configuration
    const validation = validateEmailProvider(providerData as any);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Invalid provider configuration',
        errors: validation.errors 
      });
    }

    // Deactivate other providers of the same type if this one is active
    if (providerData.isActive) {
      await db
        .update(emailProviderSettings)
        .set({ isActive: false })
        .where(and(
          eq(emailProviderSettings.tenantId, req.user.tenantId),
          eq(emailProviderSettings.provider, providerData.provider)
        ));
    }

    const [newProvider] = await db
      .insert(emailProviderSettings)
      .values(providerData)
      .returning();

    // Don't expose sensitive data
    const sanitizedProvider = {
      ...newProvider,
      apiKey: newProvider.apiKey ? '***' : null,
      apiSecret: newProvider.apiSecret ? '***' : null
    };

    res.status(201).json(sanitizedProvider);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error creating email provider:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

enhancedNotificationRoutes.put('/email-providers/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const providerId = parseInt(req.params.id);
    const updateData = insertEmailProviderSettingSchema.partial().parse(req.body);

    // Deactivate other providers of the same type if this one is being activated
    if (updateData.isActive) {
      await db
        .update(emailProviderSettings)
        .set({ isActive: false })
        .where(and(
          eq(emailProviderSettings.tenantId, req.user.tenantId),
          eq(emailProviderSettings.provider, updateData.provider!)
        ));
    }

    const [updatedProvider] = await db
      .update(emailProviderSettings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(emailProviderSettings.id, providerId),
        eq(emailProviderSettings.tenantId, req.user.tenantId)
      ))
      .returning();

    if (!updatedProvider) {
      return res.status(404).json({ message: 'Email provider not found' });
    }

    // Don't expose sensitive data
    const sanitizedProvider = {
      ...updatedProvider,
      apiKey: updatedProvider.apiKey ? '***' : null,
      apiSecret: updatedProvider.apiSecret ? '***' : null
    };

    res.json(sanitizedProvider);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error updating email provider:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

enhancedNotificationRoutes.delete('/email-providers/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const providerId = parseInt(req.params.id);

    await db
      .delete(emailProviderSettings)
      .where(and(
        eq(emailProviderSettings.id, providerId),
        eq(emailProviderSettings.tenantId, req.user.tenantId)
      ));

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting email provider:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test email provider
enhancedNotificationRoutes.post('/email-providers/:id/test', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const providerId = parseInt(req.params.id);
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({ message: 'Test email address required' });
    }

    const provider = await db
      .select()
      .from(emailProviderSettings)
      .where(and(
        eq(emailProviderSettings.id, providerId),
        eq(emailProviderSettings.tenantId, req.user.tenantId)
      ))
      .limit(1);

    if (!provider[0]) {
      return res.status(404).json({ message: 'Email provider not found' });
    }

    // Send test notification
    await notificationService.createNotification({
      tenantId: req.user.tenantId,
      userIds: [req.user.id],
      title: 'Email Provider Test',
      messageBody: 'This is a test email to verify your email provider configuration is working correctly.',
      type: 'SYSTEM_MESSAGE',
      severity: 'INFO',
      deliveryChannels: ['email'],
      createdBy: req.user.id
    });

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ message: 'Failed to send test email' });
  }
});

// Enhanced notification preferences routes
enhancedNotificationRoutes.get('/preferences', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const preferences = await db
      .select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, req.user.id),
        eq(notificationPreferences.tenantId, req.user.tenantId)
      ));

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

enhancedNotificationRoutes.put('/preferences', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const preferencesData = z.array(insertNotificationPreferenceSchema.partial()).parse(req.body);

    await notificationService.updatePreferences(
      req.user.id,
      req.user.tenantId,
      preferencesData
    );

    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Notification triggers management
enhancedNotificationRoutes.get('/triggers', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const triggers = await db
      .select()
      .from(notificationTriggers)
      .where(eq(notificationTriggers.tenantId, req.user.tenantId))
      .orderBy(desc(notificationTriggers.createdAt));

    res.json(triggers);
  } catch (error) {
    console.error('Error fetching notification triggers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

enhancedNotificationRoutes.post('/triggers', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const triggerData = insertNotificationTriggerSchema.parse({
      ...req.body,
      tenantId: req.user.tenantId,
      createdBy: req.user.id
    });

    const [newTrigger] = await db
      .insert(notificationTriggers)
      .values(triggerData)
      .returning();

    res.status(201).json(newTrigger);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error creating notification trigger:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

enhancedNotificationRoutes.put('/triggers/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const triggerId = parseInt(req.params.id);
    const updateData = insertNotificationTriggerSchema.partial().parse(req.body);

    const [updatedTrigger] = await db
      .update(notificationTriggers)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(notificationTriggers.id, triggerId),
        eq(notificationTriggers.tenantId, req.user.tenantId)
      ))
      .returning();

    if (!updatedTrigger) {
      return res.status(404).json({ message: 'Notification trigger not found' });
    }

    res.json(updatedTrigger);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error updating notification trigger:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

enhancedNotificationRoutes.delete('/triggers/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const triggerId = parseInt(req.params.id);

    await db
      .delete(notificationTriggers)
      .where(and(
        eq(notificationTriggers.id, triggerId),
        eq(notificationTriggers.tenantId, req.user.tenantId)
      ));

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting notification trigger:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Enhanced notification creation
enhancedNotificationRoutes.post('/send', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const notificationData = createNotificationSchema.parse({
      ...req.body,
      tenantId: req.user.tenantId,
      createdBy: req.user.id
    });

    await notificationService.createNotification(notificationData);

    res.status(201).json({ message: 'Notification sent successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Email delivery logs
enhancedNotificationRoutes.get('/email-logs', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { limit = 50, offset = 0, status, providerId } = req.query;

    let query = db
      .select({
        id: emailDeliveryLogs.id,
        recipientEmail: emailDeliveryLogs.recipientEmail,
        subject: emailDeliveryLogs.subject,
        status: emailDeliveryLogs.status,
        sentAt: emailDeliveryLogs.sentAt,
        deliveredAt: emailDeliveryLogs.deliveredAt,
        openedAt: emailDeliveryLogs.openedAt,
        clickedAt: emailDeliveryLogs.clickedAt,
        errorMessage: emailDeliveryLogs.errorMessage,
        providerName: emailProviderSettings.provider
      })
      .from(emailDeliveryLogs)
      .leftJoin(emailProviderSettings, eq(emailDeliveryLogs.providerId, emailProviderSettings.id))
      .where(eq(emailDeliveryLogs.tenantId, req.user.tenantId));

    if (status) {
      query = query.where(eq(emailDeliveryLogs.status, status as string));
    }

    if (providerId) {
      query = query.where(eq(emailDeliveryLogs.providerId, parseInt(providerId as string)));
    }

    const logs = await query
      .orderBy(desc(emailDeliveryLogs.sentAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailDeliveryLogs)
      .where(eq(emailDeliveryLogs.tenantId, req.user.tenantId));

    res.json({
      logs,
      total: totalResult[0]?.count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Notification analytics
enhancedNotificationRoutes.get('/analytics', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const stats = await notificationService.getNotificationStats(req.user.tenantId);

    // Email delivery analytics
    const emailStats = await db
      .select({
        status: emailDeliveryLogs.status,
        count: sql<number>`count(*)`
      })
      .from(emailDeliveryLogs)
      .where(eq(emailDeliveryLogs.tenantId, req.user.tenantId))
      .groupBy(emailDeliveryLogs.status);

    const emailDeliveryStats: Record<string, number> = {};
    emailStats.forEach(stat => {
      emailDeliveryStats[stat.status] = stat.count;
    });

    res.json({
      notifications: stats,
      emailDelivery: emailDeliveryStats
    });
  } catch (error) {
    console.error('Error fetching notification analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Bulk actions
enhancedNotificationRoutes.post('/bulk-mark-read', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: 'Notification IDs array required' });
    }

    await notificationService.markAsRead(notificationIds, req.user.id);

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

enhancedNotificationRoutes.post('/mark-all-read', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await notificationService.markAllAsRead(req.user.id, req.user.tenantId);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Clear notification cache
enhancedNotificationRoutes.post('/clear-cache', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    notificationService.clearCache();

    res.json({ message: 'Notification cache cleared' });
  } catch (error) {
    console.error('Error clearing notification cache:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});