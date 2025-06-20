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

    // Format the model name according to OpenRouter standards
    // If the model doesn't include a slash, assume it's already correct
    // Otherwise, make sure it matches the OpenRouter format
    const formattedModel = modelId.includes('/') ? modelId : `google/${modelId}`;
    console.log(`Using OpenRouter with model: ${formattedModel}`);
    
    const requestBody = {
      model: formattedModel || "google/gemini-flash-1.5-8b-exp",
      messages: modifiedMessages,
      temperature: 0.7,
      max_tokens: 1000
    };

    console.log("OpenRouter request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "AccFirm"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
    }

    const data: OpenRouterResponse = await response.json();
    
    console.log("OpenRouter response data:", JSON.stringify(data));
    
    // Check if the response has the expected structure
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error("Invalid response format from OpenRouter:", data);
      throw new Error("Invalid response format from OpenRouter API");
    }
    
    // Ensure the response has the required fields
    const choices = data.choices.map(choice => {
      // Make sure each choice has a message with content
      if (!choice.message || !choice.message.content) {
        console.warn("Choice missing message or content:", choice);
        return {
          ...choice,
          message: {
            role: "assistant",
            content: "I apologize, but I couldn't generate a proper response."
          }
        };
      }
      return choice;
    });
    
    // Return in standardized format
    return {
      choices: choices,
      model: data.model || formattedModel
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
    
    // Convert Google AI response to standard format
    return {
      choices: data.candidates.map(candidate => ({
        message: {
          role: "assistant",
          content: candidate.content.parts[0].text
        },
        index: candidate.index,
        finish_reason: candidate.finishReason
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
    
    // Convert Anthropic response to standard format
    return {
      choices: [{
        message: {
          role: "assistant",
          content: data.content[0].text
        },
        index: 0,
        finish_reason: data.stop_reason
      }],
      model: data.model
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
  
  // Check if the API key suggests OpenRouter usage (based on the prefix)
  const isOpenRouterKey = apiKey.startsWith('sk-or-');
  
  // If API key is OpenRouter format or model contains a slash (provider/model format),
  // use OpenRouter regardless of the provider setting
  if (isOpenRouterKey || modelId.includes('/')) {
    console.log(`Detected OpenRouter usage: key=${isOpenRouterKey}, model=${modelId}`);
    return queryOpenRouter(apiKey, modelId, messages, systemPrompt);
  }
  
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