import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Workflow, WorkflowAction, InsertWorkflowAction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, ArrowLeft, Plus, MoveVertical, Trash2, Settings } from "lucide-react";

interface WorkflowBuilderProps {
  workflowId?: number;
  onBack: () => void;
}

// Define action form schema
const actionFormSchema = z.object({
  actionType: z.enum([
    "change_task_status",
    "change_task_assignee",
    "set_task_due_date",
    "add_task_comment",
    "send_notification",
    "create_new_task",
  ]),
  actionData: z.string().min(1, "Action data is required"),
  sortOrder: z.number(),
});

type ActionFormData = z.infer<typeof actionFormSchema>;

export function WorkflowBuilder({ workflowId, onBack }: WorkflowBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);
  const [selectedAction, setSelectedAction] = useState<WorkflowAction | null>(null);
  const [newActionData, setNewActionData] = useState<{
    actionType: string;
    parameters: Record<string, any>;
  }>({
    actionType: "change_task_status",
    parameters: {},
  });

  // Fetch workflow details if workflowId is provided
  const {
    data: workflow,
    isLoading: isLoadingWorkflow,
    error: workflowError,
  } = useQuery<Workflow>({
    queryKey: ['/api/v1/workflows', workflowId],
    enabled: !!workflowId,
  });

  // Fetch workflow actions if workflowId is provided
  const {
    data: actions = [],
    isLoading: isLoadingActions,
    error: actionsError,
  } = useQuery<WorkflowAction[]>({
    queryKey: [`/api/v1/workflows/${workflowId}/actions`],
    enabled: !!workflowId,
  });

  // Update workflow mutation
  const updateWorkflowMutation = useMutation({
    mutationFn: (data: Partial<Workflow>) =>
      apiRequest(`/api/v1/workflows/${workflowId}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/workflows', workflowId] });
      toast({
        title: "Workflow updated",
        description: "The workflow has been updated successfully.",
      });
      setIsEditingWorkflow(false);
    },
    onError: () => {
      toast({
        title: "Failed to update workflow",
        description: "There was an error updating the workflow. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create action mutation
  const createActionMutation = useMutation({
    mutationFn: (data: Partial<InsertWorkflowAction>) =>
      apiRequest(`/api/v1/workflows/${workflowId}/actions`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/workflows/${workflowId}/actions`] });
      toast({
        title: "Action added",
        description: "The workflow action has been added successfully.",
      });
      setNewActionData({
        actionType: "change_task_status",
        parameters: {},
      });
    },
    onError: () => {
      toast({
        title: "Failed to add action",
        description: "There was an error adding the workflow action. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update action mutation
  const updateActionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertWorkflowAction> }) =>
      apiRequest(`/api/v1/workflows/${workflowId}/actions/${id}`, {
        method: 'PUT',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/workflows/${workflowId}/actions`] });
      toast({
        title: "Action updated",
        description: "The workflow action has been updated successfully.",
      });
      setSelectedAction(null);
    },
    onError: () => {
      toast({
        title: "Failed to update action",
        description: "There was an error updating the workflow action. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete action mutation
  const deleteActionMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/v1/workflows/${workflowId}/actions/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/workflows/${workflowId}/actions`] });
      toast({
        title: "Action deleted",
        description: "The workflow action has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete action",
        description: "There was an error deleting the workflow action. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form for workflow editing
  const workflowForm = useForm<Workflow>({
    resolver: zodResolver(
      z.object({
        name: z.string().min(1, "Workflow name is required"),
        description: z.string().optional().nullable(),
        triggerEvent: z.string(),
        triggerData: z.string().optional().nullable(),
        conditions: z.string().optional().nullable(),
        isEnabled: z.boolean(),
      })
    ),
    values: workflow || {
      id: 0,
      name: "",
      tenantId: 0,
      description: null,
      triggerEvent: "task_status_changed",
      triggerData: null,
      conditions: null,
      isEnabled: true,
      createdBy: 0,
      createdAt: new Date(),
      lastRunAt: null,
    },
  });

  // Reset form when workflow data changes
  useEffect(() => {
    if (workflow) {
      workflowForm.reset(workflow);
    }
  }, [workflow, workflowForm]);

  // Add new action handler
  const handleAddAction = () => {
    if (!workflowId) return;

    const nextSortOrder = actions.length > 0
      ? Math.max(...actions.map(a => a.sortOrder)) + 10
      : 10;

    createActionMutation.mutate({
      workflowId,
      actionType: newActionData.actionType as any,
      actionData: JSON.stringify(newActionData.parameters),
      sortOrder: nextSortOrder,
    });
  };

  // Update action handler
  const handleUpdateAction = (action: WorkflowAction) => {
    if (!workflowId) return;

    updateActionMutation.mutate({
      id: action.id,
      data: {
        actionType: action.actionType,
        actionData: action.actionData,
        sortOrder: action.sortOrder,
      },
    });
  };

  // Delete action handler
  const handleDeleteAction = (actionId: number) => {
    if (!workflowId) return;
    deleteActionMutation.mutate(actionId);
  };

  // Handle workflow form submission
  const onWorkflowSubmit = (data: any) => {
    if (!workflowId) return;
    updateWorkflowMutation.mutate(data);
  };

  // Format action type for display
  const formatActionType = (actionType: string) => {
    const words = actionType.split('_');
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Render action configuration based on action type
  const renderActionConfiguration = (actionType: string, parameters: any, onChange: (params: any) => void) => {
    switch (actionType) {
      case 'change_task_status':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Status ID
                </label>
                <Input
                  type="number"
                  value={parameters.statusId || ""}
                  onChange={(e) => onChange({ ...parameters, statusId: parseInt(e.target.value) })}
                  placeholder="Enter status ID"
                />
                <p className="text-sm text-gray-500 mt-1">
                  ID of the status to change the task to
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'change_task_assignee':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Assignee ID
                </label>
                <Input
                  type="number"
                  value={parameters.assigneeId || ""}
                  onChange={(e) => onChange({ ...parameters, assigneeId: parseInt(e.target.value) })}
                  placeholder="Enter assignee user ID"
                />
                <p className="text-sm text-gray-500 mt-1">
                  ID of the user to assign the task to
                </p>
              </div>
            </div>
          </div>
        );

      case 'add_task_comment':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comment Text
                </label>
                <Textarea
                  value={parameters.commentText || ""}
                  onChange={(e) => onChange({ ...parameters, commentText: e.target.value })}
                  placeholder="Enter comment text"
                  rows={3}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Text to add as a comment to the task
                </p>
              </div>
            </div>
          </div>
        );

      case 'send_notification':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Type
                </label>
                <Select
                  value={parameters.notificationType || "email"}
                  onValueChange={(value) => onChange({ ...parameters, notificationType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select notification type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="in_app">In-App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient IDs
                </label>
                <Input
                  value={parameters.recipientIds || ""}
                  onChange={(e) => onChange({ ...parameters, recipientIds: e.target.value })}
                  placeholder="Enter comma-separated user IDs"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Comma-separated list of user IDs to notify
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <Input
                  value={parameters.subject || ""}
                  onChange={(e) => onChange({ ...parameters, subject: e.target.value })}
                  placeholder="Enter notification subject"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <Textarea
                  value={parameters.message || ""}
                  onChange={(e) => onChange({ ...parameters, message: e.target.value })}
                  placeholder="Enter notification message"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      // Add more action types as needed

      default:
        return (
          <div className="p-4 border rounded bg-amber-50 text-amber-800">
            <AlertTriangle className="h-5 w-5 inline-block mr-2" />
            Configuration for this action type is not yet implemented.
          </div>
        );
    }
  };

  if (isLoadingWorkflow || isLoadingActions) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (workflowError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load workflow details. Please try again later.</p>
            <Button onClick={onBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workflows
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {workflowId ? "Edit Workflow" : "Create Workflow"}
          </h2>
        </div>
        {workflowId && !isEditingWorkflow && (
          <Button onClick={() => setIsEditingWorkflow(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Edit Workflow
          </Button>
        )}
      </div>

      {workflowId && !isEditingWorkflow ? (
        <Card>
          <CardHeader>
            <CardTitle>{workflow?.name}</CardTitle>
            <CardDescription>{workflow?.description || "No description provided."}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Trigger Event</h3>
                <p>{formatActionType(workflow?.triggerEvent || "")}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <div className="flex items-center mt-1">
                  <div className={`h-2 w-2 rounded-full ${workflow?.isEnabled ? "bg-green-500" : "bg-red-500"} mr-2`}></div>
                  <span>{workflow?.isEnabled ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        workflowId && (
          <Card>
            <CardHeader>
              <CardTitle>Workflow Settings</CardTitle>
              <CardDescription>Configure the basic settings for this workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...workflowForm}>
                <form onSubmit={workflowForm.handleSubmit(onWorkflowSubmit)} className="space-y-6">
                  <FormField
                    control={workflowForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Workflow Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={workflowForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Describe what this workflow does..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={workflowForm.control}
                    name="triggerEvent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trigger Event</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a trigger event" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="task_created_admin">Admin Task Created</SelectItem>
                            <SelectItem value="task_created_revenue">Revenue Task Created</SelectItem>
                            <SelectItem value="task_status_changed">Task Status Changed</SelectItem>
                            <SelectItem value="task_assignee_changed">Task Assignee Changed</SelectItem>
                            <SelectItem value="task_due_date_arrives">Task Due Date Arrives</SelectItem>
                            <SelectItem value="task_due_date_approaching">Task Due Date Approaching</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={workflowForm.control}
                    name="isEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Workflow Status
                          </FormLabel>
                          <FormDescription>
                            Enable or disable this workflow
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingWorkflow(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateWorkflowMutation.isPending}
                    >
                      {updateWorkflowMutation.isPending ? (
                        <Spinner size="sm" className="mr-2" />
                      ) : null}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )
      )}

      {workflowId && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Actions</CardTitle>
              <CardDescription>
                Define the actions that will be executed when this workflow is triggered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <div className="text-center p-6 border border-dashed rounded-lg">
                  <p className="text-gray-500 mb-4">
                    No actions configured yet. Add your first action to define what happens when this workflow is triggered.
                  </p>
                  <Button onClick={() => setSelectedAction({ id: 0 } as any)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Action
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {actions
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((action, index) => (
                      <div
                        key={action.id}
                        className="flex items-start p-4 border rounded-lg"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 mr-3">
                          {index + 1}
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-medium">
                            {formatActionType(action.actionType)}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {action.actionData}
                          </p>
                        </div>
                        <div className="flex-shrink-0 space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAction(action.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedAction(action)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  <div className="flex justify-center mt-4">
                    <Button onClick={() => setSelectedAction({ id: 0 } as any)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Action
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action editor modal */}
          {selectedAction && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedAction.id === 0 ? "Add Action" : "Edit Action"}
                </CardTitle>
                <CardDescription>
                  Configure what this action will do when the workflow is triggered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Action Type
                    </label>
                    <Select
                      value={
                        selectedAction.id === 0
                          ? newActionData.actionType
                          : selectedAction.actionType
                      }
                      onValueChange={(value) => {
                        if (selectedAction.id === 0) {
                          setNewActionData({
                            ...newActionData,
                            actionType: value,
                            parameters: {},
                          });
                        } else {
                          setSelectedAction({
                            ...selectedAction,
                            actionType: value as any,
                            actionData: "{}",
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select action type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="change_task_status">Change Task Status</SelectItem>
                        <SelectItem value="change_task_assignee">Change Task Assignee</SelectItem>
                        <SelectItem value="add_task_comment">Add Task Comment</SelectItem>
                        <SelectItem value="send_notification">Send Notification</SelectItem>
                        <SelectItem value="set_task_due_date">Set Task Due Date</SelectItem>
                        <SelectItem value="create_new_task">Create New Task</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Configuration
                    </label>
                    {selectedAction.id === 0
                      ? renderActionConfiguration(
                          newActionData.actionType,
                          newActionData.parameters,
                          (params) => {
                            setNewActionData({
                              ...newActionData,
                              parameters: params,
                            });
                          }
                        )
                      : renderActionConfiguration(
                          selectedAction.actionType,
                          selectedAction.actionData ? JSON.parse(selectedAction.actionData) : {},
                          (params) => {
                            setSelectedAction({
                              ...selectedAction,
                              actionData: JSON.stringify(params),
                            });
                          }
                        )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedAction.id === 0) {
                      handleAddAction();
                    } else {
                      handleUpdateAction(selectedAction);
                    }
                    setSelectedAction(null);
                  }}
                  disabled={
                    createActionMutation.isPending || updateActionMutation.isPending
                  }
                >
                  {createActionMutation.isPending || updateActionMutation.isPending ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : null}
                  {selectedAction.id === 0 ? "Add Action" : "Update Action"}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}