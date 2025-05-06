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
// import { GoogleGenerativeAI } from '@google/generative-ai'; - Not importing for now

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
    
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: response.content[0].text
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
    // Add more providers as needed
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}