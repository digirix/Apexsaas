// Shared types for setup module
export type SetupSection = 'countries' | 'currencies' | 'states' | 'entity-types' | 'task-statuses' | 'task-status-workflow' | 'task-categories' | 'service-types' | 'tax-jurisdictions' | 'payment-gateways' | 'designations' | 'departments' | 'ai-configuration';

// AI Configuration types
export interface AIConnectionTestResult {
  success: boolean;
  message: string;
}

export type AIProvider = 'openrouter' | 'openai' | 'anthropic' | 'google' | 'deepseek';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  requiresApiKey: boolean;
  description?: string;
  contextWindow?: number;
  supportsVision?: boolean;
}

export interface ProviderConfig {
  name: string;
  displayName: string;
  description: string;
  icon: string; // icon name from lucide-react
  apiKeyConfigured: boolean;
  apiKeyName: string; // what the API key is called (e.g. "API Key", "Secret Key")
  apiKeyPlaceholder: string; // placeholder for the API key input
  apiKeyPrefix?: string; // expected prefix for API key validation
  apiKeyMinLength: number;
  apiKeyTestEndpoint?: string;
  models: AIModel[];
}

export interface AIConfiguration {
  selectedProvider: AIProvider;
  providers: Record<AIProvider, ProviderConfig>;
  selectedModel?: string;
}