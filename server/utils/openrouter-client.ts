import { decrypt } from './encryption';
import { AIClient } from './ai-client-factory';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

/**
 * OpenRouterClient - Handles API communication with OpenRouter.ai
 */
export class OpenRouterClient implements AIClient {
  private apiKey: string;
  
  private initialized: Promise<void>;

  constructor(encryptedApiKey: string) {
    this.apiKey = ''; // Will be set after decryption
    this.initialized = this.initializeClient(encryptedApiKey);
  }
  
  /**
   * Initialize the client by decrypting the API key
   */
  private async initializeClient(encryptedApiKey: string): Promise<void> {
    try {
      this.apiKey = await decrypt(encryptedApiKey);
      // Validate API key is not empty after decryption
      if (!this.apiKey || this.apiKey.trim() === '') {
        throw new Error('Empty API key after decryption');
      }
    } catch (error) {
      console.error('Failed to initialize OpenRouter client:', error);
      throw new Error('Invalid API key format');
    }
  }
  
  /**
   * Test API key validity
   * @returns Object with success status and message
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Wait for initialization to complete
      await this.initialized;
      
      if (!this.apiKey) {
        throw new Error('API key not initialized');
      }
      
      const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          message: errorData.error?.message || `API error: ${response.status} ${response.statusText}` 
        };
      }
      
      return { success: true, message: 'API connection successful' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
  
  /**
   * Get available models from OpenRouter
   * @returns List of available models
   */
  public async getModels(): Promise<any> {
    try {
      // Wait for initialization to complete
      await this.initialized;
      
      if (!this.apiKey) {
        throw new Error('API key not initialized');
      }
      
      const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }
  
  /**
   * Generate chat completion
   * @param model Model ID to use
   * @param messages Chat messages
   * @param temperature Sampling temperature
   * @returns Chat completion response
   */
  public async createChatCompletion(model: string, messages: any[], temperature: number = 0.7): Promise<any> {
    try {
      // Wait for initialization to complete
      await this.initialized;
      
      if (!this.apiKey) {
        throw new Error('API key not initialized');
      }
      
      const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': `${process.env.APP_HOSTNAME || 'http://localhost:5000'}`,
          'X-Title': 'Accounting AI Assistant'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error generating completion:', error);
      throw error;
    }
  }
  
  /**
   * Analyze accounting data with AI
   * @param model Model ID to use
   * @param data Object containing accounting data to analyze
   * @param query User's specific question or request
   * @returns AI-generated analysis
   */
  public async analyzeData(model: string, data: any, query: string): Promise<string> {
    try {
      const systemPrompt = `You are an expert accounting and financial analysis AI assistant. 
      Analyze the provided accounting data and respond to the user's query with insights, patterns, and recommendations.
      Focus on accuracy, clarity, and actionable insights. Use accounting terminology appropriately.`;
      
      const userPrompt = `Here is the accounting data to analyze:
      ${JSON.stringify(data, null, 2)}
      
      My question/request is: ${query}`;
      
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];
      
      const completion = await this.createChatCompletion(model, messages);
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error analyzing accounting data:', error);
      throw error;
    }
  }
}