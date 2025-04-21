import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Edit, Trash2, ArrowLeft, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Link } from "wouter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ChartOfAccountsMainGroup = {
  id: number;
  name: string;
  code: string;
};

type ChartOfAccountsElementGroup = {
  id: number;
  mainGroupId: number;
  name: string;
  code: string;
};

type ChartOfAccountsSubElementGroup = {
  id: number;
  elementGroupId: number;
  name: string;
  customName?: string;
  code: string;
  description: string | null;
};

type ChartOfAccountsDetailedGroup = {
  id: number;
  subElementGroupId: number;
  name: string;
  customName?: string;
  code: string;
  description: string | null;
};

type ChartOfAccount = {
  id: number;
  detailedGroupId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  description: string | null;
  isActive: boolean;
};

// Schema for Chart of Account form
const chartOfAccountSchema = z.object({
  mainGroup: z.string(),
  elementGroup: z.string(),
  subElementGroup: z.string(),
  detailedGroup: z.string(),
  accountName: z.string().min(2, "Account name must be at least 2 characters"),
  accountCode: z.string(),
  description: z.string().nullable().optional(),
});

export default function COAConfigurationPage() {
  const [accountType, setAccountType] = useState<"balance-sheet" | "profit-loss">("balance-sheet");
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Element selections state
  const [selectedMainGroup, setSelectedMainGroup] = useState<string | null>(null);
  const [selectedElementGroup, setSelectedElementGroup] = useState<string | null>(null);
  const [selectedSubElementGroup, setSelectedSubElementGroup] = useState<string | null>(null);
  const [selectedDetailedGroup, setSelectedDetailedGroup] = useState<string | null>(null);
  
  // Filtered account data
  const [filteredAccounts, setFilteredAccounts] = useState<any[]>([]);
  
  // Query data
  const { data: mainGroups = [], isLoading: isLoadingMainGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/main-groups'],
  });
  
  const { data: elementGroups = [], isLoading: isLoadingElementGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/element-groups'],
  });
  
  const { data: subElementGroups = [], isLoading: isLoadingSubElementGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'],
  });
  
  const { data: detailedGroups = [], isLoading: isLoadingDetailedGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'],
  });
  
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
  });
  
  // Filter main groups based on account type
  const filteredMainGroups = mainGroups.filter((group: ChartOfAccountsMainGroup) => {
    if (accountType === "balance-sheet") {
      return group.name === "Balance Sheet";
    } else {
      return group.name === "Profit and Loss";
    }
  });
  
  // Filter element groups based on selected main group
  const filteredElementGroups = selectedMainGroup 
    ? elementGroups.filter((group: ChartOfAccountsElementGroup) => 
        group.mainGroupId === parseInt(selectedMainGroup)
      ) 
    : [];
  
  // Filter sub-element groups based on selected element group
  const filteredSubElementGroups = selectedElementGroup 
    ? subElementGroups.filter((group: ChartOfAccountsSubElementGroup) => 
        group.elementGroupId === parseInt(selectedElementGroup)
      ) 
    : [];
  
  // Filter detailed groups based on selected sub-element group
  const filteredDetailedGroups = selectedSubElementGroup 
    ? detailedGroups.filter((group: ChartOfAccountsDetailedGroup) => 
        group.subElementGroupId === parseInt(selectedSubElementGroup)
      ) 
    : [];
  
  // Update filtered accounts when account type changes
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      // This is a simplified filter, you may need to adjust based on your actual data structure
      const filtered = accounts.filter((account: ChartOfAccount) => {
        // Get the detailed group for this account
        const detailedGroup = detailedGroups.find((dg: ChartOfAccountsDetailedGroup) => 
          dg.id === account.detailedGroupId
        );
        
        if (!detailedGroup) return false;
        
        // Get the sub-element group for this detailed group
        const subElementGroup = subElementGroups.find((seg: ChartOfAccountsSubElementGroup) => 
          seg.id === detailedGroup.subElementGroupId
        );
        
        if (!subElementGroup) return false;
        
        // Get the element group for this sub-element group
        const elementGroup = elementGroups.find((eg: ChartOfAccountsElementGroup) => 
          eg.id === subElementGroup.elementGroupId
        );
        
        if (!elementGroup) return false;
        
        // Get the main group for this element group
        const mainGroup = mainGroups.find((mg: ChartOfAccountsMainGroup) => 
          mg.id === elementGroup.mainGroupId
        );
        
        if (!mainGroup) return false;
        
        // Now check if this account belongs to the selected account type
        if (accountType === "balance-sheet") {
          return mainGroup.name === "Balance Sheet";
        } else {
          return mainGroup.name === "Profit and Loss";
        }
      });
      
      setFilteredAccounts(filtered);
    }
  }, [accountType, accounts, detailedGroups, subElementGroups, elementGroups, mainGroups]);
  
  // Form for the chart of account
  const chartOfAccountForm = useForm<z.infer<typeof chartOfAccountSchema>>({
    resolver: zodResolver(chartOfAccountSchema),
    defaultValues: {
      mainGroup: "",
      elementGroup: "",
      subElementGroup: "",
      detailedGroup: "",
      accountName: "",
      accountCode: "",
      description: "",
    }
  });
  
  // Watch form fields to enable conditional selections
  const watchMainGroup = chartOfAccountForm.watch("mainGroup");
  const watchElementGroup = chartOfAccountForm.watch("elementGroup");
  const watchSubElementGroup = chartOfAccountForm.watch("subElementGroup");
  
  // Reset dependent fields when parent field changes
  useEffect(() => {
    if (watchMainGroup) {
      chartOfAccountForm.setValue("elementGroup", "");
      chartOfAccountForm.setValue("subElementGroup", "");
      chartOfAccountForm.setValue("detailedGroup", "");
    }
  }, [watchMainGroup, chartOfAccountForm]);
  
  useEffect(() => {
    if (watchElementGroup) {
      chartOfAccountForm.setValue("subElementGroup", "");
      chartOfAccountForm.setValue("detailedGroup", "");
    }
  }, [watchElementGroup, chartOfAccountForm]);
  
  useEffect(() => {
    if (watchSubElementGroup) {
      chartOfAccountForm.setValue("detailedGroup", "");
    }
  }, [watchSubElementGroup, chartOfAccountForm]);
  
  // Create chart of account mutation
  const createChartOfAccountMutation = useMutation({
    mutationFn: async (values: z.infer<typeof chartOfAccountSchema>) => {
      // Prepare data for API
      const detailedGroupId = parseInt(values.detailedGroup);
      const detailedGroup = detailedGroups.find(dg => dg.id === detailedGroupId);
      const subElementGroup = subElementGroups.find(seg => seg.id === detailedGroup?.subElementGroupId);
      const elementGroup = elementGroups.find(eg => eg.id === subElementGroup?.elementGroupId);
      
      let accountType = "asset"; // Default
      
      if (elementGroup) {
        switch(elementGroup.name) {
          case "Assets":
            accountType = "asset";
            break;
          case "Liabilities":
            accountType = "liability";
            break;
          case "Equity":
            accountType = "equity";
            break;
          case "Incomes":
            accountType = "revenue";
            break;
          case "Expenses":
            accountType = "expense";
            break;
        }
      }
      
      const data = {
        detailedGroupId,
        accountName: values.accountName,
        accountCode: values.accountCode,
        accountType,
        description: values.description || null,
      };
      
      return apiRequest(
        `/api/v1/finance/chart-of-accounts`,
        {
          method: 'POST',
          data
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chart of account created successfully",
      });
      setCreateDialogOpen(false);
      chartOfAccountForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create chart of account",
        variant: "destructive",
      });
      console.error("Create error:", error);
    }
  });
  
  // Update chart of account mutation
  const updateChartOfAccountMutation = useMutation({
    mutationFn: async (values: z.infer<typeof chartOfAccountSchema>) => {
      if (!currentItem) return null;
      
      // Prepare data for API
      const detailedGroupId = parseInt(values.detailedGroup);
      const detailedGroup = detailedGroups.find(dg => dg.id === detailedGroupId);
      const subElementGroup = subElementGroups.find(seg => seg.id === detailedGroup?.subElementGroupId);
      const elementGroup = elementGroups.find(eg => eg.id === subElementGroup?.elementGroupId);
      
      let accountType = "asset"; // Default
      
      if (elementGroup) {
        switch(elementGroup.name) {
          case "Assets":
            accountType = "asset";
            break;
          case "Liabilities":
            accountType = "liability";
            break;
          case "Equity":
            accountType = "equity";
            break;
          case "Incomes":
            accountType = "revenue";
            break;
          case "Expenses":
            accountType = "expense";
            break;
        }
      }
      
      const data = {
        detailedGroupId,
        accountName: values.accountName,
        accountCode: values.accountCode,
        accountType,
        description: values.description || null,
      };
      
      return apiRequest(
        `/api/v1/finance/chart-of-accounts/${currentItem.id}`,
        {
          method: 'PATCH',
          data
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chart of account updated successfully",
      });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update chart of account",
        variant: "destructive",
      });
      console.error("Update error:", error);
    }
  });
  
  // Delete chart of account mutation
  const deleteChartOfAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(
        `/api/v1/finance/chart-of-accounts/${id}`,
        {
          method: 'DELETE'
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chart of account deleted successfully",
      });
      setDeleteDialogOpen(false);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "An error occurred";
      setDeleteError(errorMessage);
    }
  });
  
  // Handle opening create dialog
  const handleCreate = () => {
    chartOfAccountForm.reset({
      mainGroup: filteredMainGroups.length > 0 ? String(filteredMainGroups[0].id) : "",
      elementGroup: "",
      subElementGroup: "",
      detailedGroup: "",
      accountName: "",
      accountCode: "",
      description: "",
    });
    setCreateDialogOpen(true);
  };
  
  // Handle opening edit dialog
  const handleEdit = (account: any) => {
    setCurrentItem(account);
    
    // Find the detailed group for this account
    const detailedGroup = detailedGroups.find((dg: ChartOfAccountsDetailedGroup) => 
      dg.id === account.detailedGroupId
    );
    
    if (!detailedGroup) {
      toast({
        title: "Error",
        description: "Could not find detailed group for this account",
        variant: "destructive",
      });
      return;
    }
    
    // Find the sub-element group for this detailed group
    const subElementGroup = subElementGroups.find((seg: ChartOfAccountsSubElementGroup) => 
      seg.id === detailedGroup.subElementGroupId
    );
    
    if (!subElementGroup) {
      toast({
        title: "Error",
        description: "Could not find sub-element group for this account",
        variant: "destructive",
      });
      return;
    }
    
    // Find the element group for this sub-element group
    const elementGroup = elementGroups.find((eg: ChartOfAccountsElementGroup) => 
      eg.id === subElementGroup.elementGroupId
    );
    
    if (!elementGroup) {
      toast({
        title: "Error",
        description: "Could not find element group for this account",
        variant: "destructive",
      });
      return;
    }
    
    // Find the main group for this element group
    const mainGroup = mainGroups.find((mg: ChartOfAccountsMainGroup) => 
      mg.id === elementGroup.mainGroupId
    );
    
    if (!mainGroup) {
      toast({
        title: "Error",
        description: "Could not find main group for this account",
        variant: "destructive",
      });
      return;
    }
    
    // Reset form with account data
    chartOfAccountForm.reset({
      mainGroup: String(mainGroup.id),
      elementGroup: String(elementGroup.id),
      subElementGroup: String(subElementGroup.id),
      detailedGroup: String(detailedGroup.id),
      accountName: account.accountName,
      accountCode: account.accountCode,
      description: account.description || "",
    });
    
    setEditDialogOpen(true);
  };
  
  // Handle opening delete dialog
  const handleDeleteClick = (account: any) => {
    setCurrentItem(account);
    setDeleteDialogOpen(true);
    setDeleteError(null);
  };
  
  // Handle form submission for create
  const onCreateSubmit = (values: z.infer<typeof chartOfAccountSchema>) => {
    createChartOfAccountMutation.mutate(values);
  };
  
  // Handle form submission for edit
  const onEditSubmit = (values: z.infer<typeof chartOfAccountSchema>) => {
    updateChartOfAccountMutation.mutate(values);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (!currentItem) return;
    deleteChartOfAccountMutation.mutate(currentItem.id);
  };
  
  // Function to get account type text for display
  const getAccountTypeText = (accountType: string) => {
    switch(accountType) {
      case "asset": return "Asset";
      case "liability": return "Liability";
      case "equity": return "Equity";
      case "revenue": return "Revenue";
      case "expense": return "Expense";
      default: return accountType;
    }
  };
  
  // Function to get human-readable description of account structure
  const getAccountStructureText = (account: any) => {
    const detailedGroup = detailedGroups.find((dg: ChartOfAccountsDetailedGroup) => dg.id === account.detailedGroupId);
    if (!detailedGroup) return "";
    
    const subElementGroup = subElementGroups.find((seg: ChartOfAccountsSubElementGroup) => seg.id === detailedGroup.subElementGroupId);
    if (!subElementGroup) return detailedGroup.customName || detailedGroup.name;
    
    const elementGroup = elementGroups.find((eg: ChartOfAccountsElementGroup) => eg.id === subElementGroup.elementGroupId);
    if (!elementGroup) return `${subElementGroup.customName || subElementGroup.name} > ${detailedGroup.customName || detailedGroup.name}`;
    
    return `${elementGroup.name} > ${subElementGroup.customName || subElementGroup.name} > ${detailedGroup.customName || detailedGroup.name}`;
  };
  
  // Loading state
  const isLoading = isLoadingMainGroups || isLoadingElementGroups || isLoadingSubElementGroups || 
                     isLoadingDetailedGroups || isLoadingAccounts;

  return (
    <AppLayout title="Chart of Accounts">
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
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>
                Manage your account heads with their chart of accounts structure for financial reporting.
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter by Main Group (Balance Sheet or Profit & Loss) */}
          <div className="mb-6">
            <div className="text-base font-medium mb-2">Select Account Type</div>
            <RadioGroup
              defaultValue="balance-sheet"
              value={accountType}
              onValueChange={(value) => setAccountType(value as "balance-sheet" | "profit-loss")}
              className="flex space-x-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balance-sheet" id="balance-sheet" />
                <label htmlFor="balance-sheet">Balance Sheet</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="profit-loss" id="profit-loss" />
                <label htmlFor="profit-loss">Profit and Loss</label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Accounts Table */}
          {isLoading ? (
            <div className="py-8 text-center">Loading chart of accounts...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-8 text-center">
              No accounts found. Click the "Add New Account" button to create one.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Element Group</TableHead>
                    <TableHead>Sub Element Group</TableHead>
                    <TableHead>Detailed Group</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account: any) => {
                    const detailedGroup = detailedGroups.find(dg => dg.id === account.detailedGroupId);
                    const subElementGroup = detailedGroup ? 
                      subElementGroups.find(seg => seg.id === detailedGroup.subElementGroupId) : null;
                    const elementGroup = subElementGroup ?
                      elementGroups.find(eg => eg.id === subElementGroup.elementGroupId) : null;
                    
                    return (
                      <TableRow key={account.id}>
                        <TableCell>{account.accountCode}</TableCell>
                        <TableCell>{account.accountName}</TableCell>
                        <TableCell>{elementGroup ? elementGroup.name : '-'}</TableCell>
                        <TableCell>{subElementGroup ? (subElementGroup.customName || subElementGroup.name) : '-'}</TableCell>
                        <TableCell>{detailedGroup ? (detailedGroup.customName || detailedGroup.name) : '-'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(account)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteClick(account)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new account head with its chart of accounts structure.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...chartOfAccountForm}>
            <form onSubmit={chartOfAccountForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Main Group Selection */}
                <FormField
                  control={chartOfAccountForm.control}
                  name="mainGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Group</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent fields
                            chartOfAccountForm.setValue("elementGroup", "");
                            chartOfAccountForm.setValue("subElementGroup", "");
                            chartOfAccountForm.setValue("detailedGroup", "");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Main Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredMainGroups.map((group: ChartOfAccountsMainGroup) => (
                              <SelectItem key={group.id} value={String(group.id)}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Element Group Selection */}
                <FormField
                  control={chartOfAccountForm.control}
                  name="elementGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Element Group</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent fields
                            chartOfAccountForm.setValue("subElementGroup", "");
                            chartOfAccountForm.setValue("detailedGroup", "");
                          }}
                          disabled={!watchMainGroup}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Element Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {elementGroups
                              .filter((group: ChartOfAccountsElementGroup) => 
                                group.mainGroupId === parseInt(watchMainGroup)
                              )
                              .map((group: ChartOfAccountsElementGroup) => (
                                <SelectItem key={group.id} value={String(group.id)}>
                                  {group.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Sub Element Group Selection */}
                <FormField
                  control={chartOfAccountForm.control}
                  name="subElementGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Element Group</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent field
                            chartOfAccountForm.setValue("detailedGroup", "");
                          }}
                          disabled={!watchElementGroup}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sub Element Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {subElementGroups
                              .filter((group: ChartOfAccountsSubElementGroup) => 
                                group.elementGroupId === parseInt(watchElementGroup)
                              )
                              .map((group: ChartOfAccountsSubElementGroup) => (
                                <SelectItem key={group.id} value={String(group.id)}>
                                  {group.customName || group.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Detailed Group Selection */}
                <FormField
                  control={chartOfAccountForm.control}
                  name="detailedGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Group</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!watchSubElementGroup}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Detailed Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {detailedGroups
                              .filter((group: ChartOfAccountsDetailedGroup) => 
                                group.subElementGroupId === parseInt(watchSubElementGroup)
                              )
                              .map((group: ChartOfAccountsDetailedGroup) => (
                                <SelectItem key={group.id} value={String(group.id)}>
                                  {group.customName || group.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Account Name */}
                <FormField
                  control={chartOfAccountForm.control}
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
                
                {/* Account Code */}
                <FormField
                  control={chartOfAccountForm.control}
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
              </div>
              
              {/* Description */}
              <FormField
                control={chartOfAccountForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createChartOfAccountMutation.isPending}
                >
                  {createChartOfAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update the account head and its chart of accounts structure.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...chartOfAccountForm}>
            <form onSubmit={chartOfAccountForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Main Group Selection */}
                <FormField
                  control={chartOfAccountForm.control}
                  name="mainGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Group</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent fields
                            chartOfAccountForm.setValue("elementGroup", "");
                            chartOfAccountForm.setValue("subElementGroup", "");
                            chartOfAccountForm.setValue("detailedGroup", "");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Main Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {mainGroups.map((group: ChartOfAccountsMainGroup) => (
                              <SelectItem key={group.id} value={String(group.id)}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Element Group Selection */}
                <FormField
                  control={chartOfAccountForm.control}
                  name="elementGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Element Group</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent fields
                            chartOfAccountForm.setValue("subElementGroup", "");
                            chartOfAccountForm.setValue("detailedGroup", "");
                          }}
                          disabled={!watchMainGroup}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Element Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {elementGroups
                              .filter((group: ChartOfAccountsElementGroup) => 
                                group.mainGroupId === parseInt(watchMainGroup)
                              )
                              .map((group: ChartOfAccountsElementGroup) => (
                                <SelectItem key={group.id} value={String(group.id)}>
                                  {group.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Sub Element Group Selection */}
                <FormField
                  control={chartOfAccountForm.control}
                  name="subElementGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Element Group</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent field
                            chartOfAccountForm.setValue("detailedGroup", "");
                          }}
                          disabled={!watchElementGroup}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sub Element Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {subElementGroups
                              .filter((group: ChartOfAccountsSubElementGroup) => 
                                group.elementGroupId === parseInt(watchElementGroup)
                              )
                              .map((group: ChartOfAccountsSubElementGroup) => (
                                <SelectItem key={group.id} value={String(group.id)}>
                                  {group.customName || group.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Detailed Group Selection */}
                <FormField
                  control={chartOfAccountForm.control}
                  name="detailedGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Group</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!watchSubElementGroup}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Detailed Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {detailedGroups
                              .filter((group: ChartOfAccountsDetailedGroup) => 
                                group.subElementGroupId === parseInt(watchSubElementGroup)
                              )
                              .map((group: ChartOfAccountsDetailedGroup) => (
                                <SelectItem key={group.id} value={String(group.id)}>
                                  {group.customName || group.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Account Name */}
                <FormField
                  control={chartOfAccountForm.control}
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
                
                {/* Account Code */}
                <FormField
                  control={chartOfAccountForm.control}
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
              </div>
              
              {/* Description */}
              <FormField
                control={chartOfAccountForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateChartOfAccountMutation.isPending}
                >
                  {updateChartOfAccountMutation.isPending ? "Updating..." : "Update Account"}
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
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this account?
              This action cannot be undone and may affect financial reports.
            </DialogDescription>
          </DialogHeader>
          
          {deleteError && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-4">
              {deleteError}
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteChartOfAccountMutation.isPending}
            >
              {deleteChartOfAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}