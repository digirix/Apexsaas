import { Express, Request, Response } from 'express';
import { DatabaseStorage } from '../database-storage';
import { queryAI } from '../services/ai-service';
import { fetchTenantDataForQuery } from '../services/chatbot-data-service';

interface AiInteractionFeedback {
  interactionId: number;
  rating: number; // 1-5 star rating
  comment?: string; // Optional comment
}

export const registerChatbotRoutes = (app: Express, isAuthenticated: any, db: DatabaseStorage) => {
  // Route to check if chat is available (tenant has valid AI configuration)
  app.get('/api/v1/ai/chat/status', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user.tenantId;
      
      console.log(`Checking chat availability for tenant: ${tenantId}`);
      
      // Get AI configuration for this tenant using the correct method
      const config = await db.getActiveTenantAiConfiguration(tenantId);
      console.log('AI config found:', config);
      
      if (!config || !config.isActive || !config.provider || !config.apiKey) {
        console.log('AI not available, returning false');
        return res.json({ 
          isAvailable: false,
          provider: null,
          model: null
        });
      }
      
      // Return status indicating chat is available
      console.log(`AI available: provider=${config.provider}, model=${config.model}`);
      return res.json({
        isAvailable: true,
        provider: config.provider,
        model: config.model || 'default'
      });
    } catch (error) {
      console.error('Error checking chat availability:', error);
      return res.status(500).json({ 
        error: 'Failed to check chat availability',
        isAvailable: false
      });
    }
  });
  
  // Route to handle chat messages
  app.post('/api/v1/ai/chat', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { messages, conversationId } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages are required and must be an array' });
      }
      
      // Get the AI configuration for this tenant
      const config = await db.getActiveTenantAiConfiguration(tenantId);
      
      if (!config || !config.isActive || !config.provider || !config.apiKey) {
        return res.status(400).json({ error: 'AI is not configured or enabled for this tenant' });
      }
      
      // Get the latest user message
      const userMessage = messages[messages.length - 1];
      
      if (!userMessage || userMessage.role !== 'user') {
        return res.status(400).json({ error: 'Last message must be from the user' });
      }
      
      // Create a system prompt that includes tenant-specific data
      const tenantData = await fetchTenantDataForQuery(tenantId, userMessage.content);
      
      // Create a system prompt that includes tenant-specific context
      const systemPrompt = `
You are an AI assistant for an accounting firm management platform. 
You have access to the following information about the tenant:
${tenantData}

Please use this information to provide accurate and helpful responses. If you don't know 
something or the information is not in the provided context, be honest about it.
      `.trim();
      
      // Record start time for processing time calculation
      const startTime = Date.now();
      
      // Query the AI with the tenant's configuration
      const aiResponse = await queryAI(
        config.provider,
        config.apiKey,
        config.model || 'google/gemini-flash-1.5-8b-exp', // Default model if not specified
        messages,
        systemPrompt
      );
      
      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;
      
      // Log conversation with expanded analytics
      await db.logAiInteraction({
        tenantId,
        userId: req.user.id,
        timestamp: new Date(),
        userQuery: userMessage.content,
        aiResponse: aiResponse.choices[0].message.content,
        provider: config.provider,
        modelId: config.modelId || 'default',
        processingTimeMs,
        feedbackRating: null,  // Will be updated later when user provides feedback
        feedbackComment: null  // Will be updated later when user provides feedback
      });
      
      // Return the AI response to the client
      return res.json({
        message: aiResponse.choices[0].message,
        conversationId: conversationId || `chat-${Date.now()}`
      });
    } catch (error: any) {
      console.error('Error in chat API:', error);
      return res.status(500).json({ 
        error: error.message || 'Failed to get AI response',
        message: {
          role: 'assistant',
          content: 'I apologize, but I encountered an error while processing your request. Please try again later.'
        }
      });
    }
  });
  
  // Route to submit feedback for AI interactions
  app.post('/api/v1/ai/chat/feedback', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { interactionId, rating, comment } = req.body as AiInteractionFeedback;
      const tenantId = req.user.tenantId;
      
      if (!interactionId || typeof interactionId !== 'number') {
        return res.status(400).json({ error: 'Valid interaction ID is required' });
      }
      
      if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating is required and must be between 1 and 5' });
      }
      
      // Get the interaction to confirm it belongs to this tenant and user
      // We would implement this method in database-storage.ts
      const interaction = await db.getAiInteraction(interactionId);
      
      if (!interaction || interaction.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Interaction not found or unauthorized' });
      }
      
      // Update the interaction with feedback
      // We would implement this method in database-storage.ts
      const updatedInteraction = await db.updateAiInteractionFeedback(interactionId, {
        feedbackRating: rating,
        feedbackComment: comment || null
      });
      
      return res.json({ 
        success: true, 
        message: 'Feedback submitted successfully',
        interaction: {
          id: updatedInteraction.id,
          timestamp: updatedInteraction.timestamp,
          feedbackRating: updatedInteraction.feedbackRating,
          feedbackComment: updatedInteraction.feedbackComment
        }
      });
      
    } catch (error: any) {
      console.error('Error submitting AI feedback:', error);
      return res.status(500).json({ 
        error: error.message || 'Failed to submit feedback' 
      });
    }
  });
  
  // Route to get AI interaction history for current user
  app.get('/api/v1/ai/chat/history', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      
      // Get the recent chat history for this user
      // We would implement this method in database-storage.ts
      const interactions = await db.getUserAiInteractions(tenantId, userId, 20); // Limit to last 20
      
      // Map to a format suitable for the client
      const history = interactions.map(interaction => ({
        id: interaction.id,
        timestamp: interaction.timestamp,
        userQuery: interaction.userQuery,
        aiResponse: interaction.aiResponse,
        feedbackRating: interaction.feedbackRating,
        processingTimeMs: interaction.processingTimeMs
      }));
      
      return res.json({ history });
      
    } catch (error: any) {
      console.error('Error fetching AI chat history:', error);
      return res.status(500).json({ 
        error: error.message || 'Failed to retrieve chat history' 
      });
    }
  });
};