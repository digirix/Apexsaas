import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ArrowLeft, Save, Trash2, Pencil, Plus } from 'lucide-react';

// Form Schemas
const subElementGroupSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  code: z.string().min(2, { message: "Code must be at least 2 characters" }),
  description: z.string().optional(),
  elementGroupId: z.string(),
});

const detailedGroupSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  code: z.string().min(2, { message: "Code must be at least 2 characters" }),
  description: z.string().optional(),
  subElementGroupId: z.string(),
});

const accountSchema = z.object({
  accountName: z.string().min(3, { message: "Account name must be at least 3 characters" }),
  accountCode: z.string().min(2, { message: "Account code must be at least 2 characters" }).optional(),
  description: z.string().optional(),
  openingBalance: z.coerce.number().default(0),
  detailedGroupId: z.string(),
});

export default function ChartOfAccountsSetupPage() {
  const [setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for active tab and dialog controls
  const [activeTab, setActiveTab] = useState('sub-element-groups');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  
  // Edit forms
  const subElementGroupForm = useForm<z.infer<typeof subElementGroupSchema>>({
    resolver: zodResolver(subElementGroupSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      elementGroupId: '',
    },
  });
  
  const detailedGroupForm = useForm<z.infer<typeof detailedGroupSchema>>({
    resolver: zodResolver(detailedGroupSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      subElementGroupId: '',
    },
  });
  
  const accountForm = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountName: '',
      accountCode: '',
      description: '',
      openingBalance: 0,
      detailedGroupId: '',
    },
  });
  
  // Data fetching queries
  const { data: elementGroupsData, isLoading: elementGroupsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/element-groups'],
    queryFn: async () => apiRequest('GET', '/api/v1/finance/chart-of-accounts/element-groups'),
  });
  
  const { data: subElementGroupsData, isLoading: subElementGroupsLoading, refetch: refetchSubElementGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'],
    queryFn: async () => apiRequest('GET', '/api/v1/finance/chart-of-accounts/sub-element-groups'),
  });
  
  const { data: detailedGroupsData, isLoading: detailedGroupsLoading, refetch: refetchDetailedGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'],
    queryFn: async () => apiRequest('GET', '/api/v1/finance/chart-of-accounts/detailed-groups'),
  });
  
  const { data: accountsData, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
    queryFn: async () => apiRequest('GET', '/api/v1/finance/chart-of-accounts'),
  });
  
  // Mutations
  const updateSubElementGroupMutation = useMutation({
    mutationFn: async (values: any) => {
      return apiRequest('PATCH', `/api/v1/finance/chart-of-accounts/sub-element-groups/${currentItem.id}`, values);
    },
    onSuccess: () => {
      toast({
        title: "Sub-Element Group Updated",
        description: "The sub-element group has been updated successfully.",
      });
      setEditDialogOpen(false);
      refetchSubElementGroups();
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Sub-Element Group",
        description: error.message || "Failed to update sub-element group",
        variant: "destructive",
      });
    },
  });
  
  const updateDetailedGroupMutation = useMutation({
    mutationFn: async (values: any) => {
      return apiRequest('PATCH', `/api/v1/finance/chart-of-accounts/detailed-groups/${currentItem.id}`, values);
    },
    onSuccess: () => {
      toast({
        title: "Detailed Group Updated",
        description: "The detailed group has been updated successfully.",
      });
      setEditDialogOpen(false);
      refetchDetailedGroups();
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Detailed Group",
        description: error.message || "Failed to update detailed group",
        variant: "destructive",
      });
    },
  });
  
  const updateAccountMutation = useMutation({
    mutationFn: async (values: any) => {
      return apiRequest('PATCH', `/api/v1/finance/chart-of-accounts/${currentItem.id}`, values);
    },
    onSuccess: () => {
      toast({
        title: "Account Updated",
        description: "The account has been updated successfully.",
      });
      setEditDialogOpen(false);
      refetchAccounts();
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Account",
        description: error.message || "Failed to update account",
        variant: "destructive",
      });
    },
  });
  
  const deleteSubElementGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/v1/finance/chart-of-accounts/sub-element-groups/${currentItem.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Sub-Element Group Deleted",
        description: "The sub-element group has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      refetchSubElementGroups();
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Sub-Element Group",
        description: error.message || "Failed to delete sub-element group. It might be in use by detailed groups or accounts.",
        variant: "destructive",
      });
    },
  });
  
  const deleteDetailedGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/v1/finance/chart-of-accounts/detailed-groups/${currentItem.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Detailed Group Deleted",
        description: "The detailed group has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      refetchDetailedGroups();
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Detailed Group",
        description: error.message || "Failed to delete detailed group. It might be in use by accounts.",
        variant: "destructive",
      });
    },
  });
  
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/v1/finance/chart-of-accounts/${currentItem.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "The account has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      refetchAccounts();
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Account",
        description: error.message || "Failed to delete account. It might be in use by journal entries.",
        variant: "destructive",
      });
    },
  });
  
  // Handler functions
  const handleEditSubElementGroup = (item: any) => {
    setCurrentItem(item);
    subElementGroupForm.reset({
      name: item.customName || formatName(item.name),
      code: item.code,
      description: item.description || '',
      elementGroupId: item.elementGroupId.toString(),
    });
    setActiveTab('sub-element-groups');
    setEditDialogOpen(true);
  };
  
  const handleEditDetailedGroup = (item: any) => {
    setCurrentItem(item);
    detailedGroupForm.reset({
      name: item.customName || formatName(item.name),
      code: item.code,
      description: item.description || '',
      subElementGroupId: item.subElementGroupId.toString(),
    });
    setActiveTab('detailed-groups');
    setEditDialogOpen(true);
  };
  
  const handleEditAccount = (item: any) => {
    setCurrentItem(item);
    accountForm.reset({
      accountName: item.accountName,
      accountCode: item.accountCode || '',
      description: item.description || '',
      openingBalance: parseFloat(item.openingBalance) || 0,
      detailedGroupId: item.detailedGroupId.toString(),
    });
    setActiveTab('accounts');
    setEditDialogOpen(true);
  };
  
  const handleDeleteItem = (item: any, type: string) => {
    setCurrentItem(item);
    setActiveTab(type);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (!currentItem) return;
    
    if (activeTab === 'sub-element-groups') {
      deleteSubElementGroupMutation.mutate();
    } else if (activeTab === 'detailed-groups') {
      deleteDetailedGroupMutation.mutate();
    } else if (activeTab === 'accounts') {
      deleteAccountMutation.mutate();
    }
  };
  
  const handleSubmitSubElementGroup = (values: z.infer<typeof subElementGroupSchema>) => {
    updateSubElementGroupMutation.mutate({
      customName: values.name,
      code: values.code,
      description: values.description,
      elementGroupId: parseInt(values.elementGroupId),
    });
  };
  
  const handleSubmitDetailedGroup = (values: z.infer<typeof detailedGroupSchema>) => {
    updateDetailedGroupMutation.mutate({
      customName: values.name,
      code: values.code,
      description: values.description,
      subElementGroupId: parseInt(values.subElementGroupId),
    });
  };
  
  const handleSubmitAccount = (values: z.infer<typeof accountSchema>) => {
    updateAccountMutation.mutate({
      accountName: values.accountName,
      accountCode: values.accountCode,
      description: values.description,
      openingBalance: values.openingBalance,
      detailedGroupId: parseInt(values.detailedGroupId),
    });
  };
  
  // Helper functions
  const formatName = (name: string) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  const getElementGroupName = (id: number) => {
    if (!elementGroupsData || !Array.isArray(elementGroupsData)) return 'Loading...';
    const group = elementGroupsData.find(g => g.id === id);
    return group ? (group.customName || formatName(group.name)) : 'Unknown';
  };
  
  const getSubElementGroupName = (id: number) => {
    if (!subElementGroupsData || !Array.isArray(subElementGroupsData)) return 'Loading...';
    const group = subElementGroupsData.find(g => g.id === id);
    return group ? (group.customName || formatName(group.name)) : 'Unknown';
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Chart of Accounts Setup</h1>
          <p className="text-muted-foreground">Manage your chart of accounts structure</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setLocation('/setup')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Setup
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation('/finance/chart-of-accounts')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Account
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts Management</CardTitle>
          <CardDescription>
            Edit, delete, or update elements in your chart of accounts structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sub-element-groups">Sub-Element Groups</TabsTrigger>
              <TabsTrigger value="detailed-groups">Detailed Groups</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
            </TabsList>
            
            {/* Sub-Element Groups Tab */}
            <TabsContent value="sub-element-groups">
              <div className="border rounded-md">
                {subElementGroupsLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                    <p>Loading sub-element groups...</p>
                  </div>
                ) : !subElementGroupsData || !Array.isArray(subElementGroupsData) || subElementGroupsData.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No sub-element groups found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Element Group</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subElementGroupsData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.customName || formatName(item.name)}</TableCell>
                          <TableCell>{item.code}</TableCell>
                          <TableCell>{getElementGroupName(item.elementGroupId)}</TableCell>
                          <TableCell>{item.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditSubElementGroup(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteItem(item, 'sub-element-groups')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
            
            {/* Detailed Groups Tab */}
            <TabsContent value="detailed-groups">
              <div className="border rounded-md">
                {detailedGroupsLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                    <p>Loading detailed groups...</p>
                  </div>
                ) : !detailedGroupsData || !Array.isArray(detailedGroupsData) || detailedGroupsData.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No detailed groups found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Sub-Element Group</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedGroupsData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.customName || formatName(item.name)}</TableCell>
                          <TableCell>{item.code}</TableCell>
                          <TableCell>{getSubElementGroupName(item.subElementGroupId)}</TableCell>
                          <TableCell>{item.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditDetailedGroup(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteItem(item, 'detailed-groups')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
            
            {/* Accounts Tab */}
            <TabsContent value="accounts">
              <div className="border rounded-md">
                {accountsLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                    <p>Loading accounts...</p>
                  </div>
                ) : !accountsData || !Array.isArray(accountsData) || accountsData.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No accounts found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Account Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Opening Balance</TableHead>
                        <TableHead>Current Balance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountsData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.accountName}</TableCell>
                          <TableCell>{item.accountCode || '-'}</TableCell>
                          <TableCell className="capitalize">{item.accountType}</TableCell>
                          <TableCell>{parseFloat(item.openingBalance).toFixed(2)}</TableCell>
                          <TableCell>{parseFloat(item.currentBalance).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditAccount(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteItem(item, 'accounts')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeTab === 'sub-element-groups' ? 'Edit Sub-Element Group' : 
               activeTab === 'detailed-groups' ? 'Edit Detailed Group' : 'Edit Account'}
            </DialogTitle>
            <DialogDescription>
              Make changes to the selected item and save your updates.
            </DialogDescription>
          </DialogHeader>
          
          {activeTab === 'sub-element-groups' && (
            <Form {...subElementGroupForm}>
              <form onSubmit={subElementGroupForm.handleSubmit(handleSubmitSubElementGroup)} className="space-y-4">
                <FormField
                  control={subElementGroupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={subElementGroupForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={subElementGroupForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter description (optional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={subElementGroupForm.control}
                  name="elementGroupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Element Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select element group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {elementGroupsData && Array.isArray(elementGroupsData) && elementGroupsData.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.customName || formatName(group.name)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateSubElementGroupMutation.isPending}>
                    {updateSubElementGroupMutation.isPending ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
          
          {activeTab === 'detailed-groups' && (
            <Form {...detailedGroupForm}>
              <form onSubmit={detailedGroupForm.handleSubmit(handleSubmitDetailedGroup)} className="space-y-4">
                <FormField
                  control={detailedGroupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={detailedGroupForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={detailedGroupForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter description (optional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={detailedGroupForm.control}
                  name="subElementGroupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-Element Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sub-element group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subElementGroupsData && Array.isArray(subElementGroupsData) && subElementGroupsData.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.customName || formatName(group.name)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateDetailedGroupMutation.isPending}>
                    {updateDetailedGroupMutation.isPending ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
          
          {activeTab === 'accounts' && (
            <Form {...accountForm}>
              <form onSubmit={accountForm.handleSubmit(handleSubmitAccount)} className="space-y-4">
                <FormField
                  control={accountForm.control}
                  name="accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name (AC Head)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter account name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={accountForm.control}
                  name="accountCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter account code (optional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={accountForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter description (optional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={accountForm.control}
                  name="openingBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Balance</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={accountForm.control}
                  name="detailedGroupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select detailed group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {detailedGroupsData && Array.isArray(detailedGroupsData) && detailedGroupsData.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.customName || formatName(group.name)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateAccountMutation.isPending}>
                    {updateAccountMutation.isPending ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activeTab === 'sub-element-groups' ? 'Delete Sub-Element Group' : 
               activeTab === 'detailed-groups' ? 'Delete Detailed Group' : 'Delete Account'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {
                activeTab === 'sub-element-groups' ? 'sub-element group' : 
                activeTab === 'detailed-groups' ? 'detailed group' : 'account'
              }? This action cannot be undone.
              {activeTab === 'sub-element-groups' && (
                <p className="mt-2 text-red-500">Warning: This will also delete all detailed groups and accounts associated with this sub-element group.</p>
              )}
              {activeTab === 'detailed-groups' && (
                <p className="mt-2 text-red-500">Warning: This will also delete all accounts associated with this detailed group.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}