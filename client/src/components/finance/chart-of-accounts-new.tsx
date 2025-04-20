import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Save, 
  Plus,
  Trash2,
  PlusCircle,
  Edit,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

// Chart of Account schemas
const accountSchema = z.object({
  detailedGroupId: z.number().optional(),
  accountName: z.string().min(1, "Account name is required"),
  accountType: z.string().optional(),
  description: z.string().optional().nullable(),
  openingBalance: z.string().default("0.00"),
});

// New schemas for adding hierarchy groups
const newDetailedGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  subElementGroupId: z.number(),
  description: z.string().optional(),
});

export default function ChartOfAccountsNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedSubElementGroupId, setSelectedSubElementGroupId] = useState<number | null>(null);
  const [selectedDetailedGroupId, setSelectedDetailedGroupId] = useState<number | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteDetailedDialogOpen, setDeleteDetailedDialogOpen] = useState<boolean>(false);
  const [detailedGroupToDelete, setDetailedGroupToDelete] = useState<number | null>(null);

  // Mode selection
  const [showCreateAccount, setShowCreateAccount] = useState<boolean>(true);
  const [showCreateDetailedGroup, setShowCreateDetailedGroup] = useState<boolean>(false);
  
  // For editing
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editingDetailedGroup, setEditingDetailedGroup] = useState<any>(null);

  // Fetch data from API
  const { data: subElementGroups = [], refetch: refetchSubElementGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'],
    refetchOnWindowFocus: false,
  });

  const { data: detailedGroups = [], refetch: refetchDetailedGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'],
    refetchOnWindowFocus: false,
  });

  const { data: chartOfAccounts = [], refetch: refetchAccounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts', { includeSystemAccounts: false }],
    refetchOnWindowFocus: false,
  });

  // Forms
  const accountForm = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountName: '',
      description: '',
      openingBalance: '0.00',
    },
  });

  const detailedGroupForm = useForm<z.infer<typeof newDetailedGroupSchema>>({
    resolver: zodResolver(newDetailedGroupSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  });

  // Reset form when editing mode changes
  useEffect(() => {
    if (editingAccount) {
      accountForm.reset({
        accountName: editingAccount.accountName,
        description: editingAccount.description || '',
        openingBalance: editingAccount.openingBalance || '0.00',
        accountType: editingAccount.accountType,
        detailedGroupId: editingAccount.detailedGroupId,
      });
      
      if (editingAccount.detailedGroupId) {
        setSelectedDetailedGroupId(editingAccount.detailedGroupId);
        
        // Find the parent sub-element group
        const detailedGroup = detailedGroups.find((g: any) => g.id === editingAccount.detailedGroupId);
        if (detailedGroup) {
          setSelectedSubElementGroupId(detailedGroup.subElementGroupId);
        }
      }
      
      if (editingAccount.accountType) {
        setSelectedAccountType(editingAccount.accountType);
      }
    } else {
      accountForm.reset({
        accountName: '',
        description: '',
        openingBalance: '0.00',
      });
    }
  }, [editingAccount, accountForm, detailedGroups]);

  // Reset detailed group form when editing mode changes
  useEffect(() => {
    if (editingDetailedGroup) {
      detailedGroupForm.reset({
        name: editingDetailedGroup.name,
        code: editingDetailedGroup.code,
        description: editingDetailedGroup.description || '',
        subElementGroupId: editingDetailedGroup.subElementGroupId,
      });
      
      if (editingDetailedGroup.subElementGroupId) {
        setSelectedSubElementGroupId(editingDetailedGroup.subElementGroupId);
      }
    } else {
      detailedGroupForm.reset({
        name: '',
        code: '',
        description: '',
      });
    }
  }, [editingDetailedGroup, detailedGroupForm]);

  // Set sub element group ID when creating a detailed group
  useEffect(() => {
    if (showCreateDetailedGroup && selectedSubElementGroupId) {
      detailedGroupForm.setValue('subElementGroupId', selectedSubElementGroupId);
    }
  }, [showCreateDetailedGroup, selectedSubElementGroupId, detailedGroupForm]);

  // Mutations
  const createAccount = useMutation({
    mutationFn: (data: any) => {
      return apiRequest(`/api/v1/finance/chart-of-accounts`, {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingAccount ? "Account updated successfully" : "Account created successfully",
      });
      refetchAccounts();
      accountForm.reset({
        accountName: '',
        description: '',
        openingBalance: '0.00',
      });
      setEditingAccount(null);
    },
    onError: (error: any) => {
      console.error('Error with account:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to process account",
        variant: "destructive",
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/v1/finance/chart-of-accounts/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
      refetchAccounts();
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const createDetailedGroup = useMutation({
    mutationFn: (data: any) => {
      return apiRequest(`/api/v1/finance/chart-of-accounts/detailed-groups`, {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingDetailedGroup ? "Detailed group updated successfully" : "Detailed group created successfully",
      });
      refetchDetailedGroups();
      detailedGroupForm.reset({
        name: '',
        code: '',
        description: '',
      });
      setEditingDetailedGroup(null);
      setShowCreateDetailedGroup(false);
      setShowCreateAccount(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to process detailed group",
        variant: "destructive",
      });
    },
  });

  const deleteDetailedGroup = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/v1/finance/chart-of-accounts/detailed-groups/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Detailed group deleted successfully",
      });
      refetchDetailedGroups();
      setDeleteDetailedDialogOpen(false);
      setDetailedGroupToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete detailed group",
        variant: "destructive",
      });
    },
  });

  // Submit handlers
  const handleAccountSubmit = (data: z.infer<typeof accountSchema>) => {
    const completeData = {
      ...data,
      detailedGroupId: selectedDetailedGroupId,
      accountType: selectedAccountType,
    };

    if (editingAccount) {
      createAccount.mutate({
        ...completeData,
        id: editingAccount.id,
      });
    } else {
      createAccount.mutate(completeData);
    }
  };

  const handleDetailedGroupSubmit = (data: z.infer<typeof newDetailedGroupSchema>) => {
    if (editingDetailedGroup) {
      createDetailedGroup.mutate({
        ...data,
        id: editingDetailedGroup.id,
      });
    } else {
      createDetailedGroup.mutate(data);
    }
  };

  // Filtered detailed groups based on selected sub-element group
  const filteredDetailedGroups = detailedGroups.filter((group: any) => 
    group.subElementGroupId === selectedSubElementGroupId
  );

  // Format currency
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  // Helper to get account type display name
  const getAccountTypeDisplay = (type: string) => {
    const types: {[key: string]: string} = {
      'asset': 'Asset',
      'liability': 'Liability',
      'equity': 'Equity',
      'revenue': 'Revenue',
      'expense': 'Expense'
    };
    return types[type] || type;
  };

  // Get readable name from snake_case
  const formatName = (name: string) => {
    if (!name) return '';
    return name.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>
                Manage your financial account structure
              </CardDescription>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateAccount(true);
                  setShowCreateDetailedGroup(false);
                  setEditingAccount(null);
                  setEditingDetailedGroup(null);
                }}
              >
                {showCreateAccount ? (
                  <RefreshCw className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Account
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateAccount(false);
                  setShowCreateDetailedGroup(true);
                  setEditingAccount(null);
                  setEditingDetailedGroup(null);
                }}
              >
                {showCreateDetailedGroup ? (
                  <RefreshCw className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Detailed Group
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setLocation('/finance')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {showCreateAccount && (
            <Card className="mb-6 border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {editingAccount ? 'Edit Account' : 'Create New Account'}
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <Form {...accountForm}>
                  <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <FormLabel>Sub-Element Group</FormLabel>
                        <Select
                          value={selectedSubElementGroupId?.toString() || ''}
                          onValueChange={(value) => {
                            setSelectedSubElementGroupId(parseInt(value));
                            setSelectedDetailedGroupId(null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sub-Element Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {subElementGroups.map((group: any) => (
                              <SelectItem 
                                key={group.id} 
                                value={group.id.toString()}
                              >
                                {formatName(group.name)} ({group.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <FormLabel>Detailed Group</FormLabel>
                        <Select
                          value={selectedDetailedGroupId?.toString() || ''}
                          onValueChange={(value) => {
                            setSelectedDetailedGroupId(parseInt(value));
                          }}
                          disabled={!selectedSubElementGroupId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedSubElementGroupId ? "Select Detailed Group" : "First select a Sub-Element Group"} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredDetailedGroups.map((group: any) => (
                              <SelectItem 
                                key={group.id} 
                                value={group.id.toString()}
                              >
                                {formatName(group.name)} ({group.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <FormLabel>Account Type</FormLabel>
                        <Select
                          value={selectedAccountType || ''}
                          onValueChange={setSelectedAccountType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Account Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asset">Asset</SelectItem>
                            <SelectItem value="liability">Liability</SelectItem>
                            <SelectItem value="equity">Equity</SelectItem>
                            <SelectItem value="revenue">Revenue</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <FormField
                          control={accountForm.control}
                          name="accountName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Cash in Hand" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={accountForm.control}
                          name="openingBalance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Opening Balance</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="0.00" 
                                  {...field} 
                                  type="number" 
                                  step="0.01"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <FormField
                      control={accountForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter account description" 
                              className="resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2">
                      {editingAccount && (
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingAccount(null);
                            accountForm.reset({
                              accountName: '',
                              description: '',
                              openingBalance: '0.00',
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                      
                      <Button 
                        type="submit"
                        disabled={
                          !selectedDetailedGroupId || 
                          !selectedAccountType || 
                          createAccount.isPending || 
                          !accountForm.formState.isValid
                        }
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {editingAccount ? 'Update' : 'Save'} Account
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
          
          {showCreateDetailedGroup && (
            <Card className="mb-6 border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {editingDetailedGroup ? 'Edit Detailed Group' : 'Create New Detailed Group'}
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <Form {...detailedGroupForm}>
                  <form onSubmit={detailedGroupForm.handleSubmit(handleDetailedGroupSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <FormLabel>Sub-Element Group</FormLabel>
                        <Select
                          value={selectedSubElementGroupId?.toString() || ''}
                          onValueChange={(value) => {
                            const id = parseInt(value);
                            setSelectedSubElementGroupId(id);
                            detailedGroupForm.setValue('subElementGroupId', id);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sub-Element Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {subElementGroups.map((group: any) => (
                              <SelectItem 
                                key={group.id} 
                                value={group.id.toString()}
                              >
                                {formatName(group.name)} ({group.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <FormField
                          control={detailedGroupForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Trade Debtors" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={detailedGroupForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. TD" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <FormField
                      control={detailedGroupForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter group description" 
                              className="resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2">
                      {editingDetailedGroup && (
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingDetailedGroup(null);
                            detailedGroupForm.reset({
                              name: '',
                              code: '',
                              description: '',
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                      
                      <Button 
                        type="submit"
                        disabled={
                          !selectedSubElementGroupId || 
                          createDetailedGroup.isPending || 
                          !detailedGroupForm.formState.isValid
                        }
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {editingDetailedGroup ? 'Update' : 'Save'} Detailed Group
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
          
          {/* Lists */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <Card className="md:col-span-4">
              <CardHeader>
                <CardTitle className="text-lg">Detailed Groups</CardTitle>
                <CardDescription>
                  Manage your chart of accounts structure
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 pb-2">
                  <Select
                    value={selectedSubElementGroupId?.toString() || ''}
                    onValueChange={(value) => setSelectedSubElementGroupId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Sub-Element Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {subElementGroups.map((group: any) => (
                        <SelectItem 
                          key={group.id} 
                          value={group.id.toString()}
                        >
                          {formatName(group.name)} ({group.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDetailedGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                            {selectedSubElementGroupId 
                              ? "No detailed groups found" 
                              : "Select a sub-element group to view detailed groups"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDetailedGroups.map((group: any) => (
                          <TableRow key={group.id}>
                            <TableCell>{formatName(group.name)}</TableCell>
                            <TableCell>{group.code}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingDetailedGroup(group);
                                  setShowCreateAccount(false);
                                  setShowCreateDetailedGroup(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDetailedGroupToDelete(group.id);
                                  setDeleteDetailedDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-8">
              <CardHeader>
                <CardTitle className="text-lg">Chart of Accounts</CardTitle>
                <CardDescription>
                  Your financial account structure
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  <Select
                    value={selectedAccountType || ''}
                    onValueChange={(value) => setSelectedAccountType(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by Account Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="asset">Assets</SelectItem>
                      <SelectItem value="liability">Liabilities</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    size="default" 
                    onClick={() => refetchAccounts()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingAccounts ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            Loading accounts...
                          </TableCell>
                        </TableRow>
                      ) : chartOfAccounts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                            No accounts found. Create your first account above.
                          </TableCell>
                        </TableRow>
                      ) : (
                        chartOfAccounts
                          .filter((account: any) => !selectedAccountType || account.accountType === selectedAccountType)
                          .map((account: any) => (
                            <TableRow key={account.id}>
                              <TableCell className="font-mono">{account.accountCode}</TableCell>
                              <TableCell>{account.accountName}</TableCell>
                              <TableCell>{getAccountTypeDisplay(account.accountType)}</TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(account.currentBalance)}
                              </TableCell>
                              <TableCell className="text-right space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingAccount(account);
                                    setShowCreateAccount(true);
                                    setShowCreateDetailedGroup(false);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setAccountToDelete(account.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this account? This action cannot be undone
              and may affect existing journal entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (accountToDelete) {
                  deleteAccount.mutate(accountToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Detailed Group Confirmation Dialog */}
      <AlertDialog open={deleteDetailedDialogOpen} onOpenChange={setDeleteDetailedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Detailed Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this detailed group? This action cannot be undone
              and may affect existing accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (detailedGroupToDelete) {
                  deleteDetailedGroup.mutate(detailedGroupToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDetailedGroup.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}