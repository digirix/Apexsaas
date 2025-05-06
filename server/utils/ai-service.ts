import crypto from 'crypto';
import { AI_PROVIDERS, TestAiConnectionResponse, SelectAiConfiguration } from '@shared/ai-schema';
import { storage } from '../storage';
import { Client, Entity, Task, ServiceType, TaxJurisdiction } from '@shared/schema';

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

/**
 * Interface for AI request parameters
 */
interface AiRequestParams {
  provider: string;
  model: string;
  messages: Array<{role: string; content: string}>;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Fetches the AI configuration for a tenant
 */
export async function getAiConfigForTenant(tenantId: number, provider?: string): Promise<SelectAiConfiguration | undefined> {
  try {
    if (provider) {
      return await storage.getAiConfigurationByProvider(tenantId, provider);
    }
    
    // If no specific provider is requested, get all configurations and return the first active one
    const configurations = await storage.getAiConfigurations(tenantId);
    return configurations.find(config => config.isActive);
  } catch (error) {
    console.error('Error fetching AI configuration:', error);
    return undefined;
  }
}

/**
 * Makes a request to the selected AI provider
 */
async function makeAiRequest(params: AiRequestParams): Promise<{success: boolean; data?: any; error?: string}> {
  try {
    let response;
    let result;
    
    switch (params.provider) {
      case 'Google AI':
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.messages[0]}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: params.messages.slice(1).map(msg => ({
              role: msg.role === 'user' ? 'USER' : 'MODEL',
              parts: [{ text: msg.content }]
            })),
            generationConfig: {
              temperature: params.temperature || 0.7,
              maxOutputTokens: params.maxTokens || 2048
            }
          })
        });
        break;
        
      case 'OpenAI':
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${params.messages[0]}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: params.model,
            messages: params.messages.slice(1),
            temperature: params.temperature || 0.7,
            max_tokens: params.maxTokens || 2048
          })
        });
        break;
        
      case 'OpenRouter.ai':
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${params.messages[0]}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://accountingfirm.com', // Replace with actual domain in production
            'X-Title': 'Accounting Firm Management'
          },
          body: JSON.stringify({
            model: params.model,
            messages: params.messages.slice(1),
            temperature: params.temperature || 0.7,
            max_tokens: params.maxTokens || 2048
          })
        });
        break;
        
      case 'Anthropic (Claude)':
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': params.messages[0],
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: params.model,
            messages: params.messages.slice(1).map(msg => ({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            })),
            max_tokens: params.maxTokens || 2048
          })
        });
        break;
        
      case 'DeepSeek':
        response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${params.messages[0]}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: params.model,
            messages: params.messages.slice(1),
            temperature: params.temperature || 0.7,
            max_tokens: params.maxTokens || 2048
          })
        });
        break;
        
      default:
        return {
          success: false,
          error: `Unknown AI provider: ${params.provider}`
        };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    result = await response.json();
    
    // Extract the response text based on the provider's response format
    let responseText = '';
    
    switch (params.provider) {
      case 'Google AI':
        responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        break;
      case 'OpenAI':
      case 'OpenRouter.ai':
      case 'DeepSeek':
        responseText = result.choices?.[0]?.message?.content || '';
        break;
      case 'Anthropic (Claude)':
        responseText = result.content?.[0]?.text || '';
        break;
    }

    return {
      success: true,
      data: responseText
    };
  } catch (error) {
    console.error(`Error making AI request to ${params.provider}:`, error);
    return {
      success: false,
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Generates task suggestions based on entity information
 */
export async function generateTaskSuggestions(
  tenantId: number, 
  entityId: number,
  includeContext: boolean = true
): Promise<{success: boolean; suggestions?: any[]; error?: string}> {
  try {
    // Get AI configuration
    const aiConfig = await getAiConfigForTenant(tenantId);
    if (!aiConfig) {
      return {
        success: false,
        error: "No AI configuration found for this tenant"
      };
    }
    
    // Get entity details
    const entity = await storage.getEntity(entityId, tenantId);
    if (!entity) {
      return {
        success: false,
        error: "Entity not found"
      };
    }
    
    // Get client details
    const client = await storage.getClient(entity.clientId, tenantId);
    if (!client) {
      return {
        success: false,
        error: "Client not found"
      };
    }
    
    // Get entity type
    const entityType = await storage.getEntityType(entity.entityTypeId, tenantId);
    
    // Get tax jurisdictions
    const taxJurisdictions = await storage.getTaxJurisdictionsForEntity(tenantId, entityId);
    
    // Get service subscriptions
    const serviceSubscriptions = await storage.getEntityServiceSubscriptions(tenantId, entityId);
    
    // Get service details for subscribed services
    const services = [];
    for (const subscription of serviceSubscriptions) {
      const service = await storage.getServiceType(subscription.serviceTypeId, tenantId);
      if (service) {
        services.push({
          ...service,
          isRequired: subscription.isRequired,
          isSubscribed: subscription.isSubscribed
        });
      }
    }
    
    // Generate task categories dynamically based on entity type and services
    const taskCategories = await storage.getTaskCategories(tenantId);
    
    // Build context object
    const context = {
      entityName: entity.name,
      entityType: entityType?.name || 'Unknown',
      entityRegistrationNumber: entity.registrationNumber,
      entityIncorporationDate: entity.incorporationDate,
      entityFiscalYearEnd: entity.fiscalYearEnd,
      clientName: client.name,
      taxJurisdictions: taxJurisdictions.map(tj => tj.name),
      services: services.map(s => ({
        name: s.name,
        description: s.description,
        frequency: s.frequency,
        isRequired: s.isRequired,
        isSubscribed: s.isSubscribed
      })),
      taskCategories: taskCategories.map(tc => tc.name)
    };
    
    // Prepare the prompt for the AI
    const systemPrompt = `
You are an AI assistant for an accounting firm management system. Your task is to suggest relevant tasks 
for the entity based on its type, tax jurisdictions, and subscribed services. For each suggested task, provide:
1. A clear task name
2. A detailed description of what needs to be done
3. An appropriate category from the available categories
4. A suggested due date (relative to current date or fiscal year end)
5. Estimated effort in hours
6. Priority level (Low, Medium, High)

Only suggest tasks that are directly relevant to accounting, tax, compliance, or financial services.
Format your response as a JSON array of task objects with these properties:
name, description, category, dueDate, estimatedHours, priority
`;

    const userPrompt = `
Please suggest appropriate tasks for the following entity:
${JSON.stringify(context, null, 2)}

Return ONLY a valid JSON array of task objects.
`;

    // Make the AI request
    const decryptedApiKey = decryptApiKey(aiConfig.apiKey);
    const response = await makeAiRequest({
      provider: aiConfig.provider,
      model: aiConfig.model,
      messages: [
        decryptedApiKey, // First message is the API key
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3 // Lower temperature for more consistent outputs
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }

    // Parse the JSON response
    try {
      // Clean up the response to ensure it's valid JSON
      const cleanedResponse = response.data.trim()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      const suggestions = JSON.parse(cleanedResponse);
      
      // Log the result
      await storage.createAiReportHistory({
        tenantId,
        userId: 1, // Default system user
        entityId,
        reportType: 'task_suggestions',
        prompt: includeContext ? JSON.stringify({systemPrompt, userPrompt}) : 'Task suggestions request',
        response: JSON.stringify(suggestions),
        metadata: JSON.stringify(context)
      });
      
      return {
        success: true,
        suggestions
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        success: false,
        error: `Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  } catch (error) {
    console.error('Error generating task suggestions:', error);
    return {
      success: false,
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Processes chat message with AI and returns response
 */
export async function processChatMessage(
  tenantId: number,
  userId: number,
  message: string,
  conversationId?: string,
  previousMessages: Array<{role: string; content: string}> = []
): Promise<{success: boolean; response?: string; conversationId?: string; error?: string}> {
  try {
    // Get AI configuration
    const aiConfig = await getAiConfigForTenant(tenantId);
    if (!aiConfig) {
      return {
        success: false,
        error: "No AI configuration found for this tenant"
      };
    }
    
    // Generate or use existing conversation ID
    const newConversationId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Build context
    const systemPrompt = `
You are an AI assistant for an accounting firm management system. You help users with questions about:
- Accounting and financial reporting tasks
- Tax compliance and filing requirements
- Entity management and corporate governance
- Financial analysis and planning

Provide concise, accurate information based on accounting best practices and regulations.
Avoid giving specific legal advice but you can explain general regulatory requirements.
If you're unsure about specific jurisdictional details, acknowledge the limitations.

Always be professional, courteous, and focus on actionable information.
`;

    // Create messages array with history
    const messages = [
      decryptApiKey(aiConfig.apiKey), // First message is the API key
      { role: 'system', content: systemPrompt },
      ...previousMessages,
      { role: 'user', content: message }
    ];
    
    // Make the AI request
    const response = await makeAiRequest({
      provider: aiConfig.provider,
      model: aiConfig.model,
      messages,
      temperature: 0.7
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }
    
    // Log the chat history
    await storage.createAiChatHistory({
      tenantId,
      userId,
      conversationId: newConversationId,
      message,
      response: response.data,
      metadata: JSON.stringify({
        provider: aiConfig.provider,
        model: aiConfig.model
      })
    });
    
    return {
      success: true,
      response: response.data,
      conversationId: newConversationId
    };
  } catch (error) {
    console.error('Error processing chat message:', error);
    return {
      success: false,
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Analyzes entity compliance status across jurisdictions and services
 */
export async function analyzeEntityCompliance(
  tenantId: number,
  entityId: number
): Promise<{success: boolean; analysis?: any; error?: string}> {
  try {
    // Get AI configuration
    const aiConfig = await getAiConfigForTenant(tenantId);
    if (!aiConfig) {
      return {
        success: false,
        error: "No AI configuration found for this tenant"
      };
    }
    
    // Get entity details
    const entity = await storage.getEntity(entityId, tenantId);
    if (!entity) {
      return {
        success: false,
        error: "Entity not found"
      };
    }
    
    // Get tax jurisdictions
    const taxJurisdictions = await storage.getTaxJurisdictionsForEntity(tenantId, entityId);
    
    // Get service subscriptions
    const serviceSubscriptions = await storage.getEntityServiceSubscriptions(tenantId, entityId);
    
    // Get existing tasks
    const tasks = await storage.getTasks(tenantId, undefined, entityId);
    
    // Build context
    const context = {
      entity,
      taxJurisdictions,
      serviceSubscriptions,
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        dueDate: t.dueDate,
        status: t.status,
        priority: t.priority
      }))
    };
    
    // Prepare the prompt
    const systemPrompt = `
You are an AI assistant for an accounting firm management system specializing in compliance analysis.
Based on the entity information, tax jurisdictions, services, and current tasks, provide a comprehensive
compliance analysis that identifies:

1. Current compliance status (Compliant, At Risk, Non-Compliant) for each jurisdiction
2. Missing or overdue compliance tasks
3. Upcoming deadlines in the next 30/60/90 days
4. Strategic recommendations to improve compliance

Format your response as a structured analysis with clear sections and actionable insights.
`;

    const userPrompt = `
Please analyze the compliance status for the following entity:
${JSON.stringify(context, null, 2)}

Provide a comprehensive compliance analysis.
`;

    // Make the AI request
    const decryptedApiKey = decryptApiKey(aiConfig.apiKey);
    const response = await makeAiRequest({
      provider: aiConfig.provider,
      model: aiConfig.model,
      messages: [
        decryptedApiKey, // First message is the API key
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }
    
    // Log the analysis
    await storage.createAiReportHistory({
      tenantId,
      userId: 1, // Default system user
      entityId,
      reportType: 'compliance_analysis',
      prompt: systemPrompt + '\n' + userPrompt,
      response: response.data,
      metadata: JSON.stringify(context)
    });
    
    return {
      success: true,
      analysis: response.data
    };
  } catch (error) {
    console.error('Error analyzing entity compliance:', error);
    return {
      success: false,
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Extracts key information from uploaded documents
 */
export async function extractDocumentInfo(
  tenantId: number,
  documentType: string,
  documentContent: string
): Promise<{success: boolean; extractedInfo?: any; error?: string}> {
  try {
    // Get AI configuration
    const aiConfig = await getAiConfigForTenant(tenantId);
    if (!aiConfig) {
      return {
        success: false,
        error: "No AI configuration found for this tenant"
      };
    }
    
    // Prepare prompts based on document type
    let systemPrompt = '';
    
    switch (documentType) {
      case 'invoice':
        systemPrompt = `
You are an AI assistant that extracts key information from invoices.
Extract the following fields:
- Invoice number
- Invoice date
- Due date
- Vendor/supplier name
- Total amount
- Tax amount
- Line items (with descriptions, quantities, and prices)

Format your response as a JSON object with these fields.
`;
        break;
        
      case 'tax_form':
        systemPrompt = `
You are an AI assistant that extracts key information from tax forms.
Extract the following fields:
- Form type/number
- Tax year
- Entity name
- Entity tax ID
- Relevant amounts and figures
- Filing deadlines

Format your response as a JSON object with these fields.
`;
        break;
        
      case 'financial_statement':
        systemPrompt = `
You are an AI assistant that extracts key information from financial statements.
Extract the following fields:
- Statement type (Income Statement, Balance Sheet, Cash Flow)
- Period (year/quarter)
- Company name
- Key financial figures (revenue, expenses, profits, assets, liabilities)
- Important ratios or metrics

Format your response as a JSON object with these fields.
`;
        break;
        
      default:
        systemPrompt = `
You are an AI assistant that extracts key information from accounting and financial documents.
Extract all relevant fields and data from the document.
Format your response as a structured JSON object with appropriate fields.
`;
    }

    const userPrompt = `
Extract information from the following ${documentType}:

${documentContent}

Return ONLY a valid JSON object with the extracted information.
`;

    // Make the AI request
    const decryptedApiKey = decryptApiKey(aiConfig.apiKey);
    const response = await makeAiRequest({
      provider: aiConfig.provider,
      model: aiConfig.model,
      messages: [
        decryptedApiKey, // First message is the API key
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2 // Low temperature for consistent extraction
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }

    // Parse the JSON response
    try {
      // Clean up the response to ensure it's valid JSON
      const cleanedResponse = response.data.trim()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      const extractedInfo = JSON.parse(cleanedResponse);
      
      // Log the extraction
      await storage.createAiReportHistory({
        tenantId,
        userId: 1, // Default system user
        entityId: null,
        reportType: `document_extraction_${documentType}`,
        prompt: systemPrompt + '\n' + userPrompt,
        response: JSON.stringify(extractedInfo),
        metadata: JSON.stringify({documentType})
      });
      
      return {
        success: true,
        extractedInfo
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        success: false,
        error: `Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  } catch (error) {
    console.error('Error extracting document info:', error);
    return {
      success: false,
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}