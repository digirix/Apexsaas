import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Workflow } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Zap, 
  AlertTriangle,
  Calendar,
  UserCog,
  MessageSquare,
  CheckSquare,
  FileText,
  Briefcase
} from "lucide-react";
import { AddWorkflowModal } from "./add-workflow-modal";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

interface WorkflowListProps {
  onSelectWorkflow: (id: number) => void;
  onCreateWorkflow: (id: number) => void;
}

export function WorkflowList({ onSelectWorkflow, onCreateWorkflow }: WorkflowListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<number | null>(null);

  // Fetch workflows
  const { data: workflows = [], isLoading, error } = useQuery<Workflow[]>({
    queryKey: ['/api/v1/workflows'],
  });

  // Toggle workflow status
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) => 
      apiRequest(`/api/v1/workflows/${id}/toggle`, 'PATCH', { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/workflows'] });
      toast({
        title: "Workflow status updated",
        description: "The workflow status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update workflow status",
        description: "There was an error updating the workflow status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete workflow
  const deleteWorkflowMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/v1/workflows/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/workflows'] });
      toast({
        title: "Workflow deleted",
        description: "The workflow has been deleted successfully.",
      });
      setWorkflowToDelete(null);
    },
    onError: () => {
      toast({
        title: "Failed to delete workflow",
        description: "There was an error deleting the workflow. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle workflow creation
  const handleWorkflowCreated = (workflowId: number) => {
    setIsAddModalOpen(false);
    onCreateWorkflow(workflowId);
  };

  // Get trigger icon based on trigger type
  const getTriggerIcon = (triggerEvent: string) => {
    switch (triggerEvent) {
      case 'task_created_admin':
        return <Briefcase className="h-4 w-4" />;
      case 'task_created_revenue':
        return <FileText className="h-4 w-4" />;
      case 'task_status_changed':
        return <CheckSquare className="h-4 w-4" />;
      case 'task_assignee_changed':
        return <UserCog className="h-4 w-4" />;
      case 'task_due_date_arrives':
        return <Calendar className="h-4 w-4" />;
      case 'task_due_date_approaching':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  // Format trigger name for display
  const formatTriggerName = (triggerEvent: string) => {
    const words = triggerEvent.split('_');
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load workflows. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Workflow Automation</h2>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Zap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Workflows Found</h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first automated workflow to streamline your processes.
            </p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Your First Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead className="w-[150px]">Active</TableHead>
                <TableHead className="w-[150px]">Last Run</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell className="font-medium">{workflow.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {getTriggerIcon(workflow.triggerEvent)}
                      <span className="ml-2">{formatTriggerName(workflow.triggerEvent)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={workflow.isEnabled}
                      onCheckedChange={(checked) => 
                        toggleStatusMutation.mutate({ id: workflow.id, isEnabled: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {workflow.lastRunAt 
                      ? new Date(workflow.lastRunAt).toLocaleString() 
                      : "Never run"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSelectWorkflow(workflow.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setWorkflowToDelete(workflow.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isAddModalOpen && (
        <AddWorkflowModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onWorkflowCreated={handleWorkflowCreated}
        />
      )}

      <DeleteConfirmationDialog
        isOpen={workflowToDelete !== null}
        onClose={() => setWorkflowToDelete(null)}
        onConfirm={() => {
          if (workflowToDelete !== null) {
            deleteWorkflowMutation.mutate(workflowToDelete);
          }
        }}
        title="Delete Workflow"
        description="Are you sure you want to delete this workflow? This action cannot be undone and all associated actions and execution history will be permanently removed."
        isDeleting={deleteWorkflowMutation.isPending}
      />
    </div>
  );
}