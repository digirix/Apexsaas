import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AIConnectionTestResult, AIProvider, ProviderConfig } from "@/types/setup";
import { AI_PROVIDERS } from "@/lib/ai-providers";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  Bot,
  Brain,
  Check,
  Cpu,
  Info,
  Key,
  Loader2,
  Router,
  Waypoints,
  Braces,
  CircleDashed,
  Trash2,
  Shield,
  ArrowRight
} from "lucide-react";

// Zod schemas for form validation
const providerSelectionSchema = z.object({
  provider: z.string()
});

const apiKeySchema = z.object({
  apiKey: z.string().min(10, { message: "API key must be at least 10 characters" })
});

const modelSelectionSchema = z.object({
  selectedModel: z.string()
});

// Form value types
type ProviderSelectionFormValues = z.infer<typeof providerSelectionSchema>;
type ApiKeyFormValues = z.infer<typeof apiKeySchema>;
type ModelSelectionFormValues = z.infer<typeof modelSelectionSchema>;

// AI Model type
type AIModel = {
  id: string;
  name: string;
  provider: string;
  description?: string;
};

// Helper function to get the icon component for a provider
function getIconComponent(iconName: string) {
  switch (iconName) {
    case "Router":
      return <Router className="h-5 w-5" />;
    case "Bot":
      return <Bot className="h-5 w-5" />;
    case "Waypoints":
      return <Waypoints className="h-5 w-5" />;
    case "CircleDashed":
      return <CircleDashed className="h-5 w-5" />;
    case "Braces":
      return <Braces className="h-5 w-5" />;
    default:
      return <Bot className="h-5 w-5" />;
  }
}

