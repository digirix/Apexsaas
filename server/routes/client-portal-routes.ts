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
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      // Get client portal access record
      const accessRecords = await db
        .select()
        .from(clientPortalAccess)
        .where(and(
          eq(clientPortalAccess.username, username),
          eq(clientPortalAccess.tenantId, tenantId)
        ));
      
      if (!accessRecords || accessRecords.length === 0) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      const accessRecord = accessRecords[0];
      
      // Check if account is active
      if (!accessRecord.isActive) {
        return res.status(401).json({ message: 'Account is inactive. Please contact your accountant.' });
      }
      
      // Verify password
      const passwordMatch = await comparePasswords(password, accessRecord.password);
      
      if (!passwordMatch) {
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
        return res.status(404).json({ message: 'Client account not found' });
      }
      
      const client = clientResults[0];
      
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
      
      // Login the user
      req.login(clientPortalUser, (err) => {
        if (err) {
          return next(err);
        }
        
        return res.json({ 
          user: clientPortalUser,
          passwordResetRequired: accessRecord.passwordResetRequired
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
  
  // Get client entities
  app.get("/api/client-portal/entities", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      const entityResults = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.clientId, user.clientId),
          eq(entities.tenantId, user.tenantId)
        ));
      
      // Get entity types for each entity
      const enrichedEntities = await Promise.all(entityResults.map(async (entity) => {
        // You would normally join with entityTypes here, but we're doing it manually
        // since we're not setting up a proper join in this example
        const entityTypeResult = await db
          .execute(sql`
            SELECT et.name as "entityType" 
            FROM entity_types et 
            WHERE et.id = ${entity.entityTypeId} AND et.tenant_id = ${user.tenantId}
          `);
        
        const entityType = entityTypeResult.rows[0]?.entityType || 'Unknown';
        
        return {
          ...entity,
          entityType
        };
      }));
      
      res.json(enrichedEntities);
    } catch (error) {
      console.error('Error fetching client entities:', error);
      res.status(500).json({ message: 'Failed to fetch entities' });
    }
  });
  
  // Get client invoices
  app.get("/api/client-portal/invoices", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      const invoiceResults = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.clientId, user.clientId),
          eq(invoices.tenantId, user.tenantId)
        ))
        .orderBy(desc(invoices.issueDate));
      
      res.json(invoiceResults);
    } catch (error) {
      console.error('Error fetching client invoices:', error);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });
  
  // Get client documents (placeholder for now)
  app.get("/api/client-portal/documents", isClientAuthenticated, async (req, res) => {
    try {
      // This is a placeholder - in a real implementation, you would fetch documents from your storage
      res.json([]);
    } catch (error) {
      console.error('Error fetching client documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });
  
  // Get client tasks
  app.get("/api/client-portal/tasks", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      const taskResults = await db
        .select()
        .from(tasks)
        .where(and(
          eq(tasks.clientId, user.clientId),
          eq(tasks.tenantId, user.tenantId)
        ))
        .orderBy(desc(tasks.dueDate));
      
      res.json(taskResults);
    } catch (error) {
      console.error('Error fetching client tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks' });
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