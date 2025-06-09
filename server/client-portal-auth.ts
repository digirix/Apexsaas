import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { 
  clientPortalAccess, 
  clients,
  users,
  User
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

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

// Define a type for client portal users
export interface ClientPortalUser {
  id: number;
  clientId: number;
  tenantId: number;
  username: string;
  displayName: string;
  email: string;
  passwordResetRequired: boolean;
  isClientPortalUser: true;
}

// This will help passport distinguish between regular users and client portal users
export function isClientPortalUser(user: any): user is ClientPortalUser {
  return user && user.isClientPortalUser === true;
}

export function setupClientPortalAuth(app: Express) {
  console.log("Setting up client portal authentication...");
  
  // Set up a separate session for client portal
  const clientPortalSessionSettings: session.SessionOptions = {
    secret: process.env.CLIENT_PORTAL_SESSION_SECRET || process.env.SESSION_SECRET || 'client-portal-dev-secret',
    resave: false,
    saveUninitialized: false,
    name: 'client-portal.sid', // Use a different cookie name from the main application
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    }
  };
  
  // Apply the client portal session middleware to client portal routes only
  app.use('/api/client-portal', session(clientPortalSessionSettings));
  app.use('/api/client-portal', passport.initialize());
  app.use('/api/client-portal', passport.session());
  
  // Use a separate strategy name for client portal authentication
  passport.use("client-portal-local", new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
  }, async (req, username, password, done) => {
    try {
      const tenantId = req.body.tenantId;
      
      if (!tenantId) {
        return done(null, false, { message: 'Tenant ID is required' });
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
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      const accessRecord = accessRecords[0];
      
      // Check if account is active
      if (!accessRecord.isActive) {
        return done(null, false, { message: 'Account is inactive. Please contact your accountant.' });
      }
      
      // Verify password
      const passwordMatch = await comparePasswords(password, accessRecord.password);
      
      if (!passwordMatch) {
        return done(null, false, { message: 'Invalid username or password' });
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
        return done(null, false, { message: 'Client account not found' });
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
      const clientPortalUser: ClientPortalUser = {
        id: accessRecord.id,
        clientId: client.id,
        tenantId: client.tenantId,
        username: accessRecord.username,
        displayName: client.displayName,
        email: client.email,
        passwordResetRequired: accessRecord.passwordResetRequired,
        isClientPortalUser: true,  // Flag to differentiate from regular users
      };
      
      return done(null, clientPortalUser);
    } catch (error) {
      return done(error);
    }
  }));
  
  // Note: Login route is handled in client-portal-routes.ts to avoid conflicts
  
  // Note: Logout route is handled in client-portal-routes.ts to avoid conflicts
  
  // Client profile endpoint
  app.get('/api/client-portal/profile', isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as ClientPortalUser;
      
      // Get detailed client information
      const clientResult = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, user.clientId),
          eq(clients.tenantId, user.tenantId)
        ));
      
      if (!clientResult || clientResult.length === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // TODO: Get account manager information when that feature is implemented
      
      res.status(200).json({
        client: {
          id: clientResult[0].id,
          displayName: clientResult[0].displayName,
          email: clientResult[0].email,
          status: clientResult[0].status,
        },
        accountManager: {
          name: "Your Account Manager",
          email: "accountmanager@example.com",
        }
      });
    } catch (error) {
      console.error('Error fetching client profile:', error);
      res.status(500).json({ message: 'Error fetching client profile' });
    }
  });
  
  // Note: Client tasks endpoint is now handled in client-portal-routes.ts
  
  // Client documents endpoint
  app.get('/api/client-portal/documents', isClientAuthenticated, async (req, res) => {
    try {
      const user = req.user as ClientPortalUser;
      
      // Placeholder for now - will implement actual document fetching later
      const mockDocuments = [
        {
          id: 1,
          name: "2024 Tax Return",
          type: "Tax Return",
          description: "Your completed tax return for the 2024 tax year",
          date: new Date(new Date().setDate(new Date().getDate() - 45)).toISOString(),
        },
        {
          id: 2,
          name: "Q2 Financial Statements",
          type: "Financial Statement",
          description: "Financial statements for Q2 2024",
          date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
        },
        {
          id: 3,
          name: "Business Registration",
          type: "Document",
          description: "Your business registration documents",
          date: new Date(new Date().setDate(new Date().getDate() - 180)).toISOString(),
        }
      ];
      
      res.status(200).json(mockDocuments);
    } catch (error) {
      console.error('Error fetching client documents:', error);
      res.status(500).json({ message: 'Error fetching client documents' });
    }
  });
  
  // Function to check if a request is from a client portal user
  function isClientAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && isClientPortalUser(req.user)) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Password reset endpoint (will be implemented later)
  app.post('/api/client-portal/reset-password', async (req, res) => {
    try {
      const { password, token, tenantId, clientId } = req.body;
      
      if (!password || !tenantId || !clientId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // For now, just update the password directly
      // In a production app, you'd validate a reset token here
      const hashedPassword = await hashPassword(password);
      
      await db
        .update(clientPortalAccess)
        .set({ 
          password: hashedPassword,
          passwordResetRequired: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(clientPortalAccess.clientId, clientId),
          eq(clientPortalAccess.tenantId, tenantId)
        ));
      
      res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Error resetting password' });
    }
  });
  
  console.log("Client portal authentication setup successful");
  
  return { isClientAuthenticated };
}