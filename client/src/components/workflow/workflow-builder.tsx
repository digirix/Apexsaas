import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  X, 
  Plus, 
  Save, 
  Settings, 
  Zap, 
  Target,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WorkflowBuilderProps {
  workflow?: any;
  onClose: () => void;
  onSave: () => void;
}

export function WorkflowBuilder({ workflow, onClose, onSave }: WorkflowBuilderProps) {
  const [workflowData, setWorkflowData] = useState({
    name: "",
    description: "",
    status: "draft",
    isActive: false
  });
  
  const [triggers, setTriggers] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [showTriggerForm, setShowTriggerForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<any>(null);
  const [editingAction, setEditingAction] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch trigger configuration
  const { data: triggerConfig } = useQuery({
    queryKey: ["/api/v1/workflows/config/triggers"],
  });

  // Fetch action configuration
  const { data: actionConfig } = useQuery({
    queryKey: ["/api/v1/workflows/config/actions"],
  });

  // Load existing workflow data if editing
  useEffect(() => {
    if (workflow) {
      setWorkflowData({
        name: workflow.name || "",
        description: workflow.description || "",
        status: workflow.status || "draft",
        isActive: workflow.isActive || false
      });
      
      // Fetch full workflow details if we have an ID
      if (workflow.id) {
        fetch(`/api/v1/workflows/${workflow.id}`)
          .then(res => res.json())
          .then(data => {
            setTriggers(data.triggers || []);
            setActions(data.actions || []);
          })
          .catch(console.error);
      }
    }
  }, [workflow]);

  // Save workflow mutation
  const saveWorkflowMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = workflow?.id ? "PUT" : "POST";
      const url = workflow?.id ? `/api/v1/workflows/${workflow.id}` : "/api/v1/workflows";
      
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workflow saved successfully.",
      });
      onSave();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save workflow.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!workflowData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a workflow name.",
        variant: "destructive",
      });
      return;
    }

    if (triggers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one trigger.",
        variant: "destructive",
      });
      return;
    }

    if (actions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one action.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      workflow: workflowData,
      triggers: triggers.map(t => ({
        triggerModule: t.triggerModule,
        triggerEvent: t.triggerEvent,
        triggerConditions: t.triggerConditions ? JSON.stringify(t.triggerConditions) : null,
        isActive: t.isActive ?? true
      })),
      actions: actions.map((a, index) => ({
        sequenceOrder: index + 1,
        actionType: a.actionType,
        actionConfiguration: JSON.stringify(a.actionConfiguration),
        isActive: a.isActive ?? true
      }))
    };

    saveWorkflowMutation.mutate(payload);
  };

  const addTrigger = (triggerData: any) => {
    setTriggers([...triggers, { ...triggerData, id: Date.now() }]);
    setShowTriggerForm(false);
    setEditingTrigger(null);
  };

  const updateTrigger = (triggerData: any) => {
    setTriggers(triggers.map(t => t.id === editingTrigger.id ? { ...triggerData, id: t.id } : t));
    setShowTriggerForm(false);
    setEditingTrigger(null);
  };

  const deleteTrigger = (triggerId: any) => {
    setTriggers(triggers.filter(t => t.id !== triggerId));
  };

  const addAction = (actionData: any) => {
    setActions([...actions, { ...actionData, id: Date.now() }]);
    setShowActionForm(false);
    setEditingAction(null);
  };

  const updateAction = (actionData: any) => {
    setActions(actions.map(a => a.id === editingAction.id ? { ...actionData, id: a.id } : a));
    setShowActionForm(false);
    setEditingAction(null);
  };

  const deleteAction = (actionId: any) => {
    setActions(actions.filter(a => a.id !== actionId));
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newActions = [...actions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newActions.length) {
      [newActions[index], newActions[targetIndex]] = [newActions[targetIndex], newActions[index]];
      setActions(newActions);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {workflow?.id ? "Edit Workflow" : "Create Workflow"}
          </h2>
          <p className="text-muted-foreground">
            Configure automated processes for your business operations.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveWorkflowMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveWorkflowMutation.isPending ? "Saving..." : "Save Workflow"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Information */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Configure the basic settings for your workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name</Label>
              <Input
                id="name"
                value={workflowData.name}
                onChange={(e) => setWorkflowData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter workflow name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={workflowData.description}
                onChange={(e) => setWorkflowData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this workflow does"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={workflowData.status}
                onValueChange={(value) => setWorkflowData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={workflowData.isActive}
                onCheckedChange={(checked) => setWorkflowData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="active">Enable workflow execution</Label>
            </div>
          </CardContent>
        </Card>

        {/* Triggers and Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Triggers Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Triggers
                  </CardTitle>
                  <CardDescription>
                    Define what events will start this workflow.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTrigger(null);
                    setShowTriggerForm(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Trigger
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {triggers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No triggers configured. Add a trigger to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {triggers.map((trigger, index) => (
                    <div key={trigger.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">
                          {triggerConfig?.modules?.find((m: any) => m.name === trigger.triggerModule)?.displayName || trigger.triggerModule}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {trigger.triggerEvent} {trigger.triggerConditions && "with conditions"}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTrigger(trigger);
                            setShowTriggerForm(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTrigger(trigger.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Actions
                  </CardTitle>
                  <CardDescription>
                    Define what happens when the workflow is triggered.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAction(null);
                    setShowActionForm(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Action
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No actions configured. Add an action to define what happens.
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map((action, index) => (
                    <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3 flex-1">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <div className="font-medium">
                            {actionConfig?.types?.find((t: any) => t.name === action.actionType)?.displayName || action.actionType}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {action.actionConfiguration?.title || action.actionConfiguration?.message || "Action configured"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveAction(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveAction(index, 'down')}
                          disabled={index === actions.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingAction(action);
                            setShowActionForm(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteAction(action.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trigger Form Modal */}
      {showTriggerForm && (
        <TriggerForm
          trigger={editingTrigger}
          triggerConfig={triggerConfig}
          onSave={editingTrigger ? updateTrigger : addTrigger}
          onCancel={() => {
            setShowTriggerForm(false);
            setEditingTrigger(null);
          }}
        />
      )}

      {/* Action Form Modal */}
      {showActionForm && (
        <ActionForm
          action={editingAction}
          actionConfig={actionConfig}
          onSave={editingAction ? updateAction : addAction}
          onCancel={() => {
            setShowActionForm(false);
            setEditingAction(null);
          }}
        />
      )}
    </div>
  );
}

// Trigger Form Component
function TriggerForm({ trigger, triggerConfig, onSave, onCancel }: any) {
  const [formData, setFormData] = useState({
    triggerType: trigger?.triggerType || "",
    triggerConfiguration: trigger?.triggerConfiguration || {}
  });

  const selectedTriggerType = triggerConfig?.types?.find((t: any) => t.name === formData.triggerType);

  const handleConfigChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      triggerConfiguration: {
        ...prev.triggerConfiguration,
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    if (!formData.triggerType) {
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-hidden">
        <CardHeader>
          <CardTitle>{trigger ? "Edit Trigger" : "Add Trigger"}</CardTitle>
        </CardHeader>
        <ScrollArea className="max-h-[60vh]">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, triggerType: value, triggerConfiguration: {} }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  {triggerConfig?.types?.map((type: any) => (
                    <SelectItem key={type.name} value={type.name}>
                      {type.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTriggerType && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {selectedTriggerType.description}
                </div>
                {selectedTriggerType.configFields?.map((field: any) => (
                  <div key={field.name} className="space-y-2">
                    <Label>{field.label || field.name.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}</Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        value={formData.triggerConfiguration[field.name] || field.defaultValue || ""}
                        onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        disabled={field.readonly}
                      />
                    ) : field.type === "select" ? (
                      <Select
                        value={formData.triggerConfiguration[field.name] || field.defaultValue || ""}
                        onValueChange={(value) => handleConfigChange(field.name, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option: string) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={field.type === "number" ? "number" : "text"}
                        value={formData.triggerConfiguration[field.name] || field.defaultValue || ""}
                        onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        disabled={field.readonly}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </ScrollArea>
        <CardContent className="pt-0">
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Trigger
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Action Form Component
function ActionForm({ action, actionConfig, onSave, onCancel }: any) {
  const [formData, setFormData] = useState({
    actionType: action?.actionType || "",
    actionConfiguration: action?.actionConfiguration || {}
  });

  const selectedActionType = actionConfig?.types?.find((t: any) => t.name === formData.actionType);

  const handleConfigChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      actionConfiguration: {
        ...prev.actionConfiguration,
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    if (!formData.actionType) {
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-hidden">
        <CardHeader>
          <CardTitle>{action ? "Edit Action" : "Add Action"}</CardTitle>
        </CardHeader>
        <ScrollArea className="max-h-[60vh]">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select
                value={formData.actionType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, actionType: value, actionConfiguration: {} }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  {actionConfig?.types?.map((type: any) => (
                    <SelectItem key={type.name} value={type.name}>
                      {type.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedActionType && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {selectedActionType.description}
                </div>
                {selectedActionType.configFields?.map((field: any) => (
                  <div key={field.name} className="space-y-2">
                    <Label>{field.name.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}</Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        value={formData.actionConfiguration[field.name] || ""}
                        onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    ) : field.type === "select" ? (
                      <Select
                        value={formData.actionConfiguration[field.name] || ""}
                        onValueChange={(value) => handleConfigChange(field.name, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option: string) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={field.type === "number" ? "number" : "text"}
                        value={formData.actionConfiguration[field.name] || ""}
                        onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </ScrollArea>
        <CardContent className="pt-0">
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Action
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}