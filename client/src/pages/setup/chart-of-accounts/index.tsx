import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ArrowLeft, Edit, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Type definitions for Chart of Accounts entities
interface ChartOfAccountsMainGroup {
  id: number;
  name: string;
  code: string;
}

interface ChartOfAccountsElementGroup {
  id: number;
  mainGroupId: number;
  name: string;
  code: string;
}

interface ChartOfAccountsSubElementGroup {
  id: number;
  elementGroupId: number;
  name: string;
  customName?: string | null;
  code: string;
  description?: string | null;
}

interface ChartOfAccountsDetailedGroup {
  id: number;
  subElementGroupId: number;
  name: string;
  customName?: string | null;
  code: string;
  description?: string | null;
}

interface ChartOfAccount {
  id: number;
  detailedGroupId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  description?: string | null;
}

// Main interface combining all levels for table display
interface COARow {
  id?: number;
  mainGroup?: string;
  elementGroup?: string;
  elementGroupId?: number;
  subElementGroup?: string;
  subElementGroupId?: number;
  detailedGroup?: string;
  detailedGroupId?: number;
  accountId?: number;
  accountCode?: string;
  accountName?: string;
}

// Account form validation schema
const accountFormSchema = z.object({
  elementGroupId: z.string().min(1, "Element Group is required"),
  subElementGroupId: z.string().min(1, "Sub Element Group is required"),
  detailedGroupId: z.string().min(1, "Detailed Group is required"),
  accountCode: z.string().min(1, "Account Code is required"),
  accountName: z.string().min(1, "Account Name is required"),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

// Sub Element Group form validation schema
const subElementGroupFormSchema = z.object({
  elementGroupId: z.string().min(1, "Element Group is required"),
  name: z.string().min(1, "Name is required"),
  customName: z.string().optional(),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
});

// Detailed Group form validation schema
const detailedGroupFormSchema = z.object({
  subElementGroupId: z.string().min(1, "Sub Element Group is required"),
  name: z.string().min(1, "Name is required"),
  customName: z.string().optional(),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
});

export default function ChartOfAccountsSetupPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filter state
  const [accountType, setAccountType] = useState<"balance_sheet" | "profit_and_loss">("balance_sheet");
  
  // Dialog states
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showSubElementGroupDialog, setShowSubElementGroupDialog] = useState(false);
  const [showDetailedGroupDialog, setShowDetailedGroupDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: number, type: string} | null>(null);
  
  // Editing state
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Data queries
  const { data: mainGroups = [], isLoading: mainGroupsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/main-groups'],
    refetchOnWindowFocus: false,
  });
  
  const { data: elementGroups = [], isLoading: elementGroupsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/element-groups'],
    refetchOnWindowFocus: false,
  });
  
  const { data: subElementGroups = [], isLoading: subElementGroupsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'],
    refetchOnWindowFocus: false,
  });
  
  const { data: detailedGroups = [], isLoading: detailedGroupsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'],
    refetchOnWindowFocus: false,
  });
  
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
    refetchOnWindowFocus: false,
  });
  
  // Form for account creation/editing
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      elementGroupId: "",
      subElementGroupId: "",
      detailedGroupId: "",
      accountCode: "",
      accountName: "",
    },
  });
  
  // Form for sub element group creation/editing
  const subElementGroupForm = useForm({
    resolver: zodResolver(subElementGroupFormSchema),
    defaultValues: {
      elementGroupId: "",
      name: "",
      customName: "",
      code: "",
      description: "",
    },
  });
  
  // Form for detailed group creation/editing
  const detailedGroupForm = useForm({
    resolver: zodResolver(detailedGroupFormSchema),
    defaultValues: {
      subElementGroupId: "",
      name: "",
      customName: "",
      code: "",
      description: "",
    },
  });
  
  // Reset forms when closing dialogs
  useEffect(() => {
    if (!showAccountDialog) {
      accountForm.reset();
      setEditingItem(null);
    }
  }, [showAccountDialog, accountForm]);
  
  useEffect(() => {
    if (!showSubElementGroupDialog) {
      subElementGroupForm.reset();
      setEditingItem(null);
    }
  }, [showSubElementGroupDialog, subElementGroupForm]);
  
  useEffect(() => {
    if (!showDetailedGroupDialog) {
      detailedGroupForm.reset();
      setEditingItem(null);
    }
  }, [showDetailedGroupDialog, detailedGroupForm]);
  
  // Set form values when editing an item
  useEffect(() => {
    if (editingItem && showAccountDialog) {
      accountForm.reset({
        elementGroupId: String(editingItem.elementGroupId || ""),
        subElementGroupId: String(editingItem.subElementGroupId || ""),
        detailedGroupId: String(editingItem.detailedGroupId || ""),
        accountCode: editingItem.accountCode || "",
        accountName: editingItem.accountName || "",
      });
    } else if (editingItem && showSubElementGroupDialog) {
      subElementGroupForm.reset({
        elementGroupId: String(editingItem.elementGroupId || ""),
        name: editingItem.name || "",
        customName: editingItem.customName || "",
        code: editingItem.code || "",
        description: editingItem.description || "",
      });
    } else if (editingItem && showDetailedGroupDialog) {
      detailedGroupForm.reset({
        subElementGroupId: String(editingItem.subElementGroupId || ""),
        name: editingItem.name || "",
        customName: editingItem.customName || "",
        code: editingItem.code || "",
        description: editingItem.description || "",
      });
    }
  }, [editingItem, showAccountDialog, showSubElementGroupDialog, showDetailedGroupDialog, accountForm, subElementGroupForm, detailedGroupForm]);
  
  // Set filtered element groups based on selected main group type
  const filteredMainGroups = mainGroups.filter((mg: ChartOfAccountsMainGroup) => 
    mg.name === accountType
  );
  
  const filteredElementGroups = elementGroups.filter((eg: ChartOfAccountsElementGroup) => 
    filteredMainGroups.some((mg: ChartOfAccountsMainGroup) => mg.id === eg.mainGroupId)
  );
  
  // Filter sub-element groups based on filtered element groups
  const filteredSubElementGroups = subElementGroups.filter((seg: ChartOfAccountsSubElementGroup) => 
    filteredElementGroups.some((eg: ChartOfAccountsElementGroup) => eg.id === seg.elementGroupId)
  );
  
  // Filter detailed groups based on filtered sub-element groups
  const filteredDetailedGroups = detailedGroups.filter((dg: ChartOfAccountsDetailedGroup) => 
    filteredSubElementGroups.some((seg: ChartOfAccountsSubElementGroup) => seg.id === dg.subElementGroupId)
  );
  
  // Filter accounts based on filtered detailed groups
  const filteredAccounts = accounts.filter((acc: ChartOfAccount) => 
    filteredDetailedGroups.some((dg: ChartOfAccountsDetailedGroup) => dg.id === acc.detailedGroupId)
  );
  
  // Mutations for CRUD operations
  const createAccountMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("POST", "/api/v1/finance/chart-of-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      setShowAccountDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });
  
  const updateAccountMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("PATCH", `/api/v1/finance/chart-of-accounts/${editingItem.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      toast({
        title: "Success",
        description: "Account updated successfully",
      });
      setShowAccountDialog(false);
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account",
        variant: "destructive",
      });
    },
  });
  
  const deleteAccountMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/v1/finance/chart-of-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });
  
  const createSubElementGroupMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("POST", "/api/v1/finance/chart-of-accounts/sub-element-groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'] });
      toast({
        title: "Success",
        description: "Sub Element Group created successfully",
      });
      setShowSubElementGroupDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Sub Element Group",
        variant: "destructive",
      });
    },
  });
  
  const updateSubElementGroupMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("PATCH", `/api/v1/finance/chart-of-accounts/sub-element-groups/${editingItem.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'] });
      toast({
        title: "Success",
        description: "Sub Element Group updated successfully",
      });
      setShowSubElementGroupDialog(false);
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Sub Element Group",
        variant: "destructive",
      });
    },
  });
  
  const deleteSubElementGroupMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/v1/finance/chart-of-accounts/sub-element-groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'] });
      toast({
        title: "Success",
        description: "Sub Element Group deleted successfully",
      });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Sub Element Group",
        variant: "destructive",
      });
    },
  });
  
  const createDetailedGroupMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("/api/v1/finance/chart-of-accounts/detailed-groups", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'] });
      toast({
        title: "Success",
        description: "Detailed Group created successfully",
      });
      setShowDetailedGroupDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Detailed Group",
        variant: "destructive",
      });
    },
  });
  
  const updateDetailedGroupMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/v1/finance/chart-of-accounts/detailed-groups/${editingItem.id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'] });
      toast({
        title: "Success",
        description: "Detailed Group updated successfully",
      });
      setShowDetailedGroupDialog(false);
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Detailed Group",
        variant: "destructive",
      });
    },
  });
  
  const deleteDetailedGroupMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/v1/finance/chart-of-accounts/detailed-groups/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'] });
      toast({
        title: "Success",
        description: "Detailed Group deleted successfully",
      });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Detailed Group",
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const onSubmitAccount = (data: AccountFormValues) => {
    const formData = {
      detailedGroupId: parseInt(data.detailedGroupId),
      accountCode: data.accountCode,
      accountName: data.accountName,
      accountType: getAccountTypeFromDetailedGroupId(parseInt(data.detailedGroupId)),
    };
    
    if (editingItem) {
      updateAccountMutation.mutate(formData);
    } else {
      createAccountMutation.mutate(formData);
    }
  };
  
  const onSubmitSubElementGroup = (data: any) => {
    const formData = {
      elementGroupId: parseInt(data.elementGroupId),
      name: data.name === 'custom' ? 'custom' : data.name,
      customName: data.name === 'custom' ? data.customName : null,
      code: data.code,
      description: data.description,
    };
    
    if (editingItem) {
      updateSubElementGroupMutation.mutate(formData);
    } else {
      createSubElementGroupMutation.mutate(formData);
    }
  };
  
  const onSubmitDetailedGroup = (data: any) => {
    const formData = {
      subElementGroupId: parseInt(data.subElementGroupId),
      name: data.name === 'custom' ? 'custom' : data.name,
      customName: data.name === 'custom' ? data.customName : null,
      code: data.code,
      description: data.description,
    };
    
    if (editingItem) {
      updateDetailedGroupMutation.mutate(formData);
    } else {
      createDetailedGroupMutation.mutate(formData);
    }
  };
  
  // Handle delete confirmation
  const handleDelete = () => {
    if (!itemToDelete) return;
    
    switch (itemToDelete.type) {
      case 'account':
        deleteAccountMutation.mutate(itemToDelete.id);
        break;
      case 'subElementGroup':
        deleteSubElementGroupMutation.mutate(itemToDelete.id);
        break;
      case 'detailedGroup':
        deleteDetailedGroupMutation.mutate(itemToDelete.id);
        break;
    }
  };
  
  // Prepare table data
  const prepareTableData = () => {
    const rows: COARow[] = [];
    
    filteredAccounts.forEach((account: ChartOfAccount) => {
      const detailedGroup = detailedGroups.find((dg: ChartOfAccountsDetailedGroup) => dg.id === account.detailedGroupId);
      if (!detailedGroup) return;
      
      const subElementGroup = subElementGroups.find((seg: ChartOfAccountsSubElementGroup) => seg.id === detailedGroup.subElementGroupId);
      if (!subElementGroup) return;
      
      const elementGroup = elementGroups.find((eg: ChartOfAccountsElementGroup) => eg.id === subElementGroup.elementGroupId);
      if (!elementGroup) return;
      
      rows.push({
        id: account.id,
        elementGroup: elementGroup.name,
        elementGroupId: elementGroup.id,
        subElementGroup: subElementGroup.customName || subElementGroup.name,
        subElementGroupId: subElementGroup.id,
        detailedGroup: detailedGroup.customName || detailedGroup.name,
        detailedGroupId: detailedGroup.id,
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
      });
    });
    
    return rows;
  };
  
  // Helper to determine account type based on detailed group
  const getAccountTypeFromDetailedGroupId = (detailedGroupId: number): string => {
    const detailedGroup = detailedGroups.find((dg: ChartOfAccountsDetailedGroup) => dg.id === detailedGroupId);
    if (!detailedGroup) return "asset"; // Default fallback
    
    const subElementGroup = subElementGroups.find((seg: ChartOfAccountsSubElementGroup) => seg.id === detailedGroup.subElementGroupId);
    if (!subElementGroup) return "asset";
    
    const elementGroup = elementGroups.find((eg: ChartOfAccountsElementGroup) => eg.id === subElementGroup.elementGroupId);
    if (!elementGroup) return "asset";
    
    // Map element group to account type
    switch (elementGroup.name) {
      case 'assets':
        return 'asset';
      case 'liabilities':
        return 'liability';
      case 'equity':
        return 'equity';
      case 'incomes':
        return 'revenue';
      case 'expenses':
        return 'expense';
      default:
        return 'asset';
    }
  };
  
  const tableData = prepareTableData();
  const isLoading = mainGroupsLoading || elementGroupsLoading || subElementGroupsLoading || detailedGroupsLoading || accountsLoading;
  
  // Get filtered selection options for dropdowns
  const getFilteredSubElementGroups = (elementGroupId: string) => {
    return subElementGroups.filter((seg: ChartOfAccountsSubElementGroup) => 
      seg.elementGroupId === parseInt(elementGroupId)
    );
  };
  
  const getFilteredDetailedGroups = (subElementGroupId: string) => {
    return detailedGroups.filter((dg: ChartOfAccountsDetailedGroup) => 
      dg.subElementGroupId === parseInt(subElementGroupId)
    );
  };

  return (
    <AppLayout title="Chart of Accounts Setup">
      <div className="mb-4">
        <Link href="/setup">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Setup
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
          <CardDescription>
            Manage your chart of accounts structure and account heads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter by main group type (Balance Sheet or Profit and Loss) */}
          <div className="mb-6">
            <RadioGroup
              value={accountType}
              onValueChange={(value) => setAccountType(value as "balance_sheet" | "profit_and_loss")}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balance_sheet" id="balance_sheet" />
                <Label htmlFor="balance_sheet">Balance Sheet</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="profit_and_loss" id="profit_and_loss" />
                <Label htmlFor="profit_and_loss">Profit and Loss</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Add buttons for chart of accounts entities */}
          <div className="flex space-x-2 mb-4">
            <Button onClick={() => {
              setEditingItem(null);
              setShowAccountDialog(true);
            }} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
            <Button onClick={() => {
              setEditingItem(null);
              setShowSubElementGroupDialog(true);
            }} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Sub Element Group
            </Button>
            <Button onClick={() => {
              setEditingItem(null);
              setShowDetailedGroupDialog(true);
            }} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Detailed Group
            </Button>
          </div>
          
          {/* Chart of Accounts Table */}
          {isLoading ? (
            <div className="text-center py-4">Loading chart of accounts data...</div>
          ) : tableData.length === 0 ? (
            <div className="text-center py-4">
              No accounts found for the selected type. Add an account to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Element Group</TableHead>
                    <TableHead>Sub Element Group</TableHead>
                    <TableHead>Detailed Group</TableHead>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.elementGroup}</TableCell>
                      <TableCell>{row.subElementGroup}</TableCell>
                      <TableCell>{row.detailedGroup}</TableCell>
                      <TableCell>{row.accountCode}</TableCell>
                      <TableCell>{row.accountName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingItem({
                                id: row.accountId,
                                elementGroupId: row.elementGroupId,
                                subElementGroupId: row.subElementGroupId,
                                detailedGroupId: row.detailedGroupId,
                                accountCode: row.accountCode,
                                accountName: row.accountName,
                              });
                              setShowAccountDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setItemToDelete({
                                id: row.accountId!,
                                type: 'account'
                              });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Account" : "Add New Account"}</DialogTitle>
            <DialogDescription>
              Enter the details for the account head.
            </DialogDescription>
          </DialogHeader>
          <Form {...accountForm}>
            <form onSubmit={accountForm.handleSubmit(onSubmitAccount)} className="space-y-4">
              <FormField
                control={accountForm.control}
                name="elementGroupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Element Group</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset dependent fields
                        accountForm.setValue("subElementGroupId", "");
                        accountForm.setValue("detailedGroupId", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an element group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredElementGroups.map((group: ChartOfAccountsElementGroup) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accountForm.control}
                name="subElementGroupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub Element Group</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset dependent field
                        accountForm.setValue("detailedGroupId", "");
                      }}
                      disabled={!accountForm.watch("elementGroupId")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a sub element group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getFilteredSubElementGroups(accountForm.watch("elementGroupId")).map((group: ChartOfAccountsSubElementGroup) => (
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
              <FormField
                control={accountForm.control}
                name="detailedGroupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Group</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!accountForm.watch("subElementGroupId")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a detailed group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getFilteredDetailedGroups(accountForm.watch("subElementGroupId")).map((group: ChartOfAccountsDetailedGroup) => (
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
              <FormField
                control={accountForm.control}
                name="accountCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter account code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accountForm.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter account name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAccountDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={accountForm.formState.isSubmitting}>
                  {editingItem ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Sub Element Group Dialog */}
      <Dialog open={showSubElementGroupDialog} onOpenChange={setShowSubElementGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Sub Element Group" : "Add New Sub Element Group"}</DialogTitle>
            <DialogDescription>
              Enter the details for the sub element group.
            </DialogDescription>
          </DialogHeader>
          <Form {...subElementGroupForm}>
            <form onSubmit={subElementGroupForm.handleSubmit(onSubmitSubElementGroup)} className="space-y-4">
              <FormField
                control={subElementGroupForm.control}
                name="elementGroupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Element Group</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an element group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredElementGroups.map((group: ChartOfAccountsElementGroup) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subElementGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a name or custom" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Standard options based on the enum */}
                        <SelectItem value="capital">Capital</SelectItem>
                        <SelectItem value="share_capital">Share Capital</SelectItem>
                        <SelectItem value="reserves">Reserves</SelectItem>
                        <SelectItem value="non_current_liabilities">Non-Current Liabilities</SelectItem>
                        <SelectItem value="current_liabilities">Current Liabilities</SelectItem>
                        <SelectItem value="non_current_assets">Non-Current Assets</SelectItem>
                        <SelectItem value="current_assets">Current Assets</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="service_revenue">Service Revenue</SelectItem>
                        <SelectItem value="cost_of_sales">Cost of Sales</SelectItem>
                        <SelectItem value="cost_of_service_revenue">Cost of Service Revenue</SelectItem>
                        <SelectItem value="purchase_returns">Purchase Returns</SelectItem>
                        <SelectItem value="custom">Custom (Add your own)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {subElementGroupForm.watch("name") === "custom" && (
                <FormField
                  control={subElementGroupForm.control}
                  name="customName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter custom name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={subElementGroupForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter group code" />
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSubElementGroupDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={subElementGroupForm.formState.isSubmitting}>
                  {editingItem ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Detailed Group Dialog */}
      <Dialog open={showDetailedGroupDialog} onOpenChange={setShowDetailedGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Detailed Group" : "Add New Detailed Group"}</DialogTitle>
            <DialogDescription>
              Enter the details for the detailed group.
            </DialogDescription>
          </DialogHeader>
          <Form {...detailedGroupForm}>
            <form onSubmit={detailedGroupForm.handleSubmit(onSubmitDetailedGroup)} className="space-y-4">
              <FormField
                control={detailedGroupForm.control}
                name="subElementGroupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub Element Group</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a sub element group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredSubElementGroups.map((group: ChartOfAccountsSubElementGroup) => (
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
              <FormField
                control={detailedGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a name or custom" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Standard options based on the enum */}
                        <SelectItem value="owners_capital">Owner's Capital</SelectItem>
                        <SelectItem value="long_term_loans">Long Term Loans</SelectItem>
                        <SelectItem value="short_term_loans">Short Term Loans</SelectItem>
                        <SelectItem value="trade_creditors">Trade Creditors</SelectItem>
                        <SelectItem value="accrued_charges">Accrued Charges</SelectItem>
                        <SelectItem value="other_payables">Other Payables</SelectItem>
                        <SelectItem value="property_plant_equipment">Property, Plant & Equipment</SelectItem>
                        <SelectItem value="intangible_assets">Intangible Assets</SelectItem>
                        <SelectItem value="stock_in_trade">Stock in Trade</SelectItem>
                        <SelectItem value="trade_debtors">Trade Debtors</SelectItem>
                        <SelectItem value="advances_prepayments">Advances & Prepayments</SelectItem>
                        <SelectItem value="other_receivables">Other Receivables</SelectItem>
                        <SelectItem value="cash_bank_balances">Cash & Bank Balances</SelectItem>
                        <SelectItem value="custom">Custom (Add your own)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {detailedGroupForm.watch("name") === "custom" && (
                <FormField
                  control={detailedGroupForm.control}
                  name="customName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter custom name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={detailedGroupForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter group code" />
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDetailedGroupDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={detailedGroupForm.formState.isSubmitting}>
                  {editingItem ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!itemToDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}