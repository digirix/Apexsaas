import { Express, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { saasAdmins, SelectSaasAdmin } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { db } from './db';

// Extend Express User interface to support both tenant users and SaaS admins
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      displayName: string;
      // Tenant user properties (optional for SaaS admins)
      tenantId?: number;
      username?: string;
      password?: string;
      designationId?: number | null;
      departmentId?: number | null;
      isSuperAdmin?: boolean;
      isAdmin?: boolean;
      isActive?: boolean;
      createdAt?: Date;
      // SaaS admin properties (optional for tenant users)
      role?: string;
      lastLoginAt?: Date | null;
      // Discriminator fields
      isSaasAdmin?: boolean;
    }
  }
}

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 12);
}

async function comparePasswords(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

export interface SaasAdminUser {
  id: number;
  email: string;
  role: string;
  displayName: string;
  isActive: boolean;
  isSaasAdmin: true;
}

export function isSaasAdminUser(user: any): user is SaasAdminUser {
  return user && user.isSaasAdmin === true;
}

export function setupSaasAdminAuth(app: Express) {
  console.log('Setting up SaaS Admin authentication...');

  // Configure SaaS Admin Local Strategy
  passport.use('saas-admin-local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        console.log('SaaS Admin authentication attempt for:', email);
        
        const admin = await db
          .select()
          .from(saasAdmins)
          .where(eq(saasAdmins.email, email))
          .limit(1);

        if (!admin.length) {
          console.log('SaaS Admin not found:', email);
          return done(null, false, { message: 'Invalid credentials' });
        }

        const adminUser = admin[0];
        
        if (!adminUser.isActive) {
          console.log('SaaS Admin account disabled:', email);
          return done(null, false, { message: 'Account disabled' });
        }

        const isValidPassword = await comparePasswords(password, adminUser.passwordHash);
        
        if (!isValidPassword) {
          console.log('Invalid password for SaaS Admin:', email);
          return done(null, false, { message: 'Invalid credentials' });
        }

        // Update last login
        await db
          .update(saasAdmins)
          .set({ lastLoginAt: new Date() })
          .where(eq(saasAdmins.id, adminUser.id));

        const saasAdminUser: SaasAdminUser = {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          displayName: adminUser.displayName,
          isActive: adminUser.isActive,
          isSaasAdmin: true,
        };

        console.log('SaaS Admin authentication successful:', email);
        return done(null, saasAdminUser);
      } catch (error) {
        console.error('SaaS Admin authentication error:', error);
        return done(error);
      }
    }
  ));

  // SaaS Admin authentication middleware
  function isSaasAdminAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && isSaasAdminUser(req.user)) {
      return next();
    }
    return res.status(401).json({ message: 'SaaS Admin authentication required' });
  }

  // SaaS Admin role-based authorization middleware
  function requireSaasAdminRole(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated() || !isSaasAdminUser(req.user)) {
        return res.status(401).json({ message: 'SaaS Admin authentication required' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      return next();
    };
  }

  // SaaS Admin login endpoint
  app.post('/api/saas-admin/auth/login', (req, res, next) => {
    passport.authenticate('saas-admin-local', (err: any, user: SaasAdminUser | false, info: any) => {
      if (err) {
        console.error('SaaS Admin login error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (!user) {
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('SaaS Admin session error:', err);
          return res.status(500).json({ message: 'Session error' });
        }

        return res.json({
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            displayName: user.displayName,
            isSaasAdmin: true,
          }
        });
      });
    })(req, res, next);
  });

  // SaaS Admin logout endpoint
  app.post('/api/saas-admin/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('SaaS Admin logout error:', err);
        return res.status(500).json({ message: 'Logout error' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // SaaS Admin profile endpoint
  app.get('/api/saas-admin/auth/me', isSaasAdminAuthenticated, (req, res) => {
    const user = req.user as SaasAdminUser;
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        isSaasAdmin: true,
      }
    });
  });

  console.log('SaaS Admin authentication setup successful');
  
  // Export middleware functions for use in routes
  return {
    isSaasAdminAuthenticated,
    requireSaasAdminRole,
    hashPassword,
    comparePasswords,
  };
}