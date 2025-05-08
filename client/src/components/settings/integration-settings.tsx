import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TenantSetting } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, ExternalLink, ArrowRightLeft, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function IntegrationSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [stripeConnected, setStripeConnected] = useState(false);
  const [paypalConnected, setPaypalConnected] = useState(false);
  const [quickbooksConnected, setQuickbooksConnected] = useState(false);
  const [xeroConnected, setXeroConnected] = useState(false);
  const [mailchimpConnected, setMailchimpConnected] = useState(false);
  const [twilioConnected, setTwilioConnected] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [oneDriveConnected, setOneDriveConnected] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enableWebhooks, setEnableWebhooks] = useState(false);
  
  // Fetch settings
  const { data: settings = [], isLoading } = useQuery<TenantSetting[]>({
    queryKey: ["/api/v1/tenant/settings"],
    refetchOnWindowFocus: false
  });
  
  // Set up mutations for saving settings
  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/tenant/settings",
        { key, value }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tenant/settings"] });
    }
  });
  
  // Initialize form from settings
  useEffect(() => {
    if (settings.length > 0) {
      // Lookup function for settings
      const getSetting = (key: string) => {
        const setting = settings.find(s => s.key === key);
        return setting ? setting.value : "";
      };
      
      setStripeConnected(getSetting("stripe_connected") === "true");
      setPaypalConnected(getSetting("paypal_connected") === "true");
      setQuickbooksConnected(getSetting("quickbooks_connected") === "true");
      setXeroConnected(getSetting("xero_connected") === "true");
      setMailchimpConnected(getSetting("mailchimp_connected") === "true");
      setTwilioConnected(getSetting("twilio_connected") === "true");
      setGoogleDriveConnected(getSetting("google_drive_connected") === "true");
      setOneDriveConnected(getSetting("onedrive_connected") === "true");
      setWebhookUrl(getSetting("webhook_url") || "");
      setEnableWebhooks(getSetting("enable_webhooks") === "true");
    }
  }, [settings]);
  
  // Handle save all settings
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Create array of settings to save
      const settingsToSave = [
        { key: "stripe_connected", value: stripeConnected.toString() },
        { key: "paypal_connected", value: paypalConnected.toString() },
        { key: "quickbooks_connected", value: quickbooksConnected.toString() },
        { key: "xero_connected", value: xeroConnected.toString() },
        { key: "mailchimp_connected", value: mailchimpConnected.toString() },
        { key: "twilio_connected", value: twilioConnected.toString() },
        { key: "google_drive_connected", value: googleDriveConnected.toString() },
        { key: "onedrive_connected", value: oneDriveConnected.toString() },
        { key: "webhook_url", value: webhookUrl },
        { key: "enable_webhooks", value: enableWebhooks.toString() }
      ];
      
      // Save each setting
      for (const setting of settingsToSave) {
        await saveSettingMutation.mutateAsync(setting);
      }
      
      toast({
        title: "Settings saved",
        description: "Your integration settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Service connection functions - in a real app, these would make API calls
  const handleConnectService = (service: string) => {
    toast({
      title: `Connecting to ${service}`,
      description: `Initiating connection to ${service}...`,
    });
    
    // Simulate OAuth flow
    setTimeout(() => {
      toast({
        title: `${service} Connected`,
        description: `Successfully connected to ${service}.`,
      });
      
      // Update connection state based on service
      switch (service) {
        case 'Stripe':
          setStripeConnected(true);
          break;
        case 'PayPal':
          setPaypalConnected(true);
          break;
        case 'QuickBooks':
          setQuickbooksConnected(true);
          break;
        case 'Xero':
          setXeroConnected(true);
          break;
        case 'Mailchimp':
          setMailchimpConnected(true);
          break;
        case 'Twilio':
          setTwilioConnected(true);
          break;
        case 'Google Drive':
          setGoogleDriveConnected(true);
          break;
        case 'OneDrive':
          setOneDriveConnected(true);
          break;
      }
    }, 1000);
  };
  
  const handleConfigureService = (service: string) => {
    toast({
      title: `Configure ${service}`,
      description: `Opening ${service} configuration...`,
    });
  };
  
  const handleDisconnectService = (service: string) => {
    toast({
      title: `Disconnect ${service}`,
      description: `Disconnecting from ${service}...`,
    });
    
    setTimeout(() => {
      toast({
        title: `${service} Disconnected`,
        description: `Successfully disconnected from ${service}.`,
      });
      
      // Update connection state based on service
      switch (service) {
        case 'Stripe':
          setStripeConnected(false);
          break;
        case 'PayPal':
          setPaypalConnected(false);
          break;
        case 'QuickBooks':
          setQuickbooksConnected(false);
          break;
        case 'Xero':
          setXeroConnected(false);
          break;
        case 'Mailchimp':
          setMailchimpConnected(false);
          break;
        case 'Twilio':
          setTwilioConnected(false);
          break;
        case 'Google Drive':
          setGoogleDriveConnected(false);
          break;
        case 'OneDrive':
          setOneDriveConnected(false);
          break;
      }
    }, 1000);
  };
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const IntegrationCard = ({ 
    name, 
    description, 
    initials, 
    initialsColor, 
    connected,
    onConnect,
    onConfigure,
    onDisconnect
  }: {
    name: string;
    description: string;
    initials: string;
    initialsColor: string;
    connected: boolean;
    onConnect: () => void;
    onConfigure: () => void;
    onDisconnect: () => void;
  }) => (
    <div className="flex items-center justify-between border p-4 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className={`w-12 h-12 ${initialsColor} rounded-md flex items-center justify-center`}>
          <span className="font-semibold">{initials}</span>
        </div>
        <div>
          <h3 className="font-medium">{name}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center">
        {connected ? (
          <>
            <Badge className="mr-2 bg-green-100 text-green-800 hover:bg-green-100">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onConfigure}
            >
              Configure
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <Badge className="mr-2 bg-red-100 text-red-800 hover:bg-red-100">
              <XCircle className="h-3 w-3 mr-1" />
              Disconnected
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onConnect}
            >
              Connect
            </Button>
          </>
        )}
      </div>
    </div>
  );
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connect with external services and applications</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="payment">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="accounting">Accounting</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>
          
          <TabsContent value="payment" className="space-y-4 pt-4">
            <div className="grid gap-6">
              <IntegrationCard
                name="Stripe"
                description="Accept credit card payments"
                initials="S"
                initialsColor="bg-blue-100 text-blue-700"
                connected={stripeConnected}
                onConnect={() => handleConnectService('Stripe')}
                onConfigure={() => handleConfigureService('Stripe')}
                onDisconnect={() => handleDisconnectService('Stripe')}
              />
              
              <IntegrationCard
                name="PayPal"
                description="Accept PayPal payments"
                initials="P"
                initialsColor="bg-indigo-100 text-indigo-700"
                connected={paypalConnected}
                onConnect={() => handleConnectService('PayPal')}
                onConfigure={() => handleConfigureService('PayPal')}
                onDisconnect={() => handleDisconnectService('PayPal')}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="accounting" className="space-y-4 pt-4">
            <div className="grid gap-6">
              <IntegrationCard
                name="QuickBooks"
                description="Sync accounting data"
                initials="QB"
                initialsColor="bg-green-100 text-green-700"
                connected={quickbooksConnected}
                onConnect={() => handleConnectService('QuickBooks')}
                onConfigure={() => handleConfigureService('QuickBooks')}
                onDisconnect={() => handleDisconnectService('QuickBooks')}
              />
              
              <IntegrationCard
                name="Xero"
                description="Sync accounting data"
                initials="X"
                initialsColor="bg-blue-100 text-blue-700"
                connected={xeroConnected}
                onConnect={() => handleConnectService('Xero')}
                onConfigure={() => handleConfigureService('Xero')}
                onDisconnect={() => handleDisconnectService('Xero')}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="communications" className="space-y-4 pt-4">
            <div className="grid gap-6">
              <IntegrationCard
                name="Mailchimp"
                description="Email marketing integration"
                initials="M"
                initialsColor="bg-blue-100 text-blue-700"
                connected={mailchimpConnected}
                onConnect={() => handleConnectService('Mailchimp')}
                onConfigure={() => handleConfigureService('Mailchimp')}
                onDisconnect={() => handleDisconnectService('Mailchimp')}
              />
              
              <IntegrationCard
                name="Twilio"
                description="SMS notifications"
                initials="T"
                initialsColor="bg-purple-100 text-purple-700"
                connected={twilioConnected}
                onConnect={() => handleConnectService('Twilio')}
                onConfigure={() => handleConfigureService('Twilio')}
                onDisconnect={() => handleDisconnectService('Twilio')}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="storage" className="space-y-4 pt-4">
            <div className="grid gap-6">
              <IntegrationCard
                name="Google Drive"
                description="Cloud storage integration"
                initials="GD"
                initialsColor="bg-blue-100 text-blue-700"
                connected={googleDriveConnected}
                onConnect={() => handleConnectService('Google Drive')}
                onConfigure={() => handleConfigureService('Google Drive')}
                onDisconnect={() => handleDisconnectService('Google Drive')}
              />
              
              <IntegrationCard
                name="OneDrive"
                description="Microsoft cloud storage"
                initials="OD"
                initialsColor="bg-blue-100 text-blue-700"
                connected={oneDriveConnected}
                onConnect={() => handleConnectService('OneDrive')}
                onConfigure={() => handleConfigureService('OneDrive')}
                onDisconnect={() => handleDisconnectService('OneDrive')}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Webhook Settings</h3>
          
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <div className="flex">
              <Input 
                id="webhook-url" 
                placeholder="https://your-app.com/webhook" 
                className="flex-1 rounded-r-none"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <Button variant="outline" className="rounded-l-none">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              URL to receive notifications from our system
            </p>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="enable-webhook">Enable Webhooks</Label>
              <p className="text-sm text-muted-foreground">Send events to your webhook URL</p>
            </div>
            <Switch 
              id="enable-webhook" 
              checked={enableWebhooks}
              onCheckedChange={setEnableWebhooks}
            />
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
          <div className="flex">
            <ArrowRightLeft className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              <strong>API Access:</strong> You can access our API for deeper integrations. 
              Visit our <a href="#" className="underline">API documentation</a> to learn more.
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}