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
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Save, 
  Plus,
  MinusCircle,
  PlusCircle,
  Edit,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Chart of Account schemas
const accountSchema = z.object({
  detailedGroupId: z.number(),
  accountName: z.string().min(1, "Account name is required"),
  openingBalance: z.string().default("0"),
});

// New schemas for adding hierarchy groups
const newMainGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
});

const newElementGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  mainGroupId: z.number(),
});

const newSubElementGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  elementGroupId: z.number(),
});

const newDetailedGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  subElementGroupId: z.number(),
});

// Predefined values as per config
const MAIN_GROUPS = [
  { name: "Balance Sheet", value: "balance_sheet" },
  { name: "Profit and Loss", value: "profit_and_loss" }
];

const ELEMENT_GROUPS = {
  balance_sheet: [
    { name: "Equity", value: "equity" },
    { name: "Liabilities", value: "liabilities" },
    { name: "Assets", value: "assets" }
  ],
  profit_and_loss: [
    { name: "Incomes", value: "incomes" },
    { name: "Expenses", value: "expenses" }
  ]
};

const SUB_ELEMENT_GROUPS = {
  equity: [
    { name: "Capital", value: "capital" },
    { name: "Share Capital", value: "share_capital" },
    { name: "Reserves", value: "reserves" }
  ],
  liabilities: [
    { name: "Non Current Liabilities", value: "non_current_liabilities" },
    { name: "Current Liabilities", value: "current_liabilities" }
  ],
  assets: [
    { name: "Non Current Assets", value: "non_current_assets" },
    { name: "Current Assets", value: "current_assets" }
  ],
  incomes: [
    { name: "Sales", value: "sales" },
    { name: "Service Revenue", value: "service_revenue" }
  ],
  expenses: [
    { name: "Cost of Sales", value: "cost_of_sales" },
    { name: "Cost of Service Revenue", value: "cost_of_service_revenue" },
    { name: "Purchase Returns", value: "purchase_returns" }
  ]
};

const DETAILED_GROUPS = {
  capital: [
    { name: "Owners Capital", value: "owners_capital" }
  ],
  non_current_liabilities: [
    { name: "Long term loans", value: "long_term_loans" }
  ],
  current_liabilities: [
    { name: "Short term loans", value: "short_term_loans" },
    { name: "Trade Creditors", value: "trade_creditors" },
    { name: "Accrued Charges", value: "accrued_charges" },
    { name: "Other Payables", value: "other_payables" }
  ],
  non_current_assets: [
    { name: "Property Plant and Equipment", value: "property_plant_equipment" },
    { name: "Intangible Assets", value: "intangible_assets" }
  ],
  current_assets: [
    { name: "Stock in trade", value: "stock_in_trade" },
    { name: "Trade Debtors", value: "trade_debtors" },
    { name: "Advances and prepayments", value: "advances_prepayments" },
    { name: "Other Receivables", value: "other_receivables" },
    { name: "Cash and Bank Balances", value: "cash_bank_balances" }
  ],
  share_capital: [],
  reserves: [],
  sales: [],
  service_revenue: [],
  cost_of_sales: [],
  cost_of_service_revenue: [],
  purchase_returns: []
};

