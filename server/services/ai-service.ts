import { fetch } from 'undici';

// Function to get tenant-specific data based on the query
export const fetchTenantDataForQuery = async (tenantId: number, query: string) => {
  // This function will be extended to query various tenant data
  // based on the user's request
  
  // Types of data we need to handle:
  // - Clients
  // - Entities
  // - Tasks
  // - Users
  // - Financial data
  // - Chart of Accounts
  // - etc.

  // For now, return a placeholder message
  return {
    clients: [], // Will be populated with tenant-specific client data
    entities: [], // Will be populated with tenant-specific entity data
    tasks: [], // Will be populated with tenant-specific task data
    users: [], // Will be populated with tenant-specific user data
    message: "Data fetch functionality will be implemented based on query type"
  };
}

// Function to send a query to OpenRouter.ai
export const queryOpenRouter = async (
  apiKey: string, 
  modelId: string, 
  messages: Array<{role: string, content: string}>,
  systemPrompt?: string
) => {
  try {
    // Prepare the body of the request
    const body: any = {
      model: modelId,
      messages: []
    };

    // Add system prompt if provided
    if (systemPrompt) {
      body.messages.push({
        role: "system",
        content: systemPrompt
      });
    }

    // Add user messages
    body.messages = [...body.messages, ...messages];

    // Make the request to OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://accountant-ai.replit.app/', // Replace with your domain
        'X-Title': 'Accountant AI Assistant'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error querying OpenRouter:', error);
    throw new Error(`Failed to get response from AI: ${error.message}`);
  }
}

// Function to send a query to Google AI (Gemini)
export const queryGoogleAI = async (
  apiKey: string, 
  modelId: string, 
  messages: Array<{role: string, content: string}>,
  systemPrompt?: string
) => {
  try {
    // Convert messages to Gemini format
    // Gemini uses a different format than OpenAI/OpenRouter
    const contents = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: `[System Instruction]\n${systemPrompt}\n[End System Instruction]` }]
      });
    }

    // Convert messages to Gemini format
    for (const message of messages) {
      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      });
    }

    // Make the request to Google AI API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google AI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Format the response to match OpenAI/OpenRouter format
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: data.candidates[0].content.parts[0].text
          }
        }
      ]
    };
  } catch (error: any) {
    console.error('Error querying Google AI:', error);
    throw new Error(`Failed to get response from AI: ${error.message}`);
  }
}

// Function to send a query to Anthropic (Claude)
export const queryAnthropic = async (
  apiKey: string, 
  modelId: string, 
  messages: Array<{role: string, content: string}>,
  systemPrompt?: string
) => {
  try {
    // Prepare the request body
    const body: any = {
      model: modelId,
      messages: messages,
      max_tokens: 2048
    };

    // Add system prompt if provided
    if (systemPrompt) {
      body.system = systemPrompt;
    }

    // Make the request to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Format the response to match OpenAI/OpenRouter format
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: data.content[0].text
          }
        }
      ]
    };
  } catch (error: any) {
    console.error('Error querying Anthropic:', error);
    throw new Error(`Failed to get response from AI: ${error.message}`);
  }
}

// Generic function to query any AI provider
export const queryAI = async (
  provider: string,
  apiKey: string,
  modelId: string,
  messages: Array<{role: string, content: string}>,
  systemPrompt?: string
) => {
  switch(provider) {
    case 'OpenAI':
      return await queryOpenRouter(apiKey, modelId, messages, systemPrompt);
    case 'Google':
      return await queryGoogleAI(apiKey, modelId, messages, systemPrompt);
    case 'Anthropic':
      return await queryAnthropic(apiKey, modelId, messages, systemPrompt);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}