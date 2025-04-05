import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
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
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  console.log("Setting up auth middleware...");
  const SESSION_SECRET = process.env.SESSION_SECRET || "keyboard cat"; // Fallback for dev
  console.log("Using session secret (dev fallback if not set)");
  
  console.log("Creating session settings...");
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
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
        const user = await storage.getUserByEmail(email);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: 'Invalid email or password' });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  };

  // Middleware to check if user belongs to specified tenant
  const hasTenantAccess = (req: any, res: any, next: any) => {
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
      
      // Check if user with this email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Create new tenant
      const tenant = await storage.createTenant({ name: tenantName });
      
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
      
      // Auto login after signup
      req.login(user, err => {
        if (err) return next(err);
        
        // Don't send the password back
        const { password, ...userWithoutPassword } = user;
        res.status(201).json({
          user: userWithoutPassword,
          tenant
        });
      });
    } catch (error) {
      next(error);
    }
  });

  // Login firm user
  app.post("/api/v1/auth/login/firm", (req, res, next) => {
    passport.authenticate('firm-local', (err: any, user: SelectUser | false, info: { message?: string } | undefined) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || 'Invalid email or password' });
      
      req.login(user, (err) => {
        if (err) return next(err);
        
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

  return { isAuthenticated, hasTenantAccess };
}
