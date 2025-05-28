import { Express, Request, Response } from 'express';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { 
  clientPortalAccess, 
  clients, 
  entities, 
  invoices, 
  payments, 
  tasks
} from '@shared/schema';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Promisify scrypt
const scryptAsync = promisify(scrypt);

// Helper functions for password management
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Check if client is authenticated
function isClientAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && (req.user as any).isClientPortalUser) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
}

export function registerClientPortalRoutes(app: Express) {
  // Client Portal Authentication Routes
  
  // Client login endpoint
  app.post("/api/client-portal/login", async (req, res, next) => {
    try {
      const { username, password, tenantId } = req.body;
      
      if (!username || !password || !tenantId) {
        return res.status(400).json({ message: 'Username, password, and tenant ID are required' });
      }
      
      console.log(`Client portal login attempt for username: ${username}, tenantId: ${tenantId}`);
      
      // Get client portal access record
      const accessRecords = await db
        .select()
        .from(clientPortalAccess)
        .where(and(
          eq(clientPortalAccess.username, username),
          eq(clientPortalAccess.tenantId, tenantId)
        ));
      
      if (!accessRecords || accessRecords.length === 0) {
        console.log('Client portal login failed: User not found');
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      const accessRecord = accessRecords[0];
      console.log('Access record found:', { id: accessRecord.id, isActive: accessRecord.isActive });
      
      // Check if account is active
      if (!accessRecord.isActive) {
        console.log('Client portal login failed: Account inactive');
        return res.status(401).json({ message: 'Account is inactive. Please contact your accountant.' });
      }
      
      // Verify password
      const passwordMatch = await comparePasswords(password, accessRecord.password);
      console.log('Password match:', passwordMatch);
      
      if (!passwordMatch) {
        console.log('Client portal login failed: Invalid password');
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Get client information
      const clientResults = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, accessRecord.clientId),
          eq(clients.tenantId, accessRecord.tenantId)
        ));
      
      if (!clientResults || clientResults.length === 0) {
        console.log('Client portal login failed: Client not found');
        return res.status(404).json({ message: 'Client account not found' });
      }
      
      const client = clientResults[0];
      console.log('Client found:', { id: client.id, displayName: client.displayName });
      
      // Update last login time
      await db
        .update(clientPortalAccess)
        .set({ 
          lastLogin: new Date(),
          updatedAt: new Date()
        })
        .where(eq(clientPortalAccess.id, accessRecord.id));
      
      // Create client portal user object with combined information
      const clientPortalUser = {
        id: accessRecord.id,
        clientId: client.id,
        tenantId: client.tenantId,
        username: accessRecord.username,
        displayName: client.displayName,
        email: client.email,
        passwordResetRequired: accessRecord.passwordResetRequired,
        isClientPortalUser: true,  // Flag to differentiate from regular users
      };
      
      console.log('Client portal login successful, creating session');
      
      // Login the user with client portal session
      req.login(clientPortalUser, (err) => {
        if (err) {
          console.error('Error during client login:', err);
          return next(err);
        }
        
        console.log('Login session created successfully');
        return res.status(200).json({ 
          message: 'Login successful',
          user: {
            clientId: clientPortalUser.clientId,
            displayName: clientPortalUser.displayName,
            email: clientPortalUser.email,
            tenantId: clientPortalUser.tenantId,
            passwordResetRequired: clientPortalUser.passwordResetRequired,
          }
        });
      });
    } catch (error) {
      console.error('Client login error:', error);
      res.status(500).json({ message: 'An error occurred during login' });
    }
  });
  
  // Client logout endpoint
  app.post("/api/client-portal/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
  
  // Get current client user
  app.get("/api/client-portal/me", isClientAuthenticated, (req, res) => {
    res.json({ user: req.user });
  });
  
  // Get client profile with detailed information
  app.get("/api/client-portal/profile", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      console.log(`Fetching profile for client ${user.clientId} in tenant ${user.tenantId}`);
      
      // Get client details
      const clientResults = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, user.clientId),
          eq(clients.tenantId, user.tenantId)
        ));
      
      if (!clientResults || clientResults.length === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const client = clientResults[0];
      
      // Get associated entities for this client
      const entityResults = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.clientId, user.clientId),
          eq(entities.tenantId, user.tenantId)
        ));
      
      // Count open tasks for the client
      const openTaskCount = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM tasks
        WHERE 
          client_id = ${user.clientId}
          AND tenant_id = ${user.tenantId}
          AND is_completed = false
      `);
      
      // Count upcoming invoices
      const upcomingInvoiceCount = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM invoices
        WHERE 
          client_id = ${user.clientId}
          AND tenant_id = ${user.tenantId}
          AND status IN ('draft', 'sent', 'overdue')
      `);
      
      // Get latest task
      const latestTaskResult = await db.execute(sql`
        SELECT 
          id, 
          title, 
          description, 
          due_date as "dueDate", 
          is_completed as "isCompleted"
        FROM tasks
        WHERE 
          client_id = ${user.clientId}
          AND tenant_id = ${user.tenantId}
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      // Return combined client profile data
      res.json({
        client: client,
        entities: entityResults,
        stats: {
          openTaskCount: parseInt(openTaskCount.rows[0]?.count || '0'),
          upcomingInvoiceCount: parseInt(upcomingInvoiceCount.rows[0]?.count || '0'),
          entityCount: entityResults.length
        },
        latestTask: latestTaskResult.rows[0] || null
      });
    } catch (error) {
      console.error('Error fetching client profile:', error);
      res.status(500).json({ message: 'Failed to fetch client profile' });
    }
  });
  
  // Change password endpoint
  app.post("/api/client-portal/change-password", isClientAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user as any;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
      }
      
      // Get portal access record
      const accessRecords = await db
        .select()
        .from(clientPortalAccess)
        .where(eq(clientPortalAccess.id, user.id));
      
      if (!accessRecords || accessRecords.length === 0) {
        return res.status(404).json({ message: 'Account not found' });
      }
      
      const accessRecord = accessRecords[0];
      
      // Verify current password
      const passwordMatch = await comparePasswords(currentPassword, accessRecord.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password
      await db
        .update(clientPortalAccess)
        .set({ 
          password: hashedPassword,
          passwordResetRequired: false,
          updatedAt: new Date()
        })
        .where(eq(clientPortalAccess.id, user.id));
      
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });
  
  // Client Portal Data Routes
  
  // Get individual entity details
  app.get("/api/client-portal/entities/:id", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const entityId = parseInt(req.params.id);
      
      if (!entityId || isNaN(entityId)) {
        return res.status(400).json({ message: 'Invalid entity ID' });
      }
      
      console.log(`Fetching entity ${entityId} for client ${user.clientId} in tenant ${user.tenantId}`);
      
      // Get the specific entity
      const entityResults = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.id, entityId),
          eq(entities.clientId, user.clientId),
          eq(entities.tenantId, user.tenantId)
        ));
      
      if (!entityResults || entityResults.length === 0) {
        return res.status(404).json({ message: 'Entity not found' });
      }
      
      const entity = entityResults[0];
      
      // Get entity type, country, and state information
      const enrichedEntityResult = await db.execute(sql`
        SELECT 
          e.*,
          et.name as "entityTypeName",
          c.name as "countryName",
          s.name as "stateName"
        FROM entities e
        LEFT JOIN entity_types et ON et.id = e.entity_type_id AND et.tenant_id = e.tenant_id
        LEFT JOIN countries c ON c.id = e.country_id
        LEFT JOIN states s ON s.id = e.state_id AND s.country_id = c.id
        WHERE e.id = ${entityId} AND e.client_id = ${user.clientId} AND e.tenant_id = ${user.tenantId}
      `);
      
      if (!enrichedEntityResult.rows || enrichedEntityResult.rows.length === 0) {
        return res.status(404).json({ message: 'Entity not found' });
      }
      
      res.json(enrichedEntityResult.rows[0]);
    } catch (error) {
      console.error('Error fetching entity details:', error);
      res.status(500).json({ message: 'Failed to fetch entity details' });
    }
  });
  
  // Get client entities with detailed information
  app.get("/api/client-portal/entities", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      console.log(`Fetching entities for client ${user.clientId} in tenant ${user.tenantId}`);
      
      const entityResults = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.clientId, user.clientId),
          eq(entities.tenantId, user.tenantId)
        ));
      
      if (!entityResults || entityResults.length === 0) {
        console.log('No entities found for client');
        return res.json([]);
      }
      
      console.log(`Found ${entityResults.length} entities for client`);
      
      // Get entity types for each entity along with additional metadata
      const enrichedEntities = await Promise.all(entityResults.map(async (entity) => {
        // Get entity type information
        let entityTypeResult;
        try {
          entityTypeResult = await db
            .execute(sql`
              SELECT et.name as "entityType"
              FROM entity_types et 
              WHERE et.id = ${entity.entityTypeId} AND et.tenant_id = ${user.tenantId}
            `);
        } catch (error) {
          console.error(`Error getting entity type for entity ${entity.id}:`, error);
          entityTypeResult = { rows: [] };
        }
        
        const entityType = entityTypeResult.rows[0]?.entityType || 'Unknown';
        
        // Get country and state information
        let locationResult;
        try {
          locationResult = await db
            .execute(sql`
              SELECT 
                c.name as "countryName",
                s.name as "stateName"
              FROM countries c
              LEFT JOIN states s ON s.id = ${entity.stateId} AND s.country_id = c.id
              WHERE c.id = ${entity.countryId}
            `);
        } catch (error) {
          console.error(`Error getting location info for entity ${entity.id}:`, error);
          locationResult = { rows: [] };
        }
        
        const countryName = locationResult.rows[0]?.countryName || 'Unknown';
        const stateName = locationResult.rows[0]?.stateName || '';
        
        // Count tasks for this entity
        const taskCount = await db
          .execute(sql`
            SELECT COUNT(*) as count
            FROM tasks
            WHERE entity_id = ${entity.id} AND tenant_id = ${user.tenantId}
          `);
        
        // Count invoices for this entity
        const invoiceCount = await db
          .execute(sql`
            SELECT COUNT(*) as count
            FROM invoices
            WHERE entity_id = ${entity.id} AND tenant_id = ${user.tenantId}
          `);
        
        // Return enriched entity data
        return {
          ...entity,
          entityType: entityType,
          countryName,
          stateName,
          stats: {
            taskCount: parseInt(taskCount.rows[0]?.count || '0'),
            invoiceCount: parseInt(invoiceCount.rows[0]?.count || '0')
          }
        };
      }));
      
      res.json(enrichedEntities);
    } catch (error) {
      console.error('Error fetching client entities:', error);
      res.status(500).json({ message: 'Failed to fetch entities' });
    }
  });
  
  // Get all client invoices or invoices for a specific entity
  app.get("/api/client-portal/invoices", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : null;
      
      if (entityId) {
        console.log(`Fetching invoices for client ${user.clientId}, entity ${entityId} in tenant ${user.tenantId}`);
      } else {
        console.log(`Fetching all invoices for client ${user.clientId} in tenant ${user.tenantId}`);
      }
      
      // Build WHERE clause based on whether entityId is provided
      let whereClause = `
        i.client_id = ${user.clientId}
        AND i.tenant_id = ${user.tenantId}
        AND i.is_deleted = FALSE
      `;
      
      if (entityId) {
        whereClause += ` AND i.entity_id = ${entityId}`;
      }
      
      // Query the invoices table with joins to get detailed information
      const invoiceResults = await db.execute(sql`
        SELECT 
          i.id,
          i.tenant_id as "tenantId",
          i.client_id as "clientId",
          i.entity_id as "entityId",
          e.name as "entityName",
          i.invoice_number as "invoiceNumber",
          i.issue_date as "issueDate",
          i.due_date as "dueDate",
          i.currency_code as "currencyCode",
          i.subtotal,
          i.tax_amount as "taxAmount",
          i.discount_amount as "discountAmount",
          i.total_amount as "totalAmount",
          i.amount_paid as "amountPaid",
          i.amount_due as "amountDue",
          i.status,
          i.notes,
          i.created_at as "createdAt",
          i.updated_at as "updatedAt" 
        FROM invoices i
        LEFT JOIN entities e ON i.entity_id = e.id AND i.tenant_id = e.tenant_id
        WHERE 
          ${sql.raw(whereClause)}
        ORDER BY i.issue_date DESC
      `);
      
      // If there are no invoices, return empty array
      if (invoiceResults.rowCount === 0) {
        if (entityId) {
          console.log(`No invoices found for client's entity ${entityId}`);
        } else {
          console.log('No invoices found for client');
        }
        
        return res.json([]);
      }
      
      console.log(`Found ${invoiceResults.rowCount} invoices for client`);
      
      // Get invoice line items for all retrieved invoices
      const invoiceIds = invoiceResults.rows
        .filter(invoice => invoice && typeof invoice.id === 'number')
        .map(invoice => invoice.id);
        
      // Only fetch line items if we have invoices
      let invoiceLineItemsResults = { rows: [] };
      if (invoiceIds.length > 0) {
        invoiceLineItemsResults = await db.execute(sql`
          SELECT 
            il.id,
            il.invoice_id as "invoiceId",
            il.description,
            il.quantity,
            il.unit_price as "unitPrice",
            il.tax_rate as "taxRate",
            il.tax_amount as "taxAmount",
            il.discount_amount as "discountAmount",
            (il.quantity * il.unit_price - COALESCE(il.discount_amount, 0) + COALESCE(il.tax_amount, 0)) as "totalAmount"
          FROM invoice_line_items il
          WHERE il.invoice_id IN (${sql.raw(invoiceIds.join(','))})
        `);
      }
      
      // Group line items by invoice ID
      const lineItemsByInvoiceId: Record<number, any[]> = {};
      invoiceLineItemsResults.rows.forEach(lineItem => {
        if (lineItem && typeof lineItem.invoiceId === 'number') {
          if (!lineItemsByInvoiceId[lineItem.invoiceId]) {
            lineItemsByInvoiceId[lineItem.invoiceId] = [];
          }
          lineItemsByInvoiceId[lineItem.invoiceId].push(lineItem);
        }
      });
      
      // Add line items to invoices
      const enrichedInvoices = invoiceResults.rows.map(invoice => {
        if (invoice && typeof invoice.id === 'number') {
          return {
            ...invoice,
            lineItems: lineItemsByInvoiceId[invoice.id] || []
          };
        }
        return { ...invoice, lineItems: [] };
      });
      
      res.json(enrichedInvoices);
    } catch (error) {
      console.error('Error fetching client invoices:', error);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });
  
  // Get client documents
  app.get("/api/client-portal/documents", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      console.log(`Fetching documents for client ${user.clientId} in tenant ${user.tenantId}`);
      
      // Query the database for actual client documents
      const documentResults = await db.execute(sql`
        SELECT 
          d.id,
          d.name,
          d.description,
          d.file_path as "filePath",
          d.document_type as "documentType",
          d.created_at as "createdAt",
          d.file_size as "fileSize",
          d.status
        FROM documents d
        WHERE 
          d.client_id = ${user.clientId}
          AND d.tenant_id = ${user.tenantId}
        ORDER BY d.created_at DESC
      `);
      
      // If there are no documents, add an initial document for demo purposes
      if (documentResults.rowCount === 0) {
        const currentYear = new Date().getFullYear();
        
        console.log('No documents found, returning sample document data for demonstration');
        return res.json([
          {
            id: 1,
            name: `${currentYear} Tax Return`,
            description: 'Annual tax filing for the current fiscal year',
            filePath: '/documents/tax-returns/2024.pdf',
            documentType: 'Tax Return',
            createdAt: new Date().toISOString(),
            fileSize: '1.2MB',
            status: 'Completed'
          }
        ]);
      }
      
      console.log(`Found ${documentResults.rowCount} documents for client`);
      res.json(documentResults.rows);
    } catch (error) {
      console.error('Error fetching client documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });
  
  // Get all client tasks or tasks for a specific entity
  app.get("/api/client-portal/tasks", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : null;
      
      if (entityId) {
        console.log(`Fetching tasks for client ${user.clientId}, entity ${entityId} in tenant ${user.tenantId}`);
      } else {
        console.log(`Fetching all tasks for client ${user.clientId} in tenant ${user.tenantId}`);
      }
      
      // Build WHERE clause based on whether entityId is provided
      let whereClause = `
        t.client_id = ${user.clientId}
        AND t.tenant_id = ${user.tenantId}
      `;
      
      if (entityId) {
        whereClause += ` AND t.entity_id = ${entityId}`;
      }
      
      // Query the tasks table and join with task statuses, entities, and users to get rich data
      const taskResults = await db.execute(sql`
        SELECT 
          t.id,
          t.tenant_id as "tenantId",
          t.task_type as "taskType",
          t.task_details as "title",
          t.task_details as "description",
          t.due_date as "dueDate",
          t.status_id as "statusId",
          ts.name as "statusName",
          t.assignee_id as "assigneeId",
          u.display_name as "assigneeName",
          t.entity_id as "entityId",
          e.name as "entityName",
          t.created_at as "createdAt",
          t.updated_at as "updatedAt" 
        FROM tasks t
        LEFT JOIN task_statuses ts ON t.status_id = ts.id AND t.tenant_id = ts.tenant_id
        LEFT JOIN entities e ON t.entity_id = e.id AND t.tenant_id = e.tenant_id
        LEFT JOIN users u ON t.assignee_id = u.id AND t.tenant_id = u.tenant_id
        WHERE 
          ${sql.raw(whereClause)}
        ORDER BY t.due_date DESC
      `);
      
      // If there are no tasks, return empty array
      if (taskResults.rowCount === 0) {
        if (entityId) {
          console.log(`No tasks found for client's entity ${entityId}`);
        } else {
          console.log('No tasks found for client');
        }
        
        return res.json([]);
      }
      
      console.log(`Found ${taskResults.rowCount} tasks for client`);
      
      // Return the task data
      res.json(taskResults.rows);
    } catch (error) {
      console.error('Error fetching client tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  });
  
  // Get entity services (using exact same logic as working admin portal)
  app.get("/api/client-portal/entity/:entityId/services", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const entityId = parseInt(req.params.entityId);
      
      if (!entityId || isNaN(entityId)) {
        return res.status(400).json({ message: 'Invalid entity ID' });
      }
      
      console.log(`Fetching services for entity ${entityId} in tenant ${user.tenantId}`);
      
      // Ensure entity exists and belongs to client (same validation as admin portal)
      const entity = await storage.getEntity(entityId, user.tenantId);
      if (!entity || entity.clientId !== user.clientId) {
        return res.status(404).json({ message: "Entity not found or access denied" });
      }
      
      // Get existing subscriptions for this entity (exact same as admin portal)
      const subscriptions = await storage.getEntityServiceSubscriptions(user.tenantId, entityId);
      
      // Only show services that have been explicitly added to this entity (same logic as admin)
      const servicesWithStatus = [];
      for (const subscription of subscriptions) {
        const serviceType = await storage.getServiceType(subscription.serviceTypeId, user.tenantId);
        if (serviceType) {
          servicesWithStatus.push({
            ...serviceType,
            isRequired: subscription.isRequired,
            isSubscribed: subscription.isSubscribed
          });
        }
      }
      
      res.json(servicesWithStatus);
    } catch (error) {
      console.error('Error fetching entity services:', error);
      res.status(500).json({ message: 'Failed to fetch entity services' });
    }
  });
  
  // API Routes for Portal Access Management
  
  // Get client portal access
  app.get("/api/v1/clients/:clientId/portal-access", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const tenantId = (req.user as any).tenantId;
      
      if (!clientId || isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
      }
      
      const accessResults = await db
        .select()
        .from(clientPortalAccess)
        .where(and(
          eq(clientPortalAccess.clientId, clientId),
          eq(clientPortalAccess.tenantId, tenantId)
        ));
      
      if (!accessResults || accessResults.length === 0) {
        return res.status(404).json({ message: 'Portal access not found' });
      }
      
      // Don't send the password back
      const { password, ...accessWithoutPassword } = accessResults[0];
      res.json(accessWithoutPassword);
    } catch (error) {
      console.error('Error fetching client portal access:', error);
      res.status(500).json({ message: 'Failed to fetch portal access' });
    }
  });
  
  // Create client portal access
  app.post("/api/v1/clients/:clientId/portal-access", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const tenantId = (req.user as any).tenantId;
      const { username, password, passwordResetRequired, isActive } = req.body;
      
      if (!clientId || isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
      }
      
      // Check if client exists
      const clientResults = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, clientId),
          eq(clients.tenantId, tenantId)
        ));
      
      if (!clientResults || clientResults.length === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Check if portal access already exists
      const existingAccess = await db
        .select()
        .from(clientPortalAccess)
        .where(and(
          eq(clientPortalAccess.clientId, clientId),
          eq(clientPortalAccess.tenantId, tenantId)
        ));
      
      if (existingAccess && existingAccess.length > 0) {
        return res.status(409).json({ message: 'Portal access already exists for this client' });
      }
      
      // Check if username is unique
      const existingUsername = await db
        .select()
        .from(clientPortalAccess)
        .where(and(
          eq(clientPortalAccess.username, username),
          eq(clientPortalAccess.tenantId, tenantId)
        ));
      
      if (existingUsername && existingUsername.length > 0) {
        return res.status(409).json({ message: 'Username already exists' });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Create portal access
      const newAccess = await db
        .insert(clientPortalAccess)
        .values({
          tenantId,
          clientId,
          username,
          password: hashedPassword,
          passwordResetRequired: passwordResetRequired || true,
          isActive: isActive || true,
          createdAt: new Date()
        })
        .returning();
      
      if (!newAccess || newAccess.length === 0) {
        return res.status(500).json({ message: 'Failed to create portal access' });
      }
      
      // Update client hasPortalAccess flag
      await db
        .update(clients)
        .set({ hasPortalAccess: true })
        .where(and(
          eq(clients.id, clientId),
          eq(clients.tenantId, tenantId)
        ));
      
      // Don't send the password back
      const { password: pw, ...accessWithoutPassword } = newAccess[0];
      res.status(201).json(accessWithoutPassword);
    } catch (error) {
      console.error('Error creating client portal access:', error);
      res.status(500).json({ message: 'Failed to create portal access' });
    }
  });
  
  // Update client portal access
  app.patch("/api/v1/clients/:clientId/portal-access", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const tenantId = (req.user as any).tenantId;
      const { isActive } = req.body;
      
      if (!clientId || isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
      }
      
      // Get portal access
      const accessResults = await db
        .select()
        .from(clientPortalAccess)
        .where(and(
          eq(clientPortalAccess.clientId, clientId),
          eq(clientPortalAccess.tenantId, tenantId)
        ));
      
      if (!accessResults || accessResults.length === 0) {
        return res.status(404).json({ message: 'Portal access not found' });
      }
      
      // Update portal access
      const updatedAccess = await db
        .update(clientPortalAccess)
        .set({
          isActive,
          updatedAt: new Date()
        })
        .where(and(
          eq(clientPortalAccess.clientId, clientId),
          eq(clientPortalAccess.tenantId, tenantId)
        ))
        .returning();
      
      if (!updatedAccess || updatedAccess.length === 0) {
        return res.status(500).json({ message: 'Failed to update portal access' });
      }
      
      // Don't send the password back
      const { password, ...accessWithoutPassword } = updatedAccess[0];
      res.json(accessWithoutPassword);
    } catch (error) {
      console.error('Error updating client portal access:', error);
      res.status(500).json({ message: 'Failed to update portal access' });
    }
  });
  
  // Reset client portal password
  app.post("/api/v1/clients/:clientId/portal-access/reset-password", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const tenantId = (req.user as any).tenantId;
      const { password, passwordResetRequired } = req.body;
      
      if (!clientId || isNaN(clientId) || !password) {
        return res.status(400).json({ message: 'Invalid client ID or password' });
      }
      
      // Get portal access
      const accessResults = await db
        .select()
        .from(clientPortalAccess)
        .where(and(
          eq(clientPortalAccess.clientId, clientId),
          eq(clientPortalAccess.tenantId, tenantId)
        ));
      
      if (!accessResults || accessResults.length === 0) {
        return res.status(404).json({ message: 'Portal access not found' });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Update portal access
      const updatedAccess = await db
        .update(clientPortalAccess)
        .set({
          password: hashedPassword,
          passwordResetRequired: passwordResetRequired || true,
          updatedAt: new Date()
        })
        .where(and(
          eq(clientPortalAccess.clientId, clientId),
          eq(clientPortalAccess.tenantId, tenantId)
        ))
        .returning();
      
      if (!updatedAccess || updatedAccess.length === 0) {
        return res.status(500).json({ message: 'Failed to reset password' });
      }
      
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error resetting client portal password:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });
  
  // Delete client portal access
  app.delete("/api/v1/clients/:clientId/portal-access", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const tenantId = (req.user as any).tenantId;
      
      if (!clientId || isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
      }
      
      // Get portal access
      const accessResults = await db
        .select()
        .from(clientPortalAccess)
        .where(and(
          eq(clientPortalAccess.clientId, clientId),
          eq(clientPortalAccess.tenantId, tenantId)
        ));
      
      if (!accessResults || accessResults.length === 0) {
        return res.status(404).json({ message: 'Portal access not found' });
      }
      
      // Delete portal access
      await db
        .delete(clientPortalAccess)
        .where(and(
          eq(clientPortalAccess.clientId, clientId),
          eq(clientPortalAccess.tenantId, tenantId)
        ));
      
      // Update client hasPortalAccess flag
      await db
        .update(clients)
        .set({ hasPortalAccess: false })
        .where(and(
          eq(clients.id, clientId),
          eq(clients.tenantId, tenantId)
        ));
      
      res.json({ message: 'Portal access deleted successfully' });
    } catch (error) {
      console.error('Error deleting client portal access:', error);
      res.status(500).json({ message: 'Failed to delete portal access' });
    }
  });
  
  return { isClientAuthenticated };
}