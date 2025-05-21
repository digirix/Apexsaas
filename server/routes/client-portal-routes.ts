import { Express, Request, Response, NextFunction } from "express";
import { db, sql } from "../db";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import { ClientPortalUser, isClientPortalUser } from "../client-portal-auth";

// For password hashing
const scryptAsync = promisify(scrypt);

// Middleware to check if the user is authenticated as a client
function isClientAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user && isClientPortalUser(req.user)) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export function setupClientPortalRoutes(app: Express) {
  // Client authentication status
  app.get("/api/client-portal/auth/me", (req, res) => {
    if (req.isAuthenticated() && req.user && isClientPortalUser(req.user)) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
  
  // Login for client portal
  app.post("/api/client-portal/login", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Find client portal user in the database
      const result = await db.execute(sql`
        SELECT 
          cpa.id, 
          cpa.client_id as "clientId",
          c.tenant_id as "tenantId",
          cpa.username,
          cpa.password,
          cpa.display_name as "displayName",
          cpa.email,
          cpa.password_reset_required as "passwordResetRequired"
        FROM client_portal_access cpa
        JOIN clients c ON cpa.client_id = c.id
        WHERE cpa.username = ${username} AND cpa.is_active = true
      `);
      
      if (result.rowCount === 0) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const user = result.rows[0];
      
      // Verify password
      const [hashedPassword, salt] = user.password.split(".");
      const hashedBuf = Buffer.from(hashedPassword, "hex");
      const suppliedBuf = (await scryptAsync(password, salt, 64)) as Buffer;
      
      if (!timingSafeEqual(hashedBuf, suppliedBuf)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Create client portal user object
      const clientPortalUser: ClientPortalUser = {
        id: user.id,
        clientId: user.clientId,
        tenantId: user.tenantId,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        passwordResetRequired: user.passwordResetRequired,
        isClientPortalUser: true
      };
      
      // Log in the user
      req.login(clientPortalUser, (err) => {
        if (err) return next(err);
        
        // Get client information
        db.execute(sql`
          SELECT 
            c.id, 
            c.display_name as "displayName",
            c.short_name as "shortName",
            c.email,
            c.phone,
            c.address,
            c.city,
            c.state,
            c.zip,
            c.country,
            c.website,
            c.notes,
            c.account_manager_id as "accountManagerId",
            u.display_name as "accountManagerName",
            u.email as "accountManagerEmail",
            u.profile_image as "accountManagerImage"
          FROM clients c
          LEFT JOIN users u ON c.account_manager_id = u.id
          WHERE c.id = ${clientPortalUser.clientId} AND c.tenant_id = ${clientPortalUser.tenantId}
        `).then(clientResult => {
          // Return user with client information
          res.json({
            user: clientPortalUser,
            client: clientResult.rowCount > 0 ? clientResult.rows[0] : null
          });
        }).catch(error => {
          console.error("Error fetching client information:", error);
          res.json({ user: clientPortalUser });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });
  
  // Logout from client portal
  app.post("/api/client-portal/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "An error occurred during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Reset password
  app.post("/api/client-portal/reset-password", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as ClientPortalUser;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      // Get current hashed password
      const userResult = await db.execute(sql`
        SELECT password FROM client_portal_access
        WHERE id = ${user.id}
      `);
      
      if (userResult.rowCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const dbUser = userResult.rows[0];
      
      // Verify current password
      const [hashedPassword, salt] = dbUser.password.split(".");
      const hashedBuf = Buffer.from(hashedPassword, "hex");
      const suppliedBuf = (await scryptAsync(currentPassword, salt, 64)) as Buffer;
      
      if (!timingSafeEqual(hashedBuf, suppliedBuf)) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const newSalt = randomBytes(16).toString("hex");
      const newHashedBuf = (await scryptAsync(newPassword, newSalt, 64)) as Buffer;
      const newHashedPassword = `${newHashedBuf.toString("hex")}.${newSalt}`;
      
      // Update the password in the database
      await db.execute(sql`
        UPDATE client_portal_access
        SET password = ${newHashedPassword}, password_reset_required = false
        WHERE id = ${user.id}
      `);
      
      // Update the user in the session
      const updatedUser = { ...user, passwordResetRequired: false };
      req.login(updatedUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error updating session" });
        }
        res.json({ message: "Password reset successfully" });
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "An error occurred during password reset" });
    }
  });
  
  // Get client profile
  app.get("/api/client-portal/profile", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as ClientPortalUser;
      
      // Get client information with account manager details
      const clientResult = await db.execute(sql`
        SELECT 
          c.id, 
          c.display_name as "displayName",
          c.short_name as "shortName",
          c.email,
          c.phone,
          c.address,
          c.city,
          c.state,
          c.zip,
          c.country,
          c.website,
          c.notes,
          c.account_manager_id as "accountManagerId",
          u.display_name as "accountManagerName",
          u.email as "accountManagerEmail",
          u.profile_image as "accountManagerImage",
          u.phone as "accountManagerPhone"
        FROM clients c
        LEFT JOIN users u ON c.account_manager_id = u.id
        WHERE c.id = ${user.clientId} AND c.tenant_id = ${user.tenantId}
      `);
      
      if (clientResult.rowCount === 0) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json({
        user,
        client: clientResult.rows[0]
      });
    } catch (error) {
      console.error("Error fetching client profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  
  // Get client entities
  app.get("/api/client-portal/entities", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as ClientPortalUser;
      console.log(`Fetching entities for client ${user.clientId} in tenant ${user.tenantId}`);
      
      // Query the database for actual client entities
      const entityResults = await db.execute(sql`
        SELECT 
          e.id,
          e.name,
          e.entity_type as "entityType",
          e.tax_id as "taxId",
          e.vat_id as "vat_id",
          e.address,
          e.city,
          e.state,
          e.country,
          e.fiscal_year_start as "fiscalYearStart",
          e.status,
          c.name as "countryName",
          s.name as "stateName"
        FROM entities e
        LEFT JOIN ref_countries c ON e.country = c.code
        LEFT JOIN ref_states s ON e.state = s.code AND e.country = s.country_code
        WHERE 
          e.client_id = ${user.clientId}
          AND e.tenant_id = ${user.tenantId}
        ORDER BY e.name
      `);
      
      // Get basic stats for each entity (task counts, documents, etc.)
      const entities = entityResults.rows.map((entity: any) => {
        // Add some default stats for each entity
        return {
          ...entity,
          stats: {
            taskCount: Math.floor(Math.random() * 8) + 1,  // Random number between 1-8
            documentCount: Math.floor(Math.random() * 12) + 1,  // Random number between 1-12
            transactionCount: Math.floor(Math.random() * 100) + 20,  // Random number between 20-120
          },
          file_access_link: entity.id % 2 === 0 ? "https://example.com/files" : null // Every other entity has a file link
        };
      });
      
      res.json(entities);
    } catch (error) {
      console.error('Error fetching client entities:', error);
      res.status(500).json({ message: 'Failed to fetch entities' });
    }
  });
  
  // Get all client invoices or invoices for a specific entity
  app.get("/api/client-portal/invoices", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as ClientPortalUser;
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
  
  // Get client tasks
  app.get("/api/client-portal/tasks", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as ClientPortalUser;
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : null;
      
      if (entityId) {
        console.log(`Fetching tasks for client ${user.clientId}, entity ${entityId} in tenant ${user.tenantId}`);
      } else {
        console.log(`Fetching all tasks for client ${user.clientId} in tenant ${user.tenantId}`);
      }
      
      // Get the entities to match with client tasks
      const entitiesResult = await db.execute(sql`
        SELECT id, name FROM entities 
        WHERE tenant_id = ${user.tenantId} AND client_id = ${user.clientId}
      `);
      
      const entities = entitiesResult.rows || [];
      
      // Create realistic task data based on client's actual entities
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      // Task statuses
      const statuses = ["Pending", "In Progress", "Completed", "Approved"];
      const priorities = ["Low", "Medium", "High", "Urgent"];
      
      // Common task types for financial clients
      const taskTypes = [
        "Tax Filing", 
        "Financial Review", 
        "Document Submission", 
        "Approval Required", 
        "Meeting",
        "Statement Review"
      ];
      
      // Create mock tasks
      let clientTasks = [];
      
      // Generate 2-3 tasks per entity
      for (const entity of entities) {
        // Skip if we're filtering by entity and this isn't the one
        if (entityId && entity.id !== entityId) continue;
        
        // Completed task
        clientTasks.push({
          id: 1000 + entity.id,
          tenantId: user.tenantId,
          clientId: user.clientId,
          entityId: entity.id,
          entityName: entity.name,
          title: `${taskTypes[0]} for ${entity.name}`,
          description: "Review and sign tax documents for filing",
          dueDate: lastWeek.toISOString(),
          priority: "High",
          status: "Completed",
          assignedTo: "Account Manager",
          createdAt: lastWeek.toISOString(),
          updatedAt: yesterday.toISOString()
        });
        
        // In progress task
        clientTasks.push({
          id: 2000 + entity.id,
          tenantId: user.tenantId,
          clientId: user.clientId,
          entityId: entity.id,
          entityName: entity.name,
          title: `${taskTypes[1]} for ${entity.name}`,
          description: "Quarterly financial statement review",
          dueDate: nextWeek.toISOString(),
          priority: "Medium",
          status: "In Progress",
          assignedTo: "Financial Analyst",
          createdAt: lastWeek.toISOString(),
          updatedAt: now.toISOString()
        });
        
        // Pending task
        clientTasks.push({
          id: 3000 + entity.id,
          tenantId: user.tenantId,
          clientId: user.clientId,
          entityId: entity.id,
          entityName: entity.name,
          title: `${taskTypes[2]} for ${entity.name}`,
          description: "Submit updated business registration documents",
          dueDate: new Date(nextWeek.setDate(nextWeek.getDate() + 14)).toISOString(),
          priority: "Low",
          status: "Pending",
          assignedTo: "Account Manager",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      }
      
      console.log(`Returning ${clientTasks.length} tasks for client`);
      return res.json(clientTasks);
    } catch (error) {
      console.error('Error fetching client tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  });
  
  // Get client documents
  app.get("/api/client-portal/documents", isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as ClientPortalUser;
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : null;
      
      if (entityId) {
        console.log(`Fetching documents for client ${user.clientId}, entity ${entityId} in tenant ${user.tenantId}`);
      } else {
        console.log(`Fetching all documents for client ${user.clientId} in tenant ${user.tenantId}`);
      }
      
      // Get the entities to create relevant document data
      const entitiesResult = await db.execute(sql`
        SELECT id, name FROM entities 
        WHERE tenant_id = ${user.tenantId} AND client_id = ${user.clientId}
      `);
      
      const entities = entitiesResult.rows || [];
      
      // Create document data based on client's actual entities
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastQuarter = new Date(now);
      lastQuarter.setMonth(lastQuarter.getMonth() - 3);
      
      // Document types
      const docTypes = ["Tax Return", "Financial Statement", "Report", "Agreement", "Certificate"];
      
      // Create sample documents
      let clientDocuments = [];
      let docId = 1000;
      
      // Generate documents per entity
      for (const entity of entities) {
        // Skip if we're filtering by entity and this isn't the one
        if (entityId && entity.id !== entityId) continue;
        
        // Tax Return
        clientDocuments.push({
          id: docId++,
          tenantId: user.tenantId,
          clientId: user.clientId,
          entityId: entity.id,
          entityName: entity.name,
          name: `${entity.name} Annual Tax Return`,
          description: "Filed tax return for the previous fiscal year",
          type: "Tax Return",
          date: lastQuarter.toISOString(),
          fileSize: 2456789,
          filePath: "/documents/tax-returns/tax-return-2024.pdf",
          status: "Final"
        });
        
        // Financial Statement
        clientDocuments.push({
          id: docId++,
          tenantId: user.tenantId,
          clientId: user.clientId,
          entityId: entity.id,
          entityName: entity.name,
          name: `${entity.name} Q1 Financial Statement`,
          description: "Quarterly financial statement including P&L and balance sheet",
          type: "Financial Statement",
          date: lastMonth.toISOString(),
          fileSize: 1256789,
          filePath: "/documents/financial-statements/q1-2024.pdf",
          status: "Final"
        });
        
        // Monthly Report
        clientDocuments.push({
          id: docId++,
          tenantId: user.tenantId,
          clientId: user.clientId,
          entityId: entity.id,
          entityName: entity.name,
          name: `${entity.name} Monthly Financial Review`,
          description: "Review of monthly financial performance and KPIs",
          type: "Report",
          date: lastWeek.toISOString(),
          fileSize: 756789,
          filePath: "/documents/reports/monthly-review-april-2024.pdf",
          status: "Final"
        });
        
        // Agreement
        clientDocuments.push({
          id: docId++,
          tenantId: user.tenantId,
          clientId: user.clientId,
          entityId: entity.id,
          entityName: entity.name,
          name: `${entity.name} Service Agreement`,
          description: "Signed service agreement for accounting services",
          type: "Agreement",
          date: lastQuarter.toISOString(),
          fileSize: 456789,
          filePath: "/documents/agreements/service-agreement-2024.pdf",
          status: "Final"
        });
      }
      
      console.log(`Returning ${clientDocuments.length} documents for client`);
      return res.json(clientDocuments);
    } catch (error) {
      console.error('Error fetching client documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });
}