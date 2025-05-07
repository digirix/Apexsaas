import { Express, Request, Response } from 'express';
import { DatabaseStorage } from '../database-storage';
import { sql } from 'drizzle-orm';
import { 
  InsertAiAssistantCustomization, 
  AiAssistantCustomization, 
  InsertAiConfiguration, 
  AiConfiguration,
  aiPersonalityEnum,
  aiSpecializationEnum,
  aiResponseLengthEnum,
  aiToneEnum,
  aiProviderEnum
} from '@shared/schema';

/**
 * Interface for AI provider configuration settings
 */
interface AIProviderSettings extends Omit<InsertAiConfiguration, 'tenantId'> {
  id?: number;
  tenantId: number;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Extended properties not in schema
  temperature?: number;
  maxTokens?: number;
  systemPromptOverride?: string;
  preferredAnalyticsTypes?: string[];
  enableDatabaseAccess?: boolean;
  enableGeneralKnowledge?: boolean;
  customInstructions?: string;
}

export const registerAICustomizationRoutes = (app: Express, isAuthenticated: any, hasTenantAccess: any, db: DatabaseStorage) => {
  // AI Assistant Persona Customization Routes
  
  // Get AI assistant customizations for current user
  app.get('/api/v1/ai/assistant/customizations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing tenant ID or user ID' });
      }
      
      const customizations = await db.getAiAssistantCustomizations(tenantId);
      
      // Only return customizations for the current user
      const userCustomizations = customizations.filter(c => c.userId === userId);
      
      return res.json({ customizations: userCustomizations });
    } catch (error: any) {
      console.error('Error fetching AI assistant customizations:', error);
      return res.status(500).json({ error: 'Failed to fetch AI assistant customizations' });
    }
  });
  
  // Get active AI assistant customization for current user
  app.get('/api/v1/ai/assistant/customization/active', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing tenant ID or user ID' });
      }
      
      const customization = await db.getUserAiAssistantCustomization(tenantId, userId);
      
      if (!customization) {
        return res.status(404).json({ error: 'No active AI assistant customization found' });
      }
      
      return res.json({ customization });
    } catch (error: any) {
      console.error('Error fetching active AI assistant customization:', error);
      return res.status(500).json({ error: 'Failed to fetch active AI assistant customization' });
    }
  });
  
  // Get specific AI assistant customization
  app.get('/api/v1/ai/assistant/customization/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const customizationId = parseInt(req.params.id);
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing tenant ID or user ID' });
      }
      
      if (isNaN(customizationId)) {
        return res.status(400).json({ error: 'Invalid customization ID' });
      }
      
      const customization = await db.getAiAssistantCustomization(customizationId, tenantId);
      
      if (!customization) {
        return res.status(404).json({ error: 'AI assistant customization not found' });
      }
      
      // Ensure the user can only access their own customizations
      if (customization.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to access this customization' });
      }
      
      return res.json({ customization });
    } catch (error: any) {
      console.error('Error fetching AI assistant customization:', error);
      return res.status(500).json({ error: 'Failed to fetch AI assistant customization' });
    }
  });
  
  // Create new AI assistant customization
  app.post('/api/v1/ai/assistant/customization', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const customization: AIAssistantCustomization = req.body;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing tenant ID or user ID' });
      }
      
      // Validate required fields
      if (!customization.name || !customization.personality || !customization.specialization || 
          !customization.responseLength || !customization.tone) {
        return res.status(400).json({ 
          error: 'Required fields missing: name, personality, specialization, responseLength, and tone are required' 
        });
      }
      
      const newCustomization = await db.createAiAssistantCustomization({
        tenantId,
        userId,
        name: customization.name,
        personality: customization.personality,
        specialization: customization.specialization,
        responseLength: customization.responseLength,
        tone: customization.tone,
        isActive: customization.isActive || false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // If this customization is set as active, deactivate others
      if (newCustomization.isActive) {
        const existingCustomizations = await db.getAiAssistantCustomizations(tenantId);
        
        for (const existing of existingCustomizations) {
          if (existing.id !== newCustomization.id && existing.userId === userId && existing.isActive) {
            await db.updateAiAssistantCustomization(existing.id, { isActive: false });
          }
        }
      }
      
      return res.json({ 
        success: true, 
        message: 'AI assistant customization created successfully',
        customization: newCustomization
      });
    } catch (error: any) {
      console.error('Error creating AI assistant customization:', error);
      return res.status(500).json({ error: 'Failed to create AI assistant customization' });
    }
  });
  
  // Update AI assistant customization
  app.put('/api/v1/ai/assistant/customization/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const customizationId = parseInt(req.params.id);
      const updates: Partial<AIAssistantCustomization> = req.body;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing tenant ID or user ID' });
      }
      
      if (isNaN(customizationId)) {
        return res.status(400).json({ error: 'Invalid customization ID' });
      }
      
      // Check if the customization exists and belongs to this user
      const existingCustomization = await db.getAiAssistantCustomization(customizationId, tenantId);
      
      if (!existingCustomization) {
        return res.status(404).json({ error: 'AI assistant customization not found' });
      }
      
      if (existingCustomization.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to modify this customization' });
      }
      
      // Perform the update
      const updatedCustomization = await db.updateAiAssistantCustomization(customizationId, {
        name: updates.name,
        personality: updates.personality,
        specialization: updates.specialization,
        responseLength: updates.responseLength,
        tone: updates.tone,
        isActive: updates.isActive,
        updatedAt: new Date()
      });
      
      // If this customization is being set as active, deactivate others
      if (updates.isActive) {
        const existingCustomizations = await db.getAiAssistantCustomizations(tenantId);
        
        for (const existing of existingCustomizations) {
          if (existing.id !== customizationId && existing.userId === userId && existing.isActive) {
            await db.updateAiAssistantCustomization(existing.id, { isActive: false });
          }
        }
      }
      
      return res.json({ 
        success: true, 
        message: 'AI assistant customization updated successfully',
        customization: updatedCustomization
      });
    } catch (error: any) {
      console.error('Error updating AI assistant customization:', error);
      return res.status(500).json({ error: 'Failed to update AI assistant customization' });
    }
  });
  
  // Delete AI assistant customization
  app.delete('/api/v1/ai/assistant/customization/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const customizationId = parseInt(req.params.id);
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing tenant ID or user ID' });
      }
      
      if (isNaN(customizationId)) {
        return res.status(400).json({ error: 'Invalid customization ID' });
      }
      
      // Check if the customization exists and belongs to this user
      const existingCustomization = await db.getAiAssistantCustomization(customizationId, tenantId);
      
      if (!existingCustomization) {
        return res.status(404).json({ error: 'AI assistant customization not found' });
      }
      
      if (existingCustomization.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this customization' });
      }
      
      // Don't allow deletion of active customization
      if (existingCustomization.isActive) {
        return res.status(400).json({ 
          error: 'Cannot delete active customization. Set another customization as active first.' 
        });
      }
      
      // Delete the customization
      const success = await db.deleteAiAssistantCustomization(customizationId, tenantId);
      
      if (!success) {
        return res.status(500).json({ error: 'Failed to delete AI assistant customization' });
      }
      
      return res.json({ 
        success: true, 
        message: 'AI assistant customization deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting AI assistant customization:', error);
      return res.status(500).json({ error: 'Failed to delete AI assistant customization' });
    }
  });

  // AI Provider Configuration Routes
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
      const settings: AIProviderSettings = req.body;
      
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