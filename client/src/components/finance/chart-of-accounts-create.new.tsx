import React, { useState, useEffect, useRef } from 'react';
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  Save, 
  Plus,
  MinusCircle,
  PlusCircle,
  Edit,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const accountSchema = z.object({
  detailedGroupId: z.number(),
  accountName: z.string().min(1, "Account name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  isSystemAccount: z.boolean().default(false),
  openingBalance: z.string().default("0"),
  currentBalance: z.string().default("0"),
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
  code: z.string().min(1, "Code is required"),
  subElementGroupId: z.number(),
});

export default function ChartOfAccountsCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // For table entries
  const [entries, setEntries] = useState<any[]>([]);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Dialog states
  const [showNewMainGroupDialog, setShowNewMainGroupDialog] = useState(false);
  const [showNewElementGroupDialog, setShowNewElementGroupDialog] = useState(false);
  const [showNewSubElementGroupDialog, setShowNewSubElementGroupDialog] = useState(false);
  const [showNewDetailedGroupDialog, setShowNewDetailedGroupDialog] = useState(false);
  
  // Fetch main groups, element groups, sub-element groups, and detailed groups
  const { data: mainGroups, isLoading: mainGroupsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/main-groups'],
    refetchOnWindowFocus: false,
  });
  
  const [selectedMainGroup, setSelectedMainGroup] = useState<number | null>(null);
  const [selectedElementGroup, setSelectedElementGroup] = useState<number | null>(null);
  const [selectedSubElementGroup, setSelectedSubElementGroup] = useState<number | null>(null);
  
  const { data: elementGroups, isLoading: elementGroupsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/element-groups', selectedMainGroup],
    enabled: !!selectedMainGroup,
    refetchOnWindowFocus: false,
  });
  
  const { data: subElementGroups, isLoading: subElementGroupsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups', selectedElementGroup],
    enabled: !!selectedElementGroup,
    refetchOnWindowFocus: false,
  });
  
  const { data: detailedGroups, isLoading: detailedGroupsLoading } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups', selectedSubElementGroup],
    enabled: !!selectedSubElementGroup,
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
      code: '',
      subElementGroupId: 0,
    },
  });
  
  // Set appropriate IDs when dialogs open
  useEffect(() => {
    if (showNewElementGroupDialog && selectedMainGroup) {
      newElementGroupForm.setValue('mainGroupId', selectedMainGroup);
    }
    if (showNewSubElementGroupDialog && selectedElementGroup) {
      newSubElementGroupForm.setValue('elementGroupId', selectedElementGroup);
    }
    if (showNewDetailedGroupDialog && selectedSubElementGroup) {
      newDetailedGroupForm.setValue('subElementGroupId', selectedSubElementGroup);
    }
  }, [showNewElementGroupDialog, showNewSubElementGroupDialog, showNewDetailedGroupDialog]);
  
  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountName: '',
      description: '',
      isActive: true,
      isSystemAccount: false,
      openingBalance: '0',
      currentBalance: '0',
    },
  });
  
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
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/main-groups'] });
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
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v1/finance/chart-of-accounts/element-groups', selectedMainGroup] 
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
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups', selectedElementGroup] 
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
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups', selectedSubElementGroup] 
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
      return apiRequest('POST', '/api/v1/finance/chart-of-accounts', values);
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "The account has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts'] });
      form.reset();
      
      // Add the entry to the table
      if (currentEntry) {
        if (isEditing) {
          // Replace the edited entry
          setEntries(entries.map(entry => 
            entry.id === currentEntry.id ? currentEntry : entry
          ));
        } else {
          // Add new entry
          setEntries([...entries, {
            ...currentEntry,
            id: Date.now(), // Temporary ID for table
          }]);
        }
        setCurrentEntry(null);
        setIsEditing(false);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error creating account",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });
  
  // For getting display names
  const getMainGroupName = (id: number) => {
    const group = mainGroups?.find((g: any) => g.id === id);
    return group ? group.name : 'Unknown';
  };
  
  const getElementGroupName = (id: number) => {
    const group = elementGroups?.find((g: any) => g.id === id);
    return group ? group.name : 'Unknown';
  };
  
  const getSubElementGroupName = (id: number) => {
    const group = subElementGroups?.find((g: any) => g.id === id);
    return group ? group.name : 'Unknown';
  };
  
  const getDetailedGroupName = (id: number) => {
    const group = detailedGroups?.find((g: any) => g.id === id);
    return group ? group.name : 'Unknown';
  };
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof accountSchema>) => {
    if (!values.detailedGroupId) {
      toast({
        title: "Validation Error",
        description: "Please select a detailed group for this account",
        variant: "destructive",
      });
      return;
    }
    
    // Save the current entry for table display
    setCurrentEntry({
      ...values,
      mainGroupId: selectedMainGroup,
      mainGroupName: getMainGroupName(selectedMainGroup || 0),
      elementGroupId: selectedElementGroup,
      elementGroupName: getElementGroupName(selectedElementGroup || 0),
      subElementGroupId: selectedSubElementGroup,
      subElementGroupName: getSubElementGroupName(selectedSubElementGroup || 0),
      detailedGroupName: getDetailedGroupName(values.detailedGroupId),
    });
    
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
    createDetailedGroupMutation.mutate(values);
  };
  
  // Function to edit an entry
  const editEntry = (entry: any) => {
    setSelectedMainGroup(entry.mainGroupId);
    
    // We need to set these in sequence with timeouts to allow the queries to complete
    setTimeout(() => {
      setSelectedElementGroup(entry.elementGroupId);
      
      setTimeout(() => {
        setSelectedSubElementGroup(entry.subElementGroupId);
        
        setTimeout(() => {
          form.setValue('detailedGroupId', entry.detailedGroupId);
          form.setValue('accountName', entry.accountName);
          form.setValue('description', entry.description || '');
          form.setValue('isActive', entry.isActive);
          form.setValue('isSystemAccount', entry.isSystemAccount);
          form.setValue('openingBalance', entry.openingBalance);
          form.setValue('currentBalance', entry.currentBalance);
          
          setCurrentEntry(entry);
          setIsEditing(true);
        }, 300);
      }, 300);
    }, 300);
  };
  
  // Function to delete an entry from the table
  const deleteEntry = (id: number) => {
    setEntries(entries.filter(entry => entry.id !== id));
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
                            value={selectedMainGroup?.toString() || ""} 
                            onValueChange={(value) => {
                              setSelectedMainGroup(parseInt(value));
                              setSelectedElementGroup(null);
                              setSelectedSubElementGroup(null);
                              form.setValue('detailedGroupId', 0);
                            }}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {mainGroups?.map((group: any) => (
                                <SelectItem key={group.id} value={group.id.toString()}>
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
                            value={selectedElementGroup?.toString() || ""} 
                            onValueChange={(value) => {
                              setSelectedElementGroup(parseInt(value));
                              setSelectedSubElementGroup(null);
                              form.setValue('detailedGroupId', 0);
                            }}
                            disabled={!selectedMainGroup}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {elementGroups?.map((group: any) => (
                                <SelectItem key={group.id} value={group.id.toString()}>
                                  {group.customName || group.name}
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
                            value={selectedSubElementGroup?.toString() || ""} 
                            onValueChange={(value) => {
                              setSelectedSubElementGroup(parseInt(value));
                              form.setValue('detailedGroupId', 0);
                            }}
                            disabled={!selectedElementGroup}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {subElementGroups?.map((group: any) => (
                                <SelectItem key={group.id} value={group.id.toString()}>
                                  {group.customName || group.name}
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
                            value={form.watch('detailedGroupId')?.toString() || ""} 
                            onValueChange={(value) => {
                              form.setValue('detailedGroupId', parseInt(value));
                            }}
                            disabled={!selectedSubElementGroup}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {detailedGroups?.map((group: any) => (
                                <SelectItem key={group.id} value={group.id.toString()}>
                                  {group.customName || group.name}
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
                      </td>
                    </tr>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-t">
                        <td className="p-2">{entry.mainGroupName}</td>
                        <td className="p-2">{entry.elementGroupName}</td>
                        <td className="p-2">{entry.subElementGroupName}</td>
                        <td className="p-2">{entry.detailedGroupName}</td>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="currentBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Balance</FormLabel>
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
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter account description" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4">
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Is System Account</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation('/finance')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Finance
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => form.reset()}
              >
                Clear Form
              </Button>
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
                      <Input placeholder="e.g. Balance Sheet" {...field} />
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
                      <Input placeholder="e.g. BS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewMainGroupDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMainGroupMutation.isPending}>
                  {createMainGroupMutation.isPending ? "Adding..." : "Add Main Group"}
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
              Add a new element group to the selected main group.
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
                      <Input placeholder="e.g. Assets" {...field} />
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
                      <Input placeholder="e.g. A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewElementGroupDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createElementGroupMutation.isPending}>
                  {createElementGroupMutation.isPending ? "Adding..." : "Add Element Group"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog for adding new Sub Element Group */}
      <Dialog open={showNewSubElementGroupDialog} onOpenChange={setShowNewSubElementGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Sub Element Group</DialogTitle>
            <DialogDescription>
              Add a new sub element group to the selected element group.
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
                      <Input placeholder="e.g. Current Assets" {...field} />
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
                      <Input placeholder="e.g. CA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewSubElementGroupDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createSubElementGroupMutation.isPending}>
                  {createSubElementGroupMutation.isPending ? "Adding..." : "Add Sub Element Group"}
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
              Add a new detailed group to the selected sub element group.
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
                      <Input placeholder="e.g. Cash and Bank Balances" {...field} />
                    </FormControl>
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
                      <Input placeholder="e.g. CBB" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewDetailedGroupDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createDetailedGroupMutation.isPending}>
                  {createDetailedGroupMutation.isPending ? "Adding..." : "Add Detailed Group"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}