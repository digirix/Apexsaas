import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Chart of Account schema
const accountSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  isSystemAccount: z.boolean().default(false),
  openingBalance: z.string().default("0"),
  detailedGroupId: z.number().min(1, "Detailed group is required"),
});

export default function EditChartOfAccountPage() {
  const params = useParams();
  const accountId = Number(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Selected group values
  const [selectedMainGroup, setSelectedMainGroup] = useState<number | null>(null);
  const [selectedElementGroup, setSelectedElementGroup] = useState<number | null>(null);
  const [selectedSubElementGroup, setSelectedSubElementGroup] = useState<number | null>(null);
  
  // Form initialization
  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountName: '',
      description: '',
      isActive: true,
      isSystemAccount: false,
      openingBalance: '0',
      detailedGroupId: 0,
    },
  });

  // Query the account data
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts', accountId],
    enabled: !!accountId,
    refetchOnWindowFocus: false,
  });
  
  // Query hierarchy data
  const { data: mainGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/main-groups'],
    refetchOnWindowFocus: false,
  });

  const { data: elementGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/element-groups'],
    refetchOnWindowFocus: false,
  });

  const { data: subElementGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'],
    refetchOnWindowFocus: false,
  });

  const { data: detailedGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'],
    refetchOnWindowFocus: false,
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof accountSchema>) => {
      return apiRequest('PUT', `/api/v1/finance/chart-of-accounts/${accountId}`, values);
    },
    onSuccess: () => {
      toast({
        title: "Account updated",
        description: "The account has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      navigate('/finance/chart-of-accounts');
    },
    onError: (error: any) => {
      toast({
        title: "Error updating account",
        description: error.message || "Failed to update account",
        variant: "destructive",
      });
    },
  });
  
  // Load account data into the form when available
  useEffect(() => {
    if (account) {
      form.reset({
        accountName: account.accountName,
        description: account.description || '',
        isActive: account.isActive,
        isSystemAccount: account.isSystemAccount,
        openingBalance: account.openingBalance || '0',
        detailedGroupId: account.detailedGroupId,
      });
      
      setSelectedMainGroup(account.mainGroupId);
      setSelectedElementGroup(account.elementGroupId);
      setSelectedSubElementGroup(account.subElementGroupId);
    }
  }, [account, form]);
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof accountSchema>) => {
    updateMutation.mutate(values);
  };
  
  // Get element groups filtered by selected main group
  const filteredElementGroups = selectedMainGroup
    ? elementGroups.filter((eg: any) => eg.mainGroupId === selectedMainGroup)
    : [];
  
  // Get sub-element groups filtered by selected element group
  const filteredSubElementGroups = selectedElementGroup
    ? subElementGroups.filter((seg: any) => seg.elementGroupId === selectedElementGroup)
    : [];
  
  // Get detailed groups filtered by selected sub-element group
  const filteredDetailedGroups = selectedSubElementGroup
    ? detailedGroups.filter((dg: any) => dg.subElementGroupId === selectedSubElementGroup)
    : [];
  
  return (
    <AppLayout title={`Edit Chart of Account`}>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Edit Chart of Account</CardTitle>
              <CardDescription>
                Update an existing account in the chart of accounts
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/finance/chart-of-accounts')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accountLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="text-lg font-semibold">Account Information</div>
                    <Separator />
                    
                    <FormField
                      control={form.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="openingBalance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opening Balance</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex space-x-4">
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Is Active</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="isSystemAccount"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={account?.isSystemAccount}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>System Account</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-lg font-semibold">Account Classification</div>
                    <Separator />
                    
                    <div className="space-y-4">
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-sm font-medium">Main Group</label>
                        <Select
                          value={selectedMainGroup?.toString() || ""}
                          onValueChange={(value) => {
                            const id = parseInt(value);
                            setSelectedMainGroup(id);
                            setSelectedElementGroup(null);
                            setSelectedSubElementGroup(null);
                            form.setValue('detailedGroupId', 0);
                          }}
                          disabled={account?.isSystemAccount}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Main Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {mainGroups.map((group: any) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-sm font-medium">Element Group</label>
                        <Select
                          value={selectedElementGroup?.toString() || ""}
                          onValueChange={(value) => {
                            const id = parseInt(value);
                            setSelectedElementGroup(id);
                            setSelectedSubElementGroup(null);
                            form.setValue('detailedGroupId', 0);
                          }}
                          disabled={!selectedMainGroup || account?.isSystemAccount}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Element Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredElementGroups.map((group: any) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-sm font-medium">Sub-Element Group</label>
                        <Select
                          value={selectedSubElementGroup?.toString() || ""}
                          onValueChange={(value) => {
                            const id = parseInt(value);
                            setSelectedSubElementGroup(id);
                            form.setValue('detailedGroupId', 0);
                          }}
                          disabled={!selectedElementGroup || account?.isSystemAccount}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sub-Element Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredSubElementGroups.map((group: any) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="detailedGroupId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Detailed Group</FormLabel>
                            <Select
                              value={field.value.toString()}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              disabled={!selectedSubElementGroup || account?.isSystemAccount}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Detailed Group" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {filteredDetailedGroups.map((group: any) => (
                                  <SelectItem key={group.id} value={group.id.toString()}>
                                    {group.customName || group.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {account && (
                      <div className="mt-6 p-4 bg-muted rounded-md">
                        <h3 className="font-medium text-sm mb-2">Account Information</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Account Code:</div>
                          <div className="font-mono">{account.accountCode}</div>
                          
                          <div>Account Type:</div>
                          <div className="capitalize">{account.accountType}</div>
                          
                          <div>Current Balance:</div>
                          <div>
                            {parseFloat(account.currentBalance).toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            })}
                          </div>
                          
                          <div>Created At:</div>
                          <div>{new Date(account.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <CardFooter className="flex justify-end pt-4 px-0">
                  <Button type="submit" disabled={updateMutation.isPending || accountLoading}>
                    {updateMutation.isPending && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}