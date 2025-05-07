import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Search, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ChartOfAccountsCSVImport from "@/components/setup/chart-of-accounts-csv-import";

import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, TableHeader, TableRow, TableHead, TableCell, TableBody 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea as BaseTextarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Create a fixed version of Textarea that handles null values properly
const Textarea = (props: any) => {
  const fixedProps = {...props};
  if (fixedProps.value === null || fixedProps.value === undefined) {
    fixedProps.value = '';
  }
  return <BaseTextarea {...fixedProps} />;
};

import { AppLayout } from "@/components/layout/app-layout";

// Types for chart of accounts structure
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
  elementGroup: z.string(),
  subElementGroup: z.string(),
  detailedGroup: z.string(),
  accountName: z.string().min(2, "Account name must be at least 2 characters"),
  description: z.string().nullable().optional(),
});

// Schema for Sub Element Group form
const subElementGroupSchema = z.object({
  elementGroup: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  customName: z.string().optional(),
  code: z.string().min(1, "Code is required"),
  description: z.string().nullable().optional(),
});

// Schema for Detailed Group form
const detailedGroupSchema = z.object({
  subElementGroup: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  customName: z.string().optional(),
  code: z.string().min(1, "Code is required"),
  description: z.string().nullable().optional(),
});

export default function COAConfigurationPage() {
  const [accountType, setAccountType] = useState<"balance-sheet" | "profit-loss">("balance-sheet");
  
  // Tab state
  const [activeTab, setActiveTab] = useState("accounts");
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<ChartOfAccount | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDetailedGroupError, setDeleteDetailedGroupError] = useState<string | null>(null);
  const [deleteSubElementGroupError, setDeleteSubElementGroupError] = useState<string | null>(null);
  
  // Sub Element Group dialog states
  const [createSubElementGroupDialogOpen, setCreateSubElementGroupDialogOpen] = useState(false);
  const [editSubElementGroupDialogOpen, setEditSubElementGroupDialogOpen] = useState(false);
  const [deleteSubElementGroupDialogOpen, setDeleteSubElementGroupDialogOpen] = useState(false);
  const [currentSubElementGroup, setCurrentSubElementGroup] = useState<ChartOfAccountsSubElementGroup | null>(null);
  
  // Detailed Group dialog states
  const [createDetailedGroupDialogOpen, setCreateDetailedGroupDialogOpen] = useState(false);
  const [editDetailedGroupDialogOpen, setEditDetailedGroupDialogOpen] = useState(false);
  const [deleteDetailedGroupDialogOpen, setDeleteDetailedGroupDialogOpen] = useState(false);
  const [currentDetailedGroup, setCurrentDetailedGroup] = useState<ChartOfAccountsDetailedGroup | null>(null);
  
  // Bulk delete dialog states
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<'accounts' | 'sub-element-groups' | 'detailed-groups'>('accounts');
  
  // Search, pagination, and selection states
  const [searchTerm, setSearchTerm] = useState("");
  
  // For pagination
  const [accountsCurrentPage, setAccountsCurrentPage] = useState(1);
  const [subElementGroupsCurrentPage, setSubElementGroupsCurrentPage] = useState(1);
  const [detailedGroupsCurrentPage, setDetailedGroupsCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // For bulk selection
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [selectedSubElementGroups, setSelectedSubElementGroups] = useState<number[]>([]);
  const [selectedDetailedGroups, setSelectedDetailedGroups] = useState<number[]>([]);
  const [selectAllAccounts, setSelectAllAccounts] = useState(false);
  const [selectAllSubElementGroups, setSelectAllSubElementGroups] = useState(false);
  const [selectAllDetailedGroups, setSelectAllDetailedGroups] = useState(false);
  
  // Element selections state
  const [selectedMainGroup, setSelectedMainGroup] = useState<string | null>(null);
  const [selectedElementGroup, setSelectedElementGroup] = useState<string | null>(null);
  const [selectedSubElementGroup, setSelectedSubElementGroup] = useState<string | null>(null);
  const [selectedDetailedGroup, setSelectedDetailedGroup] = useState<string | null>(null);
  
  // Account data state
  const [accountsState, setAccountsState] = useState<ChartOfAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<ChartOfAccount[]>([]);
  
  // Handle create actions
  const handleCreate = () => {
    chartOfAccountForm.reset();
    setCreateDialogOpen(true);
  };
  
  const handleCreateSubElementGroup = () => {
    subElementGroupForm.reset();
    setCreateSubElementGroupDialogOpen(true);
  };
  
  const handleCreateDetailedGroup = () => {
    detailedGroupForm.reset();
    setCreateDetailedGroupDialogOpen(true);
  };
  
  // Query data
  const { data: mainGroups = [], isLoading: isLoadingMainGroups } = useQuery<ChartOfAccountsMainGroup[]>({
    queryKey: ['/api/v1/finance/chart-of-accounts/main-groups'],
  });
  
  const { data: elementGroups = [], isLoading: isLoadingElementGroups } = useQuery<ChartOfAccountsElementGroup[]>({
    queryKey: ['/api/v1/finance/chart-of-accounts/element-groups'],
  });
  
  const { data: subElementGroups = [], isLoading: isLoadingSubElementGroups } = useQuery<ChartOfAccountsSubElementGroup[]>({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'],
  });
  
  const { data: detailedGroups = [], isLoading: isLoadingDetailedGroups } = useQuery<ChartOfAccountsDetailedGroup[]>({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'],
  });
  
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<ChartOfAccount[]>({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filter main groups based on account type
  const filteredMainGroups = mainGroups.filter((group: ChartOfAccountsMainGroup) => {
    if (accountType === "balance-sheet") {
      return group.name === "balance_sheet";
    } else {
      return group.name === "profit_and_loss";
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
  
  // Keep accountsState in sync with the accounts data
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      setAccountsState(accounts);
    }
  }, [accounts]);
  
  // Update filtered accounts when account type or accountsState changes
  useEffect(() => {
    if (accountsState && Array.isArray(accountsState) && accountsState.length > 0) {
      // This is a simplified filter, you may need to adjust based on your actual data structure
      const filtered = accountsState.filter((account: ChartOfAccount) => {
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
          return mainGroup.name === "balance_sheet";
        } else {
          return mainGroup.name === "profit_and_loss";
        }
      });
      
      setFilteredAccounts(filtered);
    }
  }, [accountType, accountsState, detailedGroups, subElementGroups, elementGroups, mainGroups]);
  
  // Filtered and paginated data
  const filteredSearchedAccounts = filteredAccounts.filter(account => 
    account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.accountCode.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const paginatedAccounts = filteredSearchedAccounts.slice(
    (accountsCurrentPage - 1) * ITEMS_PER_PAGE, 
    accountsCurrentPage * ITEMS_PER_PAGE
  );
  
  const totalAccountsPages = Math.ceil(filteredSearchedAccounts.length / ITEMS_PER_PAGE);
  
  // Filtered and paginated sub-element groups
  const filteredSearchedSubElementGroups = subElementGroups.filter(seg => 
    (seg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seg.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (seg.customName && seg.customName?.toLowerCase().includes(searchTerm.toLowerCase())))
  );
  
  const paginatedSubElementGroups = filteredSearchedSubElementGroups.slice(
    (subElementGroupsCurrentPage - 1) * ITEMS_PER_PAGE, 
    subElementGroupsCurrentPage * ITEMS_PER_PAGE
  );
  
  const totalSubElementGroupsPages = Math.ceil(filteredSearchedSubElementGroups.length / ITEMS_PER_PAGE);
  
  // Filtered and paginated detailed groups
  const filteredSearchedDetailedGroups = detailedGroups.filter(dg => 
    (dg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dg.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dg.customName && dg.customName?.toLowerCase().includes(searchTerm.toLowerCase())))
  );
  
  const paginatedDetailedGroups = filteredSearchedDetailedGroups.slice(
    (detailedGroupsCurrentPage - 1) * ITEMS_PER_PAGE, 
    detailedGroupsCurrentPage * ITEMS_PER_PAGE
  );
  
  const totalDetailedGroupsPages = Math.ceil(filteredSearchedDetailedGroups.length / ITEMS_PER_PAGE);
  
  // Handle bulk selection
  useEffect(() => {
    if (selectAllAccounts) {
      setSelectedAccounts(paginatedAccounts.map(a => a.id));
    } else {
      setSelectedAccounts([]);
    }
  }, [selectAllAccounts, paginatedAccounts]);
  
  useEffect(() => {
    if (selectAllSubElementGroups) {
      setSelectedSubElementGroups(paginatedSubElementGroups.map(seg => seg.id));
    } else {
      setSelectedSubElementGroups([]);
    }
  }, [selectAllSubElementGroups, paginatedSubElementGroups]);
  
  useEffect(() => {
    if (selectAllDetailedGroups) {
      setSelectedDetailedGroups(paginatedDetailedGroups.map(dg => dg.id));
    } else {
      setSelectedDetailedGroups([]);
    }
  }, [selectAllDetailedGroups, paginatedDetailedGroups]);
  
  // Form for the chart of account
  const chartOfAccountForm = useForm<z.infer<typeof chartOfAccountSchema>>({
    resolver: zodResolver(chartOfAccountSchema),
    defaultValues: {
      elementGroup: "",
      subElementGroup: "",
      detailedGroup: "",
      accountName: "",
      description: "",
    }
  });
  
  // Form for sub element group
  const subElementGroupForm = useForm<z.infer<typeof subElementGroupSchema>>({
    resolver: zodResolver(subElementGroupSchema),
    defaultValues: {
      elementGroup: "",
      name: "",
      customName: "",
      code: "",
      description: "",
    }
  });
  
  // Form for detailed group
  const detailedGroupForm = useForm<z.infer<typeof detailedGroupSchema>>({
    resolver: zodResolver(detailedGroupSchema),
    defaultValues: {
      subElementGroup: "",
      name: "",
      customName: "",
      code: "",
      description: "",
    }
  });
  
  // Watch form fields to enable conditional selections
  const watchElementGroup = chartOfAccountForm.watch("elementGroup");
  const watchSubElementGroup = chartOfAccountForm.watch("subElementGroup");
  
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
  
  // Mutations for Chart of Accounts
  const deleteChartOfAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/v1/finance/chart-of-accounts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chart of account deleted successfully",
      });
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      setDeleteError(error.message || "Failed to delete chart of account");
    }
  });
  
  // Bulk delete mutation for accounts
  const bulkDeleteAccountsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sequential deletion to avoid overwhelming the server
      for (const id of ids) {
        await apiRequest('DELETE', `/api/v1/finance/chart-of-accounts/${id}`);
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedAccounts.length} accounts`,
      });
      setSelectedAccounts([]);
      setSelectAllAccounts(false);
      setBulkDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete accounts: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  // Bulk delete mutation for sub-element groups
  const bulkDeleteSubElementGroupsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sequential deletion to avoid overwhelming the server
      for (const id of ids) {
        await apiRequest('DELETE', `/api/v1/finance/chart-of-accounts/sub-element-groups/${id}`);
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedSubElementGroups.length} sub-element groups`,
      });
      setSelectedSubElementGroups([]);
      setSelectAllSubElementGroups(false);
      setBulkDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete sub-element groups: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  // Bulk delete mutation for detailed groups
  const bulkDeleteDetailedGroupsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sequential deletion to avoid overwhelming the server
      for (const id of ids) {
        await apiRequest('DELETE', `/api/v1/finance/chart-of-accounts/detailed-groups/${id}`);
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedDetailedGroups.length} detailed groups`,
      });
      setSelectedDetailedGroups([]);
      setSelectAllDetailedGroups(false);
      setBulkDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete detailed groups: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  // Delete confirmation handlers
  const handleDeleteConfirm = () => {
    if (!currentItem) return;
    deleteChartOfAccountMutation.mutate(currentItem.id);
  };
  
  const handleBulkDeleteConfirm = () => {
    switch (bulkDeleteType) {
      case 'accounts':
        bulkDeleteAccountsMutation.mutate(selectedAccounts);
        break;
      case 'sub-element-groups':
        bulkDeleteSubElementGroupsMutation.mutate(selectedSubElementGroups);
        break;
      case 'detailed-groups':
        bulkDeleteDetailedGroupsMutation.mutate(selectedDetailedGroups);
        break;
    }
  };
  
  // Helper functions
  const getElementGroupName = (id: number) => {
    const group = elementGroups.find(eg => eg.id === id);
    return group ? (group.customName || group.name.charAt(0).toUpperCase() + group.name.slice(1)) : '';
  };
  
  const getSubElementGroupName = (id: number) => {
    const group = subElementGroups.find(seg => seg.id === id);
    return group ? (group.customName || group.name) : '';
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
        <CardHeader className="flex flex-col">
          <div>
            <CardTitle>Chart of Accounts</CardTitle>
            <CardDescription>
              Manage your chart of accounts structure for financial reporting
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
              <TabsTrigger value="sub-element-groups">Sub Element Groups</TabsTrigger>
              <TabsTrigger value="detailed-groups">Detailed Groups</TabsTrigger>
            </TabsList>

            {/* Search and Action Bar - Common for all tabs */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                {activeTab === "accounts" && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={handleCreate}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Account
                    </Button>
                    <ChartOfAccountsCSVImport 
                      onSuccess={() => {
                        toast({
                          title: "Success",
                          description: "Chart of accounts imported successfully",
                        });
                        queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
                      }}
                      onError={(error) => {
                        toast({
                          title: "Error",
                          description: error || "Failed to import chart of accounts",
                          variant: "destructive",
                        });
                      }}
                    />
                    {selectedAccounts.length > 0 && (
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          setBulkDeleteType('accounts');
                          setBulkDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedAccounts.length})
                      </Button>
                    )}
                  </>
                )}
                {activeTab === "sub-element-groups" && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={handleCreateSubElementGroup}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sub Element Group
                    </Button>
                    {selectedSubElementGroups.length > 0 && (
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          setBulkDeleteType('sub-element-groups');
                          setBulkDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedSubElementGroups.length})
                      </Button>
                    )}
                  </>
                )}
                {activeTab === "detailed-groups" && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={handleCreateDetailedGroup}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Detailed Group
                    </Button>
                    {selectedDetailedGroups.length > 0 && (
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          setBulkDeleteType('detailed-groups');
                          setBulkDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedDetailedGroups.length})
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Chart of Accounts Tab */}
            <TabsContent value="accounts" className="border rounded-md p-4">
              {activeTab === "accounts" && (
                <>
                  {/* Account Type Selection (Balance Sheet vs P&L) */}
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
                        <label htmlFor="profit-loss">Profit & Loss</label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Accounts Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox 
                              checked={selectAllAccounts}
                              onCheckedChange={(checked) => setSelectAllAccounts(checked === true)}
                            />
                          </TableHead>
                          <TableHead>Account Code</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead>Element Group</TableHead>
                          <TableHead>Sub Element Group</TableHead>
                          <TableHead>Detailed Group</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4">
                              <div className="flex justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">Loading accounts...</div>
                            </TableCell>
                          </TableRow>
                        ) : paginatedAccounts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4">
                              <div className="text-sm text-muted-foreground">No accounts found</div>
                              {searchTerm && <div className="mt-1 text-xs text-muted-foreground">Try adjusting your search</div>}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedAccounts.map((account) => {
                            // Lookup related objects
                            const detailedGroup = detailedGroups.find(dg => dg.id === account.detailedGroupId);
                            const subElementGroup = detailedGroup ? 
                              subElementGroups.find(seg => seg.id === detailedGroup.subElementGroupId) : undefined;
                            const elementGroup = subElementGroup ? 
                              elementGroups.find(eg => eg.id === subElementGroup.elementGroupId) : undefined;
                            
                            return (
                              <TableRow key={account.id}>
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedAccounts.includes(account.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedAccounts([...selectedAccounts, account.id]);
                                      } else {
                                        setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>{account.accountCode}</TableCell>
                                <TableCell>{account.accountName}</TableCell>
                                <TableCell>{elementGroup ? (elementGroup.customName || elementGroup.name.charAt(0).toUpperCase() + elementGroup.name.slice(1)) : '-'}</TableCell>
                                <TableCell>{subElementGroup ? (subElementGroup.customName || subElementGroup.name) : '-'}</TableCell>
                                <TableCell>{detailedGroup ? (detailedGroup.customName || detailedGroup.name) : '-'}</TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setCurrentItem(account);
                                        setEditDialogOpen(true);
                                        
                                        // Set form values based on current account
                                        if (elementGroup && subElementGroup && detailedGroup) {
                                          chartOfAccountForm.setValue("elementGroup", elementGroup.id.toString());
                                          chartOfAccountForm.setValue("subElementGroup", subElementGroup.id.toString());
                                          chartOfAccountForm.setValue("detailedGroup", detailedGroup.id.toString());
                                          chartOfAccountForm.setValue("accountName", account.accountName);
                                          chartOfAccountForm.setValue("description", account.description || "");
                                        }
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setCurrentItem(account);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination for Accounts */}
                  {!isLoading && totalAccountsPages > 1 && (
                    <div className="flex items-center justify-between py-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {Math.min(filteredSearchedAccounts.length, ((accountsCurrentPage - 1) * ITEMS_PER_PAGE) + 1)}-{Math.min(filteredSearchedAccounts.length, accountsCurrentPage * ITEMS_PER_PAGE)} of {filteredSearchedAccounts.length}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAccountsCurrentPage(page => Math.max(1, page - 1))}
                          disabled={accountsCurrentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAccountsCurrentPage(page => Math.min(totalAccountsPages, page + 1))}
                          disabled={accountsCurrentPage === totalAccountsPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Sub Element Groups Tab */}
            <TabsContent value="sub-element-groups" className="border rounded-md p-4">
              {activeTab === "sub-element-groups" && (
                <>
                  {/* Sub Element Groups Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox 
                              checked={selectAllSubElementGroups}
                              onCheckedChange={(checked) => setSelectAllSubElementGroups(checked === true)}
                            />
                          </TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Element Group</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              <div className="flex justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">Loading sub element groups...</div>
                            </TableCell>
                          </TableRow>
                        ) : paginatedSubElementGroups.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              <div className="text-sm text-muted-foreground">No sub element groups found</div>
                              {searchTerm && <div className="mt-1 text-xs text-muted-foreground">Try adjusting your search</div>}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedSubElementGroups.map((group) => {
                            const elementGroup = elementGroups.find(eg => eg.id === group.elementGroupId);
                            
                            return (
                              <TableRow key={group.id}>
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedSubElementGroups.includes(group.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedSubElementGroups([...selectedSubElementGroups, group.id]);
                                      } else {
                                        setSelectedSubElementGroups(selectedSubElementGroups.filter(id => id !== group.id));
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>{group.code}</TableCell>
                                <TableCell>{group.customName || group.name}</TableCell>
                                <TableCell>{elementGroup ? (elementGroup.customName || elementGroup.name.charAt(0).toUpperCase() + elementGroup.name.slice(1)) : '-'}</TableCell>
                                <TableCell>{group.description || '-'}</TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setCurrentSubElementGroup(group);
                                        setEditSubElementGroupDialogOpen(true);
                                        
                                        // Set form values based on current group
                                        if (elementGroup) {
                                          subElementGroupForm.setValue("elementGroup", elementGroup.id.toString());
                                          subElementGroupForm.setValue("name", group.name);
                                          subElementGroupForm.setValue("customName", group.customName || "");
                                          subElementGroupForm.setValue("code", group.code);
                                          subElementGroupForm.setValue("description", group.description || "");
                                        }
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setCurrentSubElementGroup(group);
                                        setDeleteSubElementGroupDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination for Sub Element Groups */}
                  {!isLoading && totalSubElementGroupsPages > 1 && (
                    <div className="flex items-center justify-between py-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {Math.min(filteredSearchedSubElementGroups.length, ((subElementGroupsCurrentPage - 1) * ITEMS_PER_PAGE) + 1)}-{Math.min(filteredSearchedSubElementGroups.length, subElementGroupsCurrentPage * ITEMS_PER_PAGE)} of {filteredSearchedSubElementGroups.length}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSubElementGroupsCurrentPage(page => Math.max(1, page - 1))}
                          disabled={subElementGroupsCurrentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSubElementGroupsCurrentPage(page => Math.min(totalSubElementGroupsPages, page + 1))}
                          disabled={subElementGroupsCurrentPage === totalSubElementGroupsPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Detailed Groups Tab */}
            <TabsContent value="detailed-groups" className="border rounded-md p-4">
              {activeTab === "detailed-groups" && (
                <>
                  {/* Detailed Groups Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox 
                              checked={selectAllDetailedGroups}
                              onCheckedChange={(checked) => setSelectAllDetailedGroups(checked === true)}
                            />
                          </TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Sub Element Group</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              <div className="flex justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">Loading detailed groups...</div>
                            </TableCell>
                          </TableRow>
                        ) : paginatedDetailedGroups.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              <div className="text-sm text-muted-foreground">No detailed groups found</div>
                              {searchTerm && <div className="mt-1 text-xs text-muted-foreground">Try adjusting your search</div>}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedDetailedGroups.map((group) => {
                            const subElementGroup = subElementGroups.find(seg => seg.id === group.subElementGroupId);
                            
                            return (
                              <TableRow key={group.id}>
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedDetailedGroups.includes(group.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedDetailedGroups([...selectedDetailedGroups, group.id]);
                                      } else {
                                        setSelectedDetailedGroups(selectedDetailedGroups.filter(id => id !== group.id));
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>{group.code}</TableCell>
                                <TableCell>{group.customName || group.name}</TableCell>
                                <TableCell>{subElementGroup ? (subElementGroup.customName || subElementGroup.name) : '-'}</TableCell>
                                <TableCell>{group.description || '-'}</TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setCurrentDetailedGroup(group);
                                        setEditDetailedGroupDialogOpen(true);
                                        
                                        // Set form values based on current group
                                        if (subElementGroup) {
                                          detailedGroupForm.setValue("subElementGroup", subElementGroup.id.toString());
                                          detailedGroupForm.setValue("name", group.name);
                                          detailedGroupForm.setValue("customName", group.customName || "");
                                          detailedGroupForm.setValue("code", group.code);
                                          detailedGroupForm.setValue("description", group.description || "");
                                        }
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setCurrentDetailedGroup(group);
                                        setDeleteDetailedGroupDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination for Detailed Groups */}
                  {!isLoading && totalDetailedGroupsPages > 1 && (
                    <div className="flex items-center justify-between py-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {Math.min(filteredSearchedDetailedGroups.length, ((detailedGroupsCurrentPage - 1) * ITEMS_PER_PAGE) + 1)}-{Math.min(filteredSearchedDetailedGroups.length, detailedGroupsCurrentPage * ITEMS_PER_PAGE)} of {filteredSearchedDetailedGroups.length}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailedGroupsCurrentPage(page => Math.max(1, page - 1))}
                          disabled={detailedGroupsCurrentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailedGroupsCurrentPage(page => Math.min(totalDetailedGroupsPages, page + 1))}
                          disabled={detailedGroupsCurrentPage === totalDetailedGroupsPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkDeleteType === 'accounts' && (
                `You are about to delete ${selectedAccounts.length} account(s). This action cannot be undone.`
              )}
              {bulkDeleteType === 'sub-element-groups' && (
                `You are about to delete ${selectedSubElementGroups.length} sub-element group(s). This may also affect related detailed groups and accounts. This action cannot be undone.`
              )}
              {bulkDeleteType === 'detailed-groups' && (
                `You are about to delete ${selectedDetailedGroups.length} detailed group(s). This may also affect related accounts. This action cannot be undone.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Chart of Account Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new account in your chart of accounts
            </DialogDescription>
          </DialogHeader>
          <Form {...chartOfAccountForm}>
            <form onSubmit={chartOfAccountForm.handleSubmit((values) => {
              // Create chart of account mutation
              const detailedGroupId = parseInt(values.detailedGroup);
              const detailedGroup = detailedGroups.find(dg => dg.id === detailedGroupId);
              const subElementGroup = subElementGroups.find(seg => seg.id === detailedGroup?.subElementGroupId);
              const elementGroup = elementGroups.find(eg => eg.id === subElementGroup?.elementGroupId);
              const mainGroup = elementGroup ? 
                mainGroups.find(mg => mg.id === elementGroup.mainGroupId) : undefined;
              
              // Check for duplicate account name (case-insensitive)
              // Use accountsState which includes all accounts (active and inactive)
              const accountNameExists = accountsState.some(account => 
                account.accountName.toLowerCase() === values.accountName.toLowerCase()
              );
              
              if (accountNameExists) {
                toast({
                  title: "Validation Error",
                  description: "An account with this name already exists (name comparison is case-insensitive)",
                  variant: "destructive",
                });
                return;
              }
              
              let accountType = "asset"; // Default
              
              if (elementGroup) {
                switch(elementGroup.name.toLowerCase()) {
                  case "assets":
                    accountType = "asset";
                    break;
                  case "liabilities":
                    accountType = "liability";
                    break;
                  case "equity":
                    accountType = "equity";
                    break;
                  case "incomes":
                    accountType = "revenue";
                    break;
                  case "expenses":
                    accountType = "expense";
                    break;
                }
              }
              
              // API request to create account
              apiRequest(
                'POST',
                `/api/v1/finance/chart-of-accounts`,
                {
                  detailedGroupId,
                  accountName: values.accountName,
                  accountType,
                  description: values.description || null,
                }
              ).then(() => {
                toast({
                  title: "Success",
                  description: "Account created successfully",
                });
                setCreateDialogOpen(false);
                chartOfAccountForm.reset();
                queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
              }).catch(error => {
                toast({
                  title: "Error",
                  description: error.message || "Failed to create account",
                  variant: "destructive",
                });
              });
            })}>
              <div className="grid gap-4 py-4">
                <FormField
                  control={chartOfAccountForm.control}
                  name="elementGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Element Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Element Group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {elementGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.customName || group.name.charAt(0).toUpperCase() + group.name.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={chartOfAccountForm.control}
                  name="subElementGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Element Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!watchElementGroup}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sub Element Group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subElementGroups
                            .filter(group => watchElementGroup ? group.elementGroupId === parseInt(watchElementGroup) : false)
                            .map((group) => (
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
                  control={chartOfAccountForm.control}
                  name="detailedGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!watchSubElementGroup}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Detailed Group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {detailedGroups
                            .filter(group => watchSubElementGroup ? group.subElementGroupId === parseInt(watchSubElementGroup) : false)
                            .map((group) => (
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
                  control={chartOfAccountForm.control}
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
                  control={chartOfAccountForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter description (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Create Account</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Sub Element Group Dialog */}
      <Dialog open={createSubElementGroupDialogOpen} onOpenChange={setCreateSubElementGroupDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Sub Element Group</DialogTitle>
            <DialogDescription>
              Create a new sub element group for your chart of accounts
            </DialogDescription>
          </DialogHeader>
          <Form {...subElementGroupForm}>
            <form onSubmit={subElementGroupForm.handleSubmit((values) => {
              // Create sub element group mutation  
              const elementGroupId = parseInt(values.elementGroup);
              
              apiRequest(
                'POST',
                `/api/v1/finance/chart-of-accounts/sub-element-groups`,
                {
                  elementGroupId,
                  name: "custom", // Always use 'custom' as enum value
                  customName: values.name, // Store actual name in customName field
                  code: values.code,
                  description: values.description || null,
                }
              ).then(() => {
                toast({
                  title: "Success",
                  description: "Sub Element Group created successfully",
                });
                setCreateSubElementGroupDialogOpen(false);
                subElementGroupForm.reset();
                queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'] });
              }).catch(error => {
                toast({
                  title: "Error",
                  description: error.message || "Failed to create sub element group",
                  variant: "destructive",
                });
              });
            })}>
              <div className="grid gap-4 py-4">
                <FormField
                  control={subElementGroupForm.control}
                  name="elementGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Element Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Element Group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {elementGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.customName || group.name.charAt(0).toUpperCase() + group.name.slice(1)}
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
                      <FormControl>
                        <Input placeholder="Enter name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={subElementGroupForm.control}
                  name="customName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter custom name (optional)" {...field} />
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
                        <Input placeholder="Enter code" {...field} />
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
                        <Textarea placeholder="Enter description (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Create Sub Element Group</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Detailed Group Dialog */}
      <Dialog open={createDetailedGroupDialogOpen} onOpenChange={setCreateDetailedGroupDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Detailed Group</DialogTitle>
            <DialogDescription>
              Create a new detailed group for your chart of accounts
            </DialogDescription>
          </DialogHeader>
          <Form {...detailedGroupForm}>
            <form onSubmit={detailedGroupForm.handleSubmit((values) => {
              // Create detailed group mutation
              const subElementGroupId = parseInt(values.subElementGroup);
              
              apiRequest(
                'POST',
                `/api/v1/finance/chart-of-accounts/detailed-groups`,
                {
                  subElementGroupId,
                  name: "custom", // Always use 'custom' as enum value
                  customName: values.customName, // Store display name in customName field
                  code: values.code,
                  description: values.description || null,
                }
              ).then(() => {
                toast({
                  title: "Success",
                  description: "Detailed Group created successfully",
                });
                setCreateDetailedGroupDialogOpen(false);
                detailedGroupForm.reset();
                queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'] });
              }).catch(error => {
                toast({
                  title: "Error",
                  description: error.message || "Failed to create detailed group",
                  variant: "destructive",
                });
              });
            })}>
              <div className="grid gap-4 py-4">
                <FormField
                  control={detailedGroupForm.control}
                  name="subElementGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Element Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sub Element Group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subElementGroups.map((group) => (
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
                      <FormControl>
                        <Input placeholder="Custom" {...field} value="Custom" disabled />
                      </FormControl>
                      <FormDescription>
                        Internal name (automatically set to "Custom")
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={detailedGroupForm.control}
                  name="customName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter display name" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is the name that will appear in dropdowns and displays
                      </FormDescription>
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter description (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Create Detailed Group</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the account "{currentItem?.accountName}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="bg-destructive/15 p-3 rounded-md mb-4 text-sm text-destructive">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteChartOfAccountMutation.isPending}
            >
              {deleteChartOfAccountMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteSubElementGroupDialogOpen} onOpenChange={setDeleteSubElementGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sub Element Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the sub element group "{currentSubElementGroup?.customName || currentSubElementGroup?.name}"?
              This action cannot be undone and may affect related detailed groups and accounts.
            </DialogDescription>
          </DialogHeader>
          
          {deleteSubElementGroupError && (
            <div className="bg-destructive/15 p-3 rounded-md mb-4 text-sm text-destructive">
              {deleteSubElementGroupError}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSubElementGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (!currentSubElementGroup) return;
                setDeleteSubElementGroupError(null);
                
                apiRequest(
                  'DELETE',
                  `/api/v1/finance/chart-of-accounts/sub-element-groups/${currentSubElementGroup.id}`
                ).then(() => {
                  toast({
                    title: "Success",
                    description: "Sub Element Group deleted successfully",
                  });
                  setDeleteSubElementGroupDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'] });
                }).catch(error => {
                  if (error.message && error.message.includes("being used by detailed groups")) {
                    setDeleteSubElementGroupError(
                      "Cannot delete this sub-element group because it's being used by one or more detailed groups. Please remove or reassign those detailed groups first."
                    );
                  } else {
                    setDeleteSubElementGroupError(error.message || "Failed to delete sub element group");
                  }
                  
                  toast({
                    title: "Error",
                    description: "Failed to delete sub element group. See details in the dialog.",
                    variant: "destructive",
                  });
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDetailedGroupDialogOpen} onOpenChange={setDeleteDetailedGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Detailed Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the detailed group "{currentDetailedGroup?.customName || currentDetailedGroup?.name}"?
              This action cannot be undone and may affect related accounts.
            </DialogDescription>
          </DialogHeader>
          
          {deleteDetailedGroupError && (
            <div className="bg-destructive/15 p-3 rounded-md mb-4 text-sm text-destructive">
              {deleteDetailedGroupError}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDetailedGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (!currentDetailedGroup) return;
                setDeleteDetailedGroupError(null);
                
                apiRequest(
                  'DELETE',
                  `/api/v1/finance/chart-of-accounts/detailed-groups/${currentDetailedGroup.id}`
                ).then(() => {
                  toast({
                    title: "Success",
                    description: "Detailed Group deleted successfully",
                  });
                  setDeleteDetailedGroupDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'] });
                }).catch(error => {
                  if (error.message && error.message.includes("being used by accounts")) {
                    setDeleteDetailedGroupError(
                      "Cannot delete this detailed group because it's being used by one or more accounts. Please remove or reassign those accounts first."
                    );
                  } else {
                    setDeleteDetailedGroupError(error.message || "Failed to delete detailed group");
                  }
                  
                  toast({
                    title: "Error",
                    description: "Failed to delete detailed group. See details in the dialog.",
                    variant: "destructive",
                  });
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Sub Element Group Dialog */}
      <Dialog open={editSubElementGroupDialogOpen} onOpenChange={setEditSubElementGroupDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Sub Element Group</DialogTitle>
            <DialogDescription>
              Update the sub element group details
            </DialogDescription>
          </DialogHeader>
          <Form {...subElementGroupForm}>
            <form onSubmit={subElementGroupForm.handleSubmit((values) => {
              // Edit sub element group mutation
              if (!currentSubElementGroup) return;
              
              const elementGroupId = parseInt(values.elementGroup);
              
              apiRequest(
                'PATCH',
                `/api/v1/finance/chart-of-accounts/sub-element-groups/${currentSubElementGroup.id}`,
                {
                  elementGroupId,
                  name: "custom", // Always use 'custom' for name
                  customName: values.customName,
                  code: values.code,
                  description: values.description || null,
                }
              ).then(() => {
                toast({
                  title: "Success",
                  description: "Sub element group updated successfully",
                });
                setEditSubElementGroupDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'] });
              }).catch(error => {
                toast({
                  title: "Error",
                  description: error.message || "Failed to update sub element group",
                  variant: "destructive",
                });
              });
            })}>
              <div className="grid gap-4 py-4">
                <FormField
                  control={subElementGroupForm.control}
                  name="elementGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Element Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Element Group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {elementGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.customName || group.name.charAt(0).toUpperCase() + group.name.slice(1)}
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
                  name="customName"
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
                  control={subElementGroupForm.control}
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
                  control={subElementGroupForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter description (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Update Sub Element Group</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Detailed Group Dialog */}
      <Dialog open={editDetailedGroupDialogOpen} onOpenChange={setEditDetailedGroupDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Detailed Group</DialogTitle>
            <DialogDescription>
              Update the detailed group details
            </DialogDescription>
          </DialogHeader>
          <Form {...detailedGroupForm}>
            <form onSubmit={detailedGroupForm.handleSubmit((values) => {
              // Edit detailed group mutation
              if (!currentDetailedGroup) return;
              
              const subElementGroupId = parseInt(values.subElementGroup);
              
              apiRequest(
                'PATCH',
                `/api/v1/finance/chart-of-accounts/detailed-groups/${currentDetailedGroup.id}`,
                {
                  subElementGroupId,
                  name: "custom", // Always use 'custom' for name
                  customName: values.customName,
                  code: values.code,
                  description: values.description || null,
                }
              ).then(() => {
                toast({
                  title: "Success",
                  description: "Detailed group updated successfully",
                });
                setEditDetailedGroupDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'] });
              }).catch(error => {
                toast({
                  title: "Error",
                  description: error.message || "Failed to update detailed group",
                  variant: "destructive",
                });
              });
            })}>
              <div className="grid gap-4 py-4">
                <FormField
                  control={detailedGroupForm.control}
                  name="subElementGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Element Group</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sub Element Group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subElementGroups.map((group) => (
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
                  name="customName"
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter description (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Update Detailed Group</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}