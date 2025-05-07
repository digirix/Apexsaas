import { fetch } from 'undici';

// Define message type
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Define response types for different AI providers
interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    index: number;
    finish_reason: string;
  }[];
  model: string;
}

interface GoogleAIResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
    index: number;
  }[];
}

interface AnthropicResponse {
  content: {
    type: string;
    text: string;
  }[];
  id: string;
  model: string;
  role: string;
  stop_reason: string;
  type: string;
}

// Standardized response format for all providers
interface StandardAIResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
    index: number;
    finish_reason: string;
  }[];
  model: string;
}

// Function to fetch relevant tenant data for the query
export const fetchTenantDataForQuery = async (tenantId: number, query: string) => {
  // This function will be implemented to retrieve specific tenant data
  // based on the user's query
  return {
    tenantId,
    query,
    timestamp: new Date().toISOString(),
    tenantData: {
      // This will be populated with actual tenant data depending on the query
    }
  };
};

// OpenRouter API implementation
export const queryOpenRouter = async (
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<StandardAIResponse> => {
  try {
    // Add system prompt if provided
    const modifiedMessages = [...messages];
    if (systemPrompt) {
      modifiedMessages.unshift({
        role: "system",
        content: systemPrompt
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://accountant.io",
        "X-Title": "Accountant.io"
      },
      body: JSON.stringify({
        model: modelId || "google/gemini-flash-1.5-8b-exp",
        messages: modifiedMessages,
        temperature: 0.7,
        safety_settings: [
          {
            category: "HARM_CATEGORY_HARASSMENT", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
    }

    const data: OpenRouterResponse = await response.json();
    console.log('OpenRouter API response:', JSON.stringify(data, null, 2));
    
    // Return in standardized format
    return {
      choices: data.choices || [],
      model: data.model || 'unknown'
    };
  } catch (error: any) {
    console.error("Error querying OpenRouter:", error.message);
    throw new Error(`Failed to query OpenRouter: ${error.message}`);
  }
};

// Google AI (Gemini) API implementation
export const queryGoogleAI = async (
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<StandardAIResponse> => {
  try {
    const model = modelId || "gemini-pro";
    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Format messages for Google AI
    const formattedMessages = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : msg.role,
      parts: [{ text: msg.content }]
    }));
    
    // Add system prompt if provided
    if (systemPrompt) {
      formattedMessages.unshift({
        role: "user",
        parts: [{ text: `System Instructions: ${systemPrompt}` }]
      });
    }
    
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: formattedMessages,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google AI API Error: ${response.status} - ${errorText}`);
    }

    const data: GoogleAIResponse = await response.json();
    console.log('Google AI response:', JSON.stringify(data, null, 2));
    
    // Convert Google AI response to standard format
    if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      throw new Error('Invalid response from Google AI: No candidates returned');
    }
    
    return {
      choices: data.candidates.map(candidate => ({
        message: {
          role: "assistant",
          content: candidate.content?.parts?.[0]?.text || "No response content"
        },
        index: candidate.index || 0,
        finish_reason: candidate.finishReason || "unknown"
      })),
      model: model
    };
  } catch (error: any) {
    console.error("Error querying Google AI:", error.message);
    throw new Error(`Failed to query Google AI: ${error.message}`);
  }
};

// Anthropic API implementation
export const queryAnthropic = async (
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<StandardAIResponse> => {
  try {
    const model = modelId || "claude-3-opus-20240229";
    
    // Format messages for Anthropic
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add system instructions
    const systemInstructions = systemPrompt || "You are a helpful AI assistant for an accounting firm. Answer questions clearly and accurately.";
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: model,
        messages: formattedMessages,
        system: systemInstructions,
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API Error: ${response.status} - ${errorText}`);
    }

    const data: AnthropicResponse = await response.json();
    console.log('Anthropic API response:', JSON.stringify(data, null, 2));
    
    // Convert Anthropic response to standard format
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      throw new Error('Invalid response from Anthropic: No content returned');
    }
    
    return {
      choices: [{
        message: {
          role: "assistant",
          content: data.content[0]?.text || "No response content"
        },
        index: 0,
        finish_reason: data.stop_reason || "unknown"
      }],
      model: data.model || 'unknown'
    };
  } catch (error: any) {
    console.error("Error querying Anthropic:", error.message);
    throw new Error(`Failed to query Anthropic: ${error.message}`);
  }
};

// Main function to query AI based on provider
export const queryAI = async (
  provider: string,
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<StandardAIResponse> => {
  // Normalize provider name to handle case variations
  const normalizedProvider = provider.toLowerCase();
  
  switch (normalizedProvider) {
    case "openai":
    case "openrouter":
      return queryOpenRouter(apiKey, modelId, messages, systemPrompt);
    case "google":
      return queryGoogleAI(apiKey, modelId, messages, systemPrompt);
    case "anthropic":
      return queryAnthropic(apiKey, modelId, messages, systemPrompt);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
};