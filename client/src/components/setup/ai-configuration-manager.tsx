import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { AIConnectionTestResult, AIModel } from "@/types/setup";

// Form schema for API key
const apiKeySchema = z.object({
  apiKey: z
    .string()
    .min(10, { message: "API key must be at least 10 characters" })
    .regex(/^sk-/, { message: "OpenRouter API keys typically start with 'sk-'" }),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

// Form schema for model selection
const modelSelectionSchema = z.object({
  selectedModel: z.string().min(1, { message: "Please select a model" }),
});

type ModelSelectionFormValues = z.infer<typeof modelSelectionSchema>;

export function AIConfigurationManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<AIConnectionTestResult | null>(null);
  
  // API key form
  const apiKeyForm = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      apiKey: "",
    },
  });
  
  // Model selection form
  const modelSelectionForm = useForm<ModelSelectionFormValues>({
    resolver: zodResolver(modelSelectionSchema),
    defaultValues: {
      selectedModel: "",
    },
  });
  
  // Fetch AI configuration
  const aiConfigQuery = useQuery({
    queryKey: ["/api/v1/setup/ai-configuration"],
    enabled: !!user,
  });
  
  // Fetch available models if API key is configured
  const modelsQuery = useQuery({
    queryKey: ["/api/v1/setup/ai-models"],
    enabled: !!aiConfigQuery.data?.apiKeyConfigured,
  });
  
  // Update API key mutation
  const updateApiKeyMutation = useMutation({
    mutationFn: async (values: ApiKeyFormValues) => {
      const response = await fetch("/api/v1/setup/ai-configuration/api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save API key");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "API Key Saved",
        description: "Your OpenRouter API key has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/ai-configuration"] });
      // Reset form
      apiKeyForm.reset();
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
    mutationFn: async () => {
      const response = await fetch("/api/v1/setup/ai-configuration/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to test connection");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to OpenRouter API",
        });
        // Refresh models list
        queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/ai-models"] });
      } else {
        toast({
          title: "Connection Failed",
          description: data.message || "Failed to connect to OpenRouter API",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      setTestResult({
        success: false,
        message: error.message || "An error occurred",
      });
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
      const response = await fetch("/api/v1/setup/ai-configuration/selected-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update selected model");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Model Updated",
        description: "Your preferred AI model has been updated successfully.",
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
  
  // Update model selection form with current value when data is loaded
  useEffect(() => {
    if (aiConfigQuery.data?.selectedModel) {
      modelSelectionForm.setValue("selectedModel", aiConfigQuery.data.selectedModel);
    }
  }, [aiConfigQuery.data?.selectedModel, modelSelectionForm]);
  
  const isLoading = aiConfigQuery.isLoading || modelsQuery.isLoading;
  const apiKeyConfigured = aiConfigQuery.data?.apiKeyConfigured;
  const availableModels = modelsQuery.data?.models || [];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Configuration</h2>
          <p className="text-muted-foreground">
            Configure AI integration for enhanced accounting assistance
          </p>
        </div>
        
        {apiKeyConfigured && (
          <Badge variant="outline" className={testResult?.success ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
            {testResult?.success ? "Connected" : "Not Verified"}
          </Badge>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>OpenRouter API Configuration</CardTitle>
          <CardDescription>
            Connect your OpenRouter.ai account to enable AI-powered features. Visit{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              OpenRouter.ai
            </a>{" "}
            to get your API key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading configuration...</span>
            </div>
          ) : (
            <>
              {apiKeyConfigured ? (
                <div className="space-y-4">
                  <Alert variant={testResult?.success ? "default" : "destructive"}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>API Key Status</AlertTitle>
                    <AlertDescription>
                      {testResult?.success
                        ? "API key is configured and working correctly."
                        : testResult?.message || "API key is configured but not tested."}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => testConnectionMutation.mutate()}
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
                      onClick={() => apiKeyForm.reset({ apiKey: "" })}
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      Update API Key
                    </Button>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Select AI Model (Optional)</h3>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md mb-4">
                      <div className="flex">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-green-800 dark:text-green-300">AI Configuration Complete</h4>
                          <p className="text-sm text-green-700 dark:text-green-400">
                            Your API key is configured and a default model has been set. All AI features are ready to use.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Form {...modelSelectionForm}>
                      <form onSubmit={modelSelectionForm.handleSubmit(onSubmitModelSelection)} className="space-y-4">
                        <FormField
                          control={modelSelectionForm.control}
                          name="selectedModel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred AI Model (Optional)</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a different model (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {modelsQuery.isLoading ? (
                                    <SelectItem value="loading" disabled>
                                      Loading models...
                                    </SelectItem>
                                  ) : modelsQuery.isError ? (
                                    <SelectItem value="error" disabled>
                                      Error loading models - using default
                                    </SelectItem>
                                  ) : availableModels.length > 0 ? (
                                    availableModels.map((model: AIModel) => (
                                      <SelectItem key={model.id} value={model.id}>
                                        {model.name} ({model.provider})
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="none" disabled>
                                      No models available - using default
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                A default model (GPT-3.5 Turbo) has been automatically configured. You can optionally select another model.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            disabled={updateModelMutation.isPending || !modelSelectionForm.formState.isDirty}
                          >
                            {updateModelMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Change Model"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
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
                          <FormLabel>OpenRouter API Key</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="sk-or-..."
                              type="password"
                              {...field}
                              className="font-mono"
                            />
                          </FormControl>
                          <FormDescription>
                            Your API key will be securely encrypted before storage.
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
          <h4 className="font-medium text-sm mb-1">About OpenRouter.ai</h4>
          <p className="text-sm text-muted-foreground">
            OpenRouter provides API access to multiple LLM models from providers like OpenAI, Anthropic, Google, and more.
            You pay only for the API calls you make. No subscription required.
          </p>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>AI Features</CardTitle>
          <CardDescription>
            Once configured, AI will be available throughout the application to enhance your accounting workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}