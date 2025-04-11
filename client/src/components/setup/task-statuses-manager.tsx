import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Pencil, Plus, Trash2, ArrowRight } from "lucide-react";
import { TaskStatus } from "@shared/schema";
import { TaskStatusWorkflowManager } from "./task-status-workflow-manager";

// Default statuses with fixed ranks
const DEFAULT_STATUSES = [
  { name: "New", rank: 1 },
  { name: "Completed", rank: 3 }
];

// Create a schema for the form
const taskStatusFormSchema = z.object({
  name: z.string().min(1, "Status name is required"),
  description: z.string().optional(),
  rank: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    {
      message: "Rank must be a positive number",
    }
  ),
});

type TaskStatusFormValues = z.infer<typeof taskStatusFormSchema>;

export function TaskStatusesManager() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<TaskStatus | null>(null);
  
  // Fetch task statuses
  const { data: taskStatuses = [], isLoading } = useQuery<TaskStatus[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
  });
  
  const form = useForm<TaskStatusFormValues>({
    resolver: zodResolver(taskStatusFormSchema),
    defaultValues: {
      name: "",
      description: "",
      rank: "2",
    },
  });
  
  const createTaskStatusMutation = useMutation({
    mutationFn: async (data: TaskStatusFormValues) => {
      const response = await apiRequest("POST", "/api/v1/setup/task-statuses", {
        name: data.name,
        description: data.description || null,
        rank: parseFloat(data.rank),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/task-statuses"] });
      toast({
        title: "Success",
        description: "Task status has been created successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset({ name: "", description: "", rank: "2" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task status. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const updateTaskStatusMutation = useMutation({
    mutationFn: async (data: TaskStatusFormValues) => {
      const response = await apiRequest(
        "PUT", 
        `/api/v1/setup/task-statuses/${selectedTaskStatus?.id}`,
        {
          name: data.name,
          description: data.description || null,
          rank: parseFloat(data.rank),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/task-statuses"] });
      toast({
        title: "Success",
        description: "Task status has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const deleteTaskStatusMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        "DELETE", 
        `/api/v1/setup/task-statuses/${selectedTaskStatus?.id}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/task-statuses"] });
      toast({
        title: "Success",
        description: "Task status has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task status. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: TaskStatusFormValues) => {
    createTaskStatusMutation.mutate(data);
  };
  
  const onEditSubmit = (data: TaskStatusFormValues) => {
    updateTaskStatusMutation.mutate(data);
  };
  
  const handleEdit = (taskStatus: TaskStatus) => {
    setSelectedTaskStatus(taskStatus);
    form.reset({
      name: taskStatus.name,
      description: taskStatus.description || "",
      rank: taskStatus.rank.toString(),
    });
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = (taskStatus: TaskStatus) => {
    setSelectedTaskStatus(taskStatus);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    deleteTaskStatusMutation.mutate();
  };
  
  const isDefaultStatus = (status: TaskStatus) => {
    return status.name === "New" || status.name === "Completed";
  };
  
  // Sort the statuses by rank
  const sortedStatuses = [...taskStatuses].sort((a, b) => a.rank - b.rank);
  
  // Check if we need to create default statuses
  const needsDefaultStatuses = !taskStatuses.some(s => s.name === "New") || 
                              !taskStatuses.some(s => s.name === "Completed");
  
  const createDefaultStatuses = async () => {
    try {
      const promises = DEFAULT_STATUSES.map(status => {
        // Check if this default status already exists
        if (!taskStatuses.some(s => s.name === status.name)) {
          return apiRequest("POST", "/api/v1/setup/task-statuses", {
            name: status.name,
            description: `${status.name} status`,
            rank: status.rank,
          });
        }
        return Promise.resolve();
      });
      
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/task-statuses"] });
      
      toast({
        title: "Success",
        description: "Default task statuses have been created.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create default statuses. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const [activeTab, setActiveTab] = useState<string>("statuses");
  
  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="statuses">Define Task Statuses</TabsTrigger>
          <TabsTrigger value="workflow">Configure Status Workflow</TabsTrigger>
        </TabsList>
        
        <TabsContent value="statuses">
          <Card>
            <CardHeader>
              <CardTitle>Task Statuses</CardTitle>
              <CardDescription>
                Configure the statuses that tasks can have in your workflow. The status rank determines the progression of tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div>
                  {needsDefaultStatuses && (
                    <Button 
                      variant="outline" 
                      onClick={createDefaultStatuses}
                    >
                      Create Default Statuses
                    </Button>
                  )}
                </div>
                <Button onClick={() => {
                  form.reset({ name: "", description: "", rank: "2" });
                  setIsAddDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task Status
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : taskStatuses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <p className="text-slate-500 mb-4">No task statuses found</p>
                  <Button 
                    onClick={createDefaultStatuses}
                    className="mb-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Default Statuses
                  </Button>
                  <Button onClick={() => {
                    form.reset({ name: "", description: "", rank: "2" });
                    setIsAddDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Status
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Status Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>System Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStatuses.map((status) => (
                      <TableRow key={status.id}>
                        <TableCell>{status.rank}</TableCell>
                        <TableCell className="font-medium">{status.name}</TableCell>
                        <TableCell>{status.description || "-"}</TableCell>
                        <TableCell>
                          {isDefaultStatus(status) ? (
                            <Badge variant="secondary">System</Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(status)}
                              disabled={isDefaultStatus(status)}
                              title={isDefaultStatus(status) ? "System statuses cannot be edited" : "Edit status"}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(status)}
                              disabled={isDefaultStatus(status)}
                              title={isDefaultStatus(status) ? "System statuses cannot be deleted" : "Delete status"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={() => setActiveTab("workflow")}
                disabled={taskStatuses.length < 2}
              >
                Configure Workflow
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="workflow">
          <TaskStatusWorkflowManager />
        </TabsContent>
      </Tabs>

      {/* Add Task Status Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task Status</DialogTitle>
            <DialogDescription>
              Add a new status for task workflow. The rank determines the order in your workflow.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., In Progress, Under Review" {...field} />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this status means in your workflow"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="rank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rank</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Rank 1 is reserved for "New" and rank 3 for "Completed". Use ranks like 2, 2.1, 2.2 for intermediate steps.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createTaskStatusMutation.isPending}
                >
                  {createTaskStatusMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Task Status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Task Status Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Status</DialogTitle>
            <DialogDescription>
              Update the task status details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="rank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rank</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Rank 1 is reserved for "New" and rank 3 for "Completed". Use ranks like 2, 2.1, 2.2 for intermediate steps.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateTaskStatusMutation.isPending}
                >
                  {updateTaskStatusMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Task Status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the task status "{selectedTaskStatus?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteTaskStatusMutation.isPending}
            >
              {deleteTaskStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}