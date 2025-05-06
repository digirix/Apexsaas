import crypto from 'crypto';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { aiConfigurations } from '@shared/ai-schema';
import OpenAI from 'openai';

interface AiServiceOptions {
  tenantId: number;
}

// Define AI Provider interfaces
interface AiProvider {
  initialize(apiKey: string, model: string): void;
  generateText(prompt: string, options?: any): Promise<string>;
  analyzeImage?(imageBase64: string, prompt: string, options?: any): Promise<string>;
}

// Google AI Provider
class GoogleAiProvider implements AiProvider {
  private apiKey: string = '';
  private model: string = 'gemini-1.5-pro';
  private apiEndpoint = 'https://generativelanguage.googleapis.com';
  private apiVersion = 'v1beta';
  private availableModels: any[] = [];

  initialize(apiKey: string, model: string): void {
    this.apiKey = apiKey;
    this.model = model || 'gemini-1.5-pro';
  }

  /**
   * List available models to verify API key and find correct model names
   */
  async listModels(): Promise<any[]> {
    try {
      const url = `${this.apiEndpoint}/${this.apiVersion}/models?key=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || `Failed to list models: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.availableModels = data.models || [];
      return this.availableModels;
    } catch (error) {
      console.error('Error listing Google AI models:', error);
      throw error;
    }
  }

  /**
   * Find the best available model that matches the requested capabilities
   */
  async findBestModel(capability: 'text' | 'vision' = 'text'): Promise<string | null> {
    if (this.availableModels.length === 0) {
      try {
        await this.listModels();
      } catch (error) {
        console.error('Error fetching available models:', error);
        // If we can't get models, fall back to common model names
        return capability === 'vision' ? 'gemini-1.5-pro-vision' : 'gemini-1.5-pro';
      }
    }

    // First try exact model match
    const exactMatch = this.availableModels.find(m => m.name.endsWith(`/${this.model}`));
    if (exactMatch) {
      return this.model;
    }

    // Find preferred models based on capability
    const preferredModels = capability === 'vision' 
      ? ['gemini-1.5-pro-vision', 'gemini-pro-vision', 'gemini-1.0-pro-vision'] 
      : ['gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro', 'gemini-1.5-flash', 'gemini-flash'];

    // Look for available preferred models
    for (const modelName of preferredModels) {
      const match = this.availableModels.find(m => m.name.endsWith(`/${modelName}`));
      if (match) {
        // Extract just the model name from the full path
        const parts = match.name.split('/');
        return parts[parts.length - 1];
      }
    }

    // If no preferred model is found, just return any model that supports generateContent
    const anyModel = this.availableModels.find(m => 
      m.supportedGenerationMethods && 
      m.supportedGenerationMethods.includes('generateContent')
    );

    if (anyModel) {
      const parts = anyModel.name.split('/');
      return parts[parts.length - 1];
    }

    // If we couldn't find any suitable model
    throw new Error('No suitable Google AI model found for the requested capability');
  }

  /**
   * Generate text using the most appropriate model 
   */
  async generateText(prompt: string, options: any = {}): Promise<string> {
    try {
      // Find the best model for text generation
      const modelToUse = await this.findBestModel('text');
      
      const url = `${this.apiEndpoint}/${this.apiVersion}/models/${modelToUse}:generateContent?key=${this.apiKey}`;
      
      console.log(`Using model: ${modelToUse} for text generation`);
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature || 0.7,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
          maxOutputTokens: options.maxTokens || 1024,
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || `Failed to generate text with Google AI: ${response.statusText}`);
      }

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No content generated from the model');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Google AI API error:', error);
      throw error;
    }
  }

  /**
   * Analyze image using the most appropriate vision model
   */
  async analyzeImage(imageBase64: string, prompt: string, options: any = {}): Promise<string> {
    try {
      // Find the best model for image analysis
      const modelToUse = await this.findBestModel('vision');
      
      const url = `${this.apiEndpoint}/${this.apiVersion}/models/${modelToUse}:generateContent?key=${this.apiKey}`;
      
      console.log(`Using model: ${modelToUse} for image analysis`);
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature || 0.4,
          maxOutputTokens: options.maxTokens || 1024,
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || `Failed to analyze image with Google AI: ${response.statusText}`);
      }

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No analysis generated from the model');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Google AI Vision API error:', error);
      throw error;
    }
  }
}

