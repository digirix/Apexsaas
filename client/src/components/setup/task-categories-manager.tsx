import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlertCircle, Edit2, Trash2, Plus, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

// Category form schema
const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  isAdmin: z.boolean().default(false),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export function TaskCategoriesManager() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("admin");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch task categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["/api/v1/setup/task-categories"],
  });

  // Separate admin and revenue categories
  const adminCategories = categories.filter((cat: any) => cat.isAdmin);
  const revenueCategories = categories.filter((cat: any) => !cat.isAdmin);

  // Create a new category
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const response = await apiRequest("POST", "/api/v1/setup/task-categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/task-categories"] });
      setIsAddModalOpen(false);
      toast({
        title: "Success",
        description: "Task category created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task category",
        variant: "destructive",
      });
    },
  });

  // Update an existing category
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: { id: number; values: Partial<CategoryFormValues> }) => {
      const response = await apiRequest("PUT", `/api/v1/setup/task-categories/${data.id}`, data.values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/task-categories"] });
      setIsEditModalOpen(false);
      setCategoryToEdit(null);
      toast({
        title: "Success",
        description: "Task category updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task category",
        variant: "destructive",
      });
    },
  });

  // Delete a category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/v1/setup/task-categories/${id}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/task-categories"] });
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
      toast({
        title: "Success",
        description: "Task category deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task category",
        variant: "destructive",
      });
    },
  });

  // Form for adding a new category
  const addForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      isAdmin: activeTab === "admin",
    },
  });

  // When tab changes, update the isAdmin default value
  const onTabChange = (value: string) => {
    setActiveTab(value);
    addForm.setValue("isAdmin", value === "admin");
  };

  // Form for editing an existing category
  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      isAdmin: false,
    },
  });

  // Open edit modal and populate form with category data
  const handleEdit = (category: any) => {
    setCategoryToEdit(category);
    editForm.reset({
      name: category.name,
      isAdmin: category.isAdmin,
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal and set category to delete
  const handleDelete = (category: any) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  // Handle form submission for adding a new category
  const onAddSubmit = (data: CategoryFormValues) => {
    createCategoryMutation.mutate(data);
  };

  // Handle form submission for editing a category
  const onEditSubmit = (data: CategoryFormValues) => {
    if (categoryToEdit) {
      updateCategoryMutation.mutate({
        id: categoryToEdit.id,
        values: data,
      });
    }
  };

  // Render category table based on isAdmin flag
  const renderCategoryTable = (isAdmin: boolean) => {
    const categoriesList = isAdmin ? adminCategories : revenueCategories;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categoriesList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                No categories found. Add one to get started.
              </TableCell>
            </TableRow>
          ) : (
            categoriesList.map((category: any) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(category)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Categories</CardTitle>
        <CardDescription>
          Manage task categories for administrative and revenue tasks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="admin">Administrative Tasks</TabsTrigger>
              <TabsTrigger value="revenue">Revenue Tasks</TabsTrigger>
            </TabsList>
            
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Task Category</DialogTitle>
                  <DialogDescription>
                    Create a new task category for {activeTab === "admin" ? "administrative" : "revenue"} tasks.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...addForm}>
                  <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter category name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="isAdmin"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Administrative Task Category</FormLabel>
                            <FormDescription>
                              Check this box for administrative task categories, leave unchecked for revenue tasks.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createCategoryMutation.isPending}>
                        {createCategoryMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Category
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          <TabsContent value="admin" className="space-y-4">
            {renderCategoryTable(true)}
          </TabsContent>
          
          <TabsContent value="revenue" className="space-y-4">
            {renderCategoryTable(false)}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Category</DialogTitle>
            <DialogDescription>
              Update the task category details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Administrative Task Category</FormLabel>
                      <FormDescription>
                        Check this box for administrative task categories, leave unchecked for revenue tasks.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCategoryMutation.isPending}>
                  {updateCategoryMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Category
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <DialogTitle>Delete Task Category</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to delete the task category "{categoryToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => categoryToDelete && deleteCategoryMutation.mutate(categoryToDelete.id)}
              disabled={deleteCategoryMutation.isPending}
            >
              {deleteCategoryMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}