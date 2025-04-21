import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { PlusCircle, Edit2, Trash2 } from 'lucide-react';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Define types for our chart of accounts structure
type MainGroup = {
  id: number;
  name: string;
  code: string;
};

type ElementGroup = {
  id: number;
  mainGroupId: number;
  name: string;
  code: string;
};

type SubElementGroup = {
  id: number;
  elementGroupId: number;
  name: string;
  code: string;
  customName?: string | null;
};

type DetailedGroup = {
  id: number;
  subElementGroupId: number;
  name: string;
  code: string;
};

type AccountHead = {
  id: number;
  detailedGroupId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
};

type ChartRow = {
  id?: number;
  elementGroupId?: number;
  elementGroupName?: string;
  subElementGroupId?: number;
  subElementGroupName?: string;
  detailedGroupId?: number;
  detailedGroupName?: string;
  accountHeadId?: number;
  accountHeadName?: string;
  accountCode?: string;
};

// Form schema for validation
const chartRowSchema = z.object({
  elementGroupId: z.string().min(1, "Element Group is required"),
  subElementGroupId: z.string().min(1, "Sub Element Group is required"),
  detailedGroupId: z.string().min(1, "Detailed Group is required"),
  accountHeadName: z.string().min(1, "Account Head is required"),
  accountCode: z.string().min(1, "Account Code is required"),
  customSubElementName: z.string().optional(),
  customDetailedName: z.string().optional(),
});

