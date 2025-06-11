import { Express, Request, Response } from 'express';
import { tenantRegistrationService } from '../services/tenant-registration-service';
import { z } from 'zod';

// Validation schema for tenant registration
const registrationSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  adminDisplayName: z.string().min(2, 'Admin name must be at least 2 characters'),
  packageId: z.number().optional(),
  trialDays: z.number().min(1).max(90).optional(),
  referralCode: z.string().optional(),
  marketingSource: z.string().optional(),
});

const upgradeTrialSchema = z.object({
  packageId: z.number(),
  stripeSubscriptionId: z.string().optional(),
});

const cancelTrialSchema = z.object({
  reason: z.string().optional(),
});

export function setupTenantRegistrationRoutes(app: Express) {
  
  /**
   * POST /api/register - Register new tenant from marketing website
   */
  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      const validatedData = registrationSchema.parse(req.body);
      
      const result = await tenantRegistrationService.registerTenant(validatedData);
      
      if (result.success) {
        // Send welcome email
        await tenantRegistrationService.sendWelcomeEmail(
          result.tenantId!,
          validatedData.adminEmail
        );
        
        res.status(201).json({
          success: true,
          message: result.message,
          tenantId: result.tenantId,
          loginUrl: result.loginUrl,
          trialEndsAt: result.trialEndsAt
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      } else {
        console.error('Registration error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error during registration'
        });
      }
    }
  });

  /**
   * POST /api/tenant/:tenantId/upgrade - Upgrade trial to paid subscription
   */
  app.post('/api/tenant/:tenantId/upgrade', async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId);
      const validatedData = upgradeTrialSchema.parse(req.body);
      
      if (isNaN(tenantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tenant ID'
        });
      }
      
      const result = await tenantRegistrationService.upgradeTrial(
        tenantId,
        validatedData.packageId,
        validatedData.stripeSubscriptionId
      );
      
      res.json(result);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      } else {
        console.error('Trial upgrade error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error during upgrade'
        });
      }
    }
  });

  /**
   * POST /api/tenant/:tenantId/cancel - Cancel trial subscription
   */
  app.post('/api/tenant/:tenantId/cancel', async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId);
      const validatedData = cancelTrialSchema.parse(req.body);
      
      if (isNaN(tenantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tenant ID'
        });
      }
      
      const result = await tenantRegistrationService.cancelTrial(
        tenantId,
        validatedData.reason
      );
      
      res.json(result);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      } else {
        console.error('Trial cancellation error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error during cancellation'
        });
      }
    }
  });

  /**
   * GET /api/register/stats - Get registration statistics (for SaaS admin)
   */
  app.get('/api/register/stats', async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      
      const stats = await tenantRegistrationService.getRegistrationStats(days);
      
      res.json(stats);
      
    } catch (error) {
      console.error('Registration stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve registration statistics'
      });
    }
  });

  /**
   * POST /api/register/validate - Validate registration data before submission
   */
  app.post('/api/register/validate', async (req: Request, res: Response) => {
    try {
      const validatedData = registrationSchema.parse(req.body);
      
      // Additional validation logic could go here
      // For example, checking if email domain is blacklisted
      
      res.json({
        success: true,
        message: 'Validation passed'
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Validation error'
        });
      }
    }
  });
}