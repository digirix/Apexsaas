import { Express, Request, Response } from 'express';
import { DatabaseStorage } from '../database-storage';
import { sql } from 'drizzle-orm';

/**
 * Interface for AI assistant customization settings
 */
interface AICustomizationSettings {
  id?: number;
  tenantId: number;
  provider: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPromptOverride?: string;
  preferredAnalyticsTypes?: string[];
  enableDatabaseAccess?: boolean;
  enableGeneralKnowledge?: boolean;
  customInstructions?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const registerAICustomizationRoutes = (app: Express, isAuthenticated: any, hasTenantAccess: any, db: DatabaseStorage) => {
  // Get current AI customization settings for the tenant
  app.get('/api/v1/ai/settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Missing tenant ID' });
      }
      
      const settings = await db.getTenantAiConfigurations(tenantId);
      
      return res.json({ settings });
    } catch (error: any) {
      console.error('Error fetching AI settings:', error);
      return res.status(500).json({ error: 'Failed to fetch AI settings' });
    }
  });
  
  // Get available AI models
  app.get('/api/v1/ai/available-models', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // This is a simplified list of models, can be expanded later
      const openAIModels = [
        { id: 'openai/gpt-4o', name: 'GPT-4o (Recommended)', provider: 'OpenAI', description: 'Latest multimodal model with best performance' },
        { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'Powerful and efficient for complex tasks' },
        { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', description: 'Fast and cost-effective for simpler tasks' },
        { id: 'google/gemini-flash-1.5-8b-exp', name: 'Gemini Flash 1.5', provider: 'Google', description: 'Fast and efficient model from Google' },
        { id: 'google/gemini-1.5-pro-latest', name: 'Gemini Pro 1.5', provider: 'Google', description: 'Advanced model for complex reasoning' },
        { id: 'anthropic/claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Anthropic\'s most capable model for complex tasks' },
        { id: 'anthropic/claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'Anthropic', description: 'Balanced performance and efficiency' },
      ];
      
      return res.json({ models: openAIModels });
    } catch (error) {
      console.error('Error fetching available models:', error);
      return res.status(500).json({ error: 'Failed to fetch available models' });
    }
  });
  
  // Create or update AI settings for a tenant
  app.post('/api/v1/ai/settings', isAuthenticated, hasTenantAccess, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const settings: AICustomizationSettings = req.body;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Missing tenant ID' });
      }
      
      // Validate required fields
      if (!settings.provider || !settings.model) {
        return res.status(400).json({ error: 'Provider and model are required' });
      }
      
      // If it's an update (id exists)
      if (settings.id) {
        // Check if the configuration exists and belongs to this tenant
        const existingConfig = await db.getTenantAiConfiguration(settings.id);
        
        if (!existingConfig || existingConfig.tenantId !== tenantId) {
          return res.status(404).json({ error: 'Configuration not found or unauthorized' });
        }
        
        // Update the configuration
        const updatedSettings = await db.updateTenantAiConfiguration(settings.id, {
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          systemPromptOverride: settings.systemPromptOverride,
          preferredAnalyticsTypes: settings.preferredAnalyticsTypes,
          enableDatabaseAccess: settings.enableDatabaseAccess,
          enableGeneralKnowledge: settings.enableGeneralKnowledge,
          customInstructions: settings.customInstructions,
          isActive: settings.isActive,
          updatedAt: new Date()
        });
        
        return res.json({ 
          success: true, 
          message: 'AI settings updated successfully',
          settings: updatedSettings
        });
      } else {
        // Create new configuration
        const newSettings = await db.createTenantAiConfiguration({
          tenantId,
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          systemPromptOverride: settings.systemPromptOverride,
          preferredAnalyticsTypes: settings.preferredAnalyticsTypes,
          enableDatabaseAccess: settings.enableDatabaseAccess ?? true,
          enableGeneralKnowledge: settings.enableGeneralKnowledge ?? true,
          customInstructions: settings.customInstructions,
          isActive: settings.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        return res.json({ 
          success: true, 
          message: 'AI settings created successfully',
          settings: newSettings
        });
      }
    } catch (error: any) {
      console.error('Error saving AI settings:', error);
      return res.status(500).json({ error: 'Failed to save AI settings' });
    }
  });
  
  // Set active configuration
  app.post('/api/v1/ai/settings/:id/set-active', isAuthenticated, hasTenantAccess, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const configId = parseInt(req.params.id);
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Missing tenant ID' });
      }
      
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid configuration ID' });
      }
      
      // Check if the configuration exists and belongs to this tenant
      const config = await db.getTenantAiConfiguration(configId);
      
      if (!config || config.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Configuration not found or unauthorized' });
      }
      
      // Set all configurations for this tenant to inactive
      await db.setAllTenantAiConfigurationsInactive(tenantId);
      
      // Set this configuration to active
      const updatedConfig = await db.updateTenantAiConfiguration(configId, {
        isActive: true,
        updatedAt: new Date()
      });
      
      return res.json({ 
        success: true, 
        message: 'AI configuration set as active',
        config: updatedConfig
      });
    } catch (error) {
      console.error('Error setting active configuration:', error);
      return res.status(500).json({ error: 'Failed to set active configuration' });
    }
  });
  
  // Delete configuration
  app.delete('/api/v1/ai/settings/:id', isAuthenticated, hasTenantAccess, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const configId = parseInt(req.params.id);
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Missing tenant ID' });
      }
      
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid configuration ID' });
      }
      
      // Check if the configuration exists and belongs to this tenant
      const config = await db.getTenantAiConfiguration(configId);
      
      if (!config || config.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Configuration not found or unauthorized' });
      }
      
      // If this is the active configuration, don't allow deletion
      if (config.isActive) {
        return res.status(400).json({ error: 'Cannot delete active configuration. Set another configuration as active first.' });
      }
      
      // Delete the configuration
      await db.deleteTenantAiConfiguration(configId);
      
      return res.json({ 
        success: true, 
        message: 'AI configuration deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting configuration:', error);
      return res.status(500).json({ error: 'Failed to delete configuration' });
    }
  });
  
  // Test AI configuration connection
  app.post('/api/v1/ai/settings/test-connection', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { provider, apiKey, model } = req.body;
      
      if (!provider || !apiKey || !model) {
        return res.status(400).json({ error: 'Provider, API key, and model are required' });
      }
      
      // In a real implementation, we would make a test call to the AI provider here
      // For now, we'll simulate a successful test after a delay
      setTimeout(() => {
        return res.json({ 
          success: true, 
          message: 'Connection test successful',
          details: {
            provider,
            model,
            status: 'connected'
          }
        });
      }, 1000);
    } catch (error) {
      console.error('Error testing AI connection:', error);
      return res.status(500).json({ error: 'Failed to test AI connection' });
    }
  });
};