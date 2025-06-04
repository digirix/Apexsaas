import { Router } from 'express';
import { z } from 'zod';
import { FinancialAnalyticsService } from '../services/financial-analytics-service';
import { DatabaseStorage } from '../database-storage';

const router = Router();

// Validation schemas
const analyticsQuerySchema = z.object({
  period: z.string().regex(/^\d+$/).transform(Number).default('12')
});

export function createAnalyticsRoutes(storage: DatabaseStorage) {
  const analyticsService = new FinancialAnalyticsService(storage);

  // Get KPI metrics
  router.get('/kpi', async (req, res) => {
    try {
      const { period } = analyticsQuerySchema.parse(req.query);
      const tenantId = req.user!.tenantId;
      
      const kpiData = await analyticsService.getKPIMetrics(tenantId, period);
      res.json(kpiData);
    } catch (error) {
      console.error('Error fetching KPI metrics:', error);
      res.status(500).json({ error: 'Failed to fetch KPI metrics' });
    }
  });

  // Get trend data
  router.get('/trends', async (req, res) => {
    try {
      const { period } = analyticsQuerySchema.parse(req.query);
      const tenantId = req.user!.tenantId;
      
      const trendData = await analyticsService.getTrendData(tenantId, period);
      res.json(trendData);
    } catch (error) {
      console.error('Error fetching trend data:', error);
      res.status(500).json({ error: 'Failed to fetch trend data' });
    }
  });

  // Get client profitability
  router.get('/client-profitability', async (req, res) => {
    try {
      const { period } = analyticsQuerySchema.parse(req.query);
      const tenantId = req.user!.tenantId;
      
      const profitabilityData = await analyticsService.getClientProfitability(tenantId, period);
      res.json(profitabilityData);
    } catch (error) {
      console.error('Error fetching client profitability:', error);
      res.status(500).json({ error: 'Failed to fetch client profitability' });
    }
  });

  // Get cash flow data
  router.get('/cash-flow', async (req, res) => {
    try {
      const { period } = analyticsQuerySchema.parse(req.query);
      const tenantId = req.user!.tenantId;
      
      // For now, cash flow is the same as trend data
      const cashFlowData = await analyticsService.getTrendData(tenantId, period);
      res.json(cashFlowData);
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      res.status(500).json({ error: 'Failed to fetch cash flow data' });
    }
  });

  return router;
}