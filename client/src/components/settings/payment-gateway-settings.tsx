import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CreditCard, Smartphone, Building2, Shield, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { StripeConfiguration, PaypalConfiguration, MeezanBankConfiguration, BankAlfalahConfiguration, TenantSetting } from "@shared/schema";

// Payment gateway configuration schemas for each provider
const stripeConfigSchema = z.object({
  publicKey: z.string().min(1, "Stripe Public Key is required"),
  secretKey: z.string().min(1, "Stripe Secret Key is required"),
  webhookSecret: z.string().optional(),
  currency: z.string().default('PKR'),
});

const paypalConfigSchema = z.object({
  clientId: z.string().min(1, "PayPal Client ID is required"),
  clientSecret: z.string().min(1, "PayPal Client Secret is required"),
  mode: z.enum(['sandbox', 'production']).default('sandbox'),
  currency: z.string().default('USD'),
});

const meezan_bankConfigSchema = z.object({
  merchantId: z.string().min(1, "Meezan Bank Merchant ID is required"),
  merchantKey: z.string().min(1, "Meezan Bank Merchant Key is required"),
  apiUrl: z.string().url("Valid API URL is required"),
  currency: z.string().default('PKR'),
});

const bank_alfalahConfigSchema = z.object({
  merchantId: z.string().min(1, "Bank Alfalah Merchant ID is required"),
  merchantKey: z.string().min(1, "Bank Alfalah Merchant Key is required"),
  apiUrl: z.string().url("Valid API URL is required"),
  currency: z.string().default('PKR'),
});

type StripeConfig = z.infer<typeof stripeConfigSchema>;
type PaypalConfig = z.infer<typeof paypalConfigSchema>;
type MeezanBankConfig = z.infer<typeof meezan_bankConfigSchema>;
type BankAlfalahConfig = z.infer<typeof bank_alfalahConfigSchema>;

interface PaymentGatewayInfo {
  key: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  supportedMethods: string[];
  currencies: string[];
  defaultCurrency: string;
  configSchema: z.ZodSchema<any>;
}

const paymentGateways: PaymentGatewayInfo[] = [
  {
    key: 'stripe',
    name: 'Stripe',
    description: 'Accept credit cards, debit cards, and digital wallets globally',
    icon: CreditCard,
    supportedMethods: ['credit_card', 'debit_card', 'apple_pay', 'google_pay'],
    currencies: ['PKR', 'USD', 'EUR', 'GBP'],
    defaultCurrency: 'PKR',
    configSchema: stripeConfigSchema,
  },
  {
    key: 'paypal',
    name: 'PayPal',
    description: 'Accept PayPal payments and PayPal credit worldwide',
    icon: Smartphone,
    supportedMethods: ['paypal'],
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    defaultCurrency: 'USD',
    configSchema: paypalConfigSchema,
  },
  {
    key: 'meezan_bank',
    name: 'Meezan Bank',
    description: 'Islamic banking payment gateway for Pakistan',
    icon: Building2,
    supportedMethods: ['credit_card', 'debit_card', 'bank_transfer'],
    currencies: ['PKR'],
    defaultCurrency: 'PKR',
    configSchema: meezan_bankConfigSchema,
  },
  {
    key: 'bank_alfalah',
    name: 'Bank Alfalah',
    description: 'Secure payment processing through Bank Alfalah',
    icon: Shield,
    supportedMethods: ['credit_card', 'debit_card', 'bank_transfer'],
    currencies: ['PKR'],
    defaultCurrency: 'PKR',
    configSchema: bank_alfalahConfigSchema,
  },
];

