import crypto from 'crypto';
import { AI_PROVIDERS, TestAiConnectionResponse } from '@shared/ai-schema';

// Environment variable for encryption key (should be set in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-encryption-key-change-in-production';
const ENCRYPTION_IV = crypto.randomBytes(16);

/**
 * Encrypts an API key for secure storage in the database
 */
export function encryptApiKey(apiKey: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), ENCRYPTION_IV);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Store IV with the encrypted data so we can decrypt later
  return ENCRYPTION_IV.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts an API key from the database
 */
export function decryptApiKey(encryptedApiKey: string): string {
  const parts = encryptedApiKey.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Tests a connection to an AI provider and returns available models
 */
export async function testAiConnection(provider: string, apiKey: string): Promise<TestAiConnectionResponse> {
  try {
    switch (provider) {
      case 'OpenRouter.ai':
        return await testOpenRouterConnection(apiKey);
      case 'OpenAI':
        return await testOpenAIConnection(apiKey);
      case 'Google AI':
        return await testGoogleAIConnection(apiKey);
      case 'DeepSeek':
        return await testDeepSeekConnection(apiKey);
      case 'Anthropic (Claude)':
        return await testAnthropicConnection(apiKey);
      default:
        return {
          success: false,
          message: `Unknown provider: ${provider}`
        };
    }
  } catch (error) {
    console.error(`Error testing connection to ${provider}:`, error);
    return {
      success: false,
      message: `Connection error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validates a connection to OpenRouter.ai and retrieves available models
 */
async function testOpenRouterConnection(apiKey: string): Promise<TestAiConnectionResponse> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Format the models data
    const models = data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id
    }));

    return {
      success: true,
      message: `Successfully connected to OpenRouter.ai. Found ${models.length} models.`,
      models
    };
  } catch (error) {
    console.error('OpenRouter connection error:', error);
    return {
      success: false,
      message: `Failed to connect to OpenRouter.ai: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validates a connection to OpenAI and retrieves available models
 */
async function testOpenAIConnection(apiKey: string): Promise<TestAiConnectionResponse> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Filter to include only the relevant models (GPT models)
    const models = data.data
      .filter((model: any) => model.id.includes('gpt'))
      .map((model: any) => ({
        id: model.id,
        name: model.id
      }));

    return {
      success: true,
      message: `Successfully connected to OpenAI. Found ${models.length} GPT models.`,
      models
    };
  } catch (error) {
    console.error('OpenAI connection error:', error);
    return {
      success: false,
      message: `Failed to connect to OpenAI: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validates a connection to Google AI and retrieves available models
 */
async function testGoogleAIConnection(apiKey: string): Promise<TestAiConnectionResponse> {
  try {
    // Google AI API requires project ID which is typically part of the API key context
    // This is a simplified example - actual implementation depends on Google AI API structure
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Format the models data based on Google's response structure
    const models = data.models?.map((model: any) => ({
      id: model.name,
      name: model.displayName || model.name
    })) || [];

    return {
      success: true,
      message: `Successfully connected to Google AI. Found ${models.length} models.`,
      models
    };
  } catch (error) {
    console.error('Google AI connection error:', error);
    return {
      success: false,
      message: `Failed to connect to Google AI: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validates a connection to DeepSeek and retrieves available models
 */
async function testDeepSeekConnection(apiKey: string): Promise<TestAiConnectionResponse> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Format the models data based on DeepSeek's response structure
    const models = data.data?.map((model: any) => ({
      id: model.id,
      name: model.name || model.id
    })) || [];

    return {
      success: true,
      message: `Successfully connected to DeepSeek. Found ${models.length} models.`,
      models
    };
  } catch (error) {
    console.error('DeepSeek connection error:', error);
    return {
      success: false,
      message: `Failed to connect to DeepSeek: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validates a connection to Anthropic (Claude) and retrieves available models
 */
async function testAnthropicConnection(apiKey: string): Promise<TestAiConnectionResponse> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Format the models data based on Anthropic's response structure
    const models = data.models?.map((model: any) => ({
      id: model.id,
      name: model.name || model.id
    })) || [];

    return {
      success: true,
      message: `Successfully connected to Anthropic (Claude). Found ${models.length} models.`,
      models
    };
  } catch (error) {
    console.error('Anthropic connection error:', error);
    return {
      success: false,
      message: `Failed to connect to Anthropic (Claude): ${error instanceof Error ? error.message : String(error)}`
    };
  }
}