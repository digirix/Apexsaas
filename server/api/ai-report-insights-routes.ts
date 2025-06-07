import { Router } from "express";
import { AIReportInsightsService } from "../services/ai-report-insights-service.js";

const router = Router();
const insightsService = new AIReportInsightsService();

// Get insights for task performance report
router.get('/task-performance', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const filters = req.query;
    const insights = await insightsService.generateTaskPerformanceInsights(tenantId, filters);
    
    res.json({ insights });
  } catch (error) {
    console.error('Error generating task performance insights:', error);
    res.status(500).json({ message: 'Failed to generate insights' });
  }
});

// Get insights for compliance overview report
router.get('/compliance-overview', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const filters = req.query;
    const insights = await insightsService.generateComplianceInsights(tenantId, filters);
    
    res.json({ insights });
  } catch (error) {
    console.error('Error generating compliance insights:', error);
    res.status(500).json({ message: 'Failed to generate insights' });
  }
});

// Get insights for team efficiency report
router.get('/team-efficiency', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const filters = req.query;
    const insights = await insightsService.generateTeamEfficiencyInsights(tenantId, filters);
    
    res.json({ insights });
  } catch (error) {
    console.error('Error generating team efficiency insights:', error);
    res.status(500).json({ message: 'Failed to generate insights' });
  }
});

// Get insights for task lifecycle report
router.get('/task-lifecycle', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const filters = req.query;
    const insights = await insightsService.generateTaskPerformanceInsights(tenantId, filters);
    
    res.json({ insights });
  } catch (error) {
    console.error('Error generating task lifecycle insights:', error);
    res.status(500).json({ message: 'Failed to generate insights' });
  }
});

// Get insights for risk assessment report
router.get('/risk-assessment', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const filters = req.query;
    const insights = await insightsService.generateRiskAssessmentInsights(tenantId, filters);
    
    res.json({ insights });
  } catch (error) {
    console.error('Error generating risk assessment insights:', error);
    res.status(500).json({ message: 'Failed to generate insights' });
  }
});

// Get insights for jurisdiction analysis report
router.get('/jurisdiction-analysis', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const filters = req.query;
    const insights = await insightsService.generateComplianceInsights(tenantId, filters);
    
    res.json({ insights });
  } catch (error) {
    console.error('Error generating jurisdiction analysis insights:', error);
    res.status(500).json({ message: 'Failed to generate insights' });
  }
});

export default router;