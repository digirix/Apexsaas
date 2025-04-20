import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "@/hooks/use-toast";
import { Edit, Trash2, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Link } from "wouter";

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
  code: string;
  description: string | null;
};

type ChartOfAccountsDetailedGroup = {
  id: number;
  subElementGroupId: number;
  name: string;
  code: string;
  description: string | null;
};

// Schema for sub-element group editing
const subElementGroupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().nullable().optional(),
});

// Schema for detailed group editing
const detailedGroupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().nullable().optional(),
});

export default function COAConfigurationPage() {
  const [activeTab, setActiveTab] = useState("sub-element-groups");
  
  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Sub-element Groups Tab
  const { 
    data: subElementGroups = [],
    isLoading: isLoadingSubElementGroups 
  } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'],
    enabled: activeTab === "sub-element-groups"
  });
  
  // Detailed Groups Tab
  const { 
    data: detailedGroups = [],
    isLoading: isLoadingDetailedGroups 
  } = useQuery({
    queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'],
    enabled: activeTab === "detailed-groups"
  });

  // Form for editing sub-element groups
  const subElementGroupForm = useForm<z.infer<typeof subElementGroupSchema>>({
    resolver: zodResolver(subElementGroupSchema),
    defaultValues: {
      name: "",
      description: "",
    }
  });

  // Form for editing detailed groups
  const detailedGroupForm = useForm<z.infer<typeof detailedGroupSchema>>({
    resolver: zodResolver(detailedGroupSchema),
    defaultValues: {
      name: "",
      description: "",
    }
  });
  
  // Update sub-element group mutation
  const updateSubElementGroupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof subElementGroupSchema>) => {
      if (!currentItem) return null;
      
      return apiRequest(
        `/api/v1/finance/chart-of-accounts/sub-element-groups/${currentItem.id}`,
        {
          method: 'PATCH',
          data: values
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sub-element group updated successfully",
      });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update sub-element group",
        variant: "destructive",
      });
      console.error("Update error:", error);
    }
  });
  
  // Update detailed group mutation
  const updateDetailedGroupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof detailedGroupSchema>) => {
      if (!currentItem) return null;
      
      return apiRequest(
        `/api/v1/finance/chart-of-accounts/detailed-groups/${currentItem.id}`,
        {
          method: 'PATCH',
          data: values
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Detailed group updated successfully",
      });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update detailed group",
        variant: "destructive",
      });
      console.error("Update error:", error);
    }
  });
  
  // Delete sub-element group mutation
  const deleteSubElementGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(
        `/api/v1/finance/chart-of-accounts/sub-element-groups/${id}`,
        {
          method: 'DELETE'
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sub-element group deleted successfully",
      });
      setDeleteDialogOpen(false);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/sub-element-groups'] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "An error occurred";
      setDeleteError(errorMessage);
    }
  });
  
  // Delete detailed group mutation
  const deleteDetailedGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(
        `/api/v1/finance/chart-of-accounts/detailed-groups/${id}`,
        {
          method: 'DELETE'
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Detailed group deleted successfully",
      });
      setDeleteDialogOpen(false);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/finance/chart-of-accounts/detailed-groups'] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "An error occurred";
      setDeleteError(errorMessage);
    }
  });

  // Handle opening edit dialog
  const handleEdit = (item: any) => {
    setCurrentItem(item);
    
    if (activeTab === "sub-element-groups") {
      subElementGroupForm.reset({
        name: item.customName || item.name,
        description: item.description || ""
      });
    } else if (activeTab === "detailed-groups") {
      detailedGroupForm.reset({
        name: item.customName || item.name,
        description: item.description || ""
      });
    }
    
    setEditDialogOpen(true);
  };
  
  // Handle opening delete dialog
  const handleDeleteClick = (item: any) => {
    setCurrentItem(item);
    setDeleteDialogOpen(true);
    setDeleteError(null);
  };
  
  // Handle form submission
  const onSubmit = (values: any) => {
    if (activeTab === "sub-element-groups") {
      updateSubElementGroupMutation.mutate(values);
    } else if (activeTab === "detailed-groups") {
      updateDetailedGroupMutation.mutate(values);
    }
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (!currentItem) return;
    
    if (activeTab === "sub-element-groups") {
      deleteSubElementGroupMutation.mutate(currentItem.id);
    } else if (activeTab === "detailed-groups") {
      deleteDetailedGroupMutation.mutate(currentItem.id);
    }
  };

  return (
    <AppLayout title="Chart of Accounts Configuration">
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
          <CardTitle>Chart of Accounts Configuration</CardTitle>
          <CardDescription>
            Manage sub-element groups and detailed groups in your chart of accounts structure.
            <br />
            <strong>Note:</strong> Main groups and element groups cannot be modified as they are standard accounting classifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="sub-element-groups">Sub-Element Groups</TabsTrigger>
              <TabsTrigger value="detailed-groups">Detailed Groups</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sub-element-groups">
              {isLoadingSubElementGroups ? (
                <div>Loading...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subElementGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            No sub-element groups found
                          </TableCell>
                        </TableRow>
                      ) : (
                        subElementGroups.map((group: ChartOfAccountsSubElementGroup) => (
                          <TableRow key={group.id}>
                            <TableCell>{group.code}</TableCell>
                            <TableCell>{group.name}</TableCell>
                            <TableCell>{group.description || '-'}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEdit(group)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteClick(group)}
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
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="detailed-groups">
              {isLoadingDetailedGroups ? (
                <div>Loading...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            No detailed groups found
                          </TableCell>
                        </TableRow>
                      ) : (
                        detailedGroups.map((group: ChartOfAccountsDetailedGroup) => (
                          <TableRow key={group.id}>
                            <TableCell>{group.code}</TableCell>
                            <TableCell>{group.name}</TableCell>
                            <TableCell>{group.description || '-'}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEdit(group)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteClick(group)}
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
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {activeTab === "sub-element-groups" ? "Sub-Element Group" : "Detailed Group"}
            </DialogTitle>
            <DialogDescription>
              Update the information below and save your changes.
            </DialogDescription>
          </DialogHeader>
          
          {activeTab === "sub-element-groups" ? (
            <Form {...subElementGroupForm}>
              <form onSubmit={subElementGroupForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={subElementGroupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Group name" />
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Description" />
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
                    disabled={updateSubElementGroupMutation.isPending}
                  >
                    {updateSubElementGroupMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <Form {...detailedGroupForm}>
              <form onSubmit={detailedGroupForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={detailedGroupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Group name" />
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Description" />
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
                    disabled={updateDetailedGroupMutation.isPending}
                  >
                    {updateDetailedGroupMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {activeTab === "sub-element-groups" ? "Sub-Element Group" : "Detailed Group"}
            </DialogTitle>
            <DialogDescription>
              {deleteError ? (
                <div className="text-red-500">{deleteError}</div>
              ) : (
                <>
                  Are you sure you want to delete
                  <span className="font-semibold"> {currentItem?.name}?</span>
                  <br />
                  This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            {!deleteError && (
              <Button 
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={
                  activeTab === "sub-element-groups" 
                    ? deleteSubElementGroupMutation.isPending 
                    : deleteDetailedGroupMutation.isPending
                }
              >
                {activeTab === "sub-element-groups" 
                  ? (deleteSubElementGroupMutation.isPending ? "Deleting..." : "Delete")
                  : (deleteDetailedGroupMutation.isPending ? "Deleting..." : "Delete")
                }
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}