import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  PlusCircle, 
  Save, 
  X, 
  Trash2, 
  RefreshCw, 
  Check,
  ChevronDown 
} from 'lucide-react';
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

// Define schemas for the various levels of the Chart of Accounts
const newMainGroupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  code: z.string().min(1, { message: "Code is required" }),
});

const newElementGroupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  code: z.string().min(1, { message: "Code is required" }),
  mainGroupId: z.number().min(1, { message: "Main group is required" }),
});

const newSubElementGroupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  code: z.string().min(1, { message: "Code is required" }),
  elementGroupId: z.number().min(1, { message: "Element group is required" }),
});

const newDetailedGroupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  subElementGroupId: z.number().min(1, { message: "Sub-element group is required" }),
  code: z.string().optional(),
});

const accountSchema = z.object({
  accountName: z.string().min(2, { message: "Account name must be at least 2 characters" }),
  detailedGroupId: z.number().optional(),
  openingBalance: z.string().optional().default("0"),
});

// According to COA Config.txt
const MAIN_GROUPS = [
  { value: "balance_sheet", name: "Balance Sheet" },
  { value: "profit_loss", name: "Profit and Loss" },
];

// Based on COA Config.txt - Conditional values based on main group
const getElementGroups = (mainGroup) => {
  if (mainGroup === "balance_sheet") {
    return [
      { value: "assets", name: "Assets" },
      { value: "liabilities", name: "Liabilities" },
      { value: "equity", name: "Equity" },
    ];
  } else if (mainGroup === "profit_loss") {
    return [
      { value: "incomes", name: "Incomes" },
      { value: "expenses", name: "Expenses" },
    ];
  }
  return [];
};

// Based on COA Config.txt - Conditional values based on element group
const getSubElementGroups = (elementGroup) => {
  switch (elementGroup) {
    case "equity":
      return [
        { value: "capital", name: "Capital" },
        { value: "share_capital", name: "Share Capital" },
        { value: "reserves", name: "Reserves" },
      ];
    case "liabilities":
      return [
        { value: "non_current_liabilities", name: "Non Current Liabilities" },
        { value: "current_liabilities", name: "Current Liabilities" },
      ];
    case "assets":
      return [
        { value: "non_current_assets", name: "Non Current Assets" },
        { value: "current_assets", name: "Current Assets" },
      ];
    case "incomes":
      return [
        { value: "sales", name: "Sales" },
        { value: "service_revenue", name: "Service Revenue" },
      ];
    case "expenses":
      return [
        { value: "cost_of_sales", name: "Cost of Sales" },
        { value: "cost_of_service_revenue", name: "Cost of Service Revenue" },
        { value: "purchase_returns", name: "Purchase Returns" },
      ];
    default:
      return [];
  }
};

// Based on COA Config.txt - Detailed groups based on sub-element group
const getInitialDetailedGroups = (subElementGroup) => {
  switch (subElementGroup) {
    case "capital":
      return [
        { value: "owners_capital", name: "Owners Capital" },
      ];
    case "non_current_liabilities":
      return [
        { value: "long_term_loans", name: "Long term loans" },
      ];
    case "current_liabilities":
      return [
        { value: "short_term_loans", name: "Short term loans" },
        { value: "trade_creditors", name: "Trade Creditors" },
        { value: "accrued_charges", name: "Accrued Charges" },
        { value: "other_payables", name: "Other Payables" },
      ];
    case "non_current_assets":
      return [
        { value: "property_plant_equipment", name: "Property Plant and Equipment" },
        { value: "intangible_assets", name: "Intangible Assets" },
      ];
    case "current_assets":
      return [
        { value: "stock_in_trade", name: "Stock in trade" },
        { value: "trade_debtors", name: "Trade Debtors" },
        { value: "advances_prepayments", name: "Advances and prepayments" },
        { value: "other_receivables", name: "Other Receivables" },
        { value: "cash_bank_balances", name: "Cash and Bank Balances" },
      ];
    default:
      return [];
  }
};

