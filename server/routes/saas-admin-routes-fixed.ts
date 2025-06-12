import { Express, Request, Response } from 'express';
import { TenantDataService } from '../services/tenant-data-service-fixed';

export function setupSaasAdminRoutes(app: Express, { isSaasAdminAuthenticated, requireSaasAdminRole }: any) {
  console.log('Setting up SaaS Admin routes...');

  // =============================================================================
  // Dashboard & Analytics
  // =============================================================================

  // Dashboard KPIs
  app.get('/api/saas-admin/dashboard/kpis', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const kpis = await TenantDataService.getDashboardKPIs();
      res.json(kpis);
    } catch (error) {
      console.error('Error fetching dashboard KPIs:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
  });

  // Growth metrics
  app.get('/api/saas-admin/dashboard/growth', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const stats = await TenantDataService.getTenantStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching growth data:', error);
      res.status(500).json({ message: 'Failed to fetch growth data' });
    }
  });

  // System alerts
  app.get('/api/saas-admin/dashboard/alerts', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const alerts = await TenantDataService.getSystemAlerts();
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  // Revenue breakdown
  app.get('/api/saas-admin/dashboard/revenue-breakdown', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      // Simple revenue data structure
      const revenueData = {
        monthly: 15000,
        annual: 45000,
        byPackage: [
          { name: 'Basic', revenue: 5000 },
          { name: 'Pro', revenue: 8000 },
          { name: 'Enterprise', revenue: 47000 }
        ]
      };
      res.json(revenueData);
    } catch (error) {
      console.error('Error fetching revenue breakdown:', error);
      res.status(500).json({ message: 'Failed to fetch revenue data' });
    }
  });

  // =============================================================================
  // Tenant Management
  // =============================================================================

  // Get all tenants
  app.get('/api/saas-admin/tenants', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const status = req.query.status as string || 'all';
      
      const tenantList = await TenantDataService.getTenantListPaginated(page, limit, search, status);
      res.json(tenantList);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      res.status(500).json({ message: 'Failed to fetch tenants' });
    }
  });

  // Get tenant statistics
  app.get('/api/saas-admin/tenants/stats', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const stats = await TenantDataService.getTenantStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
      res.status(500).json({ message: 'Failed to fetch tenant statistics' });
    }
  });

  // Tenant impersonation
  app.post('/api/saas-admin/tenants/:tenantId/impersonate', isSaasAdminAuthenticated, async (req: Request, res: Response) => {
    console.log('IMPERSONATION ROUTE HIT:', req.path, req.params);
    try {
      const tenantId = parseInt(req.params.tenantId);
      const saasAdminId = req.user?.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      console.log(`Impersonation request - tenantId: ${tenantId}, saasAdminId: ${saasAdminId}`);

      if (!saasAdminId) {
        console.log('No SaaS admin ID found in request');
        return res.status(401).json({ message: 'SaaS admin authentication required' });
      }

      console.log(`Starting impersonation for tenant ${tenantId} by SaaS admin ${saasAdminId}`);

      const { impersonationService } = await import('../services/impersonation-service');
      
      const result = await impersonationService.startImpersonation(
        saasAdminId,
        tenantId,
        ipAddress,
        userAgent
      );
      
      console.log('Impersonation result:', result);
      res.json(result);
    } catch (error) {
      console.error('Impersonation error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to start impersonation' 
      });
    }
  });

  console.log('SaaS Admin routes registered successfully');
}