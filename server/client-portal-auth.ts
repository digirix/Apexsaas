// Client Portal Authentication
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { clientPortalAccess, clients } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { eq, and } from "drizzle-orm";

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

// Authentication middleware
export function setupClientPortalAuth(app: Express) {
  // Setup passport strategy for client portal
  passport.use('client-portal', new LocalStrategy(
    { usernameField: 'username' },
    async (username, password, done) => {
      try {
        console.log(`Client portal login attempt with username: ${username}`);
        
        // Get client portal access record
        const accessRecords = await db
          .select()
          .from(clientPortalAccess)
          .where(eq(clientPortalAccess.username, username));
        
        if (!accessRecords || accessRecords.length === 0) {
          console.log('Client portal access record not found');
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        const accessRecord = accessRecords[0];
        
        // Check if account is active
        if (!accessRecord.isActive) {
          console.log('Client portal account is inactive');
          return done(null, false, { message: 'Account is inactive. Please contact your accountant.' });
        }
        
        // Verify password
        const passwordMatch = await comparePasswords(password, accessRecord.password);
        console.log(`Password match:`, passwordMatch ? 'Yes' : 'No');
        
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
          console.log('Client not found');
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
        
        // Return client portal user object with combined information
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
      } catch (err) {
        console.error('Client portal authentication error:', err);
        return done(err);
      }
    }
  ));
  
  // Client portal routes
  
  // Client login endpoint
  app.post("/api/client-portal/login", (req, res, next) => {
    passport.authenticate('client-portal', (err, user, info) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info.message || 'Login failed' });
      }
      
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        return res.json({ 
          user,
          passwordResetRequired: user.passwordResetRequired
        });
      });
    })(req, res, next);
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
  
  // Middleware to check if the client is authenticated
  function isClientAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && (req.user as any).isClientPortalUser) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  }
  
  return { isClientAuthenticated };
}