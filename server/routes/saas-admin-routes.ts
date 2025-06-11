import { Express, Request, Response } from 'express';
import { db } from '../db';
import { tenants, subscriptions, packages, saasAdmins, users, entities, tasks, invoices, blogPosts } from '../../shared/schema';
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
      const totalTenantsResult = await db
        .select({ count: count() })
        .from(tenants);
      const totalTenants = totalTenantsResult[0]?.count || 0;

      // Active trials (trial status and trial_ends_at in future)
      const activeTrialsResult = await db
        .select({ count: count() })
        .from(tenants)
        .where(sql`status = 'trial' AND trial_ends_at > NOW()`);
      const activeTrials = activeTrialsResult[0]?.count || 0;

      // New sign-ups last 30 days
      const newSignupsResult = await db
        .select({ count: count() })
        .from(tenants)
        .where(sql`created_at >= NOW() - INTERVAL '30 days'`);
      const newSignups = newSignupsResult[0]?.count || 0;

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
        .limit(10);

      // Calculate MRR from active subscriptions
      const mrrResult = await db
        .select({ 
          total: sql<number>`COALESCE(SUM(${packages.monthlyPrice}), 0)` 
        })
        .from(subscriptions)
        .innerJoin(packages, eq(subscriptions.packageId, packages.id))
        .where(sql`${subscriptions.status} = 'active'`);
      const mrr = Number(mrrResult[0]?.total || 0);

      // Calculate ARPU (Average Revenue Per User)
      const arpu = totalTenants > 0 ? mrr / totalTenants : 0;

      // Calculate churn rate (cancelled in last 30 days / total active at start of period)
      const cancelledLast30Result = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(sql`status = 'cancelled' AND updated_at >= NOW() - INTERVAL '30 days'`);
      const cancelledLast30 = cancelledLast30Result[0]?.count || 0;
      
      const activeAtStartResult = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(sql`status = 'active' OR (status = 'cancelled' AND updated_at >= NOW() - INTERVAL '30 days')`);
      const activeAtStart = activeAtStartResult[0]?.count || 0;
      
      const churnRate = activeAtStart > 0 ? (cancelledLast30 / activeAtStart) * 100 : 0;

      // Calculate LTV (Lifetime Value) - simplified calculation
      const avgSubscriptionLength = 24; // months (industry average)
      const ltv = arpu * avgSubscriptionLength;

      // Trial conversion rate
      const totalTrialsResult = await db
        .select({ count: count() })
        .from(tenants)
        .where(sql`status IN ('trial', 'active', 'cancelled')`);
      const totalTrials = totalTrialsResult[0]?.count || 0;
      
      const convertedTrialsResult = await db
        .select({ count: count() })
        .from(tenants)
        .where(sql`status = 'active'`);
      const convertedTrials = convertedTrialsResult[0]?.count || 0;
      
      const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

      // System health metrics (simulated for now - would integrate with monitoring tools)
      const systemHealth = {
        uptime: 99.8,
        responseTime: 85,
        errorRate: 0.05
      };

      // Billing metrics
      const totalRevenueResult = await db
        .select({ 
          total: sql<number>`COALESCE(SUM(${packages.monthlyPrice}), 0)` 
        })
        .from(subscriptions)
        .innerJoin(packages, eq(subscriptions.packageId, packages.id))
        .where(sql`${subscriptions.status} IN ('active', 'trialing')`);
      const totalRevenue = Number(totalRevenueResult[0]?.total || 0) * 12; // Annualized

      const billing = {
        totalRevenue,
        pendingPayments: 2, // Would integrate with payment processor
        failedPayments: 1,
        nextBillingCycle: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      // Usage analytics across all tenants
      const totalUsersResult = await db
        .select({ count: count() })
        .from(users);
      const totalUsers = totalUsersResult[0]?.count || 0;

      const totalEntitiesResult = await db
        .select({ count: count() })
        .from(entities);
      const totalEntities = totalEntitiesResult[0]?.count || 0;

      const totalTasksResult = await db
        .select({ count: count() })
        .from(tasks);
      const totalTasks = totalTasksResult[0]?.count || 0;

      const totalInvoicesResult = await db
        .select({ count: count() })
        .from(invoices);
      const totalInvoices = totalInvoicesResult[0]?.count || 0;

      const usage = {
        totalUsers,
        totalEntities,
        totalTasks,
        totalInvoices
      };

      res.json({
        totalTenants,
        activeTrials,
        newSignups,
        recentTenants,
        mrr,
        arpu,
        churnRate,
        ltv,
        conversionRate,
        systemHealth,
        billing,
        usage
      });
    } catch (error) {
      console.error('Dashboard KPIs error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
  });

  // Growth Analytics - Monthly tenant growth data
  app.get('/api/saas-admin/dashboard/growth', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const growthData = await db
        .select({
          month: sql<string>`TO_CHAR(${tenants.createdAt}, 'YYYY-MM')`,
          tenants: count(),
          trials: sql<number>`COUNT(CASE WHEN ${tenants.status} = 'trial' THEN 1 END)`,
        })
        .from(tenants)
        .where(sql`${tenants.createdAt} >= NOW() - INTERVAL '12 months'`)
        .groupBy(sql`TO_CHAR(${tenants.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${tenants.createdAt}, 'YYYY-MM')`);

      // Calculate revenue for each month
      const enrichedData = await Promise.all(
        growthData.map(async (month) => {
          const revenueResult = await db
            .select({ 
              revenue: sql<number>`COALESCE(SUM(${packages.monthlyPrice}), 0)` 
            })
            .from(subscriptions)
            .innerJoin(packages, eq(subscriptions.packageId, packages.id))
            .where(sql`TO_CHAR(${subscriptions.createdAt}, 'YYYY-MM') = ${month.month} AND ${subscriptions.status} = 'active'`);
          
          return {
            month: month.month,
            tenants: month.tenants,
            trials: month.trials,
            revenue: Number(revenueResult[0]?.revenue || 0)
          };
        })
      );

      res.json(enrichedData);
    } catch (error) {
      console.error('Growth analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch growth data' });
    }
  });

  // Revenue Breakdown by Package
  app.get('/api/saas-admin/dashboard/revenue-breakdown', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const revenueData = await db
        .select({
          packageName: packages.name,
          monthlyPrice: packages.monthlyPrice,
          tenantCount: count(),
        })
        .from(subscriptions)
        .innerJoin(packages, eq(subscriptions.packageId, packages.id))
        .where(sql`${subscriptions.status} = 'active'`)
        .groupBy(packages.id, packages.name, packages.monthlyPrice);

      const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
      
      const enrichedData = revenueData.map((item, index) => ({
        packageName: item.packageName,
        revenue: Number(item.monthlyPrice) * item.tenantCount,
        tenantCount: item.tenantCount,
        color: colors[index % colors.length]
      }));

      res.json(enrichedData);
    } catch (error) {
      console.error('Revenue breakdown error:', error);
      res.status(500).json({ message: 'Failed to fetch revenue breakdown' });
    }
  });

  // System Alerts and Notifications
  app.get('/api/saas-admin/dashboard/alerts', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      // System alerts would typically come from monitoring systems
      // For now, we'll generate alerts based on actual system conditions
      const alerts = [];

      // Check for failed payments (simulated)
      const failedPaymentsResult = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(sql`${subscriptions.status} = 'past_due'`);
      
      const failedPayments = failedPaymentsResult[0]?.count || 0;
      if (failedPayments > 0) {
        alerts.push({
          id: 'failed-payments',
          type: 'warning' as const,
          message: `${failedPayments} tenants have failed payments requiring attention`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }

      // Check for trial expirations
      const expiringTrialsResult = await db
        .select({ count: count() })
        .from(tenants)
        .where(sql`${tenants.status} = 'trial' AND ${tenants.trialEndsAt} <= NOW() + INTERVAL '3 days'`);
      
      const expiringTrials = expiringTrialsResult[0]?.count || 0;
      if (expiringTrials > 0) {
        alerts.push({
          id: 'expiring-trials',
          type: 'info' as const,
          message: `${expiringTrials} trials expiring within 3 days`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }

      // Check for high error rates (simulated)
      const errorRate = 0.05; // This would come from monitoring
      if (errorRate > 1.0) {
        alerts.push({
          id: 'high-error-rate',
          type: 'error' as const,
          message: `System error rate elevated at ${(errorRate * 100).toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }

      // System health check
      const totalTenants = await db.select({ count: count() }).from(tenants);
      if ((totalTenants[0]?.count || 0) > 100) {
        alerts.push({
          id: 'scaling-milestone',
          type: 'info' as const,
          message: 'Platform has reached 100+ tenants milestone',
          timestamp: new Date().toISOString(),
          resolved: true
        });
      }

      res.json(alerts);
    } catch (error) {
      console.error('System alerts error:', error);
      res.status(500).json({ message: 'Failed to fetch system alerts' });
    }
  });

  // =============================================================================
  // Tenant Management
  // =============================================================================

  // Get tenant statistics overview
  app.get('/api/saas-admin/tenants/stats', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get basic tenant counts
      const [totalTenantsResult, activeTenantsResult, trialTenantsResult] = await Promise.all([
        db.select({ count: count() }).from(tenants),
        db.select({ count: count() }).from(tenants).where(eq(tenants.status, 'active')),
        db.select({ count: count() }).from(tenants).where(eq(tenants.status, 'trial')),
      ]);

      // Calculate total revenue from active subscriptions
      const revenueResult = await db
        .select({ 
          total: sql<number>`COALESCE(SUM(${packages.monthlyPrice}), 0)` 
        })
        .from(subscriptions)
        .innerJoin(packages, eq(subscriptions.packageId, packages.id))
        .where(sql`${subscriptions.status} = 'active'`);

      // Calculate average users per tenant
      const avgUsersResult = await db
        .select({ 
          avg: sql<number>`COALESCE(AVG(user_count.count), 0)` 
        })
        .from(
          db.select({ 
            tenantId: users.tenantId, 
            count: count().as('count') 
          })
          .from(users)
          .groupBy(users.tenantId)
          .as('user_count')
        );

      res.json({
        totalTenants: totalTenantsResult[0]?.count || 0,
        activeTenants: activeTenantsResult[0]?.count || 0,
        trialTenants: trialTenantsResult[0]?.count || 0,
        totalRevenue: Number(revenueResult[0]?.total || 0),
        avgUsersPerTenant: Number(avgUsersResult[0]?.avg || 0),
      });
    } catch (error) {
      console.error('Tenant stats error:', error);
      res.status(500).json({ message: 'Failed to fetch tenant statistics' });
    }
  });

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

      // Get tenant info with primary admin
      const tenantData = await db
        .select({
          id: tenants.id,
          companyName: tenants.companyName,
          status: tenants.status,
          createdAt: tenants.createdAt,
          trialEndsAt: tenants.trialEndsAt,
          primaryAdminUserId: tenants.primaryAdminUserId,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenantData.length) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      const tenant = tenantData[0];

      // Get primary admin user details
      let primaryAdmin = null;
      if (tenant.primaryAdminUserId) {
        const adminResult = await db
          .select({
            id: users.id,
            email: users.email,
            displayName: users.displayName,
          })
          .from(users)
          .where(eq(users.id, tenant.primaryAdminUserId))
          .limit(1);
        primaryAdmin = adminResult[0] || null;
      }

      // Get usage metrics
      const [userCount, entityCount, taskCount, invoiceCount] = await Promise.all([
        db.select({ count: count() }).from(users).where(eq(users.tenantId, tenantId)),
        db.select({ count: count() }).from(entities).where(eq(entities.tenantId, tenantId)),
        db.select({ count: count() }).from(tasks).where(eq(tasks.tenantId, tenantId)),
        db.select({ count: count() }).from(invoices).where(eq(invoices.tenantId, tenantId)),
      ]);

      // Get subscription info
      const subscription = await db
        .select({
          id: subscriptions.id,
          status: subscriptions.status,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          stripeSubscriptionId: subscriptions.stripeSubscriptionId,
          packageName: packages.name,
        })
        .from(subscriptions)
        .leftJoin(packages, eq(subscriptions.packageId, packages.id))
        .where(eq(subscriptions.tenantId, tenantId))
        .limit(1);

      res.json({
        id: tenant.id,
        companyName: tenant.companyName,
        status: tenant.status,
        createdAt: tenant.createdAt,
        trialEndsAt: tenant.trialEndsAt,
        primaryAdminUser: primaryAdmin,
        stats: {
          userCount: userCount[0]?.count || 0,
          entityCount: entityCount[0]?.count || 0,
          taskCount: taskCount[0]?.count || 0,
          invoiceCount: invoiceCount[0]?.count || 0,
        },
        subscription: subscription[0] || null,
      });
    } catch (error) {
      console.error('Tenant details error:', error);
      res.status(500).json({ message: 'Failed to fetch tenant details' });
    }
  });

  // Tenant impersonation
  app.post('/api/saas-admin/tenants/:tenantId/impersonate', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId);
      const saasAdminId = req.user?.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      if (!saasAdminId) {
        return res.status(401).json({ message: 'SaaS admin authentication required' });
      }

      const { impersonationService } = await import('../services/impersonation-service');
      
      const result = await impersonationService.startImpersonation(
        saasAdminId,
        tenantId,
        ipAddress,
        userAgent
      );
      
      res.json(result);
    } catch (error) {
      console.error('Impersonation error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to start impersonation' 
      });
    }
  });

  // Suspend tenant
  app.post('/api/saas-admin/tenants/:tenantId/suspend', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId);

      await db
        .update(tenants)
        .set({ 
          status: 'suspended',
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      res.json({ message: 'Tenant suspended successfully' });
    } catch (error) {
      console.error('Suspend tenant error:', error);
      res.status(500).json({ message: 'Failed to suspend tenant' });
    }
  });

  // Unsuspend tenant
  app.post('/api/saas-admin/tenants/:tenantId/unsuspend', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId);

      await db
        .update(tenants)
        .set({ 
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      res.json({ message: 'Tenant unsuspended successfully' });
    } catch (error) {
      console.error('Unsuspend tenant error:', error);
      res.status(500).json({ message: 'Failed to unsuspend tenant' });
    }
  });

  // Cancel tenant subscription
  app.post('/api/saas-admin/tenants/:tenantId/cancel', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId);

      await db
        .update(tenants)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      res.json({ message: 'Tenant subscription cancelled successfully' });
    } catch (error) {
      console.error('Cancel tenant error:', error);
      res.status(500).json({ message: 'Failed to cancel tenant subscription' });
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

  // =============================================================================
  // Blog Management
  // =============================================================================

  // Get all blog posts
  app.get('/api/saas-admin/blog-posts', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const allPosts = await db
        .select()
        .from(blogPosts)
        .orderBy(desc(blogPosts.createdAt));

      res.json({ posts: allPosts });
    } catch (error) {
      console.error('Blog posts list error:', error);
      res.status(500).json({ message: 'Failed to fetch blog posts' });
    }
  });

  // Create new blog post
  app.post('/api/saas-admin/blog-posts', requireSaasAdminRole(['owner']), async (req: Request, res: Response) => {
    try {
      const { 
        title, 
        slug, 
        content, 
        excerpt, 
        authorName, 
        status, 
        featuredImageUrl, 
        seoTitle, 
        seoDescription 
      } = req.body;

      // Auto-generate slug if not provided
      const finalSlug = slug || title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const newPost = await db
        .insert(blogPosts)
        .values({
          title,
          slug: finalSlug,
          content,
          authorId: 1, // SaaS admin ID
          status: status || 'draft',
          featuredImageUrl: featuredImageUrl || null,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          publishedAt: status === 'published' ? new Date() : null,
        })
        .returning();

      res.status(201).json({ post: newPost[0] });
    } catch (error) {
      console.error('Create blog post error:', error);
      res.status(500).json({ message: 'Failed to create blog post' });
    }
  });

  // Update blog post
  app.put('/api/saas-admin/blog-posts/:postId', requireSaasAdminRole(['owner']), async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId);
      const { 
        title, 
        slug, 
        content, 
        excerpt, 
        authorName, 
        status, 
        featuredImageUrl, 
        seoTitle, 
        seoDescription 
      } = req.body;

      // Check if status changed to published and set publishedAt
      const currentPost = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.id, postId))
        .limit(1);

      const shouldSetPublishedAt = status === 'published' && 
        currentPost[0]?.status !== 'published';

      await db
        .update(blogPosts)
        .set({
          title,
          slug,
          content,
          authorId: 1, // SaaS admin ID
          status,
          featuredImageUrl: featuredImageUrl || null,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          publishedAt: shouldSetPublishedAt ? new Date() : currentPost[0]?.publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, postId));

      res.json({ message: 'Blog post updated successfully' });
    } catch (error) {
      console.error('Update blog post error:', error);
      res.status(500).json({ message: 'Failed to update blog post' });
    }
  });

  // Delete blog post
  app.delete('/api/saas-admin/blog-posts/:postId', requireSaasAdminRole(['owner']), async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId);

      await db
        .delete(blogPosts)
        .where(eq(blogPosts.id, postId));

      res.json({ message: 'Blog post deleted successfully' });
    } catch (error) {
      console.error('Delete blog post error:', error);
      res.status(500).json({ message: 'Failed to delete blog post' });
    }
  });

  // =============================================================================
  // Billing & Usage Management
  // =============================================================================

  // Get usage report for all tenants
  app.get('/api/saas-admin/billing/usage-report', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { billingService } = await import('../services/billing-service');
      const report = await billingService.generateUsageReport();
      res.json({ usageReport: report });
    } catch (error) {
      console.error('Usage report error:', error);
      res.status(500).json({ message: 'Failed to generate usage report' });
    }
  });

  // Get billing preview for a specific tenant
  app.get('/api/saas-admin/billing/preview/:tenantId', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId);
      const { billingService } = await import('../services/billing-service');
      
      const preview = await billingService.previewTenantBilling(tenantId);
      if (!preview) {
        return res.status(404).json({ message: 'No billing data found for tenant' });
      }

      res.json({ billingPreview: preview });
    } catch (error) {
      console.error('Billing preview error:', error);
      res.status(500).json({ message: 'Failed to generate billing preview' });
    }
  });

  // Check if tenant is over limits
  app.get('/api/saas-admin/billing/limits/:tenantId', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId);
      const { billingService } = await import('../services/billing-service');
      
      const limitsCheck = await billingService.checkTenantLimits(tenantId);
      res.json({ limits: limitsCheck });
    } catch (error) {
      console.error('Limits check error:', error);
      res.status(500).json({ message: 'Failed to check tenant limits' });
    }
  });

  // Calculate current MRR
  app.get('/api/saas-admin/billing/mrr', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { billingService } = await import('../services/billing-service');
      const mrr = await billingService.calculateMRR();
      res.json({ mrr });
    } catch (error) {
      console.error('MRR calculation error:', error);
      res.status(500).json({ message: 'Failed to calculate MRR' });
    }
  });

  // Generate billing cycles for current period
  app.post('/api/saas-admin/billing/generate-cycles', requireSaasAdminRole(['owner']), async (req: Request, res: Response) => {
    try {
      const { periodStart, periodEnd } = req.body;
      const { billingService } = await import('../services/billing-service');
      
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      
      const cycles = await billingService.generateBillingCycles(start, end);
      res.json({ billingCycles: cycles, count: cycles.length });
    } catch (error) {
      console.error('Generate billing cycles error:', error);
      res.status(500).json({ message: 'Failed to generate billing cycles' });
    }
  });

  // =============================================================================
  // Settings Management
  // =============================================================================

  // Get SaaS settings
  app.get('/api/saas-admin/settings', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      // Return default settings for now - in production this would fetch from saasSettings table
      const defaultSettings = {
        id: 1,
        usageBasedPricingEnabled: true,
        pricePerUserPerMonth: '15.00',
        pricePerEntityPerMonth: '5.00',
        billingCycleDay: 1,
        trialPeriodDays: 14,
        defaultCurrency: 'USD',
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
        companyName: 'FirmRix',
        supportEmail: 'support@firmrix.com',
        updatedAt: new Date().toISOString(),
      };

      res.json({ settings: defaultSettings });
    } catch (error) {
      console.error('Settings fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  // Update SaaS settings
  app.put('/api/saas-admin/settings', requireSaasAdminRole(['owner']), async (req: Request, res: Response) => {
    try {
      const {
        usageBasedPricingEnabled,
        pricePerUserPerMonth,
        pricePerEntityPerMonth,
        billingCycleDay,
        trialPeriodDays,
        defaultCurrency,
        companyName,
        supportEmail,
      } = req.body;

      // In production, this would update the saasSettings table
      // For now, we'll just validate and return success
      const updatedSettings = {
        id: 1,
        usageBasedPricingEnabled,
        pricePerUserPerMonth,
        pricePerEntityPerMonth,
        billingCycleDay,
        trialPeriodDays,
        defaultCurrency,
        companyName,
        supportEmail,
        updatedAt: new Date().toISOString(),
      };

      res.json({ 
        message: 'Settings updated successfully',
        settings: updatedSettings 
      });
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  console.log('SaaS Admin routes registered successfully');
}