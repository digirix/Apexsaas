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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Bot,
  Brain,
  Check,
  Cpu,
  Database,
  Info,
  Key,
  Loader2,
  Router,
  Settings,
  Waypoints,
  Braces,
  CircleDashed
} from "lucide-react";

const apiKeySchema = z.object({
  provider: z.string(),
  apiKey: z.string().min(10, { message: "API key must be at least 10 characters" }),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

const modelSelectionSchema = z.object({
  provider: z.string(),
  selectedModel: z.string().min(1, { message: "Please select a model" }),
});

type ModelSelectionFormValues = z.infer<typeof modelSelectionSchema>;

export function MultiProviderAIConfigurationManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<Record<string, AIConnectionTestResult | null>>({});
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openrouter');
  const [providersConfig, setProvidersConfig] = useState<Record<string, ProviderConfig>>(
    JSON.parse(JSON.stringify(AI_PROVIDERS))
  );
  
  // API key form
  const apiKeyForm = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      provider: selectedProvider,
      apiKey: "",
    },
  });
  
  // Model selection form
  const modelSelectionForm = useForm<ModelSelectionFormValues>({
    resolver: zodResolver(modelSelectionSchema),
    defaultValues: {
      provider: selectedProvider,
      selectedModel: "",
    },
  });
  
  // Fetch AI configuration
  const aiConfigQuery = useQuery({
    queryKey: ["/api/v1/setup/ai-configuration"],
    enabled: !!user,
  });
  
  // Update API key mutation
  const updateApiKeyMutation = useMutation({
    mutationFn: async (values: ApiKeyFormValues) => {
      const response = await fetch(`/api/v1/setup/ai-configuration/${values.provider}/api-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: values.apiKey }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to save ${values.provider} API key`);
      }
      
      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "API Key Saved",
        description: `Your ${variables.provider} API key has been saved successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/ai-configuration"] });
      
      // Reset form
      apiKeyForm.reset();
      
      // Update providers config
      setProvidersConfig(prev => ({
        ...prev,
        [variables.provider]: {
          ...prev[variables.provider],
          apiKeyConfigured: true,
        }
      }));
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while saving the API key",
        variant: "destructive",
      });
    },
  });
  
  // Test API key connection
  const testConnectionMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await fetch(`/api/v1/setup/ai-configuration/${provider}/test-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to test ${provider} connection`);
      }
      
      return { provider, result: await response.json() };
    },
    onSuccess: (data) => {
      const { provider, result } = data;
      
      setTestResults(prev => ({
        ...prev,
        [provider]: result
      }));
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${provider} API`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message || `Failed to connect to ${provider} API`,
          variant: "destructive",
        });
      }
    },
    onError: (error, provider) => {
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          success: false,
          message: error.message || "An error occurred",
        }
      }));
      
      toast({
        title: "Error",
        description: error.message || "An error occurred while testing the connection",
        variant: "destructive",
      });
    },
  });
  
  // Update selected model
  const updateModelMutation = useMutation({
    mutationFn: async (values: ModelSelectionFormValues) => {
      const response = await fetch(`/api/v1/setup/ai-configuration/${values.provider}/selected-model`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedModel: values.selectedModel }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update selected model");
      }
      
      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Model Updated",
        description: `Your preferred AI model for ${variables.provider} has been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/ai-configuration"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the model",
        variant: "destructive",
      });
    },
  });
  
  // Handle API key submission
  const onSubmitApiKey = (values: ApiKeyFormValues) => {
    updateApiKeyMutation.mutate(values);
  };
  
  // Handle model selection submission
  const onSubmitModelSelection = (values: ModelSelectionFormValues) => {
    updateModelMutation.mutate(values);
  };
  
  // Update forms when selected provider changes
  useEffect(() => {
    apiKeyForm.setValue("provider", selectedProvider);
    modelSelectionForm.setValue("provider", selectedProvider);
  }, [selectedProvider, apiKeyForm, modelSelectionForm]);
  
  // Update component state when API config data is loaded
  useEffect(() => {
    if (aiConfigQuery.data) {
      // Update provider configs
      if (aiConfigQuery.data.providers) {
        setProvidersConfig(prev => {
          const newConfig = { ...prev };
          Object.keys(aiConfigQuery.data.providers).forEach(provider => {
            if (newConfig[provider]) {
              newConfig[provider] = {
                ...newConfig[provider],
                ...aiConfigQuery.data.providers[provider]
              };
            }
          });
          return newConfig;
        });
      }
      
      // Update selected provider
      if (aiConfigQuery.data.selectedProvider) {
        setSelectedProvider(aiConfigQuery.data.selectedProvider);
      }
      
      // Update model selection form
      if (aiConfigQuery.data.selectedModel) {
        modelSelectionForm.setValue("selectedModel", aiConfigQuery.data.selectedModel);
      }
    }
  }, [aiConfigQuery.data, modelSelectionForm]);
  
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      "Router": <Router className="h-5 w-5" />,
      "Bot": <Bot className="h-5 w-5" />,
      "Waypoints": <Waypoints className="h-5 w-5" />,
      "CircleDashed": <CircleDashed className="h-5 w-5" />,
      "Braces": <Braces className="h-5 w-5" />,
      "Cpu": <Cpu className="h-5 w-5" />,
      "Brain": <Brain className="h-5 w-5" />
    };
    
    return icons[iconName] || <Settings className="h-5 w-5" />;
  };
  
  const currentProvider = providersConfig[selectedProvider];
  const isApiKeyConfigured = currentProvider?.apiKeyConfigured;
  const testResult = testResults[selectedProvider];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Configuration</h2>
          <p className="text-muted-foreground">
            Configure AI integration for enhanced accounting assistance
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">
            <Key className="h-4 w-4 mr-2" />
            AI Providers
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="models">
            <Cpu className="h-4 w-4 mr-2" />
            Models
          </TabsTrigger>
          <TabsTrigger value="features">
            <Brain className="h-4 w-4 mr-2" />
            AI Features
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(providersConfig).map((provider) => (
              <Card 
                key={provider.name} 
                className={`cursor-pointer transition-all ${selectedProvider === provider.name ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                onClick={() => setSelectedProvider(provider.name as AIProvider)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-md bg-primary/10 text-primary">
                        {getIconComponent(provider.icon)}
                      </div>
                      <CardTitle className="text-lg">{provider.displayName}</CardTitle>
                    </div>
                    {provider.apiKeyConfigured && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" /> Configured
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-2">{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {provider.apiKeyConfigured ? (
                      <p>API key configured. {provider.models.length > 0 && `${provider.models.length} models available.`}</p>
                    ) : (
                      <p>API key not configured. Set up to enable {provider.displayName} AI features.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {currentProvider && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    {getIconComponent(currentProvider.icon)}
                  </div>
                  <div>
                    <CardTitle>{currentProvider.displayName} Configuration</CardTitle>
                    <CardDescription>
                      Configure your {currentProvider.displayName} integration
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {aiConfigQuery.isLoading ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2">Loading configuration...</span>
                  </div>
                ) : (
                  <>
                    {isApiKeyConfigured ? (
                      <div className="space-y-4">
                        <Alert variant={testResult?.success ? "default" : "destructive"}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>API Key Status</AlertTitle>
                          <AlertDescription>
                            {testResult?.success
                              ? `${currentProvider.displayName} API key is configured and working correctly.`
                              : testResult?.message || `${currentProvider.displayName} API key is configured but not tested.`}
                          </AlertDescription>
                        </Alert>
                        
                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => testConnectionMutation.mutate(currentProvider.name)}
                            disabled={testConnectionMutation.isPending}
                          >
                            {testConnectionMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              "Test Connection"
                            )}
                          </Button>
                          
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => apiKeyForm.reset({ provider: currentProvider.name, apiKey: "" })}
                            className="border-red-200 text-red-700 hover:bg-red-50"
                          >
                            Update API Key
                          </Button>
                        </div>
                        
                        {currentProvider.name === 'openrouter' && (
                          <Alert variant="info" className="bg-blue-50 text-blue-700 border-blue-200 mt-4">
                            <Info className="h-4 w-4" />
                            <AlertTitle>OpenRouter Models</AlertTitle>
                            <AlertDescription>
                              OpenRouter gives you access to models from OpenAI, Anthropic, Google, and more through a single API key.
                              <a 
                                href="https://openrouter.ai/keys" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block mt-2 underline"
                              >
                                Get your API key from OpenRouter.ai
                              </a>
                            </AlertDescription>
                          </Alert>
                        )}
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
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            disabled={updateApiKeyMutation.isPending || !apiKeyForm.formState.isValid} 
                            className="w-full md:w-auto"
                          >
                            {updateApiKeyMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save API Key"
                            )}
                          </Button>
                        </form>
                      </Form>
                    )}
                  </>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col items-start border-t bg-slate-50 p-4">
                <h4 className="font-medium text-sm mb-1">About {currentProvider.displayName}</h4>
                <p className="text-sm text-muted-foreground">
                  {currentProvider.name === 'openrouter' && (
                    "OpenRouter provides API access to multiple LLM models from different providers. You pay only for the API calls you make."
                  )}
                  {currentProvider.name === 'openai' && (
                    "OpenAI offers advanced language models like GPT-4 and GPT-3.5 Turbo with various capabilities."
                  )}
                  {currentProvider.name === 'anthropic' && (
                    "Anthropic's Claude models excel at helpful, harmless, and honest AI interactions."
                  )}
                  {currentProvider.name === 'google' && (
                    "Google's Gemini models offer cutting-edge AI capabilities with extensive context windows."
                  )}
                  {currentProvider.name === 'deepseek' && (
                    "DeepSeek provides specialized AI models for coding and technical tasks."
                  )}
                </p>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Key Management</CardTitle>
              <CardDescription>
                Manage API keys for all AI providers in one place
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {aiConfigQuery.isLoading ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2">Loading configuration...</span>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.values(providersConfig).map((provider) => (
                      <div key={provider.name} className="border rounded-md p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 rounded-md bg-primary/10 text-primary">
                              {getIconComponent(provider.icon)}
                            </div>
                            <div>
                              <h3 className="text-lg font-medium">{provider.displayName}</h3>
                              <p className="text-sm text-muted-foreground">{provider.apiKeyConfigured ? "API key configured" : "API key not configured"}</p>
                            </div>
                          </div>
                          {provider.apiKeyConfigured && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Check className="h-3 w-3 mr-1" /> Configured
                            </Badge>
                          )}
                        </div>
                        
                        {provider.apiKeyConfigured ? (
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <div className="flex-grow">
                                <Input
                                  type="password"
                                  value="••••••••••••••••••••••••••••••"
                                  disabled
                                  className="font-mono bg-gray-50"
                                />
                              </div>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => testConnectionMutation.mutate(provider.name)}
                                disabled={testConnectionMutation.isPending}
                                className="whitespace-nowrap"
                              >
                                {testConnectionMutation.isPending && testConnectionMutation.variables === provider.name ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Testing...
                                  </>
                                ) : (
                                  "Test Connection"
                                )}
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => apiKeyForm.reset({ provider: provider.name, apiKey: "" })}
                                className="border-red-200 text-red-700 hover:bg-red-50 whitespace-nowrap"
                              >
                                Update Key
                              </Button>
                            </div>
                            
                            {testResults[provider.name] && (
                              <Alert 
                                variant={testResults[provider.name]?.success ? "default" : "destructive"}
                                className={testResults[provider.name]?.success ? "bg-green-50 border-green-200" : ""}
                              >
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Connection Test</AlertTitle>
                                <AlertDescription>
                                  {testResults[provider.name]?.message}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        ) : (
                          <Form {...apiKeyForm}>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              apiKeyForm.setValue("provider", provider.name);
                              apiKeyForm.handleSubmit(onSubmitApiKey)(e);
                            }} className="space-y-4">
                              <FormField
                                control={apiKeyForm.control}
                                name="apiKey"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{provider.apiKeyName}</FormLabel>
                                    <div className="flex space-x-2">
                                      <FormControl>
                                        <Input
                                          placeholder={provider.apiKeyPlaceholder}
                                          type="password"
                                          {...field}
                                          className="font-mono"
                                        />
                                      </FormControl>
                                      <Button 
                                        type="submit" 
                                        disabled={updateApiKeyMutation.isPending || !field.value || field.value.length < 10} 
                                      >
                                        {updateApiKeyMutation.isPending && apiKeyForm.getValues("provider") === provider.name ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          "Save Key"
                                        )}
                                      </Button>
                                    </div>
                                    <FormDescription>
                                      {provider.name === 'openrouter' && (
                                        <a 
                                          href="https://openrouter.ai/keys" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          Get your API key from OpenRouter.ai
                                        </a>
                                      )}
                                      {provider.name === 'openai' && (
                                        <a 
                                          href="https://platform.openai.com/api-keys" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          Get your API key from OpenAI
                                        </a>
                                      )}
                                      {provider.name === 'anthropic' && (
                                        <a 
                                          href="https://console.anthropic.com/settings/keys" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          Get your API key from Anthropic
                                        </a>
                                      )}
                                      {provider.name === 'google' && (
                                        <a 
                                          href="https://makersuite.google.com/app/apikey" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          Get your API key from Google AI Studio
                                        </a>
                                      )}
                                      {provider.name === 'deepseek' && (
                                        <a 
                                          href="https://platform.deepseek.com/" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          Get your API key from DeepSeek Platform
                                        </a>
                                      )}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </form>
                          </Form>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Selection</CardTitle>
              <CardDescription>
                Choose the AI model you want to use for your accounting assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!Object.values(providersConfig).some(p => p.apiKeyConfigured) ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No API Keys Configured</AlertTitle>
                  <AlertDescription>
                    Please configure at least one AI provider API key before selecting a model.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {Object.values(providersConfig)
                    .filter(provider => provider.apiKeyConfigured)
                    .map((provider) => (
                      <div key={provider.name} className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 rounded-md bg-primary/10 text-primary">
                            {getIconComponent(provider.icon)}
                          </div>
                          <h3 className="text-lg font-medium">{provider.displayName} Models</h3>
                        </div>
                        
                        <div className="pl-10">
                          <Form {...modelSelectionForm}>
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                modelSelectionForm.setValue("provider", provider.name);
                                modelSelectionForm.handleSubmit(onSubmitModelSelection)(e);
                              }} 
                              className="space-y-4"
                            >
                              <FormField
                                control={modelSelectionForm.control}
                                name="selectedModel"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Select Model</FormLabel>
                                    <Select
                                      onValueChange={(value) => {
                                        field.onChange(value);
                                        modelSelectionForm.setValue("provider", provider.name);
                                      }}
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Select a model" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {provider.models.map((model) => (
                                          <SelectItem key={`${provider.name}-${model.id}`} value={`${provider.name}/${model.id}`}>
                                            {model.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      Choose the model that will power AI features in the application.
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
                                    !modelSelectionForm.formState.isDirty ||
                                    !modelSelectionForm.getValues("selectedModel").startsWith(provider.name)
                                  }
                                >
                                  {updateModelMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    "Save Model Preference"
                                  )}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </div>
                        
                        <Separator className="my-2" />
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Features</CardTitle>
              <CardDescription>
                AI capabilities available throughout the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="mt-0.5 bg-slate-100 p-2 rounded-lg">
                    <svg className="h-6 w-6 text-slate-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 19v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 10V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0zM15 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 10v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">AI Chatbot Assistant</h3>
                    <p className="text-sm text-muted-foreground">
                      Get instant help and guidance with accounting tasks, system features, and best practices.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="mt-0.5 bg-slate-100 p-2 rounded-lg">
                    <svg className="h-6 w-6 text-slate-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 11.5v4.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 6V14H14V6H22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 6L18 10L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">AI Financial Reporting</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate customized financial reports with AI-powered insights and trend analysis.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="mt-0.5 bg-slate-100 p-2 rounded-lg">
                    <svg className="h-6 w-6 text-slate-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Enhanced Data Security</h3>
                    <p className="text-sm text-muted-foreground">
                      All API keys are securely encrypted before storage, and data is processed securely.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Note:</span> AI features require a configured provider and selected model to function.
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}