// OpenAI Provider
class OpenAiProvider implements AiProvider {
  private client!: OpenAI; // Using definite assignment assertion
  private model: string = 'gpt-4o';

  initialize(apiKey: string, model: string): void {
    this.client = new OpenAI({ apiKey });
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    this.model = model || 'gpt-4o';
  }

  async generateText(prompt: string, options: any = {}): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1024,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async analyzeImage(imageBase64: string, prompt: string, options: any = {}): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.4
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI Vision API error:', error);
      throw error;
    }
  }
}

// Anthropic Provider
class AnthropicProvider implements AiProvider {
  private apiKey: string = '';
  private model: string = 'claude-3-opus-20240229';
  private apiEndpoint = 'https://api.anthropic.com/v1/messages';

  initialize(apiKey: string, model: string): void {
    this.apiKey = apiKey;
    this.model = model || 'claude-3-opus-20240229';
  }

  async generateText(prompt: string, options: any = {}): Promise<string> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature || 0.7
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate text with Anthropic');
      }

      return data.content[0].text;
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }
}

// Factory function to create provider instances
function createProvider(providerName: string): AiProvider {
  switch (providerName) {
    case 'Google':
      return new GoogleAiProvider();
    case 'OpenAI':
      return new OpenAiProvider();
    case 'Anthropic':
      return new AnthropicProvider();
    default:
      throw new Error(`Unknown AI provider: ${providerName}`);
  }
}

// Helper function to encrypt sensitive data
function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

