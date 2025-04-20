import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Edit, Save, X, Trash2, PlusCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Schema for editing sub-element groups
const editSubElementGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  customName: z.string().optional(),
  elementGroupId: z.string().min(1, "Element Group is required"),
});

// Schema for editing detailed groups
const editDetailedGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  customName: z.string().optional(),
  code: z.string().min(1, "Code is required"),
  subElementGroupId: z.string().min(1, "Sub-Element Group is required"),
});

// Schema for editing accounts
const editAccountSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  accountCode: z.string().min(1, "Account code is required"),
  description: z.string().optional(),
  openingBalance: z.string().default("0"),
  detailedGroupId: z.string().min(1, "Detailed group is required"),
});

export default function COAConfigurationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Tab state
  const [activeTab, setActiveTab] = useState("sub-element-groups");
  
  // Edit dialog states
  const [isSubElementEditOpen, setIsSubElementEditOpen] = useState(false);
  const [isDetailedGroupEditOpen, setIsDetailedGroupEditOpen] = useState(false);
  const [isAccountEditOpen, setIsAccountEditOpen] = useState(false);
  
  // Delete confirmation dialog state
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: number, type: string} | null>(null);
  
  // Item being edited state
  const [editingSubElement, setEditingSubElement] = useState<any>(null);
  const [editingDetailedGroup, setEditingDetailedGroup] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  
  // Forms
  const subElementForm = useForm<z.infer<typeof editSubElementGroupSchema>>({
    resolver: zodResolver(editSubElementGroupSchema),
    defaultValues: {
      name: "",
      customName: "",
      elementGroupId: "",
    },
  });
  
  const detailedGroupForm = useForm<z.infer<typeof editDetailedGroupSchema>>({
    resolver: zodResolver(editDetailedGroupSchema),
    defaultValues: {
      name: "",
      customName: "",
      code: "",
      subElementGroupId: "",
    },
  });
  
  const accountForm = useForm<z.infer<typeof editAccountSchema>>({
    resolver: zodResolver(editAccountSchema),
    defaultValues: {
      accountName: "",
      accountType: "asset",
      accountCode: "",
      description: "",
      openingBalance: "0",
      detailedGroupId: "",
    },
  });
  
  // Queries for getting data
  const { 
    data: mainGroupsData, 
    isLoading: isMainGroupsLoading 
  } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/main-groups'],
    retry: 1,
  });
  
  const { 
    data: elementGroupsData, 
    isLoading: isElementGroupsLoading 
  } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/element-groups'],
    retry: 1,
  });
  
  const { 
    data: subElementGroupsData, 
    isLoading: isSubElementGroupsLoading,
    refetch: refetchSubElementGroups
  } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'],
    retry: 1,
  });
  
  const { 
    data: detailedGroupsData, 
    isLoading: isDetailedGroupsLoading,
    refetch: refetchDetailedGroups
  } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'],
    retry: 1,
  });
  
  const { 
    data: accountsData, 
    isLoading: isAccountsLoading,
    refetch: refetchAccounts
  } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
    retry: 1,
  });
  
  // Mutations for updating
  const updateSubElementGroupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof editSubElementGroupSchema> & { id: number }) => {
      const { id, ...updateData } = values;
      return apiRequest('PATCH', `/api/v1/finance/chart-of-accounts/sub-element-groups/${id}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "Sub-Element Group Updated",
        description: "The sub-element group has been updated successfully.",
      });
      refetchSubElementGroups();
      setIsSubElementEditOpen(false);
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
    mutationFn: async (values: z.infer<typeof editDetailedGroupSchema> & { id: number }) => {
      const { id, ...updateData } = values;
      return apiRequest('PATCH', `/api/v1/finance/chart-of-accounts/detailed-groups/${id}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "Detailed Group Updated",
        description: "The detailed group has been updated successfully.",
      });
      refetchDetailedGroups();
      setIsDetailedGroupEditOpen(false);
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
    mutationFn: async (values: z.infer<typeof editAccountSchema> & { id: number }) => {
      const { id, ...updateData } = values;
      return apiRequest('PATCH', `/api/v1/finance/chart-of-accounts/${id}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "Account Updated",
        description: "The account has been updated successfully.",
      });
      refetchAccounts();
      setIsAccountEditOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Account",
        description: error.message || "Failed to update account",
        variant: "destructive",
      });
    },
  });
  
  // Mutations for deleting
  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number, type: string }) => {
      let endpoint = '';
      
      switch (type) {
        case 'subElement':
          endpoint = `/api/v1/finance/chart-of-accounts/sub-element-groups/${id}`;
          break;
        case 'detailedGroup':
          endpoint = `/api/v1/finance/chart-of-accounts/detailed-groups/${id}`;
          break;
        case 'account':
          endpoint = `/api/v1/finance/chart-of-accounts/${id}`;
          break;
        default:
          throw new Error("Invalid item type for deletion");
      }
      
      return apiRequest('DELETE', endpoint);
    },
    onSuccess: (_, variables) => {
      let message = '';
      
      switch (variables.type) {
        case 'subElement':
          message = 'Sub-Element Group deleted successfully';
          refetchSubElementGroups();
          break;
        case 'detailedGroup':
          message = 'Detailed Group deleted successfully';
          refetchDetailedGroups();
          break;
        case 'account':
          message = 'Account deleted successfully';
          refetchAccounts();
          break;
      }
      
      toast({
        title: "Deleted",
        description: message,
      });
      
      setIsDeleteAlertOpen(false);
      setItemToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item. It may be in use by other records.",
        variant: "destructive",
      });
      setIsDeleteAlertOpen(false);
    },
  });
  
  // Handlers
  const handleEditSubElement = (item: any) => {
    setEditingSubElement(item);
    subElementForm.reset({
      name: item.name,
      customName: item.customName || "",
      elementGroupId: item.elementGroupId.toString(),
    });
    setIsSubElementEditOpen(true);
  };
  
  const handleEditDetailedGroup = (item: any) => {
    setEditingDetailedGroup(item);
    detailedGroupForm.reset({
      name: item.name,
      customName: item.customName || "",
      code: item.code,
      subElementGroupId: item.subElementGroupId.toString(),
    });
    setIsDetailedGroupEditOpen(true);
  };
  
  const handleEditAccount = (item: any) => {
    setEditingAccount(item);
    accountForm.reset({
      accountName: item.accountName,
      accountType: item.accountType,
      accountCode: item.accountCode,
      description: item.description || "",
      openingBalance: item.openingBalance,
      detailedGroupId: item.detailedGroupId?.toString() || "",
    });
    setIsAccountEditOpen(true);
  };
  
  const handleDeleteItem = (id: number, type: string) => {
    setItemToDelete({ id, type });
    setIsDeleteAlertOpen(true);
  };
  
  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItemMutation.mutate(itemToDelete);
    }
  };
  
  const onSubElementFormSubmit = (values: z.infer<typeof editSubElementGroupSchema>) => {
    if (editingSubElement) {
      updateSubElementGroupMutation.mutate({ ...values, id: editingSubElement.id });
    }
  };
  
  const onDetailedGroupFormSubmit = (values: z.infer<typeof editDetailedGroupSchema>) => {
    if (editingDetailedGroup) {
      updateDetailedGroupMutation.mutate({ ...values, id: editingDetailedGroup.id });
    }
  };
  
  const onAccountFormSubmit = (values: z.infer<typeof editAccountSchema>) => {
    if (editingAccount) {
      updateAccountMutation.mutate({ ...values, id: editingAccount.id });
    }
  };
  
  // Helper for element group names
  const getElementGroupName = (id: number) => {
    if (!elementGroupsData) return "Loading...";
    const group = elementGroupsData.find((group: any) => group.id === id);
    return group ? (group.customName || group.name) : "Unknown";
  };
  
  // Helper for sub-element group names
  const getSubElementGroupName = (id: number) => {
    if (!subElementGroupsData) return "Loading...";
    const group = subElementGroupsData.find((group: any) => group.id === id);
    return group ? (group.customName || group.name) : "Unknown";
  };
  
  // Helper for detailed group names
  const getDetailedGroupName = (id: number) => {
    if (!detailedGroupsData) return "Loading...";
    const group = detailedGroupsData.find((group: any) => group.id === id);
    return group ? (group.customName || group.name) : "Unknown";
  };
  
  // Loading states
  const isLoading = isMainGroupsLoading || isElementGroupsLoading || 
                   isSubElementGroupsLoading || isDetailedGroupsLoading ||
                   isAccountsLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3">Loading...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts Configuration</CardTitle>
          <CardDescription>
            Configure your Chart of Accounts structure. You can edit or delete Sub-Element Groups, Detailed Groups, and Accounts here.
            For adding new items, please use the Chart of Accounts section in the Finance Module.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="sub-element-groups" onValueChange={setActiveTab} value={activeTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sub-element-groups">Sub-Element Groups</TabsTrigger>
              <TabsTrigger value="detailed-groups">Detailed Groups</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
            </TabsList>
            
            {/* Sub-Element Groups Tab */}
            <TabsContent value="sub-element-groups">
              <div className="rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Custom Name</TableHead>
                      <TableHead>Element Group</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subElementGroupsData && subElementGroupsData.length > 0 ? (
                      subElementGroupsData.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.customName || "-"}</TableCell>
                          <TableCell>{getElementGroupName(item.elementGroupId)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditSubElement(item)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id, 'subElement')}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          No sub-element groups found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchSubElementGroups()}
                  className="flex items-center"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
              </div>
            </TabsContent>
            
            {/* Detailed Groups Tab */}
            <TabsContent value="detailed-groups">
              <div className="rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Custom Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Sub-Element Group</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedGroupsData && detailedGroupsData.length > 0 ? (
                      detailedGroupsData.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.customName || "-"}</TableCell>
                          <TableCell>{item.code}</TableCell>
                          <TableCell>{getSubElementGroupName(item.subElementGroupId)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditDetailedGroup(item)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id, 'detailedGroup')}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No detailed groups found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchDetailedGroups()}
                  className="flex items-center"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
              </div>
            </TabsContent>
            
            {/* Accounts Tab */}
            <TabsContent value="accounts">
              <div className="rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Detailed Group</TableHead>
                      <TableHead>Opening Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsData && accountsData.length > 0 ? (
                      accountsData.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.accountName}</TableCell>
                          <TableCell>{item.accountCode}</TableCell>
                          <TableCell className="capitalize">{item.accountType}</TableCell>
                          <TableCell>{item.detailedGroupId ? getDetailedGroupName(item.detailedGroupId) : "-"}</TableCell>
                          <TableCell>{parseFloat(item.openingBalance).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditAccount(item)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id, 'account')}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No accounts found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchAccounts()}
                  className="flex items-center"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Sub-Element Group Edit Dialog */}
      <Dialog open={isSubElementEditOpen} onOpenChange={setIsSubElementEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sub-Element Group</DialogTitle>
            <DialogDescription>
              Update the details of this sub-element group.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...subElementForm}>
            <form onSubmit={subElementForm.handleSubmit(onSubElementFormSubmit)} className="space-y-4">
              <FormField
                control={subElementForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={subElementForm.control}
                name="customName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Display Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter custom display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={subElementForm.control}
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
                        {elementGroupsData && elementGroupsData.map((group: any) => (
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
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsSubElementEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSubElementGroupMutation.isPending}>
                  {updateSubElementGroupMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span> Updating...
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
        </DialogContent>
      </Dialog>
      
      {/* Detailed Group Edit Dialog */}
      <Dialog open={isDetailedGroupEditOpen} onOpenChange={setIsDetailedGroupEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Detailed Group</DialogTitle>
            <DialogDescription>
              Update the details of this detailed group.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...detailedGroupForm}>
            <form onSubmit={detailedGroupForm.handleSubmit(onDetailedGroupFormSubmit)} className="space-y-4">
              <FormField
                control={detailedGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={detailedGroupForm.control}
                name="customName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Display Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter custom display name" {...field} />
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
                      <Input placeholder="Enter code" {...field} />
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
                        {subElementGroupsData && subElementGroupsData.map((group: any) => (
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
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDetailedGroupEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateDetailedGroupMutation.isPending}>
                  {updateDetailedGroupMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span> Updating...
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
        </DialogContent>
      </Dialog>
      
      {/* Account Edit Dialog */}
      <Dialog open={isAccountEditOpen} onOpenChange={setIsAccountEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update the details of this account.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...accountForm}>
            <form onSubmit={accountForm.handleSubmit(onAccountFormSubmit)} className="space-y-4">
              <FormField
                control={accountForm.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter account name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={accountForm.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Input placeholder="Enter account code" {...field} />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter description" {...field} />
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
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
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
                        {detailedGroupsData && detailedGroupsData.map((group: any) => (
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
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAccountEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateAccountMutation.isPending}>
                  {updateAccountMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span> Updating...
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
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected item
              and may affect related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}