const ChartOfAccountsSetup = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accountType, setAccountType] = useState<string>("balanceSheet");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<ChartRow | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ChartRow | null>(null);
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [addingNewSubElement, setAddingNewSubElement] = useState(false);
  const [addingNewDetailed, setAddingNewDetailed] = useState(false);

  // Form for adding/editing chart of accounts row
  const form = useForm({
    resolver: zodResolver(chartRowSchema),
    defaultValues: {
      elementGroupId: "",
      subElementGroupId: "",
      detailedGroupId: "",
      accountHeadName: "",
      accountCode: "",
      customSubElementName: "",
      customDetailedName: "",
    },
  });

  // Fetch main groups based on account type selection
  const { data: mainGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/main-groups'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/finance/chart-of-accounts/main-groups');
      const data = await response.json();
      return data as MainGroup[];
    },
  });

  // Get filtered main group based on selected account type
  const filteredMainGroup = React.useMemo(() => {
    if (!mainGroups.length) return null;
    return mainGroups.find((group: MainGroup) => 
      (accountType === "balanceSheet" && group.name === "balance_sheet") ||
      (accountType === "profitAndLoss" && group.name === "profit_and_loss")
    );
  }, [mainGroups, accountType]);

  // Fetch element groups for the selected main group
  const { data: elementGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/element-groups', filteredMainGroup?.id],
    queryFn: async () => {
      if (!filteredMainGroup) return [];
      const response = await apiRequest(
        'GET',
        `/api/v1/finance/chart-of-accounts/element-groups?mainGroupId=${filteredMainGroup.id}`
      );
      const data = await response.json();
      return data as ElementGroup[];
    },
    enabled: !!filteredMainGroup,
  });

  // State for currently selected element group
  const [selectedElementGroupId, setSelectedElementGroupId] = useState<string>("");

  // Fetch sub-element groups for the selected element group
  const { data: subElementGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups', selectedElementGroupId],
    queryFn: async () => {
      if (!selectedElementGroupId) return [];
      const response = await apiRequest(
        'GET',
        `/api/v1/finance/chart-of-accounts/sub-element-groups?elementGroupId=${selectedElementGroupId}`
      );
      const data = await response.json();
      return data as SubElementGroup[];
    },
    enabled: !!selectedElementGroupId,
  });

  // State for currently selected sub-element group
  const [selectedSubElementGroupId, setSelectedSubElementGroupId] = useState<string>("");

  // Fetch detailed groups for the selected sub-element group
  const { data: detailedGroups = [] } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups', selectedSubElementGroupId],
    queryFn: async () => {
      if (!selectedSubElementGroupId) return [];
      const response = await apiRequest(
        'GET',
        `/api/v1/finance/chart-of-accounts/detailed-groups?subElementGroupId=${selectedSubElementGroupId}`
      );
      const data = await response.json();
      return data as DetailedGroup[];
    },
    enabled: !!selectedSubElementGroupId,
  });

  // Fetch account heads data
  const { data: accountHeads = [], isLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/finance/chart-of-accounts');
      const data = await response.json();
      return data as AccountHead[];
    },
  });

  // Initialize the table with existing data
  useEffect(() => {
    if (accountHeads && elementGroups && subElementGroups && detailedGroups) {
      const newRows: ChartRow[] = accountHeads.map(head => {
        const detailedGroup = detailedGroups.find(g => g.id === head.detailedGroupId);
        const subElementGroup = detailedGroup && subElementGroups.find(g => g.id === detailedGroup.subElementGroupId);
        const elementGroup = subElementGroup && elementGroups.find(g => g.id === subElementGroup.elementGroupId);
        
        return {
          id: head.id,
          elementGroupId: elementGroup?.id,
          elementGroupName: elementGroup?.name,
          subElementGroupId: subElementGroup?.id,
          subElementGroupName: subElementGroup?.customName || subElementGroup?.name,
          detailedGroupId: detailedGroup?.id,
          detailedGroupName: detailedGroup?.name,
          accountHeadId: head.id,
          accountHeadName: head.accountName,
          accountCode: head.accountCode,
        };
      });
      
      setRows(newRows);
    }
  }, [accountHeads, elementGroups, subElementGroups, detailedGroups]);

  // Handle form submission for adding a new row
  const handleAddRow = async (data: any) => {
    try {
      // Logic for handling "Add New" for Sub Element Group
      let subElementId = data.subElementGroupId;
      if (data.subElementGroupId === "addNew" && data.customSubElementName) {
        // Create new sub element group
        const newSubElementResponse = await apiRequest('POST', '/api/v1/finance/chart-of-accounts/sub-element-groups', {
          elementGroupId: parseInt(data.elementGroupId),
          name: data.customSubElementName.toLowerCase().replace(/\s+/g, '_'),
          customName: data.customSubElementName,
          code: `SE-${Date.now().toString().slice(-4)}`,
          isActive: true
        });
        const newSubElementData = await newSubElementResponse.json();
        subElementId = newSubElementData.id.toString();
      }
      
      // Logic for handling "Add New" for Detailed Group
      let detailedId = data.detailedGroupId;
      if (data.detailedGroupId === "addNew" && data.customDetailedName) {
        // Create new detailed group
        const newDetailedResponse = await apiRequest('POST', '/api/v1/finance/chart-of-accounts/detailed-groups', {
          subElementGroupId: parseInt(subElementId),
          name: data.customDetailedName.toLowerCase().replace(/\s+/g, '_'),
          code: `DG-${Date.now().toString().slice(-4)}`,
          isActive: true
        });
        const newDetailedData = await newDetailedResponse.json();
        detailedId = newDetailedData.id.toString();
      }
      
      // Create new account head
      await apiRequest('POST', '/api/v1/finance/chart-of-accounts', {
        detailedGroupId: parseInt(detailedId),
        accountCode: data.accountCode,
        accountName: data.accountHeadName,
        accountType: accountType === "balanceSheet" ? 
          (data.elementGroupId === "1" ? "asset" : 
           data.elementGroupId === "2" ? "liability" : "equity") : 
          (data.elementGroupId === "4" ? "revenue" : "expense"),
        isActive: true
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'] });
      
      setIsAddDialogOpen(false);
      form.reset();
      
      toast({
        title: "Success",
        description: "Account head created successfully",
      });
    } catch (error) {
      console.error("Error adding row:", error);
      toast({
        title: "Error",
        description: "Failed to create account head",
        variant: "destructive",
      });
    }
  };

  // Handle form submission for editing a row
  const handleEditRow = async (data: any) => {
    if (!editingRow?.id) return;
    
    try {
      // Logic similar to add but with PATCH request
      // Update account head
      await apiRequest('PATCH', `/api/v1/finance/chart-of-accounts/${editingRow.id}`, {
        accountCode: data.accountCode,
        accountName: data.accountHeadName,
        detailedGroupId: parseInt(data.detailedGroupId),
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      
      setIsEditDialogOpen(false);
      setEditingRow(null);
      form.reset();
      
      toast({
        title: "Success",
        description: "Account head updated successfully",
      });
    } catch (error) {
      console.error("Error updating row:", error);
      toast({
        title: "Error",
        description: "Failed to update account head",
        variant: "destructive",
      });
    }
  };

  // Handle deleting a row
  const handleDeleteRow = async () => {
    if (!rowToDelete?.id) return;
    
    try {
      await apiRequest('DELETE', `/api/v1/finance/chart-of-accounts/${rowToDelete.id}`);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      
      setShowDeleteDialog(false);
      setRowToDelete(null);
      
      toast({
        title: "Success",
        description: "Account head deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting row:", error);
      toast({
        title: "Error",
        description: "Failed to delete account head",
        variant: "destructive",
      });
    }
  };

  // Function to open edit dialog and populate form with row data
  const openEditDialog = (row: ChartRow) => {
    setEditingRow(row);
    
    // Reset form and set values
    form.reset({
      elementGroupId: row.elementGroupId?.toString() || "",
      subElementGroupId: row.subElementGroupId?.toString() || "",
      detailedGroupId: row.detailedGroupId?.toString() || "",
      accountHeadName: row.accountHeadName || "",
      accountCode: row.accountCode || "",
    });
    
    // Set selected IDs for dropdowns
    setSelectedElementGroupId(row.elementGroupId?.toString() || "");
    setSelectedSubElementGroupId(row.subElementGroupId?.toString() || "");
    
    setIsEditDialogOpen(true);
  };

  // Handle element group change
  const handleElementGroupChange = (value: string) => {
    form.setValue("elementGroupId", value);
    setSelectedElementGroupId(value);
    form.setValue("subElementGroupId", "");
    form.setValue("detailedGroupId", "");
    setSelectedSubElementGroupId("");
    setAddingNewSubElement(false);
    setAddingNewDetailed(false);
  };

  // Handle sub element group change
  const handleSubElementGroupChange = (value: string) => {
    form.setValue("subElementGroupId", value);
    setSelectedSubElementGroupId(value);
    form.setValue("detailedGroupId", "");
    
    if (value === "addNew") {
      setAddingNewSubElement(true);
    } else {
      setAddingNewSubElement(false);
    }
    setAddingNewDetailed(false);
  };

  // Handle detailed group change
  const handleDetailedGroupChange = (value: string) => {
    form.setValue("detailedGroupId", value);
    
    if (value === "addNew") {
      setAddingNewDetailed(true);
    } else {
      setAddingNewDetailed(false);
    }
  };

  // Reset form when dialog closes
  const handleDialogClose = () => {
    form.reset();
    setSelectedElementGroupId("");
    setSelectedSubElementGroupId("");
    setAddingNewSubElement(false);
    setAddingNewDetailed(false);
  };

  return (
    <AppLayout title="Chart of Accounts Setup">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Chart of Accounts Setup</CardTitle>
          <CardDescription>
            Configure your chart of accounts structure for financial reporting
          </CardDescription>
          
          <div className="flex flex-col space-y-4 mt-4">
            <RadioGroup
              value={accountType}
              onValueChange={setAccountType}
              className="flex flex-row space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balanceSheet" id="balanceSheet" />
                <Label htmlFor="balanceSheet">Balance Sheet</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="profitAndLoss" id="profitAndLoss" />
                <Label htmlFor="profitAndLoss">Profit and Loss</Label>
              </div>
            </RadioGroup>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex justify-end mb-4">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Account</DialogTitle>
                  <DialogDescription>
                    Create a new account in your chart of accounts
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddRow)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="elementGroupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Element Group</FormLabel>
                          <Select
                            onValueChange={(value) => handleElementGroupChange(value)}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Element Group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {elementGroups?.map((group) => (
                                <SelectItem key={group.id} value={group.id.toString()}>
                                  {group.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {selectedElementGroupId && (
                      <FormField
                        control={form.control}
                        name="subElementGroupId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sub Element Group</FormLabel>
                            <Select
                              onValueChange={(value) => handleSubElementGroupChange(value)}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Sub Element Group" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subElementGroups?.map((group) => (
                                  <SelectItem key={group.id} value={group.id.toString()}>
                                    {group.customName || group.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </SelectItem>
                                ))}
                                <SelectItem value="addNew">Add New</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {addingNewSubElement && (
                      <FormField
                        control={form.control}
                        name="customSubElementName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Sub Element Group Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter name for new sub element group" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {(selectedSubElementGroupId && !addingNewSubElement) && (
                      <FormField
                        control={form.control}
                        name="detailedGroupId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Detailed Group</FormLabel>
                            <Select
                              onValueChange={(value) => handleDetailedGroupChange(value)}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Detailed Group" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {detailedGroups?.map((group) => (
                                  <SelectItem key={group.id} value={group.id.toString()}>
                                    {group.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </SelectItem>
                                ))}
                                <SelectItem value="addNew">Add New</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {addingNewDetailed && (
                      <FormField
                        control={form.control}
                        name="customDetailedName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Detailed Group Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter name for new detailed group" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
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
                      control={form.control}
                      name="accountHeadName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Head</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter account head name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={handleDialogClose}>
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button type="submit">Save</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Account</DialogTitle>
                  <DialogDescription>
                    Modify existing account in your chart of accounts
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleEditRow)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="elementGroupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Element Group</FormLabel>
                          <Select
                            onValueChange={(value) => handleElementGroupChange(value)}
                            value={field.value}
                            disabled
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Element Group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {elementGroups?.map((group) => (
                                <SelectItem key={group.id} value={group.id.toString()}>
                                  {group.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subElementGroupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sub Element Group</FormLabel>
                          <Select
                            onValueChange={(value) => handleSubElementGroupChange(value)}
                            value={field.value}
                            disabled
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Sub Element Group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subElementGroups?.map((group) => (
                                <SelectItem key={group.id} value={group.id.toString()}>
                                  {group.customName || group.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="detailedGroupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Detailed Group</FormLabel>
                          <Select
                            onValueChange={(value) => handleDetailedGroupChange(value)}
                            value={field.value}
                            disabled
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Detailed Group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {detailedGroups?.map((group) => (
                                <SelectItem key={group.id} value={group.id.toString()}>
                                  {group.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
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
                      control={form.control}
                      name="accountHeadName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Head</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter account head name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={handleDialogClose}>
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Table for Chart of Accounts */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Element Group</TableHead>
                <TableHead>Sub Element Group</TableHead>
                <TableHead>Detailed Group</TableHead>
                <TableHead>AC Head</TableHead>
                <TableHead>Account Code</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No accounts found. Add a new account to get started.
                  </TableCell>
                </TableRow>
              ) : (
                rows
                  .filter(row => {
                    // Filter based on account type
                    const elementGroup = elementGroups?.find(g => g.id === row.elementGroupId);
                    if (!elementGroup) return false;
                    
                    const mainGroup = mainGroups?.find(g => g.id === elementGroup.mainGroupId);
                    if (!mainGroup) return false;
                    
                    return (accountType === "balanceSheet" && mainGroup.name === "balance_sheet") ||
                           (accountType === "profitAndLoss" && mainGroup.name === "profit_and_loss");
                  })
                  .map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.elementGroupName?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </TableCell>
                      <TableCell>
                        {row.subElementGroupName?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </TableCell>
                      <TableCell>
                        {row.detailedGroupName?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </TableCell>
                      <TableCell>{row.accountHeadName}</TableCell>
                      <TableCell>{row.accountCode}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(row)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRowToDelete(row);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
          
          {/* Delete Confirmation Dialog */}
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this account? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRow}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default ChartOfAccountsSetup;