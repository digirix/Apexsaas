import { notificationService } from './notification-service';
import { IStorage } from '../storage';

export interface NotificationEvent {
  tenantId: number;
  module: string;
  event: string;
  entityData: any;
  userId?: number;
  metadata?: any;
}

class NotificationEventService {
  // Emit a notification event that triggers configured notifications
  async emitEvent(event: NotificationEvent): Promise<void> {
    try {
      console.log(`[NotificationEvent] Emitting event: ${event.module}.${event.event}`, {
        tenantId: event.tenantId,
        entityId: event.entityData?.id,
        userId: event.userId
      });

      // Process the event through the notification service trigger system
      await notificationService.processTrigger(
        event.tenantId,
        event.module,
        event.event,
        event.entityData,
        event.userId
      );

      console.log(`[NotificationEvent] Event processed: ${event.module}.${event.event}`);
    } catch (error) {
      console.error(`[NotificationEvent] Failed to process event ${event.module}.${event.event}:`, error);
    }
  }

  // Task-related events
  async emitTaskEvent(
    tenantId: number,
    eventType: 'created' | 'updated' | 'completed' | 'assigned' | 'status_changed',
    taskData: any,
    userId?: number,
    previousData?: any
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'tasks',
      event: eventType,
      entityData: {
        ...taskData,
        previousData
      },
      userId
    };

    await this.emitEvent(event);
  }

  // Client-related events
  async emitClientEvent(
    tenantId: number,
    eventType: 'created' | 'updated' | 'deleted',
    clientData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'clients',
      event: eventType,
      entityData: clientData,
      userId
    };

    await this.emitEvent(event);
  }

  // Entity-related events
  async emitEntityEvent(
    tenantId: number,
    eventType: 'created' | 'updated' | 'deleted',
    entityData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'entities',
      event: eventType,
      entityData,
      userId
    };

    await this.emitEvent(event);
  }

  // Invoice-related events
  async emitInvoiceEvent(
    tenantId: number,
    eventType: 'created' | 'sent' | 'paid' | 'overdue',
    invoiceData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'finance',
      event: `invoice_${eventType}`,
      entityData: invoiceData,
      userId
    };

    await this.emitEvent(event);
  }

  // Payment-related events
  async emitPaymentEvent(
    tenantId: number,
    eventType: 'received' | 'failed' | 'refunded',
    paymentData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'finance',
      event: `payment_${eventType}`,
      entityData: paymentData,
      userId
    };

    await this.emitEvent(event);
  }

  // User-related events
  async emitUserEvent(
    tenantId: number,
    eventType: 'created' | 'updated' | 'login' | 'permission_changed',
    userData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'users',
      event: eventType,
      entityData: userData,
      userId
    };

    await this.emitEvent(event);
  }

  // System-related events
  async emitSystemEvent(
    tenantId: number,
    eventType: 'maintenance' | 'backup_completed' | 'backup_failed' | 'alert',
    systemData: any,
    userId?: number
  ): Promise<void> {
    const event: NotificationEvent = {
      tenantId,
      module: 'system',
      event: eventType,
      entityData: systemData,
      userId
    };

    await this.emitEvent(event);
  }
}

export const notificationEventService = new NotificationEventService();