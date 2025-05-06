import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  Brain, 
  Edit, 
  Trash, 
  Plus, 
  Check, 
  X,
  TestTube,
  Power,
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

const aiProviderOptions = [
  { value: 'openrouter', label: 'OpenRouter.ai' },
  { value: 'googleai', label: 'Google AI (Gemini)' },
];

// Common models for OpenRouter.ai
const openrouterModels = [
  { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'anthropic/claude-3-opus-20240229', label: 'Claude 3 Opus' },
  { value: 'anthropic/claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  { value: 'anthropic/claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'meta-llama/llama-3-70b-instruct', label: 'Llama 3 70B' },
  { value: 'google/gemini-flash-1.5-8b-exp', label: 'Google Gemini Flash 1.5 8B (via OpenRouter)' },
];

// Common models for Google AI (Gemini)
const googleaiModels = [
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
];

const aiConfigurationSchema = z.object({
  id: z.number().optional(),
  provider: z.enum(['openrouter', 'googleai']),
  apiKey: z.string().min(1, "API key is required"),
  modelId: z.string().min(1, "Model ID is required"),
  isActive: z.boolean().default(true),
});

type AiConfiguration = z.infer<typeof aiConfigurationSchema>;

export default function AiConfigurationsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AiConfiguration | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);

  // Get suggested models based on provider
  const getSuggestedModels = (provider: string) => {
    return provider === 'openrouter' ? openrouterModels : googleaiModels;
  };

  // Queries
  const { data: configurations, isLoading } = useQuery({
    queryKey: ["/api/v1/setup/ai-configurations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/setup/ai-configurations");
      if (!response.ok) {
        throw new Error("Failed to fetch AI configurations");
      }
      return response.json();
    },
  });

  // Form setup
  const form = useForm<AiConfiguration>({
    resolver: zodResolver(aiConfigurationSchema),
    defaultValues: {
      provider: 'openrouter',
      apiKey: '',
      modelId: 'openai/gpt-4-turbo',
      isActive: true,
    },
  });

  // Reset form when editing config changes
  useEffect(() => {
    if (editingConfig) {
      form.reset({
        ...editingConfig
      });
    } else {
      form.reset({
        provider: 'openrouter',
        apiKey: '',
        modelId: 'google/gemini-flash-1.5-8b-exp',
        isActive: true,
      });
    }
  }, [editingConfig, form]);

  // Watch the provider to update model dropdown
  const provider = form.watch('provider');

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: async (data: AiConfiguration) => {
      const response = await apiRequest("POST", "/api/v1/setup/ai-configurations", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create AI configuration");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/ai-configurations"] });
      toast({
        title: "AI configuration created",
        description: "The AI provider has been successfully configured.",
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create AI configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: AiConfiguration) => {
      const response = await apiRequest("PUT", `/api/v1/setup/ai-configurations/${data.id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update AI configuration");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/ai-configurations"] });
      toast({
        title: "AI configuration updated",
        description: "The AI configuration has been updated.",
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update AI configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/v1/setup/ai-configurations/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete AI configuration");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/ai-configurations"] });
      toast({
        title: "AI configuration deleted",
        description: "The AI configuration has been removed.",
      });
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete AI configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/v1/setup/ai-configurations/${id}/test`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to test AI connection`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Connection successful",
          description: data.message,
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Connection test failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/v1/setup/ai-configurations/${id}`, { isActive });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update AI configuration status");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/ai-configurations"] });
      toast({
        title: variables.isActive ? "AI enabled" : "AI disabled",
        description: variables.isActive 
          ? "The AI provider has been activated." 
          : "The AI provider has been deactivated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AiConfiguration) => {
    if (editingConfig?.id) {
      updateConfigMutation.mutate({ ...values, id: editingConfig.id });
    } else {
      createConfigMutation.mutate(values);
    }
  };

  const handleEdit = (config: AiConfiguration) => {
    setEditingConfig(config);
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    setSelectedConfigId(id);
    setShowDeleteDialog(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setSelectedConfigId(null);
  };

  const handleConfirmDelete = () => {
    if (selectedConfigId !== null) {
      deleteConfigMutation.mutate(selectedConfigId);
    }
  };

  const handleTestConnection = (id: number) => {
    testConnectionMutation.mutate(id);
  };

  const handleToggleActive = (id: number, currentStatus: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleAddNew = () => {
    setEditingConfig(null);
    // Set default to use the Google Gemini model via OpenRouter as requested
    form.reset({
      provider: 'openrouter',
      apiKey: '',
      modelId: 'google/gemini-flash-1.5-8b-exp',
      isActive: true,
    });
    setIsOpen(true);
  };

  const handleProviderChange = (value: string) => {
    form.setValue("provider", value as 'openrouter' | 'googleai');
    
    // Set default model based on provider
    if (value === 'openrouter') {
      form.setValue("modelId", "google/gemini-flash-1.5-8b-exp");
    } else {
      form.setValue("modelId", "gemini-1.5-pro");
    }
  };

  const formatProviderName = (type: string) => {
    switch(type) {
      case 'openrouter':
        return 'OpenRouter.ai';
      case 'googleai':
        return 'Google AI (Gemini)';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>AI Configurations</CardTitle>
          <CardDescription>
            Configure AI providers for enhanced reporting and assistance
          </CardDescription>
        </div>
        <Button onClick={handleAddNew} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add AI Provider
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : configurations && configurations.length > 0 ? (
          <div className="space-y-4">
            {configurations.map((config: AiConfiguration) => (
              <div 
                key={config.id} 
                className="flex items-center justify-between p-4 border rounded-md"
              >
                <div className="flex items-center space-x-4">
                  <Brain className="h-6 w-6 text-slate-500" />
                  <div>
                    <h3 className="font-medium">{formatProviderName(config.provider)}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={config.isActive ? "success" : "secondary"}>
                        {config.isActive ? "Enabled" : "Disabled"}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        Model: {config.modelId}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant={config.isActive ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => handleToggleActive(config.id as number, config.isActive)}
                  >
                    <Power className="h-4 w-4 mr-1" />
                    {config.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleTestConnection(config.id as number)}
                    title="Test Connection"
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(config)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDelete(config.id as number)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No AI providers configured yet.</p>
            <p className="text-sm">Click "Add AI Provider" to set up a new AI service.</p>
          </div>
        )}
      </CardContent>

      {/* AI Config Edit/Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit AI Configuration" : "Add AI Provider"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Provider</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => handleProviderChange(value)}
                        disabled={!!editingConfig}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select AI Provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {aiProviderOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the AI provider service
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder={
                            field.value && editingConfig
                              ? "••••••••" + field.value.slice(-4)
                              : "Enter your API key"
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {provider === 'openrouter' 
                          ? 'Your OpenRouter.ai API key from https://openrouter.ai/keys' 
                          : 'Your Google AI (Gemini) API key'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Model</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select AI Model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getSuggestedModels(provider).map(model => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {provider === 'openrouter' && field.value === 'google/gemini-flash-1.5-8b-exp' 
                          ? 'Using Google Gemini Flash 1.5 8B model via OpenRouter.ai for optimal performance'
                          : 'Select the default AI model to use'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable AI Provider
                        </FormLabel>
                        <FormDescription>
                          Activate this AI provider for use in the application
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex justify-start">
                  {editingConfig && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        if (editingConfig) {
                          handleTestConnection(editingConfig.id);
                        }
                      }}
                      disabled={testConnectionMutation.isPending}
                    >
                      {testConnectionMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <TestTube className="h-4 w-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingConfig ? "Update Configuration" : "Save Configuration"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete AI Configuration"
        description="Are you sure you want to delete this AI configuration? This cannot be undone."
      />
    </Card>
  );
}