export default function ChartOfAccountsCreateTabular() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // For table entries
  const [entries, setEntries] = useState<any[]>([]);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [clearForm, setClearForm] = useState(false);
  
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
  
  // Fetch existing chart of accounts entries
  const { data: chartOfAccounts, isLoading: chartOfAccountsLoading } = useQuery({
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
  
  // When the detailed group dialog is shown, update the form with the current selected sub-element group ID
  useEffect(() => {
    if (showNewDetailedGroupDialog && selectedSubElementGroup) {
      // Use the raw value or convert from string as needed
      let subElementGroupIdNumber: number;
      
      // Handle cases where selectedSubElementGroup might be a string ID or a value key
      if (selectedSubElementGroup && typeof selectedSubElementGroup === 'string') {
        if (selectedSubElementGroup.startsWith('se_')) {
          // If it's a special format like "se_123", extract the number
          subElementGroupIdNumber = parseInt(selectedSubElementGroup.replace('se_', ''));
        } else if (!isNaN(parseInt(selectedSubElementGroup))) {
          // If it's a numeric string, convert to number
          subElementGroupIdNumber = parseInt(selectedSubElementGroup);
        } else {
          // If it's a string key like "current_assets", get the ID from the mapping
          // Find from the SUB_ELEMENT_GROUPS object based on the key
          // This is a fallback and might need adjustment based on your data structure
          subElementGroupIdNumber = 1; // Default fallback
        }
      } else if (typeof selectedSubElementGroup === 'number') {
        // If it's already a number, use it directly
        subElementGroupIdNumber = selectedSubElementGroup;
      } else {
        // Fallback
        subElementGroupIdNumber = 1;
      }
      
      console.log("Setting subElementGroupId in form:", subElementGroupIdNumber);
      newDetailedGroupForm.setValue("subElementGroupId", subElementGroupIdNumber);
    }
  }, [showNewDetailedGroupDialog, selectedSubElementGroup]);
  
  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountName: '',
      openingBalance: '0',
    },
  });
  
  // Effect for loading existing entries
  useEffect(() => {
    if (chartOfAccounts && Array.isArray(chartOfAccounts)) {
      setEntries(chartOfAccounts.map((account: any) => ({
        ...account,
        id: account.id,
      })));
    }
  }, [chartOfAccounts]);
  
  // Mutations for creating new hierarchical groups
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
      // Create simplified payload with just what's needed
      const payload = {
        ...values,
        mainGroup: selectedMainGroup,
        elementGroup: selectedElementGroup,
        subElementGroup: selectedSubElementGroup,
        detailedGroup: selectedDetailedGroup,
      };
      
      // No need to explicitly set these as backend now handles defaults
      // isActive: true,
      // isSystemAccount: false,
      // currentBalance: values.openingBalance,
      
      console.log("Sending account data:", payload);
      return apiRequest('POST', '/api/v1/finance/chart-of-accounts', payload);
    },
    onSuccess: (data) => {
      console.log("Account created successfully:", data);
      toast({
        title: "Account created",
        description: "The account has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      form.reset();
      
      // Clear form fields
      setSelectedMainGroup(null);
      setSelectedElementGroup(null);
      setSelectedSubElementGroup(null);
      setSelectedDetailedGroup(null);
    },
    onError: (error: any) => {
      console.error("Error creating account:", error);
      toast({
        title: "Error creating account",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof accountSchema>) => {
    if (!selectedDetailedGroup) {
      toast({
        title: "Validation Error",
        description: "Please select a detailed group for this account",
        variant: "destructive",
      });
      return;
    }
    
    createAccountMutation.mutate(values);
  };
  
  // Handle adding new hierarchical items
  const onAddMainGroup = (values: z.infer<typeof newMainGroupSchema>) => {
    createMainGroupMutation.mutate(values);
  };
  
  const onAddElementGroup = (values: z.infer<typeof newElementGroupSchema>) => {
    createElementGroupMutation.mutate(values);
  };
  
  const onAddSubElementGroup = (values: z.infer<typeof newSubElementGroupSchema>) => {
    createSubElementGroupMutation.mutate(values);
  };
  
  const onAddDetailedGroup = (values: z.infer<typeof newDetailedGroupSchema>) => {
    // Auto-generate code if not provided
    if (!values.code || values.code.trim() === '') {
      // Generate a code based on the name (first letter of each word) or use DG prefix
      const prefix = values.name 
        ? values.name.split(' ').map(word => word[0]?.toUpperCase() || '').join('')
        : 'DG';
      
      // Get current timestamp to ensure uniqueness
      const timestamp = new Date().getTime().toString().slice(-4);
      values.code = `${prefix}${timestamp}`;
    }
    
    // Debug to make sure we have the right values
    console.log('Adding detailed group with values:', values);
    
    createDetailedGroupMutation.mutate(values);
  };

  // Function to edit an entry
  const editEntry = (entry: any) => {
    setSelectedMainGroup(entry.mainGroup);
    setSelectedElementGroup(entry.elementGroup);
    setSelectedSubElementGroup(entry.subElementGroup);
    setSelectedDetailedGroup(entry.detailedGroup);
    
    form.setValue('accountName', entry.accountName);
    form.setValue('openingBalance', entry.openingBalance);
    
    setCurrentEntry(entry);
    setIsEditing(true);
  };
  
  // Function to delete an entry from the table
  const deleteEntry = (id: number) => {
    // Here we would implement deletion if needed
    // Temporary just remove from the displayed list
    setEntries(entries.filter(entry => entry.id !== id));
  };
  
  // Get available element groups based on selected main group
  const getElementGroups = () => {
    if (!selectedMainGroup) return [];
    return ELEMENT_GROUPS[selectedMainGroup as keyof typeof ELEMENT_GROUPS] || [];
  };
  
  // Get available sub-element groups based on selected element group
  const getSubElementGroups = () => {
    if (!selectedElementGroup) return [];
    return SUB_ELEMENT_GROUPS[selectedElementGroup as keyof typeof SUB_ELEMENT_GROUPS] || [];
  };
  
  // Get available detailed groups based on selected sub-element group
  const getDetailedGroups = () => {
    if (!selectedSubElementGroup) return [];
    return DETAILED_GROUPS[selectedSubElementGroup as keyof typeof DETAILED_GROUPS] || [];
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Chart of Accounts Management</CardTitle>
            <CardDescription>
              Add new accounts to your chart of accounts
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Main Group</th>
                      <th className="p-2 text-left">Element Group</th>
                      <th className="p-2 text-left">Sub-Element Group</th>
                      <th className="p-2 text-left">Detailed Group</th>
                      <th className="p-2 text-left">Account Name (AC Head)</th>
                      <th className="p-2 text-left">Opening Balance</th>
                      <th className="p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2">
                        <div className="flex items-center space-x-1">
                          <Select 
                            value={selectedMainGroup || ""} 
                            onValueChange={(value) => {
                              setSelectedMainGroup(value);
                              setSelectedElementGroup(null);
                              setSelectedSubElementGroup(null);
                              setSelectedDetailedGroup(null);
                            }}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {MAIN_GROUPS.map((group) => (
                                <SelectItem key={group.value} value={group.value}>
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowNewMainGroupDialog(true)}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center space-x-1">
                          <Select 
                            value={selectedElementGroup || ""} 
                            onValueChange={(value) => {
                              setSelectedElementGroup(value);
                              setSelectedSubElementGroup(null);
                              setSelectedDetailedGroup(null);
                            }}
                            disabled={!selectedMainGroup}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {getElementGroups().map((group) => (
                                <SelectItem key={group.value || group.id} value={(group.value || group.id).toString()}>
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowNewElementGroupDialog(true)}
                            disabled={!selectedMainGroup}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center space-x-1">
                          <Select 
                            value={selectedSubElementGroup || ""} 
                            onValueChange={(value) => {
                              setSelectedSubElementGroup(value);
                              setSelectedDetailedGroup(null);
                            }}
                            disabled={!selectedElementGroup}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {getSubElementGroups().map((group) => (
                                <SelectItem key={group.value || group.id} value={(group.value || group.id).toString()}>
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowNewSubElementGroupDialog(true)}
                            disabled={!selectedElementGroup}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center space-x-1">
                          <Select 
                            value={selectedDetailedGroup || ""} 
                            onValueChange={(value) => {
                              setSelectedDetailedGroup(value);
                              if (value) {
                                // Find the detailed group to get its ID
                                const detailedGroup = getDetailedGroups().find(g => g.value === value);
                                if (detailedGroup) {
                                  // Set the detailedGroupId in the form
                                  // This is where the magic happens to link the dropdown selection to the form field
                                  form.setValue('detailedGroupId', detailedGroup.id);
                                }
                              }
                            }}
                            disabled={!selectedSubElementGroup}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {getDetailedGroups().map((group) => (
                                <SelectItem key={group.value || group.id} value={(group.value || group.id).toString()}>
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowNewDetailedGroupDialog(true)}
                            disabled={!selectedSubElementGroup}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-2">
                        <FormField
                          control={form.control}
                          name="accountName"
                          render={({ field }) => (
                            <FormControl>
                              <Input placeholder="Account Name" {...field} className="w-[150px]" />
                            </FormControl>
                          )}
                        />
                      </td>
                      <td className="p-2">
                        <FormField
                          control={form.control}
                          name="openingBalance"
                          render={({ field }) => (
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00" 
                                {...field} 
                                className="w-[100px]" 
                              />
                            </FormControl>
                          )}
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex space-x-2">
                          <Button 
                            type="submit" 
                            disabled={createAccountMutation.isPending}
                            size="sm"
                          >
                            {createAccountMutation.isPending ? (
                              <>
                                <span className="animate-spin mr-1">⣾</span>
                                Saving
                              </>
                            ) : (
                              <>
                                <Save className="mr-1 h-4 w-4" />
                                Save
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              form.reset();
                              setSelectedMainGroup(null);
                              setSelectedElementGroup(null);
                              setSelectedSubElementGroup(null);
                              setSelectedDetailedGroup(null);
                              setClearForm(true);
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-t">
                        <td className="p-2">{entry.mainGroup}</td>
                        <td className="p-2">{entry.elementGroup}</td>
                        <td className="p-2">{entry.subElementGroup}</td>
                        <td className="p-2">{entry.detailedGroup}</td>
                        <td className="p-2">{entry.accountName}</td>
                        <td className="p-2">{entry.openingBalance}</td>
                        <td className="p-2">
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => editEntry(entry)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteEntry(entry.id)}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Dialog for adding new Main Group */}
      <Dialog open={showNewMainGroupDialog} onOpenChange={setShowNewMainGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Main Group</DialogTitle>
            <DialogDescription>
              Add a new main group to the chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <Form {...newMainGroupForm}>
            <form onSubmit={newMainGroupForm.handleSubmit(onAddMainGroup)} className="space-y-4">
              <FormField
                control={newMainGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Balance Sheet" {...field} />
                    </FormControl>
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
                      <Input placeholder="E.g., BS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createMainGroupMutation.isPending}>
                  {createMainGroupMutation.isPending ? 'Adding...' : 'Add Main Group'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for adding new Element Group */}
      <Dialog open={showNewElementGroupDialog} onOpenChange={setShowNewElementGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Element Group</DialogTitle>
            <DialogDescription>
              Add a new element group to the chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <Form {...newElementGroupForm}>
            <form onSubmit={newElementGroupForm.handleSubmit(onAddElementGroup)} className="space-y-4">
              <FormField
                control={newElementGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Assets" {...field} />
                    </FormControl>
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
                      <Input placeholder="E.g., A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newElementGroupForm.control}
                name="mainGroupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Group</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select main group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MAIN_GROUPS.map((group) => (
                          <SelectItem key={group.value} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createElementGroupMutation.isPending}>
                  {createElementGroupMutation.isPending ? 'Adding...' : 'Add Element Group'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for adding new Sub-Element Group */}
      <Dialog open={showNewSubElementGroupDialog} onOpenChange={setShowNewSubElementGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Sub-Element Group</DialogTitle>
            <DialogDescription>
              Add a new sub-element group to the chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <Form {...newSubElementGroupForm}>
            <form onSubmit={newSubElementGroupForm.handleSubmit(onAddSubElementGroup)} className="space-y-4">
              <FormField
                control={newSubElementGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Current Assets" {...field} />
                    </FormControl>
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
                      <Input placeholder="E.g., CA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newSubElementGroupForm.control}
                name="elementGroupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Element Group</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select element group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getElementGroups().map((group) => (
                          <SelectItem key={group.value || group.id} value={(group.id || group.value).toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createSubElementGroupMutation.isPending}>
                  {createSubElementGroupMutation.isPending ? 'Adding...' : 'Add Sub-Element Group'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for adding new Detailed Group */}
      <Dialog open={showNewDetailedGroupDialog} onOpenChange={setShowNewDetailedGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Detailed Group</DialogTitle>
            <DialogDescription>
              Add a new detailed group to the chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <Form {...newDetailedGroupForm}>
            <form onSubmit={newDetailedGroupForm.handleSubmit(onAddDetailedGroup)} className="space-y-4">
              <FormField
                control={newDetailedGroupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Bank Accounts" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Hidden field for subElementGroupId - will be auto-populated */}
              <input 
                type="hidden" 
                name="subElementGroupId" 
                {...newDetailedGroupForm.register("subElementGroupId")}
              />
              
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  This detailed group will be created in the "{getSubElementGroups().find(
                    g => selectedSubElementGroup && 
                    (g.value === selectedSubElementGroup || g.id?.toString() === selectedSubElementGroup)
                  )?.name || 'selected'}" sub-element group.
                </p>
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={createDetailedGroupMutation.isPending}>
                  {createDetailedGroupMutation.isPending ? 'Adding...' : 'Add Detailed Group'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}