export function UnifiedAIConfiguration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Setup state
  // Wizard step tracking
  const [currentStep, setCurrentStep] = useState<'provider' | 'apikey' | 'models' | 'complete'>('provider');
  
  // Provider selection and configuration
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("openrouter");
  const providersConfig = { ...AI_PROVIDERS };
  
  // Models state
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [modelSource, setModelSource] = useState<'api' | 'predefined' | 'empty'>('predefined');
  
  // API connection state
  const [testResult, setTestResult] = useState<AIConnectionTestResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  
  // API key deletion
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<AIProvider | null>(null);
  
  // Current provider details
  const currentProvider = providersConfig[selectedProvider];
  
  // Setup forms
  // 1. Provider selection form
  const providerForm = useForm<ProviderSelectionFormValues>({
    resolver: zodResolver(providerSelectionSchema),
    defaultValues: {
      provider: selectedProvider,
    }
  });
  
  // 2. API key form
  const apiKeyForm = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      apiKey: "",
    }
  });
  
  // 3. Model selection form
  const modelSelectionForm = useForm<ModelSelectionFormValues>({
    resolver: zodResolver(modelSelectionSchema),
    defaultValues: {
      selectedModel: "",
    }
  });
  
  // Reset API key form when provider changes
  useEffect(() => {
    apiKeyForm.reset({
      apiKey: ""
    });
    setTestResult(null);
  }, [selectedProvider, apiKeyForm]);
  
  // Fetch AI configuration
  const aiConfigQuery = useQuery({
    queryKey: ["/api/v1/setup/ai-configuration"],
    enabled: !!user,
  });
  
  // Update provider state from query data
  useEffect(() => {
    if (aiConfigQuery.data) {
      const config = aiConfigQuery.data as any;
      
      // Set selected provider
      if (config.selectedProvider) {
        setSelectedProvider(config.selectedProvider as AIProvider);
        providerForm.setValue("provider", config.selectedProvider);
      }
      
      // Update API key configured status for providers
      if (config.providers) {
        for (const [provider, details] of Object.entries(config.providers)) {
          if (providersConfig[provider]) {
            providersConfig[provider].apiKeyConfigured = (details as any).apiKeyConfigured;
          }
        }
      }
      
      // Set selected model if available
      if (config.selectedModel) {
        modelSelectionForm.setValue("selectedModel", config.selectedModel);
        
        // If we have a selected provider and model with a configured API key,
        // we can start at the completed state
        if (config.selectedProvider && providersConfig[config.selectedProvider]?.apiKeyConfigured) {
          setCurrentStep('complete');
        }
      }
    }
  }, [aiConfigQuery.data, providerForm, modelSelectionForm]);
  
  // Mutation to update provider API key
  const updateApiKeyMutation = useMutation({
    mutationFn: async (values: ApiKeyFormValues) => {
      const response = await fetch(`/api/v1/setup/ai-configuration/${selectedProvider}/api-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ apiKey: values.apiKey }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save API key");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "API Key Saved",
        description: "Your API key has been securely saved",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/ai-configuration"] });
      
      // Test the connection automatically after saving the API key
      testConnection();
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving API Key",
        description: error.message || "Failed to save API key",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete provider API key
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (provider: AIProvider) => {
      const response = await fetch(`/api/v1/setup/ai-configuration/${provider}/api-key`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete API key");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "API Key Deleted",
        description: "Your API key has been removed",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/ai-configuration"] });
      setProviderToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting API Key",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update model selection
  const updateModelMutation = useMutation({
    mutationFn: async (values: ModelSelectionFormValues) => {
      const response = await fetch(`/api/v1/setup/ai-configuration/${selectedProvider}/selected-model`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ selectedModel: values.selectedModel }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save model preference");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Model Preference Saved",
        description: "Your selected AI model has been saved",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/ai-configuration"] });
      
      // Move to the completed step
      setCurrentStep('complete');
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Model Preference",
        description: error.message || "Failed to save model preference",
        variant: "destructive",
      });
    },
  });
  
  // Test the API connection
  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    
    try {
      // Fix API call to use fetch directly with full URL
      const response = await fetch(`/api/v1/setup/ai-configuration/${selectedProvider}/test-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Connection test failed");
      }
      
      const result = await response.json();
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: result.message,
          variant: "default",
        });
        
        // Fetch available models automatically after successful connection
        fetchAvailableModels();
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
      
      setTestResult({
        success: false,
        message: error.message || "Failed to test connection"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  // Fetch available models for the selected provider
  const fetchAvailableModels = async () => {
    setIsFetchingModels(true);
    
    try {
      interface ModelsResponse {
        models: AIModel[];
        source: 'api' | 'predefined' | 'empty';
      }
      
      // Fix API call to use fetch directly
      const response = await fetch(`/api/v1/setup/ai-models/${selectedProvider}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch models");
      }
      
      const result: ModelsResponse = await response.json();
      
      setAvailableModels(result.models || []);
      setModelSource(result.source || 'predefined');
      
      // If we got models, move to the model selection step
      if (result.models && result.models.length > 0) {
        setCurrentStep('models');
        
        // Pre-select the first model if none selected
        if (!modelSelectionForm.getValues("selectedModel")) {
          modelSelectionForm.setValue("selectedModel", result.models[0].id);
        }
      } else {
        toast({
          title: "No Models Available",
          description: "Could not find available models for this provider",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error Fetching Models",
        description: error.message || "Failed to fetch available models",
        variant: "destructive",
      });
    } finally {
      setIsFetchingModels(false);
    }
  };
  
  // Handle API key form submission
  const onSubmitApiKey = (values: ApiKeyFormValues) => {
    updateApiKeyMutation.mutate(values);
  };
  
  // Handle provider form submission
  const onSubmitProvider = (values: ProviderSelectionFormValues) => {
    setSelectedProvider(values.provider as AIProvider);
    setCurrentStep('apikey');
  };
  
  // Handle model selection form submission
  const onSubmitModelSelection = (values: ModelSelectionFormValues) => {
    updateModelMutation.mutate(values);
  };
  
  // Handle API key deletion
  const handleDeleteApiKey = (provider: AIProvider) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  };
  
  // Confirm API key deletion
  const confirmDeleteApiKey = () => {
    if (providerToDelete) {
      deleteApiKeyMutation.mutate(providerToDelete);
      setDeleteDialogOpen(false);
    }
  };
  
  // Get status badge for provider
  const getProviderStatusBadge = (provider: ProviderConfig) => {
    if (provider.apiKeyConfigured) {
      if (selectedProvider === provider.name && aiConfigQuery.data?.selectedModel?.startsWith(provider.name)) {
        return (
          <Badge variant="default" className="ml-auto">
            <Check className="h-3.5 w-3.5 mr-1" />
            Active
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="ml-auto bg-green-50">
          <Check className="h-3.5 w-3.5 mr-1 text-green-600" />
          Configured
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="ml-auto">
        Not Configured
      </Badge>
    );
  };
  
  return (
    <>
      {/* Delete API Key Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the API key for {providerToDelete ? providersConfig[providerToDelete]?.displayName : "this provider"}?
              This will disable AI features that rely on this provider.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteApiKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>AI Configuration</CardTitle>
                <CardDescription>
                  Connect to your preferred AI provider and select models
                </CardDescription>
              </div>
              {currentStep === 'complete' && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Active: {providersConfig[selectedProvider]?.displayName}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {aiConfigQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div>
                {/* Step indicators */}
                <div className="flex items-center mb-8">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'provider' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    1
                  </div>
                  <div className="flex-1 h-0.5 mx-2 bg-muted"></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'apikey' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    2
                  </div>
                  <div className="flex-1 h-0.5 mx-2 bg-muted"></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'models' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    3
                  </div>
                  <div className="flex-1 h-0.5 mx-2 bg-muted"></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'complete' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Check className="h-4 w-4" />
                  </div>
                </div>
                
                {/* Step content */}
                <div className="mt-6">
                  {/* Step 1: Select Provider */}
                  {currentStep === 'provider' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Select AI Provider</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Choose which AI provider you want to use for your accounting assistant
                      </p>
                      
                      <Form {...providerForm}>
                        <form onSubmit={providerForm.handleSubmit(onSubmitProvider)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.values(providersConfig).map((provider) => (
                              <div 
                                key={provider.name}
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                  providerForm.watch("provider") === provider.name 
                                    ? 'ring-2 ring-primary border-primary' 
                                    : 'hover:border-primary/20'
                                }`}
                                onClick={() => {
                                  providerForm.setValue("provider", provider.name);
                                }}
                              >
                                <div className="flex items-start">
                                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                                    {getIconComponent(provider.icon)}
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <h4 className="font-medium">{provider.displayName}</h4>
                                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                                    {getProviderStatusBadge(provider)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-end">
                            <Button 
                              type="submit"
                              disabled={!providerForm.formState.isDirty}
                            >
                              Continue
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  )}
                  
                  {/* Step 2: Configure API Key */}
                  {currentStep === 'apikey' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">Configure {currentProvider.displayName} API Key</h3>
                          <p className="text-sm text-muted-foreground">
                            Provide your API key to connect to {currentProvider.displayName}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setCurrentStep('provider')}
                        >
                          Back
                        </Button>
                      </div>
                      
                      {currentProvider.apiKeyConfigured ? (
                        <div className="space-y-4">
                          <Alert className="bg-green-50 border-green-200">
                            <Check className="h-4 w-4 text-green-600" />
                            <AlertTitle>API Key Configured</AlertTitle>
                            <AlertDescription>
                              Your {currentProvider.displayName} API key is already configured.
                              
                              <div className="flex space-x-4 mt-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setCurrentStep('models')}
                                >
                                  Proceed to Model Selection
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteApiKey(selectedProvider as AIProvider)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete API Key
                                </Button>
                              </div>
                            </AlertDescription>
                          </Alert>
                          
                          <div className="pt-4">
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertTitle>Need to update your API key?</AlertTitle>
                              <AlertDescription>
                                If you need to update your API key, first delete the existing key and then add a new one.
                              </AlertDescription>
                            </Alert>
                          </div>
                        </div>
                      ) : (
                        <Form {...apiKeyForm}>
                          <form onSubmit={apiKeyForm.handleSubmit(onSubmitApiKey)} className="space-y-4">
                            <FormField
                              control={apiKeyForm.control}
                              name="apiKey"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{currentProvider.apiKeyName}</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder={currentProvider.apiKeyPlaceholder}
                                      type="password"
                                      {...field}
                                      className="font-mono"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Your API key will be securely encrypted before storage.
                                    {currentProvider.name === 'openrouter' && (
                                      <a 
                                        href="https://openrouter.ai/keys" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block mt-2 text-blue-600 hover:underline"
                                      >
                                        Get your API key from OpenRouter.ai
                                      </a>
                                    )}
                                    {currentProvider.name === 'openai' && (
                                      <a 
                                        href="https://platform.openai.com/api-keys" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block mt-2 text-blue-600 hover:underline"
                                      >
                                        Get your API key from OpenAI
                                      </a>
                                    )}
                                    {currentProvider.name === 'anthropic' && (
                                      <a 
                                        href="https://console.anthropic.com/settings/keys" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block mt-2 text-blue-600 hover:underline"
                                      >
                                        Get your API key from Anthropic
                                      </a>
                                    )}
                                    {currentProvider.name === 'google' && (
                                      <a 
                                        href="https://makersuite.google.com/app/apikey" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block mt-2 text-blue-600 hover:underline"
                                      >
                                        Get your API key from Google AI Studio
                                      </a>
                                    )}
                                    {currentProvider.name === 'deepseek' && (
                                      <a 
                                        href="https://platform.deepseek.com/" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block mt-2 text-blue-600 hover:underline"
                                      >
                                        Get your API key from DeepSeek Platform
                                      </a>
                                    )}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex justify-end space-x-4">
                              <Button
                                type="submit"
                                disabled={
                                  updateApiKeyMutation.isPending ||
                                  !apiKeyForm.formState.isValid
                                }
                              >
                                {updateApiKeyMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    Save API Key
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      )}
                      
                      {/* Connection test result */}
                      {testResult && (
                        <Alert className={testResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                          {testResult.success ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                          <AlertTitle>{testResult.success ? "Connection Successful" : "Connection Failed"}</AlertTitle>
                          <AlertDescription>{testResult.message}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                  
                  {/* Step 3: Select Model */}
                  {currentStep === 'models' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">Select AI Model</h3>
                          <p className="text-sm text-muted-foreground">
                            Choose the AI model that will power your accounting assistant
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setCurrentStep('apikey')}
                        >
                          Back
                        </Button>
                      </div>
                      
                      {isFetchingModels ? (
                        <div className="flex justify-center py-4">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                            <p className="mt-2 text-sm text-muted-foreground">Fetching available models...</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {availableModels.length > 0 ? (
                            <Form {...modelSelectionForm}>
                              <form onSubmit={modelSelectionForm.handleSubmit(onSubmitModelSelection)} className="space-y-4">
                                <FormField
                                  control={modelSelectionForm.control}
                                  name="selectedModel"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>AI Model</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a model" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {availableModels.map((model) => (
                                            <SelectItem key={model.id} value={model.id}>
                                              {model.name} 
                                              {model.provider && model.provider !== selectedProvider && ` (via ${model.provider})`}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormDescription>
                                        {modelSource === 'predefined' && (
                                          <Alert variant="outline" className="mt-2">
                                            <Info className="h-4 w-4" />
                                            <AlertTitle>Using predefined models</AlertTitle>
                                            <AlertDescription>
                                              We couldn't retrieve models from the API, so we're showing a predefined list. 
                                              Your selection will still work with the API.
                                            </AlertDescription>
                                          </Alert>
                                        )}
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <div className="flex justify-end">
                                  <Button
                                    type="submit"
                                    disabled={
                                      updateModelMutation.isPending ||
                                      !modelSelectionForm.formState.isValid ||
                                      !modelSelectionForm.getValues("selectedModel")
                                    }
                                  >
                                    {updateModelMutation.isPending ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      "Complete Setup"
                                    )}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          ) : (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>No Models Available</AlertTitle>
                              <AlertDescription>
                                We couldn't find any models for this provider. Please check your API key or try a different provider.
                                <div className="mt-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={fetchAvailableModels}
                                  >
                                    Retry
                                  </Button>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Step 4: Complete */}
                  {currentStep === 'complete' && (
                    <div className="space-y-4">
                      <Alert className="bg-green-50 border-green-200">
                        <Check className="h-4 w-4 text-green-600" />
                        <AlertTitle>AI Configuration Complete</AlertTitle>
                        <AlertDescription>
                          Your AI integration is configured and ready to use.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="rounded-lg border p-4 mt-4">
                        <h4 className="font-medium mb-2">Current Configuration</h4>
                        <dl className="space-y-2">
                          <div className="grid grid-cols-3 gap-1">
                            <dt className="text-sm font-medium text-muted-foreground">Provider:</dt>
                            <dd className="text-sm col-span-2">{providersConfig[selectedProvider]?.displayName}</dd>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <dt className="text-sm font-medium text-muted-foreground">API Key:</dt>
                            <dd className="text-sm col-span-2">
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                <Shield className="h-3.5 w-3.5 mr-1" />
                                Configured
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteApiKey(selectedProvider as AIProvider)}
                                className="ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Delete
                              </Button>
                            </dd>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <dt className="text-sm font-medium text-muted-foreground">Selected Model:</dt>
                            <dd className="text-sm col-span-2">{
                              modelSelectionForm.getValues("selectedModel")?.split('/')?.pop() || 
                              aiConfigQuery.data?.selectedModel?.split('/')?.pop() || 
                              "None selected"
                            }</dd>
                          </div>
                        </dl>
                        
                        <div className="flex space-x-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setCurrentStep('provider')}
                          >
                            Change Provider
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setCurrentStep('models');
                              fetchAvailableModels();
                            }}
                          >
                            Change Model
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={testConnection}
                          >
                            {isTestingConnection ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                Test Connection
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Connection test result */}
                      {testResult && (
                        <Alert className={testResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                          {testResult.success ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                          <AlertTitle>{testResult.success ? "Connection Successful" : "Connection Failed"}</AlertTitle>
                          <AlertDescription>{testResult.message}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="mt-6">
                        <h4 className="font-medium mb-2">AI Features</h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="rounded-lg border p-4 hover:border-primary/50 hover:bg-primary/5 transition-all">
                            <div className="flex items-start">
                              <div className="p-2 rounded-md bg-primary/10 text-primary">
                                <Bot className="h-5 w-5" />
                              </div>
                              <div className="ml-3">
                                <h5 className="font-medium">AI Chat Assistant</h5>
                                <p className="text-sm text-muted-foreground">
                                  Get help with accounting tasks, answer questions, and more
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="rounded-lg border p-4 hover:border-primary/50 hover:bg-primary/5 transition-all">
                            <div className="flex items-start">
                              <div className="p-2 rounded-md bg-primary/10 text-primary">
                                <Brain className="h-5 w-5" />
                              </div>
                              <div className="ml-3">
                                <h5 className="font-medium">Financial Analysis</h5>
                                <p className="text-sm text-muted-foreground">
                                  Get insights and analysis of your financial data
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}