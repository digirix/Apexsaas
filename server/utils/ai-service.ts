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
  analyzeImage?(imageBase64: string, prompt: string): Promise<string>;
}

// Google AI Provider
class GoogleAiProvider implements AiProvider {
  private apiKey: string;
  private model: string;
  private apiEndpoint = 'https://generativelanguage.googleapis.com';

  initialize(apiKey: string, model: string): void {
    this.apiKey = apiKey;
    this.model = model || 'gemini-pro';
  }

  async generateText(prompt: string, options: any = {}): Promise<string> {
    const url = `${this.apiEndpoint}/v1/models/${this.model}:generateContent?key=${this.apiKey}`;
    
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

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate text with Google AI');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Google AI API error:', error);
      throw error;
    }
  }

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    const url = `${this.apiEndpoint}/v1/models/gemini-pro-vision:generateContent?key=${this.apiKey}`;
    
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
        temperature: 0.4,
        maxOutputTokens: 1024,
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to analyze image with Google AI');
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

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
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
        max_tokens: 1024
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
  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
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
      return await this.provider.analyzeImage(imageBase64, prompt);
    } catch (error) {
      console.error('Error analyzing image with AI:', error);
      throw error;
    }
  }

  // Test a provider connection with the given API key
  static async testConnection(provider: string, apiKey: string): Promise<{ success: boolean; message: string; models?: any[] }> {
    try {
      const aiProvider = createProvider(provider);
      aiProvider.initialize(apiKey, '');

      // Simple test prompt
      const testResponse = await aiProvider.generateText('Respond with "Connection successful"');
      
      // Get available models based on provider
      let models: any[] = [];
      switch (provider) {
        case 'Google':
          models = [
            { id: 'gemini-pro', name: 'Gemini Pro' },
            { id: 'gemini-pro-vision', name: 'Gemini Pro Vision' },
            { id: 'gemini-flash', name: 'Gemini Flash' }
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
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
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