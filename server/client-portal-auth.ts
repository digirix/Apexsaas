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

export function setupClientPortalAuth(app: Express) {
  console.log("Setting up client portal authentication...");
  
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
      
      return done(null, clientPortalUser);
    } catch (error) {
      return done(error);
    }
  }));
  
  // Already defined in the main auth.ts
  // passport.serializeUser and passport.deserializeUser
  
  // Function to check if a request is from a client portal user
  function isClientAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && (req.user as any).isClientPortalUser) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  }
  
  console.log("Client portal authentication setup successful");
  
  return { isClientAuthenticated };
}