// Helper function to decrypt sensitive data
function decrypt(text: string, key: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Generate a secure key for encrypting API keys
// In a production environment, this should be stored securely and not generated on the fly
const getEncryptionKey = (): string => {
  // This is a simplified approach - in production, use a proper key management system
  const baseKey = process.env.AI_ENCRYPTION_KEY || 'default-encryption-key-for-development';
  return crypto.createHash('sha256').update(baseKey).digest('hex');
};

// Main AI Service class
export class AiService {
  private tenantId: number;
  private provider: AiProvider | null = null;
  private encryptionKey: string;

  constructor(options: AiServiceOptions) {
    this.tenantId = options.tenantId;
    this.encryptionKey = getEncryptionKey();
  }

  // Initialize the AI provider with the active configuration
  async initialize(): Promise<boolean> {
    try {
      // Get the active configuration for the tenant
      const config = await db.query.aiConfigurations.findFirst({
        where: and(
          eq(aiConfigurations.tenantId, this.tenantId),
          eq(aiConfigurations.isActive, true)
        )
      });

      if (!config) {
        console.warn(`No active AI configuration found for tenant ${this.tenantId}`);
        return false;
      }

      // Create and initialize the provider
      this.provider = createProvider(config.provider);
      
      // Decrypt the API key
      const decryptedApiKey = decrypt(config.apiKey, this.encryptionKey);
      
      this.provider.initialize(decryptedApiKey, config.model);
      return true;
    } catch (error) {
      console.error('Error initializing AI service:', error);
      this.provider = null;
      return false;
    }
  }

  // Generate text response
  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    if (!this.provider) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('AI provider is not initialized');
      }
    }

    // At this point this.provider should not be null, but let's double-check
    if (!this.provider) {
      throw new Error('Failed to initialize AI provider');
    }

    try {
      return await this.provider.generateText(prompt, options);
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }

  // Analyze image if the provider supports it
  async analyzeImage(imageBase64: string, prompt: string, options: any = {}): Promise<string> {
    if (!this.provider) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('AI provider is not initialized');
      }
    }

    // At this point this.provider should not be null, but let's double-check
    if (!this.provider) {
      throw new Error('Failed to initialize AI provider');
    }
    
    // Check if the current provider supports image analysis
    if (!('analyzeImage' in this.provider)) {
      throw new Error('Current AI provider does not support image analysis');
    }

    try {
      // Now TypeScript should know this.provider has an analyzeImage method
      return await (this.provider as Required<AiProvider>).analyzeImage(imageBase64, prompt, options);
    } catch (error) {
      console.error('Error analyzing image with AI:', error);
      throw error;
    }
  }

  // Test a provider connection with the given API key
  static async testConnection(provider: string, apiKey: string): Promise<{ success: boolean; message: string; error?: string; details?: any; models?: any[] }> {
    try {
      // Basic validation
      if (!apiKey || apiKey.trim() === '') {
        return {
          success: false,
          message: 'API key cannot be empty',
          error: 'EMPTY_API_KEY'
        };
      }
      
      // Check if the provider is supported
      if (!['Google', 'OpenAI', 'Anthropic'].includes(provider)) {
        return {
          success: false,
          message: `Unsupported AI provider: ${provider}`,
          error: 'UNSUPPORTED_PROVIDER'
        };
      }
      
      console.log(`Testing connection for provider: ${provider}`);
      const aiProvider = createProvider(provider);
      aiProvider.initialize(apiKey, '');

      // For Google AI, we'll try to list models first to validate API key and connection
      if (provider === 'Google' && aiProvider instanceof GoogleAiProvider) {
        try {
          console.log('Listing Google AI models to validate API key...');
          // Try to list available models first
          const availableModels = await aiProvider.listModels();
          
          // Format the models for the UI
          const formattedModels = availableModels
            .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
            .map(model => {
              const nameParts = model.name.split('/');
              const modelName = nameParts[nameParts.length - 1];
              // Format display name
              let displayName = modelName.replace(/[-_]/g, ' ');
              displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
              return { 
                id: modelName, 
                name: displayName
              };
            });
          
          if (formattedModels.length > 0) {
            console.log(`Found ${formattedModels.length} compatible Google AI models`);
            return {
              success: true,
              message: 'Connection successful. Found ' + formattedModels.length + ' available models.',
              models: formattedModels
            };
          }
          
          // If no models found, fall back to default model list
          console.log('No compatible models found, using default model list');
        } catch (listError) {
          console.warn('Error listing models from Google AI API:', listError);
          
          // Provide more detailed error information
          const errorMessage = listError instanceof Error ? listError.message : 'Unknown error';
          
          // Check for common error patterns in Google AI API
          if (errorMessage.includes('API key')) {
            return {
              success: false,
              message: 'Invalid Google AI API key. Please check your credentials.',
              error: 'INVALID_API_KEY',
              details: errorMessage
            };
          } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            return {
              success: false,
              message: 'Your Google AI API key does not have permission to access this service.',
              error: 'PERMISSION_DENIED',
              details: errorMessage
            };
          } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            return {
              success: false,
              message: 'You have exceeded your Google AI API quota or rate limit.',
              error: 'QUOTA_EXCEEDED',
              details: errorMessage
            };
          }
          
          // If we can't specifically identify the error, try text generation anyway
          console.log('Falling back to testing with text generation');
        }
      }

      // Simple test prompt for all providers
      console.log(`Testing ${provider} with a simple text generation request`);
      const testResponse = await aiProvider.generateText('Respond with "Connection successful"');
      console.log('Test response received:', testResponse?.substring(0, 100));
      
      // Get default models based on provider if we couldn't fetch them
      let models: any[] = [];
      switch (provider) {
        case 'Google':
          models = [
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
            { id: 'gemini-pro', name: 'Gemini Pro' },
            { id: 'gemini-pro-vision', name: 'Gemini Pro Vision' }
          ];
          break;
        case 'OpenAI':
          models = [
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
          ];
          break;
        case 'Anthropic':
          models = [
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
          ];
          break;
      }

      return {
        success: true,
        message: 'Connection successful',
        models
      };
    } catch (error) {
      console.error(`Error testing ${provider} connection:`, error);
      
      // Get the error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Detailed error message:', errorMessage);
      
      // Extract more detailed error information based on provider
      let userFriendlyMessage = 'Connection failed';
      let errorCode = 'UNKNOWN_ERROR';
      
      // Provider-specific error handling
      switch (provider) {
        case 'Google':
          if (errorMessage.includes('API key')) {
            userFriendlyMessage = 'Invalid Google AI API key. Please check your credentials.';
            errorCode = 'INVALID_API_KEY';
          } else if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
            userFriendlyMessage = 'Your Google AI API key does not have permission to access this service.';
            errorCode = 'PERMISSION_DENIED';
          } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            userFriendlyMessage = 'You have exceeded your Google AI API quota or rate limit.';
            errorCode = 'QUOTA_EXCEEDED';
          } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
            userFriendlyMessage = 'Network error connecting to Google AI. Please check your internet connection.';
            errorCode = 'NETWORK_ERROR';
          }
          break;
          
        case 'OpenAI':
          if (errorMessage.includes('API key')) {
            userFriendlyMessage = 'Invalid OpenAI API key. Please check your credentials.';
            errorCode = 'INVALID_API_KEY';
          } else if (errorMessage.includes('organization') || errorMessage.includes('access')) {
            userFriendlyMessage = 'Your OpenAI API key does not have access to this model or organization.';
            errorCode = 'ACCESS_DENIED';
          } else if (errorMessage.includes('rate limit') || errorMessage.includes('requests per min')) {
            userFriendlyMessage = 'Rate limit exceeded for OpenAI API. Please try again later.';
            errorCode = 'RATE_LIMIT_EXCEEDED';
          } else if (errorMessage.includes('insufficient_quota')) {
            userFriendlyMessage = 'Your OpenAI account has insufficient quota. Please check your billing.';
            errorCode = 'INSUFFICIENT_QUOTA';
          }
          break;
          
        case 'Anthropic':
          if (errorMessage.includes('key') || errorMessage.includes('auth')) {
            userFriendlyMessage = 'Invalid Anthropic API key. Please check your credentials.';
            errorCode = 'INVALID_API_KEY';
          } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
            userFriendlyMessage = 'Rate limit exceeded for Anthropic API. Please try again later.';
            errorCode = 'RATE_LIMIT_EXCEEDED';
          }
          break;
      }
      
      return {
        success: false,
        message: userFriendlyMessage,
        error: errorCode,
        details: errorMessage
      };
    }
  }

  // Helper method to encrypt an API key
  static encryptApiKey(apiKey: string): string {
    const encryptionKey = getEncryptionKey();
    return encrypt(apiKey, encryptionKey);
  }

  // Task-specific AI methods

  // Generate task suggestions for an entity
  async generateTaskSuggestions(entityData: any): Promise<any[]> {
    const prompt = `
    Based on the following entity information, generate a list of accounting and compliance tasks that need to be completed.
    
    Entity Information:
    - Name: ${entityData.name}
    - Type: ${entityData.type}
    - Jurisdictions: ${entityData.jurisdictions.join(', ')}
    - Services: ${entityData.services.join(', ')}
    - Fiscal Year End: ${entityData.fiscalYearEnd}
    - Tax IDs: ${entityData.taxIds ? Object.entries(entityData.taxIds).map(([k, v]) => `${k}: ${v}`).join(', ') : 'None'}
    
    Generate at least 5 appropriate tasks with the following information for each:
    1. Task name
    2. Description
    3. Category (e.g., Tax, Compliance, Accounting, Audit)
    4. Due date
    5. Estimated hours
    6. Priority (Low, Medium, or High)
    
    Format the response as a JSON array of task objects.
    `;

    try {
      const response = await this.generateResponse(prompt, { temperature: 0.5 });
      
      // Parse JSON from the response
      // Extract JSON from the response text (in case there's extra text around it)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not extract valid JSON from AI response');
      }
      
      const tasks = JSON.parse(jsonMatch[0]);
      return tasks;
    } catch (error) {
      console.error('Error generating task suggestions:', error);
      throw error;
    }
  }

  // Analyze entity compliance
  async analyzeEntityCompliance(entityData: any): Promise<string> {
    const prompt = `
    Perform a comprehensive compliance analysis for the following entity:
    
    Entity Information:
    - Name: ${entityData.name}
    - Type: ${entityData.type}
    - Jurisdictions: ${entityData.jurisdictions.join(', ')}
    - Services: ${entityData.services.join(', ')}
    - Fiscal Year End: ${entityData.fiscalYearEnd}
    - Tax IDs: ${entityData.taxIds ? Object.entries(entityData.taxIds).map(([k, v]) => `${k}: ${v}`).join(', ') : 'None'}
    
    Include the following in your analysis:
    1. Current compliance status across all jurisdictions
    2. Upcoming filing deadlines
    3. Potential compliance risks
    4. Recommended actions to ensure ongoing compliance
    
    Format the analysis in a structured way with clear sections and bullet points where appropriate.
    `;

    try {
      return await this.generateResponse(prompt, { temperature: 0.3 });
    } catch (error) {
      console.error('Error analyzing entity compliance:', error);
      throw error;
    }
  }

  // Extract information from documents
  async extractDocumentInfo(documentType: string, documentContent: string): Promise<any> {
    let prompt = `
    Extract key information from the following ${documentType} document content.
    Document content:
    ${documentContent.substring(0, 4000)} ${documentContent.length > 4000 ? '... (content truncated)' : ''}
    
    Analyze the content and extract structured data in JSON format based on the document type.
    `;

    // Customize prompt based on document type
    switch (documentType) {
      case 'invoice':
        prompt += `
        For invoices, extract:
        - Invoice number
        - Date
        - Due date
        - Vendor/customer information
        - Line items with descriptions, quantities, and amounts
        - Subtotal, tax amounts, and total
        - Payment terms
        `;
        break;
      case 'tax_form':
        prompt += `
        For tax forms, extract:
        - Form type/number
        - Tax year
        - Entity information
        - Key financial figures
        - Filing deadlines
        - Payment or refund amounts
        `;
        break;
      case 'financial_statement':
        prompt += `
        For financial statements, extract:
        - Statement type (Income Statement, Balance Sheet, etc.)
        - Time period
        - Key financial metrics
        - Assets, liabilities, and equity (if balance sheet)
        - Revenue, expenses, and profit/loss (if income statement)
        - Cash flow information (if cash flow statement)
        `;
        break;
      default:
        prompt += `
        Extract all relevant financial and accounting information from this document.
        `;
    }

    prompt += `
    Return only the extracted information as valid JSON with no additional text.
    `;

    try {
      const response = await this.generateResponse(prompt, { temperature: 0.2 });
      
      // Parse JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract valid JSON from AI response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error extracting document information:', error);
      throw error;
    }
  }

  // Process chat messages
  async processChatMessage(message: string, conversationHistory: any[] = []): Promise<string> {
    // Format conversation history for the prompt
    const formattedHistory = conversationHistory.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.role === 'user' ? msg.message : msg.response}`
    ).join('\n\n');

    const prompt = `
    ${formattedHistory ? `Conversation history:\n${formattedHistory}\n\n` : ''}
    
    User: ${message}
    
    You are an accounting and finance AI assistant for an accounting firm management system. Provide helpful, accurate information about accounting, taxation, compliance, financial reporting, and related topics. If you don't know the answer, admit it rather than making up information.
    
    Assistant:
    `;

    try {
      return await this.generateResponse(prompt, { temperature: 0.7 });
    } catch (error) {
      console.error('Error processing chat message:', error);
      throw error;
    }
  }
}