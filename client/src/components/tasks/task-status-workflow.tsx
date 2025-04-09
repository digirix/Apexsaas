import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Task, TaskStatus } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  ArrowRightCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskStatusWorkflowProps {
  taskId: number;
  currentStatusId: number;
  onStatusChange?: () => void;
  variant?: "button" | "icon";
  size?: "sm" | "default";
}

export function TaskStatusWorkflow({ 
  taskId, 
  currentStatusId, 
  onStatusChange,
  variant = "button",
  size = "default"
}: TaskStatusWorkflowProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  // Fetch task statuses
  const { data: statuses = [], isLoading: isLoadingStatuses } = useQuery<TaskStatus[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
  });
  
  // Sort statuses by rank
  const sortedStatuses = [...statuses].sort((a, b) => a.rank - b.rank);
  
  // Find current status
  const currentStatus = statuses.find(s => s.id === currentStatusId);
  
  // Get available next statuses - ones with higher rank than current but not more than one step ahead
  // Exception: From rank 1 (New) all rank 2.x statuses are available
  // All statuses are available for super admin
  const availableNextStatuses = sortedStatuses.filter(status => {
    // If current rank is 1 (New), show all statuses with rank starting with 2
    if (currentStatus?.rank === 1) {
      return Math.floor(status.rank) === 2 || status.rank === 3;
    }
    
    // If current rank starts with 2, only show statuses with next decimal rank or rank 3 (Completed)
    if (currentStatus && Math.floor(currentStatus.rank) === 2) {
      const currentDecimal = currentStatus.rank - 2; // Get decimal part (e.g., 2.1 -> 0.1)
      const nextDecimal = currentDecimal + 0.1; // Next decimal (e.g., 0.1 -> 0.2)
      const nextRank = 2 + nextDecimal; // Combine to get next rank (e.g., 2 + 0.2 = 2.2)
      
      return status.rank === nextRank || status.rank === 3;
    }
    
    // Don't show any options for completed tasks (rank 3)
    if (currentStatus?.rank === 3) {
      return false;
    }
    
    return false;
  });
  
  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (statusId: number) => {
      const response = await apiRequest("PUT", `/api/v1/tasks/${taskId}`, {
        statusId
      });
      return response.json();
    },
    onSuccess: (data: Task) => {
      // Find the new status name
      const newStatus = statuses.find(s => s.id === data.statusId);
      
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks", taskId] });
      
      toast({
        title: "Status Updated",
        description: `Task status changed to ${newStatus?.name || "new status"}.`,
      });
      
      // Close popover
      setIsOpen(false);
      
      // Call onStatusChange callback if provided
      if (onStatusChange) {
        onStatusChange();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle status change
  const handleStatusChange = (statusId: number) => {
    updateStatusMutation.mutate(statusId);
  };
  
  // Complete task directly
  const completeTask = () => {
    const completedStatus = statuses.find(s => s.rank === 3);
    if (completedStatus) {
      updateStatusMutation.mutate(completedStatus.id);
    } else {
      toast({
        title: "Error",
        description: "Completed status not found in the system.",
        variant: "destructive",
      });
    }
  };
  
  // Handle pending state
  if (isLoadingStatuses) {
    return (
      <Button disabled size="sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }
  
  // Get status color based on rank
  function getStatusColor(status: TaskStatus | undefined) {
    if (!status) return "bg-slate-100 text-slate-700";
    
    switch (Math.floor(status.rank)) {
      case 1: // New
        return "bg-blue-100 text-blue-700";
      case 2: // In Progress (all variations)
        return "bg-yellow-100 text-yellow-700";
      case 3: // Completed
        return "bg-green-100 text-green-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }
  
  // If current status is 'Completed' or there are no available next statuses
  if (currentStatus?.rank === 3 || availableNextStatuses.length === 0) {
    // Just show current status as non-interactive
    if (variant === "icon") {
      return (
        <span className={cn(
          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
          getStatusColor(currentStatus)
        )}>
          {currentStatus?.name || "Unknown"}
        </span>
      );
    }
    
    return (
      <Button 
        variant="outline" 
        size={size} 
        className={cn(getStatusColor(currentStatus), "border-0")}
        disabled
      >
        {currentStatus?.rank === 3 ? (
          <CheckCircle2 className="mr-1 h-4 w-4" />
        ) : null}
        {currentStatus?.name || "Unknown"}
      </Button>
    );
  }
  
  // Show popover for status selection when there are available options
  if (variant === "icon") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <span 
            className={cn(
              "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium cursor-pointer",
              getStatusColor(currentStatus)
            )}
          >
            {currentStatus?.name || "Unknown"}
            <ChevronDown className="ml-1 h-3 w-3" />
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2">
          <div className="space-y-1">
            <h4 className="text-sm font-medium mb-2">Change Status</h4>
            {availableNextStatuses.map(status => (
              <Button
                key={status.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleStatusChange(status.id)}
                disabled={updateStatusMutation.isPending}
              >
                <ArrowRightCircle className="mr-2 h-4 w-4" />
                {status.name}
              </Button>
            ))}
            {currentStatus?.rank !== 3 && !availableNextStatuses.find(s => s.rank === 3) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={completeTask}
                disabled={updateStatusMutation.isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                Mark as Completed
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size={size}
          className={cn(getStatusColor(currentStatus), "border-0")}
          disabled={updateStatusMutation.isPending}
        >
          {updateStatusMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRightCircle className="mr-2 h-4 w-4" />
          )}
          {currentStatus?.name || "Unknown"}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2">
        <div className="space-y-1">
          <h4 className="text-sm font-medium mb-2">Update Task Status</h4>
          {availableNextStatuses.map(status => (
            <Button
              key={status.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => handleStatusChange(status.id)}
              disabled={updateStatusMutation.isPending}
            >
              <ArrowRightCircle className="mr-2 h-4 w-4" />
              {status.name}
            </Button>
          ))}
          {currentStatus?.rank !== 3 && !availableNextStatuses.find(s => s.rank === 3) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={completeTask}
              disabled={updateStatusMutation.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              Mark as Completed
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}