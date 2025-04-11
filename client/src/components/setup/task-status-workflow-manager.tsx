import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TaskStatus, TaskStatusWorkflowRule } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Loader2, 
  ArrowRightCircle, 
  Check, 
  X,
  Trash
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AddWorkflowRuleFormProps {
  statuses: TaskStatus[];
  onClose: () => void;
}

function AddWorkflowRuleForm({ statuses, onClose }: AddWorkflowRuleFormProps) {
  const { toast } = useToast();
  const [fromStatusId, setFromStatusId] = useState<string>("");
  const [toStatusId, setToStatusId] = useState<string>("");
  const [isAllowed, setIsAllowed] = useState(true);
  
  // Create workflow rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/v1/setup/task-status-workflow-rules", {
        fromStatusId: parseInt(fromStatusId),
        toStatusId: parseInt(toStatusId),
        isAllowed
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rule Created",
        description: "Workflow rule has been created successfully.",
      });
      
      // Invalidate workflow rules query
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/task-status-workflow-rules"] });
      
      // Close dialog
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create workflow rule. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Form validation
  const isValid = fromStatusId && toStatusId && fromStatusId !== toStatusId;
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      createRuleMutation.mutate();
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-2 pb-4">
        <div className="space-y-2">
          <Label htmlFor="from-status">From Status</Label>
          <Select 
            value={fromStatusId} 
            onValueChange={setFromStatusId}
          >
            <SelectTrigger id="from-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map(status => (
                <SelectItem key={`from-${status.id}`} value={status.id.toString()}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex justify-center my-2">
          <ArrowRightCircle className="text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="to-status">To Status</Label>
          <Select 
            value={toStatusId} 
            onValueChange={setToStatusId}
          >
            <SelectTrigger id="to-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map(status => (
                <SelectItem key={`to-${status.id}`} value={status.id.toString()}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fromStatusId && toStatusId && fromStatusId === toStatusId && (
            <p className="text-sm text-destructive mt-1">From and To status cannot be the same</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="is-restricted" 
            checked={!isAllowed} 
            onCheckedChange={(checked) => setIsAllowed(!checked)} 
          />
          <Label htmlFor="is-restricted">Restrict this transition</Label>
        </div>
      </div>
      
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!isValid || createRuleMutation.isPending}
        >
          {createRuleMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>Save</>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TaskStatusWorkflowManager() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Fetch task statuses
  const { 
    data: statuses = [], 
    isLoading: isLoadingStatuses 
  } = useQuery<TaskStatus[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
  });
  
  // Fetch workflow rules
  const { 
    data: workflowRules = [], 
    isLoading: isLoadingRules 
  } = useQuery<TaskStatusWorkflowRule[]>({
    queryKey: ["/api/v1/setup/task-status-workflow-rules"],
  });
  
  // Toggle rule mutation
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isAllowed }: { id: number, isAllowed: boolean }) => {
      const response = await apiRequest("PUT", `/api/v1/setup/task-status-workflow-rules/${id}`, {
        isAllowed
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/task-status-workflow-rules"] });
      toast({
        title: "Rule Updated",
        description: "Workflow rule has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow rule. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/v1/setup/task-status-workflow-rules/${id}`);
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/setup/task-status-workflow-rules"] });
      toast({
        title: "Rule Deleted",
        description: "Workflow rule has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete workflow rule. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Get status name by ID
  const getStatusName = (id: number) => {
    return statuses.find(status => status.id === id)?.name || `Status #${id}`;
  };
  
  // Handle toggle rule
  const handleToggleRule = (id: number, currentValue: boolean) => {
    toggleRuleMutation.mutate({ id, isAllowed: !currentValue });
  };
  
  // Handle delete rule
  const handleDeleteRule = (id: number) => {
    deleteRuleMutation.mutate(id);
  };
  
  if (isLoadingStatuses || isLoadingRules) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Sort workflow rules by from status rank then to status rank
  const sortedRules = [...workflowRules].sort((a, b) => {
    const fromStatusA = statuses.find(s => s.id === a.fromStatusId);
    const fromStatusB = statuses.find(s => s.id === b.fromStatusId);
    const toStatusA = statuses.find(s => s.id === a.toStatusId);
    const toStatusB = statuses.find(s => s.id === b.toStatusId);
    
    if (!fromStatusA || !fromStatusB) return 0;
    
    // First sort by from status rank
    if (fromStatusA.rank !== fromStatusB.rank) {
      return fromStatusA.rank - fromStatusB.rank;
    }
    
    // Then by to status rank
    if (toStatusA && toStatusB) {
      return toStatusA.rank - toStatusB.rank;
    }
    
    return 0;
  });
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Task Status Workflow Rules</CardTitle>
          <CardDescription>
            Define which status transitions are allowed in the task workflow
          </CardDescription>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Workflow Rule</DialogTitle>
              <DialogDescription>
                Define a new rule for task status transitions.
              </DialogDescription>
            </DialogHeader>
            <AddWorkflowRuleForm 
              statuses={statuses} 
              onClose={() => setShowAddDialog(false)} 
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {sortedRules.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No workflow rules defined yet. Add rules to control task status transitions.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From Status</TableHead>
                <TableHead>To Status</TableHead>
                <TableHead className="text-center">Restricted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{getStatusName(rule.fromStatusId)}</TableCell>
                  <TableCell>{getStatusName(rule.toStatusId)}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={!rule.isAllowed}
                      onCheckedChange={() => handleToggleRule(rule.id, rule.isAllowed)}
                      disabled={toggleRuleMutation.isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Workflow Rule</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this workflow rule? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteRule(rule.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Workflow Rules Explanation</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>Rules define which status transitions are restricted for tasks</li>
            <li>By default, all status transitions are allowed</li>
            <li>Turn on "Restrict" for transitions you want to forbid</li>
            <li>These restrictions only apply to Revenue Tasks (not Admin Tasks)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}