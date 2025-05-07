import { Express, Request, Response } from 'express';
import { DatabaseStorage } from '../database-storage';
import { queryAI } from '../services/ai-service';
import { fetchTenantDataForQuery } from '../services/chatbot-data-service';
import { classifyQuery } from '../services/query-classifier-service';
import { sql } from 'drizzle-orm';

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
      
      // Get current user information
      const currentUser = req.user;
      
      // Get tenant name if available
      let tenantName = "your accounting firm";
      try {
        const tenantInfo = await db
          .select({
            name: sql<string>`name`
          })
          .from(sql`tenants`)
          .where(sql`id = ${tenantId}`)
          .limit(1);
        
        if (tenantInfo.length > 0) {
          tenantName = tenantInfo[0].name || tenantName;
        }
      } catch (err) {
        console.log('Could not fetch tenant name:', err.message);
      }
      
      // Log details for debugging
      console.log(`Fetching data for user ${currentUser.id} (${currentUser.email}) of tenant ${tenantId}`);
      
      // Classify the query to determine if it needs database context or is a general knowledge question
      const queryClassification = classifyQuery(userMessage.content);
      console.log(`Query classification: ${JSON.stringify(queryClassification)}`);
      
      // Fetch tenant data if the query is database-related or hybrid
      let tenantData = '';
      if (queryClassification.type === 'database' || queryClassification.type === 'hybrid') {
        console.log(`Query is database-related, fetching tenant data...`);
        tenantData = await fetchTenantDataForQuery(tenantId, userMessage.content, currentUser);
      } else {
        console.log(`Query is general knowledge, skipping tenant data fetch`);
        tenantData = "This appears to be a general knowledge question, not related to your tenant data.";
      }
      
      // Create a system prompt based on the query classification
      let systemPrompt = '';
      
      if (queryClassification.type === 'database') {
        // Database-specific system prompt
        systemPrompt = `
You are an AI assistant for an accounting firm management platform. You're currently helping ${currentUser.displayName} at ${tenantName} (Tenant ID: ${tenantId}).

IMPORTANT CONTEXT - You have direct access to this tenant's database. You already know:
1. Which tenant you're working with (${tenantId})
2. Which user you're talking to (${currentUser.displayName}, ID: ${currentUser.id})

REAL-TIME TENANT DATA:
${tenantData}

ANALYTICAL CAPABILITIES:
You can perform advanced financial analysis of the tenant's data, including:
1. Financial summaries and profit/loss calculations
2. Client performance analysis and ranking
3. Accounts receivable aging analysis
4. Revenue and expense trend analysis
5. Budget vs. actual comparisons
6. Custom financial metric calculations

INSTRUCTIONS FOR RESPONDING:
1. NEVER ask the user to provide their tenant ID, username, or other credentials - you already have them.
2. NEVER say "I don't have access to your tenant data" - you do have access as shown above.
3. ALWAYS use the provided tenant data to answer questions about clients, invoices, accounts, etc.
4. When responding with analytical information, say "Based on my analysis of your tenant data..." 
5. If a user asks for calculations or analysis, ALWAYS use the data analysis results from the provided tenant data.
6. Format financial data clearly with proper currency symbols and decimal places.
7. If asked about information not in the context above, say "I don't see that specific information in your current tenant data."
8. For general accounting questions, provide knowledgeable accounting advice.

Current date: ${new Date().toLocaleDateString()}
        `.trim();
      } else if (queryClassification.type === 'hybrid') {
        // Hybrid system prompt for questions that might need both database context and general knowledge
        systemPrompt = `
You are an AI assistant for an accounting firm management platform. You're currently helping ${currentUser.displayName} at ${tenantName} (Tenant ID: ${tenantId}).

You have two capabilities:
1. You can access this user's accounting data to answer specific questions about their business
2. You can provide general knowledge responses like ChatGPT 

The user's question appears to need both tenant-specific data and general knowledge.

TENANT DATA CONTEXT:
${tenantData}

INSTRUCTIONS FOR RESPONDING:
1. If the question relates to the user's specific accounting data, reference the tenant data provided above.
2. If the question requires general knowledge not related to their specific data, provide a helpful answer drawing on your training.
3. For hybrid questions, combine both data-specific insights and general knowledge.
4. When referring to tenant-specific information, say "Based on your tenant data..."
5. For general knowledge portions, make it clear you're providing general information.
6. Be conversational, informative, and accurate.
7. Format financial data clearly with proper currency symbols and decimal places.

Current date: ${new Date().toLocaleDateString()}
        `.trim();
      } else {
        // General knowledge system prompt (like ChatGPT)
        systemPrompt = `
You are an AI assistant for an accounting firm management platform, but you also function as a general knowledge assistant similar to ChatGPT.

The current question appears to be a general knowledge question not specific to the user's accounting data.

INSTRUCTIONS FOR RESPONDING:
1. Provide a comprehensive, accurate response drawing on your general knowledge.
2. Be conversational, informative, and helpful.
3. If the topic relates to accounting, finance, taxation, or business administration, provide expert-level information.
4. If the question involves current events beyond your training data, mention your knowledge cutoff date.
5. If the question requires specific user data that you don't have, suggest they rephrase to ask about their specific accounting information.
6. Be ethical and helpful while maintaining professional boundaries.
7. You may provide code examples, explanations of concepts, or general advice as appropriate.

Current date: ${new Date().toLocaleDateString()}
        `.trim();
      }
      
      // If it's about app features, add some extra context
      if (queryClassification.isAboutApplicationFeatures) {
        systemPrompt += `\n\nAPPLICATION FEATURES CONTEXT:
This is an accounting firm management platform with features including:
- Client and entity management
- Invoice and payment tracking
- Journal entries and accounting records
- Chart of accounts management
- Tax calculation and reporting
- Task management and assignments
- Financial reporting and analysis
- AI-powered assistant for data analysis and general help
`;
      }
      
      // Record start time for processing time calculation
      const startTime = Date.now();
      
      try {
        console.log(`Querying AI for tenant ${tenantId} with provider: ${config.provider}, model: ${config.model || 'google/gemini-flash-1.5-8b-exp'}`);
        
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
        
        console.log("AI response structure:", JSON.stringify({
          model: aiResponse.model,
          choicesCount: aiResponse.choices?.length || 0,
          hasContent: aiResponse.choices?.[0]?.message?.content ? true : false
        }));
        
        // Validate the response structure
        if (!aiResponse.choices || !Array.isArray(aiResponse.choices) || aiResponse.choices.length === 0) {
          console.error("Invalid AI response structure:", aiResponse);
          throw new Error("Received invalid response from AI provider");
        }
        
        // Safely extract the first choice
        const choice = aiResponse.choices[0];
        
        // Ensure message and content exist
        if (!choice.message || typeof choice.message.content !== 'string') {
          console.error("Invalid message structure in choice:", choice);
          throw new Error("AI response missing message content");
        }
        
        const responseContent = choice.message.content;
        
        // Log conversation with expanded analytics (if table exists)
        try {
          await db.logAiInteraction({
            tenantId,
            userId: req.user.id,
            timestamp: new Date(),
            userQuery: userMessage.content,
            aiResponse: responseContent,
            provider: config.provider,
            modelId: config.model || 'default', // Use model instead of modelId
            processingTimeMs,
            feedbackRating: null,  // Will be updated later when user provides feedback
            feedbackComment: null  // Will be updated later when user provides feedback
          });
        } catch (logError) {
          // Just log the error but don't fail the request if logging fails
          console.warn("Could not log AI interaction (table may not exist yet):", logError.message);
        }
        
        // Return the AI response to the client with properly structured message
        return res.json({
          message: {
            role: "assistant",
            content: responseContent
          },
          conversationId: conversationId || `chat-${Date.now()}`
        });
      } catch (innerError) {
        console.error("Error processing AI response:", innerError);
        
        // Log the failed interaction (if table exists)
        try {
          await db.logAiInteraction({
            tenantId,
            userId: req.user.id,
            timestamp: new Date(),
            userQuery: userMessage.content,
            aiResponse: `Error: ${innerError.message || "Unknown error"}`,
            provider: config.provider,
            modelId: config.model || 'default',
            processingTimeMs: Date.now() - startTime,
            feedbackRating: null,
            feedbackComment: null
          });
        } catch (logError) {
          console.warn("Could not log AI error (table may not exist yet):", logError.message);
        }
        
        throw innerError; // Re-throw to be caught by the outer try/catch
      }
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
      
      try {
        // Get the interaction to confirm it belongs to this tenant and user
        const interaction = await db.getAiInteraction(interactionId);
        
        if (!interaction || interaction.tenantId !== tenantId) {
          return res.status(404).json({ error: 'Interaction not found or unauthorized' });
        }
        
        // Update the interaction with feedback
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
      } catch (dbError) {
        // The table may not exist yet, so we just log the error and return a generic success
        console.warn("Could not save AI feedback (table may not exist yet):", dbError.message);
        return res.json({
          success: true,
          message: 'Feedback noted (storage not available)',
          interaction: null
        });
      }
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
      
      try {
        // Get the recent chat history for this user
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
      } catch (dbError) {
        // The table may not exist yet, so we just return an empty history
        console.warn("Could not retrieve AI chat history (table may not exist yet):", dbError.message);
        return res.json({ history: [] });
      }
    } catch (error: any) {
      console.error('Error fetching AI chat history:', error);
      return res.status(500).json({ 
        error: error.message || 'Failed to retrieve chat history' 
      });
    }
  });
};