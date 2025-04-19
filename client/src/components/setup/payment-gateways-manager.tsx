import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CreditCard, AlertCircle, Check, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Stripe configuration schema
const stripeConfigSchema = z.object({
  public_key: z.string().min(1, "Publishable key is required"),
  secret_key: z.string().min(1, "Secret key is required"),
  webhook_secret: z.string().optional(),
});

// PayPal configuration schema
const paypalConfigSchema = z.object({
  client_id: z.string().min(1, "Client ID is required"),
  client_secret: z.string().min(1, "Client secret is required"),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
});

// Payment Gateway settings form schema
const paymentGatewaySettingsSchema = z.object({
  id: z.number().optional(),
  tenantId: z.number(),
  gatewayType: z.string(),
  isEnabled: z.boolean().default(false),
  configData: z.union([
    stripeConfigSchema,
    paypalConfigSchema,
  ]),
});

type PaymentGatewaySettings = z.infer<typeof paymentGatewaySettingsSchema>;

export default function PaymentGatewaysManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("stripe");
  const [editingGateway, setEditingGateway] = useState<string | null>(null);
  
  // Fetch payment gateway settings
  const { data: gatewaySettings, isLoading } = useQuery({
    queryKey: ["/api/v1/finance/payment-gateways"],
  });
  
  // Test payment gateway connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (gateway: string) => {
      return await apiRequest("POST", `/api/v1/finance/payment-gateways/${gateway}/test`);
    },
    onSuccess: () => {
      toast({
        title: "Connection successful",
        description: "Successfully connected to the payment gateway",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection failed",
        description: "Failed to connect to the payment gateway. Please check your credentials.",
        variant: "destructive",
      });
    },
  });
  
  // Find the current settings for a gateway type
  const findGatewaySettings = (type: string) => {
    if (!gatewaySettings) return null;
    return gatewaySettings.find((setting: any) => setting.gatewayType === type);
  };
  
  // Get configuration for form
  const getGatewayConfig = (type: string) => {
    const setting = findGatewaySettings(type);
    if (!setting) return null;
    
    try {
      // Parse the JSON config data
      return typeof setting.configData === 'string' 
        ? JSON.parse(setting.configData) 
        : setting.configData;
    } catch (e) {
      console.error("Error parsing config data:", e);
      return {};
    }
  };
  
  // Is a gateway enabled?
  const isGatewayEnabled = (type: string) => {
    const setting = findGatewaySettings(type);
    return setting ? setting.isEnabled : false;
  };
  
  // Stripe form setup
  const stripeForm = useForm<any>({
    resolver: zodResolver(stripeConfigSchema),
    defaultValues: {
      public_key: "",
      secret_key: "",
      webhook_secret: "",
    },
  });
  
  // PayPal form setup
  const paypalForm = useForm<any>({
    resolver: zodResolver(paypalConfigSchema),
    defaultValues: {
      client_id: "",
      client_secret: "",
      environment: "sandbox",
    },
  });
  
  // Update form values when settings are loaded
  useEffect(() => {
    if (gatewaySettings) {
      const stripeConfig = getGatewayConfig("stripe");
      if (stripeConfig) {
        stripeForm.reset({
          public_key: stripeConfig.public_key || "",
          secret_key: stripeConfig.secret_key || "",
          webhook_secret: stripeConfig.webhook_secret || "",
        });
      }
      
      const paypalConfig = getGatewayConfig("paypal");
      if (paypalConfig) {
        paypalForm.reset({
          client_id: paypalConfig.client_id || "",
          client_secret: paypalConfig.client_secret || "",
          environment: paypalConfig.environment || "sandbox",
        });
      }
    }
  }, [gatewaySettings]);
  
  // Save payment gateway settings mutation
  const saveGatewaySettingsMutation = useMutation({
    mutationFn: async ({ type, config, isEnabled }: { type: string; config: any; isEnabled: boolean }) => {
      const setting = findGatewaySettings(type);
      
      // Prepare the data
      const data = {
        gatewayType: type,
        isEnabled,
        configData: JSON.stringify(config),
      };
      
      if (setting) {
        // Update existing setting
        return await apiRequest("PUT", `/api/v1/finance/payment-gateways/${setting.id}`, data);
      } else {
        // Create new setting
        return await apiRequest("POST", "/api/v1/finance/payment-gateways", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/payment-gateways"] });
      setEditingGateway(null);
      toast({
        title: "Settings saved",
        description: "Payment gateway settings have been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save payment gateway settings",
        variant: "destructive",
      });
    },
  });
  
  // Toggle payment gateway enabled state
  const toggleGatewayEnabled = async (type: string, enabled: boolean) => {
    const setting = findGatewaySettings(type);
    if (!setting) {
      toast({
        title: "Configuration Required",
        description: `Please configure your ${type} credentials before enabling the gateway.`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      await saveGatewaySettingsMutation.mutateAsync({
        type,
        config: getGatewayConfig(type),
        isEnabled: enabled,
      });
    } catch (error) {
      console.error("Error toggling gateway:", error);
    }
  };
  
  // Handle Stripe form submission
  const handleStripeSubmit = (data: any) => {
    saveGatewaySettingsMutation.mutate({
      type: "stripe",
      config: data,
      isEnabled: isGatewayEnabled("stripe"),
    });
  };
  
  // Handle PayPal form submission
  const handlePayPalSubmit = (data: any) => {
    saveGatewaySettingsMutation.mutate({
      type: "paypal",
      config: data,
      isEnabled: isGatewayEnabled("paypal"),
    });
  };
  
  // Test a payment gateway connection
  const testGatewayConnection = (type: string) => {
    testConnectionMutation.mutate(type);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Gateways</CardTitle>
          <CardDescription>
            Configure payment gateway integrations to process payments from your clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="stripe">Stripe</TabsTrigger>
              <TabsTrigger value="paypal">PayPal</TabsTrigger>
            </TabsList>
            
            <TabsContent value="stripe">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Stripe</h3>
                    <p className="text-sm text-muted-foreground">
                      Accept credit card payments directly through Stripe
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FormField
                      control={stripeForm.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={isGatewayEnabled("stripe")} 
                              onCheckedChange={(checked) => toggleGatewayEnabled("stripe", checked)}
                            />
                          </FormControl>
                          <div className="space-y-0.5">
                            <FormLabel>
                              {isGatewayEnabled("stripe") ? "Enabled" : "Disabled"}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {isGatewayEnabled("stripe") && (
                  <Alert className="bg-green-50 border-green-200">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertTitle>Stripe is enabled</AlertTitle>
                    <AlertDescription>
                      You can accept credit card payments through Stripe.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingGateway("stripe")}
                  >
                    Configure Stripe
                  </Button>
                  
                  {findGatewaySettings("stripe") && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => testGatewayConnection("stripe")}
                      disabled={testConnectionMutation.isPending}
                    >
                      {testConnectionMutation.isPending && testConnectionMutation.variables === "stripe" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                      )}
                      Test Connection
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="paypal">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">PayPal</h3>
                    <p className="text-sm text-muted-foreground">
                      Accept payments through PayPal
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FormField
                      control={paypalForm.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={isGatewayEnabled("paypal")} 
                              onCheckedChange={(checked) => toggleGatewayEnabled("paypal", checked)}
                            />
                          </FormControl>
                          <div className="space-y-0.5">
                            <FormLabel>
                              {isGatewayEnabled("paypal") ? "Enabled" : "Disabled"}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {isGatewayEnabled("paypal") && (
                  <Alert className="bg-green-50 border-green-200">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertTitle>PayPal is enabled</AlertTitle>
                    <AlertDescription>
                      You can accept payments through PayPal.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingGateway("paypal")}
                  >
                    Configure PayPal
                  </Button>
                  
                  {findGatewaySettings("paypal") && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => testGatewayConnection("paypal")}
                      disabled={testConnectionMutation.isPending}
                    >
                      {testConnectionMutation.isPending && testConnectionMutation.variables === "paypal" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                      )}
                      Test Connection
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Stripe Configuration Dialog */}
      <Dialog 
        open={editingGateway === "stripe"} 
        onOpenChange={(open) => !open && setEditingGateway(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configure Stripe</DialogTitle>
            <DialogDescription>
              Enter your Stripe API keys to connect to your Stripe account. You can find these in your Stripe dashboard.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...stripeForm}>
            <form onSubmit={stripeForm.handleSubmit(handleStripeSubmit)} className="space-y-4">
              <FormField
                control={stripeForm.control}
                name="public_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publishable Key</FormLabel>
                    <FormControl>
                      <Input placeholder="pk_..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Your Stripe Publishable Key (starts with pk_)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={stripeForm.control}
                name="secret_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Key</FormLabel>
                    <FormControl>
                      <Input placeholder="sk_..." type="password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your Stripe Secret Key (starts with sk_)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={stripeForm.control}
                name="webhook_secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook Secret (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="whsec_..." type="password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your Stripe Webhook Secret for validating webhook events (starts with whsec_)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingGateway(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveGatewaySettingsMutation.isPending}>
                  {saveGatewaySettingsMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* PayPal Configuration Dialog */}
      <Dialog 
        open={editingGateway === "paypal"} 
        onOpenChange={(open) => !open && setEditingGateway(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configure PayPal</DialogTitle>
            <DialogDescription>
              Enter your PayPal API credentials to connect to your PayPal account. You can find these in your PayPal Developer Dashboard.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...paypalForm}>
            <form onSubmit={paypalForm.handleSubmit(handlePayPalSubmit)} className="space-y-4">
              <FormField
                control={paypalForm.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Client ID..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Your PayPal Client ID
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paypalForm.control}
                name="client_secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Secret</FormLabel>
                    <FormControl>
                      <Input placeholder="Client Secret..." type="password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your PayPal Client Secret
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paypalForm.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment</FormLabel>
                    <FormControl>
                      <select
                        className="w-full p-2 border rounded-md"
                        {...field}
                      >
                        <option value="sandbox">Sandbox (Testing)</option>
                        <option value="production">Production (Live)</option>
                      </select>
                    </FormControl>
                    <FormDescription>
                      Select the PayPal environment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingGateway(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveGatewaySettingsMutation.isPending}>
                  {saveGatewaySettingsMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}