export default function ChartOfAccountsCreateTabular() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // For table entries
  const [entries, setEntries] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null);
  
  // Dialog states
  const [showNewMainGroupDialog, setShowNewMainGroupDialog] = useState(false);
  const [showNewElementGroupDialog, setShowNewElementGroupDialog] = useState(false);
  const [showNewSubElementGroupDialog, setShowNewSubElementGroupDialog] = useState(false);
  const [showNewDetailedGroupDialog, setShowNewDetailedGroupDialog] = useState(false);
  
  // Selected group values from dropdowns
  const [selectedMainGroup, setSelectedMainGroup] = useState<string | null>(null);
  const [selectedElementGroup, setSelectedElementGroup] = useState<string | null>(null);
  const [selectedSubElementGroup, setSelectedSubElementGroup] = useState<string | null>(null);
  const [selectedDetailedGroup, setSelectedDetailedGroup] = useState<string | null>(null);
  
  // Fetch API data
  const { data: mainGroupsData, isLoading: mainGroupsLoading, refetch: refetchMainGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/main-groups'],
    refetchOnWindowFocus: false,
  });
  
  const { data: elementGroupsData, isLoading: elementGroupsLoading, refetch: refetchElementGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/element-groups'],
    refetchOnWindowFocus: false,
  });
  
  const { data: subElementGroupsData, isLoading: subElementGroupsLoading, refetch: refetchSubElementGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'],
    refetchOnWindowFocus: false,
  });
  
  const { data: detailedGroupsData, isLoading: detailedGroupsLoading, refetch: refetchDetailedGroups } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'],
    refetchOnWindowFocus: false,
  });
  
  const { data: chartOfAccountsData, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
    refetchOnWindowFocus: false,
  });

  // Forms for hierarchical groups
  const newMainGroupForm = useForm<z.infer<typeof newMainGroupSchema>>({
    resolver: zodResolver(newMainGroupSchema),
    defaultValues: {
      name: '',
      code: '',
    },
  });
  
  const newElementGroupForm = useForm<z.infer<typeof newElementGroupSchema>>({
    resolver: zodResolver(newElementGroupSchema),
    defaultValues: {
      name: '',
      code: '',
      mainGroupId: 0,
    },
  });
  
  const newSubElementGroupForm = useForm<z.infer<typeof newSubElementGroupSchema>>({
    resolver: zodResolver(newSubElementGroupSchema),
    defaultValues: {
      name: '',
      code: '',
      elementGroupId: 0,
    },
  });
  
  const newDetailedGroupForm = useForm<z.infer<typeof newDetailedGroupSchema>>({
    resolver: zodResolver(newDetailedGroupSchema),
    defaultValues: {
      name: '',
      subElementGroupId: 0,
    },
  });
  
  const accountForm = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountName: '',
      openingBalance: '0',
    },
  });
  
  // Effect when showing the detailed group dialog, set the right sub-element group ID
  useEffect(() => {
    if (showNewDetailedGroupDialog && selectedSubElementGroup) {
      // Find the right subElementGroup from the data
      const subElementGroup = subElementGroupsData?.find((item: any) => 
        item.id?.toString() === selectedSubElementGroup || 
        item.name === selectedSubElementGroup
      );
      
      if (subElementGroup) {
        console.log("Setting subElementGroupId in form:", subElementGroup.id);
        newDetailedGroupForm.setValue("subElementGroupId", subElementGroup.id);
      } else if (!isNaN(parseInt(selectedSubElementGroup))) {
        // If it's a numeric string, convert to number
        const subElementGroupId = parseInt(selectedSubElementGroup);
        console.log("Setting subElementGroupId using parsed value:", subElementGroupId);
        newDetailedGroupForm.setValue("subElementGroupId", subElementGroupId);
      }
    }
  }, [showNewDetailedGroupDialog, selectedSubElementGroup, subElementGroupsData]);

  // Effect for loading existing chart of accounts data
  useEffect(() => {
    if (chartOfAccountsData && Array.isArray(chartOfAccountsData)) {
      setEntries(chartOfAccountsData);
    }
  }, [chartOfAccountsData]);
  
  // Update Element Group Form when Main Group dialog opens
  useEffect(() => {
    if (showNewElementGroupDialog && selectedMainGroup) {
      // Find the right mainGroup from the data
      const mainGroup = mainGroupsData?.find((item: any) => 
        item.name === selectedMainGroup || 
        item.id?.toString() === selectedMainGroup
      );
      
      if (mainGroup) {
        console.log("Setting mainGroupId in element group form:", mainGroup.id);
        newElementGroupForm.setValue("mainGroupId", mainGroup.id);
      }
    }
  }, [showNewElementGroupDialog, selectedMainGroup, mainGroupsData]);
  
  // Update Sub Element Group Form when Element Group dialog opens
  useEffect(() => {
    if (showNewSubElementGroupDialog && selectedElementGroup) {
      // Find the right elementGroup from the data
      const elementGroup = elementGroupsData?.find((item: any) => 
        item.name === selectedElementGroup || 
        item.id?.toString() === selectedElementGroup
      );
      
      if (elementGroup) {
        console.log("Setting elementGroupId in sub element group form:", elementGroup.id);
        newSubElementGroupForm.setValue("elementGroupId", elementGroup.id);
      }
    }
  }, [showNewSubElementGroupDialog, selectedElementGroup, elementGroupsData]);

  // Mutations
  const createMainGroupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof newMainGroupSchema>) => {
      return apiRequest('POST', '/api/v1/finance/chart-of-accounts/main-groups', values);
    },
    onSuccess: () => {
      toast({
        title: "Main Group Added",
        description: "The main group has been added successfully.",
      });
      setShowNewMainGroupDialog(false);
      newMainGroupForm.reset();
      refetchMainGroups();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding main group",
        description: error.message || "Failed to add main group",
        variant: "destructive",
      });
    },
  });
  
  const createElementGroupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof newElementGroupSchema>) => {
      return apiRequest('POST', '/api/v1/finance/chart-of-accounts/element-groups', values);
    },
    onSuccess: () => {
      toast({
        title: "Element Group Added",
        description: "The element group has been added successfully.",
      });
      setShowNewElementGroupDialog(false);
      newElementGroupForm.reset();
      refetchElementGroups();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding element group",
        description: error.message || "Failed to add element group",
        variant: "destructive",
      });
    },
  });
  
  const createSubElementGroupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof newSubElementGroupSchema>) => {
      return apiRequest('POST', '/api/v1/finance/chart-of-accounts/sub-element-groups', values);
    },
    onSuccess: () => {
      toast({
        title: "Sub Element Group Added",
        description: "The sub element group has been added successfully.",
      });
      setShowNewSubElementGroupDialog(false);
      newSubElementGroupForm.reset();
      refetchSubElementGroups();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding sub element group",
        description: error.message || "Failed to add sub element group",
        variant: "destructive",
      });
    },
  });
  
  const createDetailedGroupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof newDetailedGroupSchema>) => {
      return apiRequest('POST', '/api/v1/finance/chart-of-accounts/detailed-groups', values);
    },
    onSuccess: () => {
      toast({
        title: "Detailed Group Added",
        description: "The detailed group has been added successfully.",
      });
      setShowNewDetailedGroupDialog(false);
      newDetailedGroupForm.reset();
      
      // Refresh all the relevant data
      refetchDetailedGroups();
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding detailed group",
        description: error.message || "Failed to add detailed group",
        variant: "destructive",
      });
    },
  });
  
  const createAccountMutation = useMutation({
    mutationFn: async (values: z.infer<typeof accountSchema>) => {
      // Find IDs based on selected values
      const detailedGroup = getFilteredDetailedGroups().find(
        (g) => g.id?.toString() === selectedDetailedGroup || g.name === selectedDetailedGroup
      );
      
      if (!detailedGroup) {
        throw new Error("Selected detailed group not found");
      }
      
      // Create payload with detailed group ID
      const payload = {
        ...values,
        detailedGroupId: detailedGroup.id,
      };
      
      console.log("Creating account with:", payload);
      return apiRequest('POST', '/api/v1/finance/chart-of-accounts', payload);
    },
    onSuccess: () => {
      toast({
        title: "Account Created",
        description: "The account has been created successfully.",
      });
      accountForm.reset();
      refetchAccounts();
      
      // Don't clear the hierarchy selections to allow for easy creation of similar accounts
    },
    onError: (error: any) => {
      console.error("Error creating account:", error);
      toast({
        title: "Error Creating Account",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });
  
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/v1/finance/chart-of-accounts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "The account has been deleted successfully.",
      });
      refetchAccounts();
      setAccountToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Account",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });
  
  // Helper functions to filter and format groups from API data
  const getFilteredElementGroups = () => {
    if (!selectedMainGroup) return [];
    
    // First try to get from API data
    if (elementGroupsData && Array.isArray(elementGroupsData) && mainGroupsData && Array.isArray(mainGroupsData)) {
      const mainGroup = mainGroupsData.find(g => g.name === selectedMainGroup || g.id?.toString() === selectedMainGroup);
      
      if (mainGroup) {
        return elementGroupsData
          .filter(g => g.mainGroupId === mainGroup.id)
          .map(g => ({
            id: g.id,
            name: g.customName || g.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          }));
      }
    }
    
    // Fallback to predefined data
    return getElementGroups(selectedMainGroup);
  };
  
  const getFilteredSubElementGroups = () => {
    if (!selectedElementGroup) return [];
    
    // First try to get from API data
    if (subElementGroupsData && Array.isArray(subElementGroupsData) && elementGroupsData && Array.isArray(elementGroupsData)) {
      const elementGroup = elementGroupsData.find(g => g.name === selectedElementGroup || g.id?.toString() === selectedElementGroup);
      
      if (elementGroup) {
        return subElementGroupsData
          .filter(g => g.elementGroupId === elementGroup.id)
          .map(g => ({
            id: g.id,
            name: g.customName || g.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          }));
      }
    }
    
    // Fallback to predefined data
    return getSubElementGroups(selectedElementGroup);
  };
  
  const getFilteredDetailedGroups = () => {
    if (!selectedSubElementGroup) return [];
    
    // First try to get from API data
    if (detailedGroupsData && Array.isArray(detailedGroupsData) && subElementGroupsData && Array.isArray(subElementGroupsData)) {
      // Find the subElementGroup object
      const subElementGroup = subElementGroupsData.find(g => 
        g.id?.toString() === selectedSubElementGroup || 
        g.name === selectedSubElementGroup
      );
      
      if (subElementGroup) {
        // Filter detailed groups that match this subElementGroupId
        return detailedGroupsData
          .filter(g => g.subElementGroupId === subElementGroup.id)
          .map(g => ({
            id: g.id,
            name: g.customName || g.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          }));
      }
    }
    
    // Fallback to predefined data
    return getInitialDetailedGroups(selectedSubElementGroup);
  };
  
  // Handler functions
  const handleAddMainGroup = (values: z.infer<typeof newMainGroupSchema>) => {
    createMainGroupMutation.mutate(values);
  };
  
  const handleAddElementGroup = (values: z.infer<typeof newElementGroupSchema>) => {
    createElementGroupMutation.mutate(values);
  };
  
  const handleAddSubElementGroup = (values: z.infer<typeof newSubElementGroupSchema>) => {
    createSubElementGroupMutation.mutate(values);
  };
  
  const handleAddDetailedGroup = (values: z.infer<typeof newDetailedGroupSchema>) => {
    // Auto-generate code if not provided
    if (!values.code || values.code.trim() === '') {
      // Generate a code based on the name (first letter of each word) and timestamp
      const namePrefix = values.name.split(' ')
        .map(word => word[0]?.toUpperCase() || '')
        .join('');
      
      const timestamp = new Date().getTime().toString().slice(-4);
      values.code = `${namePrefix}${timestamp}`;
    }
    
    console.log('Adding detailed group:', values);
    createDetailedGroupMutation.mutate(values);
  };
  
  const handleCreateAccount = (values: z.infer<typeof accountSchema>) => {
    if (!selectedDetailedGroup) {
      toast({
        title: "Validation Error",
        description: "Please select a detailed group",
        variant: "destructive",
      });
      return;
    }
    
    createAccountMutation.mutate(values);
  };
  
  const handleDeleteAccount = (id: number) => {
    setAccountToDelete(id);
    setDeleteAlertOpen(true);
  };
  
  const confirmDeleteAccount = () => {
    if (accountToDelete !== null) {
      deleteAccountMutation.mutate(accountToDelete);
    }
    setDeleteAlertOpen(false);
  };
  
  const resetForm = () => {
    accountForm.reset();
  };
  
  // Find selected group labels for display
  const getSelectedMainGroupLabel = () => {
    if (!selectedMainGroup) return "";
    
    // Try API data first
    if (mainGroupsData && Array.isArray(mainGroupsData)) {
      const mainGroup = mainGroupsData.find(g => g.id?.toString() === selectedMainGroup || g.name === selectedMainGroup);
      if (mainGroup) {
        return mainGroup.customName || mainGroup.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
    }
    
    // Fallback
    return MAIN_GROUPS.find(g => g.value === selectedMainGroup)?.name || selectedMainGroup;
  };
  
  const getSelectedElementGroupLabel = () => {
    if (!selectedElementGroup) return "";
    
    // Try API data first
    if (elementGroupsData && Array.isArray(elementGroupsData)) {
      const elementGroup = elementGroupsData.find(g => g.id?.toString() === selectedElementGroup || g.name === selectedElementGroup);
      if (elementGroup) {
        return elementGroup.customName || elementGroup.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
    }
    
    // Fallback
    return getElementGroups(selectedMainGroup).find(g => g.value === selectedElementGroup)?.name || selectedElementGroup;
  };
  
  const getSelectedSubElementGroupLabel = () => {
    if (!selectedSubElementGroup) return "";
    
    // Try API data first
    if (subElementGroupsData && Array.isArray(subElementGroupsData)) {
      const subElementGroup = subElementGroupsData.find(g => g.id?.toString() === selectedSubElementGroup || g.name === selectedSubElementGroup);
      if (subElementGroup) {
        return subElementGroup.customName || subElementGroup.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
    }
    
    // Fallback
    return getSubElementGroups(selectedElementGroup).find(g => g.value === selectedSubElementGroup)?.name || selectedSubElementGroup;
  };
  
  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Chart of Accounts Management</CardTitle>
            <CardDescription>
              Add new accounts to your chart of accounts structure
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/finance')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Step 1: Account Hierarchy Selection */}
          <div className="bg-slate-50 p-4 rounded-md">
            <h3 className="text-md font-medium mb-4">Step 1: Select Account Hierarchy</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Main Group Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Main Group</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setShowNewMainGroupDialog(true)}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Select 
                  value={selectedMainGroup || ""} 
                  onValueChange={(value) => {
                    setSelectedMainGroup(value);
                    setSelectedElementGroup(null);
                    setSelectedSubElementGroup(null);
                    setSelectedDetailedGroup(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Main Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Use API data with fallback to predefined */}
                    {mainGroupsData && Array.isArray(mainGroupsData) ? (
                      mainGroupsData.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.customName || group.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </SelectItem>
                      ))
                    ) : (
                      MAIN_GROUPS.map((group) => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Element Group Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Element Group</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setShowNewElementGroupDialog(true)}
                    disabled={!selectedMainGroup}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Select 
                  value={selectedElementGroup || ""} 
                  onValueChange={(value) => {
                    setSelectedElementGroup(value);
                    setSelectedSubElementGroup(null);
                    setSelectedDetailedGroup(null);
                  }}
                  disabled={!selectedMainGroup}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Element Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredElementGroups().map((group) => (
                      <SelectItem key={group.id || group.value} value={group.id?.toString() || group.value}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sub-Element Group Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Sub-Element Group</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setShowNewSubElementGroupDialog(true)}
                    disabled={!selectedElementGroup}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Select 
                  value={selectedSubElementGroup || ""} 
                  onValueChange={(value) => {
                    setSelectedSubElementGroup(value);
                    setSelectedDetailedGroup(null);
                  }}
                  disabled={!selectedElementGroup}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Sub-Element Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredSubElementGroups().map((group) => (
                      <SelectItem key={group.id || group.value} value={group.id?.toString() || group.value}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Detailed Group Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Detailed Group</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setShowNewDetailedGroupDialog(true)}
                    disabled={!selectedSubElementGroup}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Select 
                  value={selectedDetailedGroup || ""} 
                  onValueChange={(value) => {
                    setSelectedDetailedGroup(value);
                  }}
                  disabled={!selectedSubElementGroup}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Detailed Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredDetailedGroups().map((group) => (
                      <SelectItem key={group.id || group.value} value={group.id?.toString() || group.value}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Step 2: Account Details */}
          <div className="bg-slate-50 p-4 rounded-md">
            <h3 className="text-md font-medium mb-4">Step 2: Enter Account Details</h3>
            
            {/* Show selected hierarchy */}
            {selectedMainGroup && (
              <div className="mb-4 p-3 bg-white rounded border text-sm">
                <h4 className="font-medium mb-1">Selected Account Hierarchy:</h4>
                <div className="grid grid-cols-4">
                  <div><span className="font-medium">Main:</span> {getSelectedMainGroupLabel()}</div>
                  {selectedElementGroup && <div><span className="font-medium">Element:</span> {getSelectedElementGroupLabel()}</div>}
                  {selectedSubElementGroup && <div><span className="font-medium">Sub-Element:</span> {getSelectedSubElementGroupLabel()}</div>}
                  {selectedDetailedGroup && (
                    <div>
                      <span className="font-medium">Detailed:</span> {
                        getFilteredDetailedGroups().find(g => 
                          g.id?.toString() === selectedDetailedGroup || 
                          g.value === selectedDetailedGroup
                        )?.name
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <Form {...accountForm}>
              <form onSubmit={accountForm.handleSubmit(handleCreateAccount)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={accountForm.control}
                    name="accountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name (AC Head)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter account name" 
                            {...field} 
                            disabled={!selectedDetailedGroup}
                          />
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
                            disabled={!selectedDetailedGroup}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={!selectedDetailedGroup}
                  >
                    <X className="mr-2 h-4 w-4" /> Clear
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={!selectedDetailedGroup || createAccountMutation.isPending}
                  >
                    {createAccountMutation.isPending ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save Account
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
          
          {/* Step 3: Existing Accounts */}
          <div className="bg-slate-50 p-4 rounded-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium">Step 3: Manage Existing Accounts</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchAccounts()}
                className="flex items-center"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
            </div>
            
            {accountsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                <p>Loading accounts...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No accounts found. Add your first account above.</p>
              </div>
            ) : (
              <div className="rounded border overflow-hidden">
                <table className="w-full bg-white">
                  <thead>
                    <tr className="bg-slate-100 border-b">
                      <th className="p-2 text-left font-medium text-sm">Account Name</th>
                      <th className="p-2 text-left font-medium text-sm">Type</th>
                      <th className="p-2 text-left font-medium text-sm">Opening Balance</th>
                      <th className="p-2 text-left font-medium text-sm">Current Balance</th>
                      <th className="p-2 text-center font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((account) => (
                      <tr key={account.id} className="border-b hover:bg-slate-50">
                        <td className="p-2">{account.accountName}</td>
                        <td className="p-2 capitalize">{account.accountType}</td>
                        <td className="p-2">{parseFloat(account.openingBalance).toFixed(2)}</td>
                        <td className="p-2">{parseFloat(account.currentBalance).toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAccount(account.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Add New Main Group Dialog */}
      <Dialog open={showNewMainGroupDialog} onOpenChange={setShowNewMainGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Main Group</DialogTitle>
            <DialogDescription>
              Create a new main group for your chart of accounts
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newMainGroupForm}>
            <form onSubmit={newMainGroupForm.handleSubmit(handleAddMainGroup)} className="space-y-4">
              <FormField
                control={newMainGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., balance_sheet" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use snake_case for the internal name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newMainGroupForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., BS" {...field} />
                    </FormControl>
                    <FormDescription>
                      Short code for identification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createMainGroupMutation.isPending}
                >
                  {createMainGroupMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span> Creating...
                    </>
                  ) : (
                    "Create Main Group"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add New Element Group Dialog */}
      <Dialog open={showNewElementGroupDialog} onOpenChange={setShowNewElementGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Element Group</DialogTitle>
            <DialogDescription>
              Create a new element group under the selected main group
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newElementGroupForm}>
            <form onSubmit={newElementGroupForm.handleSubmit(handleAddElementGroup)} className="space-y-4">
              <FormField
                control={newElementGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., assets" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use snake_case for the internal name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newElementGroupForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., A" {...field} />
                    </FormControl>
                    <FormDescription>
                      Short code for identification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Show selected Main Group */}
              <div className="p-3 bg-slate-50 rounded-md">
                <p className="text-sm font-medium">Selected Main Group:</p>
                <p className="text-sm">{getSelectedMainGroupLabel()}</p>
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createElementGroupMutation.isPending}
                >
                  {createElementGroupMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span> Creating...
                    </>
                  ) : (
                    "Create Element Group"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add New Sub-Element Group Dialog */}
      <Dialog open={showNewSubElementGroupDialog} onOpenChange={setShowNewSubElementGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Sub-Element Group</DialogTitle>
            <DialogDescription>
              Create a new sub-element group under the selected element group
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newSubElementGroupForm}>
            <form onSubmit={newSubElementGroupForm.handleSubmit(handleAddSubElementGroup)} className="space-y-4">
              <FormField
                control={newSubElementGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., current_assets" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use snake_case for the internal name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newSubElementGroupForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CA" {...field} />
                    </FormControl>
                    <FormDescription>
                      Short code for identification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Show selected Element Group */}
              <div className="p-3 bg-slate-50 rounded-md">
                <p className="text-sm font-medium">Selected Element Group:</p>
                <p className="text-sm">{getSelectedElementGroupLabel()}</p>
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createSubElementGroupMutation.isPending}
                >
                  {createSubElementGroupMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span> Creating...
                    </>
                  ) : (
                    "Create Sub-Element Group"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add New Detailed Group Dialog */}
      <Dialog open={showNewDetailedGroupDialog} onOpenChange={setShowNewDetailedGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Detailed Group</DialogTitle>
            <DialogDescription>
              Create a new detailed group under the selected sub-element group
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newDetailedGroupForm}>
            <form onSubmit={newDetailedGroupForm.handleSubmit(handleAddDetailedGroup)} className="space-y-4">
              <FormField
                control={newDetailedGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., cash_in_hand" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use snake_case for the internal name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newDetailedGroupForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional - Auto-generated if empty" {...field} />
                    </FormControl>
                    <FormDescription>
                      Short code for identification (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Show selected Sub-Element Group */}
              <div className="p-3 bg-slate-50 rounded-md">
                <p className="text-sm font-medium">Selected Sub-Element Group:</p>
                <p className="text-sm">{getSelectedSubElementGroupLabel()}</p>
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createDetailedGroupMutation.isPending}
                >
                  {createDetailedGroupMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span> Creating...
                    </>
                  ) : (
                    "Create Detailed Group"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}