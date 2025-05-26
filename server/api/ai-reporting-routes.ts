import express, { Request, Response } from 'express';
import { generateReport } from '../services/ai-reporting-service';
import { z } from 'zod';

// Validation schema for the report request
const reportRequestSchema = z.object({
  query: z.string().min(1, "Query must not be empty").max(500, "Query is too long"),
});

export function registerAiReportingRoutes(app: express.Express) {
  console.log("Registering AI Reporting routes...");

  /**
   * Generate a report based on a natural language query
   * POST /api/v1/ai/report
   */
  app.post('/api/v1/ai/report', async (req: Request, res: Response) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const tenantId = (req.user as any).tenantId;
      const userId = (req.user as any).id;

      // Validate the request body
      const validationResult = reportRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Invalid request',
          errors: validationResult.error.errors
        });
      }

      const { query } = validationResult.data;

      // Generate the report
      const reportData = await generateReport(tenantId, userId, query);

      // Return the report data
      res.json(reportData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error in AI reporting endpoint: ${errorMessage}`);
      res.status(500).json({ 
        message: 'Failed to generate report',
        error: errorMessage 
      });
    }
  });
  
  console.log("AI Reporting routes registered successfully");
}