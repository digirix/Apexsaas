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

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "main-groups") {
      addMainGroupMutation.mutate(formData);
    }
    // Add handlers for other tabs
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "main-groups") {
      editMainGroupMutation.mutate({ ...formData, id: selectedItem.id });
    }
    // Add handlers for other tabs
  };

  const handleDelete = (id: number) => {
    if (activeTab === "main-groups") {
      deleteMainGroupMutation.mutate(id);
    }
    // Add handlers for other tabs
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