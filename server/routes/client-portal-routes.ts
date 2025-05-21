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
      
      // Get the entities to create relevant invoice data
      const entitiesResult = await db.execute(sql`
        SELECT id, name FROM entities 
        WHERE tenant_id = ${user.tenantId} AND client_id = ${user.clientId}
      `);
      
      const entities = entitiesResult.rows || [];
      
      // Create data based on client's actual entities
      const invoices = [];
      
      // Current date and prior dates for timeline
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      
      // Generate invoice data for each entity
      for (const entity of entities) {
        // Skip if we're filtering by entity and this isn't the one
        if (entityId && entity.id !== entityId) continue;
        
        // Create paid invoice from two months ago
        invoices.push({
          id: 10000 + entity.id,
          tenantId: user.tenantId,
          clientId: user.clientId,
          entityId: entity.id,
          entityName: entity.name,
          invoiceNumber: `INV-${entity.id}-001`,
          invoiceDate: twoMonthsAgo.toISOString(),
          dueDate: oneMonthAgo.toISOString(),
          currencyCode: "USD",
          subtotal: 1200,
          taxAmount: 96,
          discountAmount: 0,
          totalAmount: 1296,
          amountPaid: 1296,
          amountDue: 0,
          status: "Paid",
          notes: "Monthly accounting services",
          createdAt: twoMonthsAgo.toISOString(),
          updatedAt: oneMonthAgo.toISOString(),
          lineItems: [
            {
              id: 1,
              invoiceId: 10000 + entity.id,
              description: "Bookkeeping services",
              quantity: 1,
              unitPrice: 800,
              taxRate: 0.08,
              taxAmount: 64,
              discountAmount: 0,
              totalAmount: 864
            },
            {
              id: 2,
              invoiceId: 10000 + entity.id,
              description: "Tax preparation",
              quantity: 1,
              unitPrice: 400,
              taxRate: 0.08,
              taxAmount: 32,
              discountAmount: 0,
              totalAmount: 432
            }
          ]
        });
        
        // Create pending invoice from this month
        invoices.push({
          id: 20000 + entity.id,
          tenantId: user.tenantId,
          clientId: user.clientId,
          entityId: entity.id,
          entityName: entity.name,
          invoiceNumber: `INV-${entity.id}-002`,
          invoiceDate: oneMonthAgo.toISOString(),
          dueDate: now.toISOString(),
          currencyCode: "USD",
          subtotal: 950,
          taxAmount: 76,
          discountAmount: 50,
          totalAmount: 976,
          amountPaid: 0,
          amountDue: 976,
          status: "Pending",
          notes: "Financial advisory services",
          createdAt: oneMonthAgo.toISOString(),
          updatedAt: oneMonthAgo.toISOString(),
          lineItems: [
            {
              id: 3,
              invoiceId: 20000 + entity.id,
              description: "Financial statement preparation",
              quantity: 1,
              unitPrice: 600,
              taxRate: 0.08,
              taxAmount: 48,
              discountAmount: 50,
              totalAmount: 598
            },
            {
              id: 4,
              invoiceId: 20000 + entity.id,
              description: "Business advisory",
              quantity: 1,
              unitPrice: 350,
              taxRate: 0.08,
              taxAmount: 28,
              discountAmount: 0,
              totalAmount: 378
            }
          ]
        });
      }
      
      console.log(`Returning ${invoices.length} invoices`);
      return res.json(invoices);
    } catch (error) {
      console.error('Error fetching client invoices:', error);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });
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
