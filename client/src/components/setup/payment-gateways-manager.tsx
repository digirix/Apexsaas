import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  CreditCard, 
  Edit, 
  Trash, 
  Plus, 
  Check, 
  X,
  SlidersHorizontal
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
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

const gatewayTypeOptions = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' }
];

const paymentGatewaySettingSchema = z.object({
  id: z.number().optional(),
  gatewayType: z.string(),
  isEnabled: z.boolean().default(false),
  configData: z.string()
});

type PaymentGatewaySetting = z.infer<typeof paymentGatewaySettingSchema>;

export default function PaymentGatewaysManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<PaymentGatewaySetting | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedGatewayId, setSelectedGatewayId] = useState<number | null>(null);

  // Queries
  const { data: gatewaySettings, isLoading } = useQuery({
    queryKey: ["/api/v1/finance/payment-gateways"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/finance/payment-gateways");
      if (!response.ok) {
        throw new Error("Failed to fetch payment gateway settings");
      }
      return response.json();
    },
  });

  // Form setup
  const form = useForm<PaymentGatewaySetting>({
    resolver: zodResolver(paymentGatewaySettingSchema),
    defaultValues: {
      gatewayType: 'stripe',
      isEnabled: false,
      configData: JSON.stringify({ 
        secret_key: "", 
        publishable_key: "", 
        webhook_secret: "" 
      }, null, 2)
    },
  });

  // Reset form when editing setting changes
  useEffect(() => {
    if (editingSetting) {
      let configData = editingSetting.configData;
      
      // Parse configData if it's a string, stringify it with formatting if it's an object
      if (typeof configData === 'object') {
        configData = JSON.stringify(configData, null, 2);
      } else if (typeof configData === 'string') {
        try {
          // Try to parse and reformat for better display
          const parsed = JSON.parse(configData);
          configData = JSON.stringify(parsed, null, 2);
        } catch (e) {
          // Keep as is if not valid JSON
        }
      }
      
      form.reset({
        ...editingSetting,
        configData
      });
    } else {
      const defaultConfigData = { 
        secret_key: "", 
        publishable_key: "", 
        webhook_secret: "" 
      };
      
      form.reset({
        gatewayType: 'stripe',
        isEnabled: false,
        configData: JSON.stringify(defaultConfigData, null, 2)
      });
    }
  }, [editingSetting, form]);

  // Mutations
  const createGatewayMutation = useMutation({
    mutationFn: async (data: PaymentGatewaySetting) => {
      const response = await apiRequest("POST", "/api/v1/finance/payment-gateways", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create payment gateway setting");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/payment-gateways"] });
      toast({
        title: "Gateway setting created",
        description: "The payment gateway has been successfully configured.",
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create gateway setting",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateGatewayMutation = useMutation({
    mutationFn: async (data: PaymentGatewaySetting) => {
      const response = await apiRequest("PUT", `/api/v1/finance/payment-gateways/${data.id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update payment gateway setting");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/payment-gateways"] });
      toast({
        title: "Gateway setting updated",
        description: "The payment gateway configuration has been updated.",
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update gateway setting",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteGatewayMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/v1/finance/payment-gateways/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete payment gateway setting");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/payment-gateways"] });
      toast({
        title: "Gateway setting deleted",
        description: "The payment gateway configuration has been removed.",
      });
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete gateway setting",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async ({ type }: { type: string }) => {
      const response = await apiRequest("POST", `/api/v1/finance/payment-gateways/${type}/test`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to test ${type} connection`);
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Connection successful",
        description: `Successfully connected to ${variables.type.charAt(0).toUpperCase() + variables.type.slice(1)}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: PaymentGatewaySetting) => {
    // Try to parse the configData to validate it's proper JSON
    try {
      const parsedConfig = JSON.parse(values.configData);
      values.configData = JSON.stringify(parsedConfig);
    } catch (e) {
      toast({
        title: "Invalid configuration",
        description: "The configuration data must be valid JSON",
        variant: "destructive",
      });
      return;
    }

    if (editingSetting?.id) {
      updateGatewayMutation.mutate({ ...values, id: editingSetting.id });
    } else {
      createGatewayMutation.mutate(values);
    }
  };

  const handleEdit = (setting: PaymentGatewaySetting) => {
    setEditingSetting(setting);
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    setSelectedGatewayId(id);
    setShowDeleteDialog(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setSelectedGatewayId(null);
  };

  const handleConfirmDelete = () => {
    if (selectedGatewayId !== null) {
      deleteGatewayMutation.mutate(selectedGatewayId);
    }
  };

  const handleTestConnection = (gatewayType: string) => {
    testConnectionMutation.mutate({ type: gatewayType });
  };

  const handleAddNew = () => {
    setEditingSetting(null);
    setIsOpen(true);
  };

  // Handle gateway type change to provide appropriate default config template
  const handleGatewayTypeChange = (value: string) => {
    form.setValue("gatewayType", value);
    
    let configTemplate = {};
    
    switch(value) {
      case 'stripe':
        configTemplate = {
          secret_key: "",
          publishable_key: "",
          webhook_secret: ""
        };
        break;
      case 'paypal':
        configTemplate = {
          client_id: "",
          client_secret: "",
          mode: "sandbox" // or "live"
        };
        break;
      default:
        configTemplate = {
          api_key: "",
          api_secret: "",
          environment: "test" // or "production"
        };
    }
    
    form.setValue("configData", JSON.stringify(configTemplate, null, 2));
  };

  const formatGatewayName = (type: string) => {
    switch(type) {
      case 'stripe':
        return 'Stripe';
      case 'paypal':
        return 'PayPal';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Payment Gateways</CardTitle>
          <CardDescription>
            Configure payment gateways for processing payments
          </CardDescription>
        </div>
        <Button onClick={handleAddNew} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Gateway
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : gatewaySettings && gatewaySettings.length > 0 ? (
          <div className="space-y-4">
            {gatewaySettings.map((setting: PaymentGatewaySetting) => (
              <div 
                key={setting.id} 
                className="flex items-center justify-between p-4 border rounded-md"
              >
                <div className="flex items-center space-x-4">
                  <CreditCard className="h-6 w-6 text-slate-500" />
                  <div>
                    <h3 className="font-medium">{formatGatewayName(setting.gatewayType)}</h3>
                    <Badge variant={setting.isEnabled ? "success" : "secondary"}>
                      {setting.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleTestConnection(setting.gatewayType)}
                    disabled={!setting.isEnabled}
                    title={setting.isEnabled ? `Test ${formatGatewayName(setting.gatewayType)} Connection` : "Enable gateway to test connection"}
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(setting)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDelete(setting.id as number)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No payment gateways configured yet.</p>
            <p className="text-sm">Click "Add Gateway" to set up a payment processor.</p>
          </div>
        )}
      </CardContent>

      {/* Gateway Edit/Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSetting ? "Edit Payment Gateway" : "Add Payment Gateway"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="gatewayType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gateway Type</FormLabel>
                      <div className="space-y-2">
                        <Tabs
                          value={field.value}
                          onValueChange={handleGatewayTypeChange}
                          className="w-full"
                          disabled={!!editingSetting}
                        >
                          <TabsList className="w-full grid grid-cols-3">
                            {gatewayTypeOptions.map((option) => (
                              <TabsTrigger key={option.value} value={option.value}>
                                {option.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                      </div>
                      <FormDescription>
                        Select the payment gateway provider
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable Gateway
                        </FormLabel>
                        <FormDescription>
                          Activate this payment gateway for processing payments
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

                <FormField
                  control={form.control}
                  name="configData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Configuration</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          className="w-full h-48 p-2 border rounded font-mono text-sm resize-y"
                          placeholder="{}"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the gateway configuration as a JSON object
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSetting ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Payment Gateway"
        description="Are you sure you want to delete this payment gateway configuration? This action cannot be undone."
        isLoading={deleteGatewayMutation.isPending}
      />
    </Card>
  );
}