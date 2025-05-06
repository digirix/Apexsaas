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
  private apiKey: string;
  private model: string;
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
  private client: OpenAI;
  private model: string;

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
  private apiKey: string;
  private model: string;
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

    try {
      return await this.provider!.generateText(prompt, options);
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

    if (!this.provider.analyzeImage) {
      throw new Error('Current AI provider does not support image analysis');
    }

    try {
      return await this.provider.analyzeImage(imageBase64, prompt, options);
    } catch (error) {
      console.error('Error analyzing image with AI:', error);
      throw error;
    }
  }

  // Test a provider connection with the given API key
  static async testConnection(provider: string, apiKey: string): Promise<{ success: boolean; message: string; error?: any; models?: any[] }> {
    try {
      // Validate API key format first
      if (!apiKey || apiKey.trim() === '') {
        return {
          success: false,
          message: 'API key cannot be empty'
        };
      }

      // Perform basic API key format validation based on provider
      if (provider === 'Google') {
        // Google API keys are typically alphanumeric and may start with 'AI'
        if (apiKey.length < 20) {
          return {
            success: false,
            message: 'Invalid Google API key format. Google API keys are typically longer than 20 characters.'
          };
        }
      } else if (provider === 'OpenAI') {
        // OpenAI keys typically start with 'sk-' and are quite long
        if (!apiKey.startsWith('sk-') || apiKey.length < 30) {
          return {
            success: false,
            message: 'Invalid OpenAI API key format. OpenAI API keys typically start with "sk-" and are longer than 30 characters.'
          };
        }
      } else if (provider === 'Anthropic') {
        // Anthropic keys have specific formats
        if (!apiKey.startsWith('sk-ant-') && !apiKey.startsWith('sk-')) {
          return {
            success: false,
            message: 'Invalid Anthropic API key format. Anthropic API keys typically start with "sk-ant-" or "sk-".'
          };
        }
      }

      console.log(`Creating provider for ${provider}...`);
      const aiProvider = createProvider(provider);
      console.log(`Initializing provider with API key...`);
      aiProvider.initialize(apiKey, '');

      // For Google AI, we'll try to list models first to validate API key and connection
      if (provider === 'Google' && aiProvider instanceof GoogleAiProvider) {
        try {
          console.log('Listing Google AI models...');
          // Try to list available models first
          const availableModels = await aiProvider.listModels();
          console.log(`Found ${availableModels.length} Google AI models`);
          
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
            return {
              success: true,
              message: 'Connection successful. Found ' + formattedModels.length + ' available models.',
              models: formattedModels
            };
          } else {
            console.log('No compatible models found, will try a test generation instead');
          }
        } catch (listError: any) {
          console.warn('Error listing Google AI models:', listError);
          
          // Provide specific error message based on error type
          const errorMessage = listError.message || '';
          
          if (errorMessage.includes('API key not valid')) {
            return {
              success: false,
              message: 'Invalid Google AI API key. Please check your key and try again.',
              error: listError
            };
          } else if (errorMessage.includes('PERMISSION_DENIED')) {
            return {
              success: false,
              message: 'Permission denied. Your Google AI API key does not have permission to access the models API.',
              error: listError
            };
          } else if (errorMessage.includes('RESOURCE_EXHAUSTED')) {
            return {
              success: false,
              message: 'API quota exceeded. Your Google AI account has reached its usage limit.',
              error: listError
            };
          } else if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED')) {
            return {
              success: false,
              message: 'Connection to Google AI timed out. Please check your network and try again.',
              error: listError
            };
          }
          
          // If error is not one of the above, continue to text generation test
          console.log('Falling back to testing with text generation');
        }
      }

      // Simple test prompt for all providers
      console.log(`Testing ${provider} with a simple text generation request`);
      try {
        const testResponse = await aiProvider.generateText('Respond with "Connection successful"');
        console.log('Test response received:', testResponse?.substring(0, 100));
        
        // Get default models based on provider since we couldn't fetch them dynamically
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
          message: `Connection to ${provider} successful`,
          models
        };
      } catch (textGenError: any) {
        console.error(`Error in text generation test for ${provider}:`, textGenError);
        
        // Format specific error messages based on provider and error type
        if (provider === 'OpenAI') {
          if (textGenError.message?.includes('401')) {
            return {
              success: false,
              message: 'Invalid API key. Please check your OpenAI API key and try again.',
              error: textGenError
            };
          } else if (textGenError.message?.includes('429')) {
            return {
              success: false,
              message: 'OpenAI rate limit exceeded. Your account has reached its usage limit.',
              error: textGenError
            };
          } else if (textGenError.message?.includes('timeout')) {
            return {
              success: false,
              message: 'Connection to OpenAI timed out. Please check your network and try again.',
              error: textGenError
            };
          }
        } else if (provider === 'Anthropic') {
          if (textGenError.message?.includes('401')) {
            return {
              success: false,
              message: 'Invalid API key. Please check your Anthropic API key and try again.',
              error: textGenError
            };
          } else if (textGenError.message?.includes('429')) {
            return {
              success: false,
              message: 'Anthropic rate limit exceeded. Your account has reached its usage limit.',
              error: textGenError
            };
          } else if (textGenError.message?.includes('timeout')) {
            return {
              success: false,
              message: 'Connection to Anthropic timed out. Please check your network and try again.',
              error: textGenError
            };
          }
        } else if (provider === 'Google') {
          if (textGenError.message?.includes('API key not valid')) {
            return {
              success: false,
              message: 'Invalid API key. Please check your Google AI API key and try again.',
              error: textGenError
            };
          } else if (textGenError.message?.includes('PERMISSION_DENIED')) {
            return {
              success: false,
              message: 'Permission denied. Your Google AI API key does not have necessary permissions.',
              error: textGenError
            };
          } else if (textGenError.message?.includes('RESOURCE_EXHAUSTED')) {
            return {
              success: false,
              message: 'API quota exceeded. Your Google AI account has reached its usage limit.',
              error: textGenError
            };
          }
        }
        
        // Generic error message if we couldn't determine a specific cause
        return {
          success: false,
          message: `Failed to connect to ${provider}: ${textGenError.message || 'Unknown error'}`,
          error: textGenError
        };
      }
    } catch (error: any) {
      console.error(`Error testing ${provider} connection:`, error);
      
      // Detailed error response with debugging information
      return {
        success: false,
        message: `Connection to ${provider} failed: ${error.message || 'Unknown error'}`,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
          details: error.details || error.response?.data || error.response || null
        }
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