export function PaymentGatewaySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('stripe');
  const [testingGateway, setTestingGateway] = useState<string | null>(null);

  // Fetch payment gateway configurations
  const { data: gatewayConfigurations = {}, isLoading } = useQuery<{
    stripe?: StripeConfiguration;
    paypal?: PaypalConfiguration;
    meezanBank?: MeezanBankConfiguration;
    bankAlfalah?: BankAlfalahConfiguration;
  }>({
    queryKey: ["/api/v1/finance/payment-gateways"],
    refetchOnWindowFocus: false
  });

  // Get current gateway configuration
  const getCurrentConfig = () => {
    switch (activeTab) {
      case 'stripe':
        return gatewayConfigurations.stripe || {};
      case 'paypal':
        return gatewayConfigurations.paypal || {};
      case 'meezan_bank':
        return gatewayConfigurations.meezanBank || {};
      case 'bank_alfalah':
        return gatewayConfigurations.bankAlfalah || {};
      default:
        return {};
    }
  };

  const currentConfig = getCurrentConfig();

  // Form setup
  const gateway = paymentGateways.find(g => g.key === activeTab)!;
  const form = useForm({
    resolver: zodResolver(gateway.configSchema),
    defaultValues: currentConfig,
    mode: 'onChange',
  });

  // Reset form when tab changes
  useEffect(() => {
    form.reset(currentConfig);
  }, [activeTab, gatewayConfigurations, form]);

  // Save gateway configuration
  const saveGatewayMutation = useMutation({
    mutationFn: async (data: any) => {
      const hasExistingConfig = Object.keys(currentConfig).length > 0;
      const endpoint = `/api/v1/finance/payment-gateways/${activeTab}`;
      const method = hasExistingConfig ? "PUT" : "POST";
      
      return apiRequest(method, endpoint, data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/payment-gateways"] });
      toast({
        title: "Configuration Saved",
        description: `${gateway.name} settings have been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save payment gateway configuration.",
        variant: "destructive",
      });
    },
  });

  // Toggle gateway status
  const toggleGatewayMutation = useMutation({
    mutationFn: async ({ enabled, testMode }: { enabled: boolean; testMode: boolean }) => {
      if (Object.keys(currentConfig).length === 0) {
        throw new Error("Gateway configuration not found. Please configure the gateway first.");
      }
      
      const payload = {
        ...currentConfig,
        isEnabled: enabled,
        isTestMode: testMode,
      };

      return apiRequest("PUT", `/api/v1/finance/payment-gateways/${activeTab}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/payment-gateways"] });
      toast({
        title: "Gateway Updated",
        description: `${gateway.name} status has been updated.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update gateway status.",
        variant: "destructive",
      });
    },
  });

  // Test gateway connection
  const testGatewayMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/v1/finance/payment-gateways/${activeTab}/test`, {});
    },
    onSuccess: () => {
      toast({
        title: "Connection Successful",
        description: `${gateway.name} connection test passed.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || `Failed to connect to ${gateway.name}.`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTestingGateway(null);
    },
  });

  const onSubmit = (data: any) => {
    console.log("=== FORM SUBMISSION STARTED ===");
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Form validation state:", form.formState.isValid);
    console.log("Active tab:", activeTab);
    console.log("Current gateway:", currentGateway);
    console.log("User:", user);
    
    if (!user?.tenantId) {
      console.error("No tenant ID found for user");
      toast({
        title: "Authentication Error",
        description: "Please log in again to save payment gateway settings.",
        variant: "destructive",
      });
      return;
    }
    
    saveGatewayMutation.mutate(data);
  };

  const handleTest = () => {
    setTestingGateway(activeTab);
    testGatewayMutation.mutate();
  };

  const handleToggleEnabled = (enabled: boolean) => {
    toggleGatewayMutation.mutate({ 
      enabled, 
      testMode: currentConfig.isTestMode ?? true 
    });
  };

  const handleToggleTestMode = (testMode: boolean) => {
    toggleGatewayMutation.mutate({ 
      enabled: currentConfig.isEnabled ?? false, 
      testMode 
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Gateway Settings</CardTitle>
          <CardDescription>Loading payment gateway configurations...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Gateway Settings
          </CardTitle>
          <CardDescription>
            Configure payment gateways to accept online payments for your invoices. 
            Each gateway requires specific API credentials from the provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              {paymentGateways.map((gateway) => {
                const config = getCurrentConfig();
                const isConfigured = Object.keys(config).length > 0;
                const isEnabled = config.isEnabled;
                
                return (
                  <TabsTrigger key={gateway.key} value={gateway.key} className="flex items-center gap-2">
                    <gateway.icon className="h-4 w-4" />
                    {gateway.name}
                    {isConfigured && (
                      <Badge variant={isEnabled ? "default" : "secondary"} className="ml-1 h-4">
                        {isEnabled ? <CheckCircle className="h-2 w-2" /> : <XCircle className="h-2 w-2" />}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {paymentGateways.map((gateway) => (
              <TabsContent key={gateway.key} value={gateway.key} className="mt-6">
                <div className="space-y-6">
                  {/* Gateway Status */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <gateway.icon className="h-5 w-5" />
                        <h3 className="font-semibold">{gateway.name}</h3>
                        {currentGateway?.isTestMode && (
                          <Badge variant="outline">Test Mode</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{gateway.description}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>Supports: {gateway.supportedMethods.join(", ")}</span>
                        <span>•</span>
                        <span>Currencies: {gateway.currencies.join(", ")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`${gateway.key}-test-mode`} className="text-sm">Test Mode</Label>
                        <Switch
                          id={`${gateway.key}-test-mode`}
                          checked={currentConfig.isTestMode ?? true}
                          onCheckedChange={handleToggleTestMode}
                          disabled={toggleGatewayMutation.isPending}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`${gateway.key}-enabled`} className="text-sm">Enabled</Label>
                        <Switch
                          id={`${gateway.key}-enabled`}
                          checked={currentConfig.isEnabled ?? false}
                          onCheckedChange={handleToggleEnabled}
                          disabled={toggleGatewayMutation.isPending}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Configuration Form */}
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {gateway.key === 'stripe' && (
                      <StripeConfigForm form={form} />
                    )}
                    {gateway.key === 'paypal' && (
                      <PaypalConfigForm form={form} />
                    )}
                    {gateway.key === 'meezan_bank' && (
                      <MeezanBankConfigForm form={form} />
                    )}
                    {gateway.key === 'bank_alfalah' && (
                      <BankAlfalahConfigForm form={form} />
                    )}

                    <Separator />

                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTest}
                        disabled={Object.keys(currentConfig).length === 0 || testingGateway === gateway.key}
                      >
                        {testingGateway === gateway.key ? "Testing..." : "Test Connection"}
                      </Button>
                      <Button 
                        type="submit"
                        disabled={saveGatewayMutation.isPending}
                      >
                        {saveGatewayMutation.isPending ? "Saving..." : "Save Configuration"}
                      </Button>
                    </div>
                  </form>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Payment Gateway Help */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Always test your payment gateway configurations in test mode 
              before enabling them for live transactions. Each gateway requires specific API credentials 
              that you must obtain from the respective provider.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Stripe Setup</h4>
              <p className="text-sm text-muted-foreground">
                1. Go to <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Stripe Dashboard</a><br />
                2. Copy your "Publishable key" (starts with pk_)<br />
                3. Copy your "Secret key" (starts with sk_)<br />
                4. Optional: Set up webhooks for payment notifications
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">PayPal Setup</h4>
              <p className="text-sm text-muted-foreground">
                1. Go to <a href="https://developer.paypal.com/developer/applications" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">PayPal Developer</a><br />
                2. Create an application for your business<br />
                3. Copy the Client ID and Client Secret<br />
                4. Choose Sandbox for testing or Live for production
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Meezan Bank Setup</h4>
              <p className="text-sm text-muted-foreground">
                1. Contact Meezan Bank for merchant account<br />
                2. Obtain Merchant ID and Merchant Key<br />
                3. Get API endpoint URL from the bank<br />
                4. Configure Islamic banking compliance settings
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Bank Alfalah Setup</h4>
              <p className="text-sm text-muted-foreground">
                1. Apply for Bank Alfalah merchant services<br />
                2. Obtain Merchant ID and API credentials<br />
                3. Get integration API endpoint<br />
                4. Configure security certificates if required
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual configuration forms for each gateway
function StripeConfigForm({ form }: { form: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="stripe-public-key">Publishable Key *</Label>
        <Input
          id="stripe-public-key"
          placeholder="pk_test_..."
          {...form.register("publicKey")}
        />
        {form.formState.errors.publicKey && (
          <p className="text-sm text-red-600">{form.formState.errors.publicKey.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="stripe-secret-key">Secret Key *</Label>
        <Input
          id="stripe-secret-key"
          type="password"
          placeholder="sk_test_..."
          {...form.register("secretKey")}
        />
        {form.formState.errors.secretKey && (
          <p className="text-sm text-red-600">{form.formState.errors.secretKey.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="stripe-webhook-secret">Webhook Secret (Optional)</Label>
        <Input
          id="stripe-webhook-secret"
          type="password"
          placeholder="whsec_..."
          {...form.register("webhookSecret")}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="stripe-currency">Default Currency</Label>
        <Select value={form.watch("currency") || "PKR"} onValueChange={(value) => form.setValue("currency", value, { shouldValidate: true })}>
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
            <SelectItem value="USD">USD - US Dollar</SelectItem>
            <SelectItem value="EUR">EUR - Euro</SelectItem>
            <SelectItem value="GBP">GBP - British Pound</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function PaypalConfigForm({ form }: { form: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="paypal-client-id">Client ID</Label>
        <Input
          id="paypal-client-id"
          placeholder="Your PayPal Client ID"
          {...form.register("clientId")}
        />
        {form.formState.errors.clientId && (
          <p className="text-sm text-red-600">{form.formState.errors.clientId.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="paypal-client-secret">Client Secret</Label>
        <Input
          id="paypal-client-secret"
          type="password"
          placeholder="Your PayPal Client Secret"
          {...form.register("clientSecret")}
        />
        {form.formState.errors.clientSecret && (
          <p className="text-sm text-red-600">{form.formState.errors.clientSecret.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="paypal-mode">Environment</Label>
        <Select value={form.watch("mode")} onValueChange={(value) => form.setValue("mode", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
            <SelectItem value="production">Production (Live)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="paypal-currency">Default Currency</Label>
        <Select value={form.watch("currency")} onValueChange={(value) => form.setValue("currency", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD - US Dollar</SelectItem>
            <SelectItem value="EUR">EUR - Euro</SelectItem>
            <SelectItem value="GBP">GBP - British Pound</SelectItem>
            <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
            <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function MeezanBankConfigForm({ form }: { form: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="meezan-merchant-id">Merchant ID</Label>
        <Input
          id="meezan-merchant-id"
          placeholder="Your Meezan Bank Merchant ID"
          {...form.register("merchantId")}
        />
        {form.formState.errors.merchantId && (
          <p className="text-sm text-red-600">{form.formState.errors.merchantId.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="meezan-merchant-key">Merchant Key</Label>
        <Input
          id="meezan-merchant-key"
          type="password"
          placeholder="Your Merchant Key"
          {...form.register("merchantKey")}
        />
        {form.formState.errors.merchantKey && (
          <p className="text-sm text-red-600">{form.formState.errors.merchantKey.message}</p>
        )}
      </div>
      
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="meezan-api-url">API URL</Label>
        <Input
          id="meezan-api-url"
          placeholder="https://api.meezanbank.com/payments/v1"
          {...form.register("apiUrl")}
        />
        {form.formState.errors.apiUrl && (
          <p className="text-sm text-red-600">{form.formState.errors.apiUrl.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="meezan-currency">Currency</Label>
        <Input
          id="meezan-currency"
          value="PKR"
          disabled
          {...form.register("currency")}
        />
      </div>
    </div>
  );
}

function BankAlfalahConfigForm({ form }: { form: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="alfalah-merchant-id">Merchant ID</Label>
        <Input
          id="alfalah-merchant-id"
          placeholder="Your Bank Alfalah Merchant ID"
          {...form.register("merchantId")}
        />
        {form.formState.errors.merchantId && (
          <p className="text-sm text-red-600">{form.formState.errors.merchantId.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="alfalah-merchant-key">Merchant Key</Label>
        <Input
          id="alfalah-merchant-key"
          type="password"
          placeholder="Your Merchant Key"
          {...form.register("merchantKey")}
        />
        {form.formState.errors.merchantKey && (
          <p className="text-sm text-red-600">{form.formState.errors.merchantKey.message}</p>
        )}
      </div>
      
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="alfalah-api-url">API URL</Label>
        <Input
          id="alfalah-api-url"
          placeholder="https://api.bankalfalah.com/payments/v1"
          {...form.register("apiUrl")}
        />
        {form.formState.errors.apiUrl && (
          <p className="text-sm text-red-600">{form.formState.errors.apiUrl.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="alfalah-currency">Currency</Label>
        <Input
          id="alfalah-currency"
          value="PKR"
          disabled
          {...form.register("currency")}
        />
      </div>
    </div>
  );
}