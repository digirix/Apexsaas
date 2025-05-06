import { ProviderConfig } from "@/types/setup";

export const AI_PROVIDERS: Record<string, ProviderConfig> = {
  openrouter: {
    name: "openrouter",
    displayName: "OpenRouter",
    description: "Access multiple AI models through a single API key",
    icon: "Router",
    apiKeyConfigured: false,
    apiKeyName: "API Key",
    apiKeyPlaceholder: "sk-or-...",
    apiKeyPrefix: "sk-or-",
    apiKeyMinLength: 20,
    models: [
      // These models are fetched dynamically from OpenRouter API
    ]
  },
  openai: {
    name: "openai",
    displayName: "OpenAI",
    description: "Direct integration with OpenAI's models",
    icon: "Bot",
    apiKeyConfigured: false,
    apiKeyName: "API Key",
    apiKeyPlaceholder: "sk-...",
    apiKeyPrefix: "sk-",
    apiKeyMinLength: 20,
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        provider: "openai",
        requiresApiKey: true,
        description: "OpenAI's most advanced multimodal model (May 2024)",
        contextWindow: 128000,
        supportsVision: true
      },
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        provider: "openai",
        requiresApiKey: true,
        description: "Fast and powerful GPT-4 model with 128K context",
        contextWindow: 128000,
        supportsVision: true
      },
      {
        id: "gpt-4",
        name: "GPT-4",
        provider: "openai",
        requiresApiKey: true,
        description: "High-capability GPT-4 model with 8K context",
        contextWindow: 8192,
        supportsVision: false
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai",
        requiresApiKey: true,
        description: "Fast, efficient model with 16K context",
        contextWindow: 16384,
        supportsVision: true
      }
    ]
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic",
    description: "Claude models from Anthropic",
    icon: "Waypoints",
    apiKeyConfigured: false,
    apiKeyName: "API Key",
    apiKeyPlaceholder: "sk-ant-...",
    apiKeyPrefix: "sk-ant-",
    apiKeyMinLength: 20,
    models: [
      {
        id: "claude-3-7-sonnet-20250219",
        name: "Claude 3.7 Sonnet",
        provider: "anthropic",
        requiresApiKey: true,
        description: "Anthropic's latest model with advanced reasoning",
        contextWindow: 200000,
        supportsVision: true
      },
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        provider: "anthropic",
        requiresApiKey: true,
        description: "Most powerful Claude model for complex tasks",
        contextWindow: 200000,
        supportsVision: true
      },
      {
        id: "claude-3-sonnet-20240229",
        name: "Claude 3 Sonnet",
        provider: "anthropic",
        requiresApiKey: true,
        description: "Balanced model for most use cases",
        contextWindow: 200000,
        supportsVision: true
      },
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        provider: "anthropic",
        requiresApiKey: true,
        description: "Fastest Claude model for quick responses",
        contextWindow: 200000,
        supportsVision: true
      }
    ]
  },
  google: {
    name: "google",
    displayName: "Google AI",
    description: "Gemini models from Google",
    icon: "CircleDashed",
    apiKeyConfigured: false,
    apiKeyName: "API Key",
    apiKeyPlaceholder: "...",
    apiKeyMinLength: 10,
    models: [
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        provider: "google",
        requiresApiKey: true,
        description: "Google's most advanced model with 1M context",
        contextWindow: 1000000,
        supportsVision: true
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        provider: "google",
        requiresApiKey: true,
        description: "Fast, efficient model for most use cases",
        contextWindow: 1000000,
        supportsVision: true
      },
      {
        id: "gemini-1.0-pro",
        name: "Gemini 1.0 Pro",
        provider: "google",
        requiresApiKey: true,
        description: "Previous generation Gemini model",
        contextWindow: 32768,
        supportsVision: true
      }
    ]
  },
  deepseek: {
    name: "deepseek",
    displayName: "DeepSeek",
    description: "DeepSeek's specialized AI models",
    icon: "Braces",
    apiKeyConfigured: false,
    apiKeyName: "API Key",
    apiKeyPlaceholder: "...",
    apiKeyMinLength: 10,
    models: [
      {
        id: "deepseek-coder",
        name: "DeepSeek Coder",
        provider: "deepseek",
        requiresApiKey: true,
        description: "Specialized for coding and technical tasks",
        contextWindow: 32768,
        supportsVision: false
      },
      {
        id: "deepseek-llm-67b",
        name: "DeepSeek LLM 67B",
        provider: "deepseek",
        requiresApiKey: true,
        description: "General purpose powerful LLM",
        contextWindow: 32768,
        supportsVision: false
      }
    ]
  }
};