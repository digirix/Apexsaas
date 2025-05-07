import { Express } from "express";
import { z } from "zod";
import { DatabaseStorage } from "../database-storage";
import { queryAI } from "../services/ai-service";
import { fetchDataForChatbot, generateSystemPrompt } from "../services/chatbot-data-service";

// Chatbot message schema
const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1)
});

// Chatbot request schema
const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  conversationId: z.string().optional()
});

export const registerChatbotRoutes = (app: Express, isAuthenticated: any, db: DatabaseStorage) => {
  // Get active AI configuration for the tenant
  const getActiveConfig = async (tenantId: number) => {
    // Get all AI configurations for the tenant
    const configs = await db.getAiConfigurations(tenantId);
    
    // Find the first active configuration
    return configs.find(config => config.isActive);
  };
  
  // Endpoint to send message to chatbot
  app.post("/api/v1/ai/chat", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      // Validate the request body
      const { messages } = chatRequestSchema.parse(req.body);
      
      // Get active AI configuration
      const config = await getActiveConfig(tenantId);
      if (!config) {
        return res.status(400).json({ 
          message: "No active AI configuration found. Please set up an AI configuration in the Setup module."
        });
      }
      
      // Get the most recent user message
      const latestUserMessage = [...messages].reverse().find(m => m.role === "user");
      if (!latestUserMessage) {
        return res.status(400).json({ message: "No user message found in the conversation" });
      }
      
      // Fetch relevant tenant data based on the user's query
      const data = await fetchDataForChatbot(db, tenantId, latestUserMessage.content);
      
      // Generate system prompt
      const systemPrompt = generateSystemPrompt(tenantId);
      
      // Add context to the system prompt based on the fetched data
      const contextMessages = [{
        role: "system",
        content: systemPrompt
      }];
      
      // Add data context
      if (data) {
        contextMessages.push({
          role: "system",
          content: `Here is some data from tenant ${tenantId} that might be relevant to the question:\n\n${JSON.stringify(data.tenantData, null, 2)}`
        });
      }
      
      // Prepare messages for AI query (excluding system messages from the original conversation)
      const userMessages = messages.filter(m => m.role !== "system");
      
      // Query the AI model
      const aiResponse = await queryAI(
        config.provider,
        config.apiKey,
        config.modelId,
        userMessages,
        systemPrompt
      );
      
      // Return the AI response
      res.json({
        message: aiResponse.choices[0].message,
        conversationId: req.body.conversationId || Date.now().toString(),
        provider: config.provider,
        model: config.modelId
      });
    } catch (error: any) {
      console.error("Error in chatbot API:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      
      res.status(500).json({ 
        message: "Failed to get response from AI assistant", 
        error: error.message
      });
    }
  });
  
  // Endpoint to check if AI chat is available for tenant
  app.get("/api/v1/ai/chat/status", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      // Get active AI configuration
      const config = await getActiveConfig(tenantId);
      
      res.json({
        isAvailable: !!config,
        provider: config?.provider || null,
        model: config?.modelId || null
      });
    } catch (error: any) {
      console.error("Error checking chatbot status:", error);
      res.status(500).json({ 
        message: "Failed to check AI availability", 
        error: error.message
      });
    }
  });
};