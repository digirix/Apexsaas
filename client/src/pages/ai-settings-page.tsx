import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AI_PROVIDERS } from "@shared/ai-schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, ExternalLink, CheckCircle2 } from "lucide-react";

export default function AiSettingsPage() {
  const { toast } = useToast();
  const [provider, setProvider] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Fetch existing AI configurations
  const { data: configurations, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ["/api/v1/ai/configurations"],
    staleTime: 10000,
  });

  // Fetch available models for the selected provider (after testing connection)
  const { data: availableModels } = useQuery({
    queryKey: ["/api/v1/ai/models", provider],
    enabled: !!provider && provider !== "",
  });

  // Create or update AI configuration
  const saveConfigMutation = useMutation({
    mutationFn: (config: any) => apiRequest("/api/v1/ai/configurations", config, "POST"),
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "AI provider configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/ai/configurations"] });
      setApiKey(""); // Clear API key for security
    },
    onError: (error: any) => {
      toast({
        title: "Error saving configuration",
        description: error.message || "There was an error saving the AI configuration.",
        variant: "destructive",
      });
    },
  });

  // Test AI connection
  const testConnectionMutation = useMutation({
    mutationFn: (data: { provider: string; apiKey: string }) => 
      apiRequest("/api/v1/ai/test-connection", data, "POST"),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Connection successful",
          description: data.message,
        });
        // Automatically set the first model if available
        if (data.models && data.models.length > 0) {
          setModel(data.models[0].id);
        }
      } else {
        toast({
          title: "Connection failed",
          description: data.message,
          variant: "destructive",
        });
      }
      setTestingConnection(false);
    },
    onError: (error: any) => {
      toast({
        title: "Connection test failed",
        description: error.message || "There was an error testing the connection.",
        variant: "destructive",
      });
      setTestingConnection(false);
    },
  });

  // Load first configuration if available
  useEffect(() => {
    if (configurations && configurations.length > 0) {
      const activeConfig = configurations.find((c: any) => c.isActive) || configurations[0];
      setProvider(activeConfig.provider);
      setModel(activeConfig.model);
      setIsActive(activeConfig.isActive);
    }
  }, [configurations]);

  const handleTestConnection = () => {
    if (!provider || !apiKey) {
      toast({
        title: "Missing information",
        description: "Please select a provider and enter an API key.",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    testConnectionMutation.mutate({ provider, apiKey });
  };

  const handleSaveConfiguration = () => {
    if (!provider || !model || !apiKey) {
      toast({
        title: "Missing information",
        description: "Please select a provider, model, and enter an API key.",
        variant: "destructive",
      });
      return;
    }

    const existingConfig = configurations?.find((c: any) => c.provider === provider);
    
    const configData = {
      id: existingConfig?.id,
      provider,
      model,
      apiKey,
      isActive,
    };
    
    saveConfigMutation.mutate(configData);
  };

  return (
    <AppLayout title="AI Settings">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">AI Provider Configuration</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Configure AI Provider</CardTitle>
            <CardDescription>
              Set up the AI provider that will power the intelligent features in your accounting firm management system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingConfigs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {/* Provider selection */}
                <div className="space-y-2">
                  <Label htmlFor="provider">AI Provider</Label>
                  <Select 
                    value={provider} 
                    onValueChange={(value) => {
                      setProvider(value);
                      setModel(""); // Reset model when provider changes
                    }}
                  >
                    <SelectTrigger id="provider">
                      <SelectValue placeholder="Select AI provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.map((providerOption) => (
                        <SelectItem key={providerOption} value={providerOption}>
                          {providerOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                  />
                  <p className="text-sm text-slate-500">
                    Your API key is encrypted and stored securely.
                  </p>
                </div>

                {/* Connection test */}
                <div>
                  <Button 
                    onClick={handleTestConnection} 
                    variant="outline" 
                    disabled={!provider || !apiKey || testingConnection}
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                        Testing Connection
                      </>
                    ) : (
                      "Test Connection"
                    )}
                  </Button>
                </div>

                {/* Model selection - only shown after successful connection test */}
                {availableModels && availableModels.models && availableModels.models.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="model">AI Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger id="model">
                        <SelectValue placeholder="Select AI model" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.models.map((modelOption: any) => (
                          <SelectItem key={modelOption.id} value={modelOption.id}>
                            {modelOption.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Active status */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active-status"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="active-status">Make this the active AI provider</Label>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-slate-500">
              <div className="flex items-center">
                <ExternalLink className="h-4 w-4 mr-1" />
                <span>
                  You will need an API key from your chosen provider.
                </span>
              </div>
            </div>
            <Button
              onClick={handleSaveConfiguration}
              disabled={!provider || !model || !apiKey || saveConfigMutation.isPending}
            >
              {saveConfigMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Saving
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Current Configurations */}
        {configurations && configurations.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Current AI Configurations</CardTitle>
              <CardDescription>
                Your existing AI provider configurations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {configurations.map((config: any) => (
                  <div key={config.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium">{config.provider}</h3>
                        {config.isActive && (
                          <CheckCircle2 className="h-4 w-4 ml-2 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500">Model: {config.model}</p>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProvider(config.provider);
                          setModel(config.model);
                          setIsActive(config.isActive);
                          // We don't set the API key for security - user needs to re-enter it
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}