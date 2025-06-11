import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SaasLayout from '@/components/saas-admin/saas-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  DollarSign, 
  Users, 
  Building2,
  Save,
  AlertCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SaasSettings {
  id: number;
  usageBasedPricingEnabled: boolean;
  pricePerUserPerMonth: string | null;
  pricePerEntityPerMonth: string | null;
  billingCycleDay: number;
  trialPeriodDays: number;
  defaultCurrency: string;
  stripePublishableKey: string | null;
  stripeWebhookSecret: string | null;
  companyName: string;
  supportEmail: string;
  updatedAt: string;
}

const settingsSchema = z.object({
  usageBasedPricingEnabled: z.boolean(),
  pricePerUserPerMonth: z.string().optional(),
  pricePerEntityPerMonth: z.string().optional(),
  billingCycleDay: z.number().min(1).max(28),
  trialPeriodDays: z.number().min(1).max(365),
  defaultCurrency: z.string().min(3).max(3),
  stripePublishableKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  companyName: z.string().min(1, 'Company name is required'),
  supportEmail: z.string().email('Valid email is required'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SaasSettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<{ settings: SaasSettings }>({
    queryKey: ['/api/saas-admin/settings'],
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      usageBasedPricingEnabled: false,
      pricePerUserPerMonth: '',
      pricePerEntityPerMonth: '',
      billingCycleDay: 1,
      trialPeriodDays: 14,
      defaultCurrency: 'USD',
      stripePublishableKey: '',
      stripeWebhookSecret: '',
      companyName: '',
      supportEmail: '',
    },
  });

  // Update form when settings are loaded
  if (settings?.settings && !form.formState.isDirty) {
    form.reset({
      usageBasedPricingEnabled: settings.settings.usageBasedPricingEnabled,
      pricePerUserPerMonth: settings.settings.pricePerUserPerMonth || '',
      pricePerEntityPerMonth: settings.settings.pricePerEntityPerMonth || '',
      billingCycleDay: settings.settings.billingCycleDay,
      trialPeriodDays: settings.settings.trialPeriodDays,
      defaultCurrency: settings.settings.defaultCurrency,
      stripePublishableKey: settings.settings.stripePublishableKey || '',
      stripeWebhookSecret: settings.settings.stripeWebhookSecret || '',
      companyName: settings.settings.companyName,
      supportEmail: settings.settings.supportEmail,
    });
  }

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const response = await fetch('/api/saas-admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saas-admin/settings'] });
      toast({
        title: 'Success',
        description: 'Settings updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data);
  };

  const watchUsageBasedPricing = form.watch('usageBasedPricingEnabled');

  if (isLoading) {
    return (
      <SaasLayout>
        <div className="space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-48" />
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </SaasLayout>
    );
  }

  return (
    <SaasLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Platform Settings
          </h1>
          <p className="text-slate-600 mt-2">
            Configure billing, pricing, and platform-wide settings
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Basic company details displayed across the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Company Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supportEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Support Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="support@yourcompany.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Billing & Trial Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Billing & Trial Configuration</CardTitle>
                <CardDescription>
                  Configure billing cycles and trial periods for new tenants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="billingCycleDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Cycle Day</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="28" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormDescription>Day of month for billing (1-28)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trialPeriodDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trial Period (Days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="365" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 14)}
                          />
                        </FormControl>
                        <FormDescription>Free trial duration</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Currency</FormLabel>
                        <FormControl>
                          <Input placeholder="USD" maxLength={3} {...field} />
                        </FormControl>
                        <FormDescription>3-letter currency code</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Usage-Based Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Usage-Based Pricing
                </CardTitle>
                <CardDescription>
                  Enable per-user and per-entity pricing for tenants that exceed package limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="usageBasedPricingEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Usage-Based Pricing</FormLabel>
                        <FormDescription>
                          Charge tenants for usage beyond their package limits
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

                {watchUsageBasedPricing && (
                  <>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Usage-based pricing will automatically bill tenants for users and entities that exceed their package limits at the end of each billing cycle.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="pricePerUserPerMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Price per Additional User/Month
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="15.00" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Amount charged per user above package limit
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pricePerEntityPerMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              Price per Additional Entity/Month
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="5.00" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Amount charged per entity above package limit
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stripe Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Stripe Integration</CardTitle>
                <CardDescription>
                  Configure Stripe for payment processing and subscription management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Stripe keys should be configured via environment variables for security. These fields are for reference only.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="stripePublishableKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stripe Publishable Key</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="pk_..." 
                            {...field} 
                            readOnly
                            className="bg-slate-50"
                          />
                        </FormControl>
                        <FormDescription>Set via STRIPE_PUBLISHABLE_KEY environment variable</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stripeWebhookSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stripe Webhook Secret</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="whsec_..." 
                            {...field} 
                            readOnly
                            className="bg-slate-50"
                          />
                        </FormControl>
                        <FormDescription>Set via STRIPE_WEBHOOK_SECRET environment variable</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </SaasLayout>
  );
}