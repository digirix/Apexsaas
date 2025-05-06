/**
 * AI Client Factory
 * 
 * This module manages the creation of various AI provider clients
 * and handles the integration with different AI providers.
 */

import { OpenRouterClient } from './openrouter-client';
import { decrypt } from './encryption';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Base interface for all AI clients
export interface AIClient {
  testConnection(): Promise<{ success: boolean; message: string }>;
  getModels?(): Promise<any>;
  createChatCompletion(model: string, messages: any[], options?: any): Promise<any>;
  analyzeData?(model: string, data: any, query: string): Promise<string>;
}

/**
 * OpenAI Client implementation
 */
export class OpenAIClient implements AIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 1
      });
      return { success: true, message: "Successfully connected to OpenAI API" };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || "Failed to connect to OpenAI API" 
      };
    }
  }

  async getModels(): Promise<any> {
    const models = await this.client.models.list();
    return models;
  }

  async createChatCompletion(
    model: string, 
    messages: any[], 
    options: any = {}
  ): Promise<any> {
    // Extract just the model ID from provider/model format
    const modelId = model.includes('/') ? model.split('/')[1] : model;
    
    const response = await this.client.chat.completions.create({
      model: modelId,
      messages,
      ...options
    });
    
    return response;
  }

  async analyzeData(model: string, data: any, query: string): Promise<string> {
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
  }
}

/**
 * Anthropic Client implementation
 */
export class AnthropicClient implements AIClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Anthropic doesn't have a simple test endpoint, so we'll make a minimal request
      // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      await this.client.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1,
        messages: [{ role: "user", content: "test" }]
      });
      return { success: true, message: "Successfully connected to Anthropic API" };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || "Failed to connect to Anthropic API" 
      };
    }
  }

  async createChatCompletion(
    model: string, 
    messages: any[], 
    options: any = {}
  ): Promise<any> {
    // Extract just the model ID from provider/model format
    const modelId = model.includes('/') ? model.split('/')[1] : model;
    
    const response = await this.client.messages.create({
      model: modelId,
      messages,
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature || 0.7
    });
    
    // Safely extract the content
    let content = "";
    if (response.content && response.content.length > 0) {
      const contentBlock = response.content[0];
      if ('type' in contentBlock && contentBlock.type === 'text' && 'text' in contentBlock) {
        content = contentBlock.text;
      }
    }
    
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: content
          }
        }
      ]
    };
  }

  async analyzeData(model: string, data: any, query: string): Promise<string> {
    const systemPrompt = `You are an expert accounting and financial analysis AI assistant. 
    Analyze the provided accounting data and respond to the user's query with insights, patterns, and recommendations.
    Focus on accuracy, clarity, and actionable insights. Use accounting terminology appropriately.`;
    
    const userPrompt = `Here is the accounting data to analyze:
    ${JSON.stringify(data, null, 2)}
    
    My question/request is: ${query}`;
    
    const messages = [
      { role: "user", content: [
        {
          type: "text",
          text: `${systemPrompt}\n\n${userPrompt}`
        }
      ]}
    ];
    
    const completion = await this.createChatCompletion(model, messages);
    return completion.choices[0].message.content;
  }
}

/**
 * Google AI Client implementation
 */
export class GoogleAIClient implements AIClient {
  private client: GoogleGenerativeAI;
  private genModel: any;
  
  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }
  
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Use Gemini Pro model for connection test
      const genAI = this.client.getGenerativeModel({ model: "gemini-pro" });
      
      // Simple test prompt
      const result = await genAI.generateContent("Test connection");
      const response = await result.response;
      
      return { 
        success: true, 
        message: "Successfully connected to Google AI API" 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || "Failed to connect to Google AI API" 
      };
    }
  }
  
  async getModels(): Promise<any> {
    // Google AI doesn't have a models list endpoint
    // Return predefined list of supported models
    return {
      data: [
        { id: "gemini-pro", name: "Gemini Pro", provider: "google" },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google" },
        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google" }
      ]
    };
  }
  
  async createChatCompletion(
    model: string, 
    messages: any[], 
    options: any = {}
  ): Promise<any> {
    try {
      // Extract model ID from provider/model format if needed
      const modelId = model.includes('/') ? model.split('/')[1] : model;
      
      // Initialize the generative model
      const genAI = this.client.getGenerativeModel({ 
        model: modelId,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.max_tokens || 1000,
        }
      });
      
      // Format messages into a chat session
      const chat = genAI.startChat();
      
      // Process messages
      let lastMessage;
      for (const message of messages) {
        if (message.role === "system") {
          // System messages need to be handled specially in Google AI
          await chat.sendMessage("I'm going to give you special instructions. Respond with just 'I understand' and then follow these instructions for subsequent messages: " + message.content);
          await chat.sendMessage("Let's begin now.");
        } else if (message.role === "user") {
          lastMessage = message.content;
        }
      }
      
      // Send the last user message to get a response
      const result = lastMessage ? await chat.sendMessage(lastMessage) : await chat.sendMessage("Hello");
      const response = await result.response;
      const text = response.text();
      
      // Return in a format compatible with other AI clients
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: text
            }
          }
        ]
      };
    } catch (error) {
      console.error("Error in Google AI chat completion:", error);
      throw error;
    }
  }
  
  async analyzeData(model: string, data: any, query: string): Promise<string> {
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
  }
}

/**
 * DeepSeek AI Client implementation (direct API integration)
 */
export class DeepSeekAIClient implements AIClient {
  private apiKey: string;
  private baseUrl = "https://api.deepseek.com/v1";
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test with a minimal chat completion request
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }
      
      return { 
        success: true, 
        message: "Successfully connected to DeepSeek AI API" 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || "Failed to connect to DeepSeek AI API" 
      };
    }
  }
  
  async getModels(): Promise<any> {
    // DeepSeek doesn't have a comprehensive model list endpoint
    // Return predefined list of supported models
    return {
      data: [
        { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek" },
        { id: "deepseek-coder", name: "DeepSeek Coder", provider: "deepseek" }
      ]
    };
  }
  
  async createChatCompletion(
    model: string, 
    messages: any[], 
    options: any = {}
  ): Promise<any> {
    // Extract model ID from provider/model format if needed
    const modelId = model.includes('/') ? model.split('/')[1] : model;
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async analyzeData(model: string, data: any, query: string): Promise<string> {
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
  }
}

/**
 * Factory to create the appropriate AI client based on provider name
 */
export async function createAIClient(
  provider: string, 
  encryptedApiKey: string
): Promise<AIClient> {
  // Decrypt the API key
  const apiKey = await decrypt(encryptedApiKey);
  
  // Create the appropriate client based on provider
  switch(provider) {
    case 'openrouter':
      return new OpenRouterClient(encryptedApiKey); // OpenRouterClient handles decryption internally
    case 'openai':
      return new OpenAIClient(apiKey);
    case 'anthropic':
      return new AnthropicClient(apiKey);
    case 'google':
      return new GoogleAIClient(apiKey);
    case 'deepseek':
      return new DeepSeekAIClient(apiKey);
    // Add more providers as needed
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}