import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";

// Account hierarchy type
type AccountHierarchyType = 'main_group' | 'element_group' | 'sub_element_group' | 'detailed_group' | 'account';

// Define the DeleteConfirmationDialog component
interface DeleteConfirmationDialogProps {
  title: string;
  description: string;
  onConfirm: () => void;
  children: React.ReactNode;
}

const DeleteConfirmationDialog = ({
  title,
  description,
  onConfirm,
  children,
}: DeleteConfirmationDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function ChartOfAccountsManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("main-groups");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    code: '',
    description: '',
    isActive: true
  });

  // Fetch Chart of Accounts data using real API endpoints
  const { data: mainGroups = [], isLoading: mainGroupsLoading } = useQuery<any[]>({
    queryKey: ["/api/v1/finance/chart-of-accounts/main-groups"]
  });

  const { data: elementGroups = [], isLoading: elementGroupsLoading } = useQuery<any[]>({
    queryKey: ["/api/v1/finance/chart-of-accounts/element-groups"],
    enabled: activeTab === "element-groups" // Only fetch when needed
  });

  const { data: subElementGroups = [], isLoading: subElementGroupsLoading } = useQuery<any[]>({
    queryKey: ["/api/v1/finance/chart-of-accounts/sub-element-groups"],
    enabled: activeTab === "sub-element-groups" // Only fetch when needed
  });

  const { data: detailedGroups = [], isLoading: detailedGroupsLoading } = useQuery<any[]>({
    queryKey: ["/api/v1/finance/chart-of-accounts/detailed-groups"],
    enabled: activeTab === "detailed-groups" // Only fetch when needed 
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<any[]>({
    queryKey: ["/api/v1/finance/chart-of-accounts"],
    enabled: activeTab === "accounts" // Only fetch when needed
  });

  // Add mutations
  const addMainGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/v1/finance/chart-of-accounts/main-groups", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/main-groups"] });
      toast({
        title: "Success",
        description: "Main group added successfully",
      });
      setIsAddDialogOpen(false);
      setFormData({
        name: '',
        code: '',
        description: '',
        isActive: true
      });
    },
    onError: (error) => {
      console.error("Error adding main group:", error);
      toast({
        title: "Error",
        description: "Failed to add main group",
        variant: "destructive",
      });
    },
  });

  // Edit mutations
  const editMainGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/v1/finance/chart-of-accounts/main-groups/${data.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/main-groups"] });
      toast({
        title: "Success",
        description: "Main group updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error updating main group:", error);
      toast({
        title: "Error",
        description: "Failed to update main group",
        variant: "destructive",
      });
    },
  });

  const editElementGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/v1/finance/chart-of-accounts/element-groups/${data.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/element-groups"] });
      toast({
        title: "Success",
        description: "Element group updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error updating element group:", error);
      toast({
        title: "Error",
        description: "Failed to update element group",
        variant: "destructive",
      });
    },
  });

  const editSubElementGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/v1/finance/chart-of-accounts/sub-element-groups/${data.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/sub-element-groups"] });
      toast({
        title: "Success",
        description: "Sub-element group updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error updating sub-element group:", error);
      toast({
        title: "Error",
        description: "Failed to update sub-element group",
        variant: "destructive",
      });
    },
  });

  const editDetailedGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/v1/finance/chart-of-accounts/detailed-groups/${data.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/detailed-groups"] });
      toast({
        title: "Success",
        description: "Detailed group updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error updating detailed group:", error);
      toast({
        title: "Error",
        description: "Failed to update detailed group",
        variant: "destructive",
      });
    },
  });

  const editAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/v1/finance/chart-of-accounts/${data.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts"] });
      toast({
        title: "Success",
        description: "Account updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error updating account:", error);
      toast({
        title: "Error",
        description: "Failed to update account",
        variant: "destructive",
      });
    },
  });

  // Delete mutations
  const deleteMainGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/v1/finance/chart-of-accounts/main-groups/${id}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/main-groups"] });
      toast({
        title: "Success",
        description: "Main group deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting main group:", error);
      toast({
        title: "Error",
        description: "Failed to delete main group",
        variant: "destructive",
      });
    },
  });

  // Form handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  // Add mutations for other account types
  const addElementGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/v1/finance/chart-of-accounts/element-groups", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/element-groups"] });
      toast({
        title: "Success",
        description: "Element group added successfully",
      });
      setIsAddDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
      console.error("Error adding element group:", error);
      toast({
        title: "Error",
        description: "Failed to add element group",
        variant: "destructive",
      });
    },
  });

  const addSubElementGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/v1/finance/chart-of-accounts/sub-element-groups", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/sub-element-groups"] });
      toast({
        title: "Success",
        description: "Sub-element group added successfully",
      });
      setIsAddDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
      console.error("Error adding sub-element group:", error);
      toast({
        title: "Error",
        description: "Failed to add sub-element group",
        variant: "destructive",
      });
    },
  });

  const addDetailedGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/v1/finance/chart-of-accounts/detailed-groups", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/detailed-groups"] });
      toast({
        title: "Success",
        description: "Detailed group added successfully",
      });
      setIsAddDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
      console.error("Error adding detailed group:", error);
      toast({
        title: "Error",
        description: "Failed to add detailed group",
        variant: "destructive",
      });
    },
  });

  const addAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/v1/finance/chart-of-accounts", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts"] });
      toast({
        title: "Success",
        description: "Account added successfully",
      });
      setIsAddDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
      console.error("Error adding account:", error);
      toast({
        title: "Error",
        description: "Failed to add account",
        variant: "destructive",
      });
    },
  });

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    
    switch (activeTab) {
      case "main-groups":
        addMainGroupMutation.mutate(formData);
        break;
      case "element-groups":
        addElementGroupMutation.mutate(formData);
        break;
      case "sub-element-groups":
        addSubElementGroupMutation.mutate(formData);
        break;
      case "detailed-groups":
        addDetailedGroupMutation.mutate(formData);
        break;
      case "accounts":
        addAccountMutation.mutate(formData);
        break;
      default:
        console.error("Unknown tab for add operation:", activeTab);
        toast({
          title: "Error",
          description: "Unknown section to add to",
          variant: "destructive",
        });
    }
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a mutation payload with core fields and the ID
    const payload = { ...formData, id: selectedItem.id };
    
    // Execute the appropriate mutation based on active tab
    switch (activeTab) {
      case "main-groups":
        editMainGroupMutation.mutate(payload);
        break;
      case "element-groups":
        editElementGroupMutation.mutate(payload);
        break;
      case "sub-element-groups":
        editSubElementGroupMutation.mutate(payload);
        break;
      case "detailed-groups":
        editDetailedGroupMutation.mutate(payload);
        break;
      case "accounts":
        editAccountMutation.mutate(payload);
        break;
      default:
        console.error("Unknown tab for edit operation:", activeTab);
        toast({
          title: "Error",
          description: "Unknown section to edit",
          variant: "destructive",
        });
    }
  };

  // Delete mutations for all account types
  const deleteElementGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/v1/finance/chart-of-accounts/element-groups/${id}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/element-groups"] });
      toast({
        title: "Success",
        description: "Element group deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting element group:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete element group",
        variant: "destructive",
      });
    },
  });

  const deleteSubElementGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/v1/finance/chart-of-accounts/sub-element-groups/${id}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/sub-element-groups"] });
      toast({
        title: "Success",
        description: "Sub-element group deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting sub-element group:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete sub-element group",
        variant: "destructive",
      });
    },
  });

  const deleteDetailedGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/v1/finance/chart-of-accounts/detailed-groups/${id}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts/detailed-groups"] });
      toast({
        title: "Success",
        description: "Detailed group deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting detailed group:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete detailed group",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/v1/finance/chart-of-accounts/${id}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/finance/chart-of-accounts"] });
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
    },
    onError: (error: any) => {
      const errorMsg = error.message || "Failed to delete account";
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    switch (activeTab) {
      case "main-groups":
        deleteMainGroupMutation.mutate(id);
        break;
      case "element-groups":
        deleteElementGroupMutation.mutate(id);
        break;
      case "sub-element-groups":
        deleteSubElementGroupMutation.mutate(id);
        break;
      case "detailed-groups":
        deleteDetailedGroupMutation.mutate(id);
        break;
      case "accounts":
        deleteAccountMutation.mutate(id);
        break;
      default:
        console.error("Unknown tab for delete operation:", activeTab);
        toast({
          title: "Error",
          description: "Unknown section to delete from",
          variant: "destructive",
        });
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      description: item.description,
      isActive: item.isActive
    });
    setIsEditDialogOpen(true);
  };

  // Formatters
  const formatName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Render table based on active tab
  const renderTable = () => {
    switch(activeTab) {
      case "main-groups":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mainGroupsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : mainGroups && mainGroups.length > 0 ? (
                mainGroups.map((group: any) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.code}</TableCell>
                    <TableCell>{formatName(group.name)}</TableCell>
                    <TableCell>{group.description}</TableCell>
                    <TableCell>{group.isActive ? "Active" : "Inactive"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(group)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DeleteConfirmationDialog
                          title="Delete Main Group"
                          description="Are you sure you want to delete this main group? This action cannot be undone."
                          onConfirm={() => handleDelete(group.id)}
                        >
                          <Button variant="outline" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DeleteConfirmationDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No main groups found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );
      
      // Add cases for other tabs

      default:
        return (
          <div className="text-center py-4">
            Select a tab to view accounts.
          </div>
        );
    }
  };

  // Render form based on active tab
  const renderForm = (isEdit: boolean = false) => {
    switch(activeTab) {
      case "main-groups":
        return (
          <form onSubmit={isEdit ? handleSubmitEdit : handleSubmitAdd}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Select
                  name="name"
                  value={formData.name}
                  onValueChange={(value) => handleSelectChange("name", value)}
                  disabled={isEdit}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                    <SelectItem value="profit_and_loss">Profit and Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Code
                </Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">
                  Status
                </Label>
                <Select
                  name="isActive"
                  value={formData.isActive ? "true" : "false"}
                  onValueChange={(value) => handleSelectChange("isActive", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!formData.name || !formData.code}>
                {isEdit ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        );
      
      // Add cases for other tabs

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chart of Accounts</CardTitle>
        <CardDescription>
          Manage your chart of accounts structure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="main-groups" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="main-groups">Main Groups</TabsTrigger>
              <TabsTrigger value="element-groups">Element Groups</TabsTrigger>
              <TabsTrigger value="sub-element-groups">Sub-Element Groups</TabsTrigger>
              <TabsTrigger value="detailed-groups">Detailed Groups</TabsTrigger>
              <TabsTrigger value="accounts">Accounts (AC Heads)</TabsTrigger>
            </TabsList>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New {activeTab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').slice(0, -1)}</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new item.
                  </DialogDescription>
                </DialogHeader>
                {renderForm()}
              </DialogContent>
            </Dialog>
          </div>
          <TabsContent value="main-groups">
            {renderTable()}
          </TabsContent>
          <TabsContent value="element-groups">
            <div className="text-center py-4">
              Element Groups section coming soon.
            </div>
          </TabsContent>
          <TabsContent value="sub-element-groups">
            <div className="text-center py-4">
              Sub-Element Groups section coming soon.
            </div>
          </TabsContent>
          <TabsContent value="detailed-groups">
            <div className="text-center py-4">
              Detailed Groups section coming soon.
            </div>
          </TabsContent>
          <TabsContent value="accounts">
            <div className="text-center py-4">
              Accounts section coming soon.
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                Edit {activeTab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').slice(0, -1)}
              </DialogTitle>
              <DialogDescription>
                Update the details for the selected item.
              </DialogDescription>
            </DialogHeader>
            {renderForm(true)}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}