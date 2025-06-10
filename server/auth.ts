import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser, clientPortalAccess, clients } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

declare global {
  namespace Express {
    // Extend the User interface to include our User type
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Check if password is bcrypt format (starts with $2b$)
    if (stored.startsWith('$2b$') || stored.startsWith('$2a$') || stored.startsWith('$2y$')) {
      console.log('Using bcrypt verification for password');
      return await bcrypt.compare(supplied, stored);
    }
    
    // Legacy scrypt format (contains a dot separator)
    if (stored.includes('.')) {
      console.log('Using legacy scrypt verification for password');
      const [hashed, salt] = stored.split('.');
      
      if (!hashed || !salt) {
        console.error('Invalid password format. Missing hash or salt component.');
        return false;
      }
      
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    }
    
    console.error('Unknown password format:', stored.substring(0, 10) + '...');
    return false;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  console.log("Setting up auth middleware...");
  const SESSION_SECRET = process.env.SESSION_SECRET || "keyboard cat"; // Fallback for dev
  console.log("Using session secret (dev fallback if not set)");
  
  console.log("Creating session settings...");
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true, // Changed to true to ensure sessions are created
    store: storage.sessionStore,
    name: 'connect.sid',
    cookie: {
      secure: false, // Set to false for development to allow HTTP cookies
      httpOnly: false, // Changed to false for development
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: 'lax', // Allow cookies for same-site requests
      path: '/' // Ensure cookie is available for all paths
    }
  };

  console.log("Setting up middleware...");
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  console.log("Session middleware set up");
  app.use(passport.initialize());
  app.use(passport.session());
  console.log("Passport middleware initialized");

  // Local strategy for firm users (with email)
  passport.use('firm-local', new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        console.log(`Login attempt with email: ${email}`);
        const user = await storage.getUserByEmail(email);
        console.log(`User found:`, user ? 'Yes' : 'No');
        
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        
        console.log('Stored password format:', user.password ? `${user.password.substring(0, 10)}...` : 'Missing');
        
        if (!user.password || typeof user.password !== 'string') {
          console.error('Invalid password format in database:', user.password);
          return done(null, false, { message: 'Account has invalid password format' });
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        console.log(`Password match:`, passwordMatch ? 'Yes' : 'No');
        
        if (!passwordMatch) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        
        return done(null, user);
      } catch (err) {
        console.error('Authentication error:', err);
        return done(err);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    // Add user type to prevent conflicts between different user types
    if ((user as any).isClientPortalUser) {
      done(null, { id: user.id, type: 'client-portal' });
    } else if ((user as any).isSaasAdmin) {
      done(null, { id: user.id, type: 'saas-admin' });
    } else {
      done(null, { id: user.id, type: 'staff' });
    }
  });

  passport.deserializeUser(async (serialized: { id: number, type: string }, done) => {
    try {
      console.log(`DEBUG DESERIALIZE: Starting deserialization for user ID ${serialized.id}, type: ${serialized.type}`);
      if (serialized.type === 'client-portal') {
        try {
          // For client portal users, fetch from clientPortalAccess and clients tables
          console.log(`Deserializing client portal user with ID: ${serialized.id}`);
          
          const accessRecords = await db
            .select()
            .from(clientPortalAccess)
            .where(eq(clientPortalAccess.id, serialized.id));
            
          if (!accessRecords || accessRecords.length === 0) {
            console.log(`No client portal access record found for ID: ${serialized.id}`);
            return done(null, false);
          }
          
          const accessRecord = accessRecords[0];
          console.log(`Found access record for client: ${accessRecord.clientId}`);
          
          const clientResults = await db
            .select()
            .from(clients)
            .where(and(
              eq(clients.id, accessRecord.clientId),
              eq(clients.tenantId, accessRecord.tenantId)
            ));
            
          if (!clientResults || clientResults.length === 0) {
            console.log(`No client found for ID: ${accessRecord.clientId}`);
            return done(null, false);
          }
          
          const client = clientResults[0];
          console.log(`Found client: ${client.displayName}`);
          
          // Create client portal user with necessary information
          const user = {
            id: accessRecord.id,
            clientId: client.id,
            tenantId: client.tenantId,
            username: accessRecord.username,
            displayName: client.displayName,
            email: client.email || '',
            passwordResetRequired: accessRecord.passwordResetRequired,
            isClientPortalUser: true,
            // Add these properties to match the User interface requirements
            password: '', // This is a placeholder, we never send the actual password
            designationId: null,
            departmentId: null,
            isSuperAdmin: false,
            isActive: true,
            createdAt: accessRecord.createdAt
          } as any; // Use type assertion to bypass type checking
          
          console.log(`Deserialized client portal user: ${user.username}`);
          return done(null, user);
        } catch (error) {
          console.error('Error deserializing client portal user:', error);
          return done(error);
        }
      } else {
        // For regular staff users
        try {
          console.log(`Deserializing staff user with ID: ${serialized.id}`);
          const user = await storage.getUser(serialized.id);
          console.log(`DEBUG AUTH: Retrieved user:`, JSON.stringify(user, null, 2));
          console.log(`DEBUG AUTH: isSuperAdmin type:`, typeof user?.isSuperAdmin, 'value:', user?.isSuperAdmin);
          return done(null, user);
        } catch (error) {
          console.error('Error deserializing staff user:', error);
          return done(error);
        }
      }
    } catch (err) {
      console.error('Deserialize error:', err);
      done(err);
    }
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  };

  // Middleware to check if user belongs to specified tenant
  const hasTenantAccess = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const tenantId = parseInt(req.params.tenantId || req.body.tenantId || req.user.tenantId);
    
    if (req.user.tenantId !== tenantId) {
      return res.status(403).json({ message: 'Forbidden: No access to this tenant' });
    }
    
    next();
  };

  // Register firm (creates tenant and super admin)
  app.post("/api/v1/auth/signup", async (req, res, next) => {
    try {
      const { tenantName, displayName, email, password } = req.body;
      
      console.log("Registration attempt:", { tenantName, displayName, email });
      
      // Check if user with this email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log("Registration failed: Email already in use");
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Create new tenant
      const tenant = await storage.createTenant({ name: tenantName });
      console.log("Tenant created:", tenant);
      
      // Create super admin user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        tenantId: tenant.id,
        username: email,
        email,
        password: hashedPassword,
        displayName,
        isSuperAdmin: true
      });
      console.log("User created:", { id: user.id, email: user.email, username: user.username });
      
      // No need to verify the user since the storage returned the created user
      console.log(`User registration successful for ${user.username}`);
      
      // Auto login after signup
      req.login(user, err => {
        if (err) {
          console.error("Login after signup failed:", err);
          return next(err);
        }
        
        console.log("Login after signup successful");
        
        // Don't send the password back
        const { password, ...userWithoutPassword } = user;
        res.status(201).json({
          user: userWithoutPassword,
          tenant
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  // Login firm user
  app.post("/api/v1/auth/login", (req, res, next) => {
    console.log("Login attempt:", req.body);
    
    // No need to access in-memory storage directly for debugging
    console.log("Processing login attempt...");
    
    passport.authenticate('firm-local', (err: any, user: SelectUser | false, info: { message?: string } | undefined) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed:", info?.message || 'Invalid email or password');
        return res.status(401).json({ message: info?.message || 'Invalid email or password' });
      }
      
      console.log("Authentication successful, logging in user:", user.email);
      
      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return next(err);
        }
        
        console.log("Login successful for:", user.email);
        
        // Don't send the password back
        const { password, ...userWithoutPassword } = user as SelectUser;
        res.json({ user: userWithoutPassword });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/v1/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: 'Logout failed' });
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });

  // Get current user
  app.get("/api/v1/auth/me", isAuthenticated, (req, res) => {
    // Don't send the password back
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json({ user: userWithoutPassword });
  });
  
  // Debug route to check users
  app.get("/api/v1/auth/debug", async (req, res) => {
    try {
      const email = req.query.email as string;
      const users = await storage.getUsers();
      const userSummary = users.map(u => ({
        id: u.id,
        email: u.email,
        username: u.username
      }));
      
      res.json({
        userCount: users.length,
        users: userSummary,
        searchEmail: email,
        foundUser: email ? Boolean(await storage.getUserByEmail(email)) : null
      });
    } catch (error) {
      console.error("Debug route error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  return { isAuthenticated, hasTenantAccess };
}
