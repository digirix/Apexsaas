// Shared types for setup module
export type SetupSection = 'countries' | 'currencies' | 'states' | 'entity-types' | 'task-statuses' | 'task-status-workflow' | 'task-categories' | 'service-types' | 'tax-jurisdictions' | 'payment-gateways' | 'designations' | 'departments' | 'ai-configuration';

// AI Configuration types
export interface AIConnectionTestResult {
  success: boolean;
  message: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

export interface AIConfiguration {
  apiKeyConfigured: boolean;
  selectedModel?: string;
  availableModels?: AIModel[];
  lastTestResult?: AIConnectionTestResult;
}