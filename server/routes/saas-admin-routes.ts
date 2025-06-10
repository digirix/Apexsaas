import { Express, Request, Response } from 'express';
import { db } from '../db';
import { tenants, subscriptions, packages, saasAdmins, users } from '../../shared/schema';
import { eq, desc, count, sql } from 'drizzle-orm';

export function setupSaasAdminRoutes(app: Express, { isSaasAdminAuthenticated, requireSaasAdminRole }: any) {
  console.log('Setting up SaaS Admin routes...');

  // =============================================================================
  // Dashboard & Analytics
  // =============================================================================

  // Dashboard KPIs
  app.get('/api/saas-admin/dashboard/kpis', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      // Total tenants
      const totalTenants = await db
        .select({ count: count() })
        .from(tenants);

      // Active trials (trial status and trial_ends_at in future)
      const activeTrials = await db
        .select({ count: count() })
        .from(tenants)
        .where(sql`status = 'trial' AND trial_ends_at > NOW()`);

      // New sign-ups last 30 days
      const newSignups = await db
        .select({ count: count() })
        .from(tenants)
        .where(sql`created_at >= NOW() - INTERVAL '30 days'`);

      // Recent tenants
      const recentTenants = await db
        .select({
          id: tenants.id,
          companyName: tenants.companyName,
          status: tenants.status,
          createdAt: tenants.createdAt,
        })
        .from(tenants)
        .orderBy(desc(tenants.createdAt))
        .limit(5);

      res.json({
        totalTenants: totalTenants[0]?.count || 0,
        activeTrials: activeTrials[0]?.count || 0,
        newSignups: newSignups[0]?.count || 0,
        recentTenants,
        // MRR and churn rate would require Stripe integration
        mrr: 0,
        churnRate: 0,
      });
    } catch (error) {
      console.error('Dashboard KPIs error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
  });

  // =============================================================================
  // Tenant Management
  // =============================================================================

  // Get all tenants with pagination and filtering
  app.get('/api/saas-admin/tenants', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;

      let query = db.select({
        id: tenants.id,
        companyName: tenants.companyName,
        status: tenants.status,
        createdAt: tenants.createdAt,
        trialEndsAt: tenants.trialEndsAt,
      }).from(tenants);

      // Apply filters
      if (search) {
        query = query.where(sql`company_name ILIKE ${'%' + search + '%'}`);
      }
      if (status) {
        query = query.where(eq(tenants.status, status));
      }

      const results = await query
        .orderBy(desc(tenants.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      // Get total count for pagination
      const totalQuery = db.select({ count: count() }).from(tenants);
      const total = await totalQuery;

      res.json({
        tenants: results,
        pagination: {
          page,
          limit,
          total: total[0]?.count || 0,
          pages: Math.ceil((total[0]?.count || 0) / limit),
        }
      });
    } catch (error) {
      console.error('Tenants list error:', error);
      res.status(500).json({ message: 'Failed to fetch tenants' });
    }
  });

  // Get detailed tenant view
  app.get('/api/saas-admin/tenants/:tenantId', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId);

      // Get tenant info
      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant.length) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      // Get usage metrics
      const userCount = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.tenantId, tenantId));

      // Get subscription info
      const subscription = await db
        .select({
          id: subscriptions.id,
          status: subscriptions.status,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          stripeSubscriptionId: subscriptions.stripeSubscriptionId,
          packageName: packages.name,
          monthlyPrice: packages.monthlyPrice,
        })
        .from(subscriptions)
        .leftJoin(packages, eq(subscriptions.packageId, packages.id))
        .where(eq(subscriptions.tenantId, tenantId))
        .limit(1);

      res.json({
        tenant: tenant[0],
        metrics: {
          userCount: userCount[0]?.count || 0,
          // Additional metrics can be added here
        },
        subscription: subscription[0] || null,
      });
    } catch (error) {
      console.error('Tenant details error:', error);
      res.status(500).json({ message: 'Failed to fetch tenant details' });
    }
  });

  // Update tenant status
  app.put('/api/saas-admin/tenants/:tenantId/status', requireSaasAdminRole(['owner', 'support']), async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId);
      const { status } = req.body;

      if (!['trial', 'active', 'suspended', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      await db
        .update(tenants)
        .set({ 
          status,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      res.json({ message: 'Tenant status updated successfully' });
    } catch (error) {
      console.error('Update tenant status error:', error);
      res.status(500).json({ message: 'Failed to update tenant status' });
    }
  });

  // =============================================================================
  // Package Management
  // =============================================================================

  // Get all packages
  app.get('/api/saas-admin/packages', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const allPackages = await db
        .select()
        .from(packages)
        .orderBy(packages.monthlyPrice);

      res.json({ packages: allPackages });
    } catch (error) {
      console.error('Packages list error:', error);
      res.status(500).json({ message: 'Failed to fetch packages' });
    }
  });

  // Create new package
  app.post('/api/saas-admin/packages', requireSaasAdminRole(['owner']), async (req: Request, res: Response) => {
    try {
      const { name, description, monthlyPrice, annualPrice, limitsJson, isPubliclyVisible } = req.body;

      const newPackage = await db
        .insert(packages)
        .values({
          name,
          description,
          monthlyPrice: monthlyPrice?.toString(),
          annualPrice: annualPrice?.toString(),
          limitsJson,
          isPubliclyVisible: isPubliclyVisible ?? true,
        })
        .returning();

      res.status(201).json({ package: newPackage[0] });
    } catch (error) {
      console.error('Create package error:', error);
      res.status(500).json({ message: 'Failed to create package' });
    }
  });

  // Update package
  app.put('/api/saas-admin/packages/:packageId', requireSaasAdminRole(['owner']), async (req: Request, res: Response) => {
    try {
      const packageId = parseInt(req.params.packageId);
      const { name, description, monthlyPrice, annualPrice, limitsJson, isPubliclyVisible, isActive } = req.body;

      await db
        .update(packages)
        .set({
          name,
          description,
          monthlyPrice: monthlyPrice?.toString(),
          annualPrice: annualPrice?.toString(),
          limitsJson,
          isPubliclyVisible,
          isActive,
        })
        .where(eq(packages.id, packageId));

      res.json({ message: 'Package updated successfully' });
    } catch (error) {
      console.error('Update package error:', error);
      res.status(500).json({ message: 'Failed to update package' });
    }
  });

  // Delete package
  app.delete('/api/saas-admin/packages/:packageId', requireSaasAdminRole(['owner']), async (req: Request, res: Response) => {
    try {
      const packageId = parseInt(req.params.packageId);

      // Check if package is in use
      const subscriptionsUsingPackage = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.packageId, packageId));

      if (subscriptionsUsingPackage[0]?.count > 0) {
        return res.status(400).json({ message: 'Cannot delete package that is currently in use' });
      }

      await db
        .delete(packages)
        .where(eq(packages.id, packageId));

      res.json({ message: 'Package deleted successfully' });
    } catch (error) {
      console.error('Delete package error:', error);
      res.status(500).json({ message: 'Failed to delete package' });
    }
  });

  console.log('SaaS Admin routes registered successfully');
}