import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  X, 
  Play, 
  Save, 
  ArrowRight,
  Zap,
  Calendar,
  Database,
  Mail,
  Webhook,
  Users,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  UserPlus,
  Flag
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ModernWorkflowBuilderProps {
  workflow?: any;
  onClose: () => void;
  onSave: () => void;
}

interface TriggerType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  category: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'select' | 'number' | 'textarea' | 'boolean';
    required: boolean;
    options?: Array<{ value: string; label: string; }>;
    placeholder?: string;
    description?: string;
  }>;
}

interface ActionType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  category: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'select' | 'number' | 'textarea' | 'boolean';
    required: boolean;
    options?: Array<{ value: string; label: string; }>;
    placeholder?: string;
    description?: string;
  }>;
}

export function ModernWorkflowBuilder({ workflow, onClose, onSave }: ModernWorkflowBuilderProps) {
  const [workflowData, setWorkflowData] = useState({
    name: workflow?.name || "",
    description: workflow?.description || "",
    isActive: workflow?.isActive || false
  });
  
  const [triggers, setTriggers] = useState<any[]>(workflow?.triggers || []);
  const [actions, setActions] = useState<any[]>(workflow?.actions || []);
  const [selectedTriggerType, setSelectedTriggerType] = useState<string>("");
  const [selectedActionType, setSelectedActionType] = useState<string>("");
  const [showTriggerForm, setShowTriggerForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available data for dropdowns
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });
  const { data: taskStatuses = [] } = useQuery({ queryKey: ["/api/v1/setup/task-statuses"] });
  const { data: taskCategories = [] } = useQuery({ queryKey: ["/api/v1/setup/task-categories"] });

  // Modern trigger types with real application integration
  const triggerTypes: TriggerType[] = [
    {
      id: "client_created",
      name: "New Client Added",
      description: "Triggered when a new client is added to the system",
      icon: UserPlus,
      category: "Client Management",
      fields: [
        {
          name: "clientType",
          label: "Client Type Filter",
          type: "select",
          required: false,
          options: [
            { value: "", label: "Any client type" },
            { value: "individual", label: "Individual clients only" },
            { value: "company", label: "Company clients only" }
          ]
        }
      ]
    },
    {
      id: "task_overdue",
      name: "Task Becomes Overdue",
      description: "Triggered when a task passes its due date without completion",
      icon: AlertTriangle,
      category: "Task Management",
      fields: [
        {
          name: "categoryFilter",
          label: "Task Category",
          type: "select",
          required: false,
          options: [
            { value: "", label: "Any category" },
            ...taskCategories.map(cat => ({ value: cat.id.toString(), label: cat.name }))
          ]
        },
        {
          name: "overdueHours",
          label: "Hours Overdue",
          type: "number",
          required: false,
          placeholder: "24",
          description: "Trigger after this many hours overdue (default: immediately)"
        }
      ]
    },
    {
      id: "task_status_changed",
      name: "Task Status Changed",
      description: "Triggered when a task status is updated",
      icon: CheckCircle,
      category: "Task Management",
      fields: [
        {
          name: "fromStatus",
          label: "From Status",
          type: "select",
          required: false,
          options: [
            { value: "", label: "Any status" },
            ...taskStatuses.map(status => ({ value: status.id.toString(), label: status.name }))
          ]
        },
        {
          name: "toStatus",
          label: "To Status",
          type: "select",
          required: true,
          options: taskStatuses.map(status => ({ value: status.id.toString(), label: status.name }))
        }
      ]
    },
    {
      id: "entity_compliance_due",
      name: "Compliance Deadline Approaching",
      description: "Triggered when entity compliance deadlines are approaching",
      icon: Flag,
      category: "Compliance",
      fields: [
        {
          name: "daysBefore",
          label: "Days Before Deadline",
          type: "number",
          required: true,
          placeholder: "7",
          description: "How many days before the deadline to trigger"
        },
        {
          name: "entityFilter",
          label: "Entity Filter",
          type: "select",
          required: false,
          options: [
            { value: "", label: "All entities" },
            ...entities.map(entity => ({ value: entity.id.toString(), label: entity.name }))
          ]
        }
      ]
    },
    {
      id: "schedule_trigger",
      name: "Scheduled Time",
      description: "Triggered at specific times or intervals",
      icon: Clock,
      category: "Scheduling",
      fields: [
        {
          name: "scheduleType",
          label: "Schedule Type",
          type: "select",
          required: true,
          options: [
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "custom", label: "Custom (Cron)" }
          ]
        },
        {
          name: "time",
          label: "Time",
          type: "text",
          required: true,
          placeholder: "09:00",
          description: "Time in HH:MM format (24-hour)"
        },
        {
          name: "cronExpression",
          label: "Cron Expression",
          type: "text",
          required: false,
          placeholder: "0 9 * * 1-5",
          description: "Custom cron expression (if schedule type is custom)"
        }
      ]
    }
  ];

  // Modern action types with real application integration
  const actionTypes: ActionType[] = [
    {
      id: "create_follow_up_task",
      name: "Create Follow-up Task",
      description: "Automatically create a new task for follow-up actions",
      icon: Plus,
      category: "Task Management",
      fields: [
        {
          name: "taskTitle",
          label: "Task Title",
          type: "text",
          required: true,
          placeholder: "Follow up on {{client.name}}",
          description: "Use {{client.name}}, {{entity.name}}, {{task.title}} for dynamic values"
        },
        {
          name: "taskDescription",
          label: "Task Description",
          type: "textarea",
          required: false,
          placeholder: "Follow up required for {{trigger.reason}}"
        },
        {
          name: "assignToUser",
          label: "Assign To",
          type: "select",
          required: true,
          options: users.map(user => ({ value: user.id.toString(), label: user.displayName }))
        },
        {
          name: "categoryId",
          label: "Task Category",
          type: "select",
          required: true,
          options: taskCategories.map(cat => ({ value: cat.id.toString(), label: cat.name }))
        },
        {
          name: "dueInDays",
          label: "Due in Days",
          type: "number",
          required: false,
          placeholder: "7",
          description: "Number of days from now when task is due"
        }
      ]
    },
    {
      id: "assign_user_to_task",
      name: "Assign User to Task",
      description: "Automatically assign a user to a task based on conditions",
      icon: Users,
      category: "Task Management",
      fields: [
        {
          name: "userId",
          label: "User to Assign",
          type: "select",
          required: true,
          options: users.map(user => ({ value: user.id.toString(), label: user.displayName }))
        },
        {
          name: "assignmentReason",
          label: "Assignment Reason",
          type: "text",
          required: false,
          placeholder: "Auto-assigned due to {{trigger.reason}}"
        }
      ]
    },
    {
      id: "update_client_status",
      name: "Update Client Status",
      description: "Change client status or add notes based on triggers",
      icon: Building2,
      category: "Client Management",
      fields: [
        {
          name: "statusUpdate",
          label: "Status Update",
          type: "select",
          required: false,
          options: [
            { value: "active", label: "Set to Active" },
            { value: "inactive", label: "Set to Inactive" },
            { value: "under_review", label: "Set to Under Review" }
          ]
        },
        {
          name: "addNote",
          label: "Add Note",
          type: "textarea",
          required: false,
          placeholder: "Automated note: {{trigger.description}}"
        }
      ]
    },
    {
      id: "send_team_alert",
      name: "Send Team Alert",
      description: "Send an internal alert to team members",
      icon: AlertTriangle,
      category: "Communication",
      fields: [
        {
          name: "alertTitle",
          label: "Alert Title",
          type: "text",
          required: true,
          placeholder: "Urgent: {{trigger.description}}"
        },
        {
          name: "alertMessage",
          label: "Alert Message",
          type: "textarea",
          required: true,
          placeholder: "Action required for {{client.name}} - {{entity.name}}"
        },
        {
          name: "severity",
          label: "Severity Level",
          type: "select",
          required: true,
          options: [
            { value: "INFO", label: "Information" },
            { value: "WARNING", label: "Warning" },
            { value: "CRITICAL", label: "Critical" }
          ]
        },
        {
          name: "targetUsers",
          label: "Send To",
          type: "select",
          required: true,
          options: [
            { value: "all", label: "All team members" },
            { value: "managers", label: "Managers only" },
            { value: "specific", label: "Specific user" }
          ]
        }
      ]
    },
    {
      id: "create_compliance_task",
      name: "Create Compliance Task",
      description: "Generate compliance-related tasks automatically",
      icon: Flag,
      category: "Compliance",
      fields: [
        {
          name: "complianceType",
          label: "Compliance Type",
          type: "select",
          required: true,
          options: [
            { value: "tax_filing", label: "Tax Filing" },
            { value: "annual_return", label: "Annual Return" },
            { value: "audit_prep", label: "Audit Preparation" },
            { value: "regulatory_update", label: "Regulatory Update" }
          ]
        },
        {
          name: "taskTitle",
          label: "Task Title",
          type: "text",
          required: true,
          placeholder: "{{complianceType}} required for {{entity.name}}"
        },
        {
          name: "priorityLevel",
          label: "Priority Level",
          type: "select",
          required: true,
          options: [
            { value: "low", label: "Low Priority" },
            { value: "medium", label: "Medium Priority" },
            { value: "high", label: "High Priority" },
            { value: "urgent", label: "Urgent" }
          ]
        }
      ]
    },
    {
      id: "update_entity_data",
      name: "Update Entity Information",
      description: "Automatically update entity data based on triggers",
      icon: Database,
      category: "Data Management",
      fields: [
        {
          name: "fieldToUpdate",
          label: "Field to Update",
          type: "select",
          required: true,
          options: [
            { value: "notes", label: "Entity Notes" },
            { value: "status", label: "Entity Status" },
            { value: "lastReviewDate", label: "Last Review Date" }
          ]
        },
        {
          name: "newValue",
          label: "New Value",
          type: "text",
          required: true,
          placeholder: "Updated by automation: {{trigger.reason}}"
        }
      ]
    }
  ];

  // Save workflow mutation
  const saveWorkflowMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = workflow ? `/api/v1/workflows/${workflow.id}` : "/api/v1/workflows";
      const method = workflow ? "PUT" : "POST";
      
      const response = await apiRequest(method, endpoint, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/workflows"] });
      toast({
        title: "Success",
        description: `Workflow ${workflow ? 'updated' : 'created'} successfully.`,
      });
      onSave();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${workflow ? 'update' : 'create'} workflow.`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!workflowData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Workflow name is required.",
        variant: "destructive",
      });
      return;
    }

    if (triggers.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one trigger is required.",
        variant: "destructive",
      });
      return;
    }

    if (actions.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one action is required.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      workflow: workflowData,
      triggers: triggers.map((trigger, index) => ({
        triggerModule: trigger.category.toLowerCase().replace(' ', '_'),
        triggerEvent: trigger.type,
        triggerConditions: JSON.stringify(trigger.config),
        isActive: true
      })),
      actions: actions.map((action, index) => ({
        sequenceOrder: index + 1,
        actionType: action.type,
        actionConfiguration: JSON.stringify(action.config),
        isActive: true
      }))
    };

    saveWorkflowMutation.mutate(payload);
  };

  const addTrigger = (triggerType: TriggerType) => {
    const newTrigger = {
      id: Date.now(),
      type: triggerType.id,
      name: triggerType.name,
      category: triggerType.category,
      icon: triggerType.icon,
      config: {}
    };
    setTriggers([...triggers, newTrigger]);
    setShowTriggerForm(false);
    setSelectedTriggerType("");
  };

  const addAction = (actionType: ActionType) => {
    const newAction = {
      id: Date.now(),
      type: actionType.id,
      name: actionType.name,
      category: actionType.category,
      icon: actionType.icon,
      config: {}
    };
    setActions([...actions, newAction]);
    setShowActionForm(false);
    setSelectedActionType("");
  };

  const removeTrigger = (triggerId: number) => {
    setTriggers(triggers.filter(t => t.id !== triggerId));
  };

  const removeAction = (actionId: number) => {
    setActions(actions.filter(a => a.id !== actionId));
  };

  const updateTriggerConfig = (triggerId: number, field: string, value: any) => {
    setTriggers(triggers.map(trigger => 
      trigger.id === triggerId 
        ? { ...trigger, config: { ...trigger.config, [field]: value } }
        : trigger
    ));
  };

  const updateActionConfig = (actionId: number, field: string, value: any) => {
    setActions(actions.map(action => 
      action.id === actionId 
        ? { ...action, config: { ...action.config, [field]: value } }
        : action
    ));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {workflow ? 'Edit Workflow' : 'Create New Workflow'}
            </h1>
            <p className="text-muted-foreground">
              Build automated workflows to streamline your business processes
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveWorkflowMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveWorkflowMutation.isPending ? 'Saving...' : 'Save Workflow'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Workflow Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Workflow Name</Label>
                      <Input
                        id="name"
                        value={workflowData.name}
                        onChange={(e) => setWorkflowData({ ...workflowData, name: e.target.value })}
                        placeholder="Enter workflow name"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={workflowData.isActive}
                        onChange={(e) => setWorkflowData({ ...workflowData, isActive: e.target.checked })}
                      />
                      <Label htmlFor="isActive">Activate immediately after saving</Label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={workflowData.description}
                      onChange={(e) => setWorkflowData({ ...workflowData, description: e.target.value })}
                      placeholder="Describe what this workflow does"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Triggers Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Triggers
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Define when this workflow should run
                      </p>
                    </div>
                    <Button onClick={() => setShowTriggerForm(true)} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Trigger
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {triggers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No triggers configured</p>
                      <p className="text-sm">Add a trigger to specify when this workflow should run</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {triggers.map((trigger) => {
                        const triggerType = triggerTypes.find(t => t.id === trigger.type);
                        const IconComponent = trigger.icon;
                        
                        return (
                          <div key={trigger.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <IconComponent className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{trigger.name}</h4>
                                  <p className="text-sm text-muted-foreground">{trigger.category}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTrigger(trigger.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {triggerType && (
                              <div className="grid grid-cols-2 gap-4">
                                {triggerType.fields.map((field) => (
                                  <div key={field.name}>
                                    <Label htmlFor={`trigger-${trigger.id}-${field.name}`}>
                                      {field.label}
                                      {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    {field.type === 'select' ? (
                                      <Select
                                        value={trigger.config[field.name] || ""}
                                        onValueChange={(value) => updateTriggerConfig(trigger.id, field.name, value)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {field.options?.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : field.type === 'textarea' ? (
                                      <Textarea
                                        id={`trigger-${trigger.id}-${field.name}`}
                                        value={trigger.config[field.name] || ""}
                                        onChange={(e) => updateTriggerConfig(trigger.id, field.name, e.target.value)}
                                        placeholder={field.placeholder}
                                        rows={2}
                                      />
                                    ) : (
                                      <Input
                                        id={`trigger-${trigger.id}-${field.name}`}
                                        type={field.type === 'number' ? 'number' : 'text'}
                                        value={trigger.config[field.name] || ""}
                                        onChange={(e) => updateTriggerConfig(trigger.id, field.name, e.target.value)}
                                        placeholder={field.placeholder}
                                      />
                                    )}
                                    {field.description && (
                                      <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Arrow */}
              {triggers.length > 0 && (
                <div className="flex justify-center">
                  <div className="p-2 bg-muted rounded-full">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Actions Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Actions
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Define what should happen when the workflow triggers
                      </p>
                    </div>
                    <Button onClick={() => setShowActionForm(true)} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Action
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {actions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No actions configured</p>
                      <p className="text-sm">Add actions to specify what should happen when triggered</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {actions.map((action, index) => {
                        const actionType = actionTypes.find(t => t.id === action.type);
                        const IconComponent = action.icon;
                        
                        return (
                          <div key={action.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    Step {index + 1}
                                  </Badge>
                                  <div className="p-2 bg-green-100 rounded-lg">
                                    <IconComponent className="h-4 w-4 text-green-600" />
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium">{action.name}</h4>
                                  <p className="text-sm text-muted-foreground">{action.category}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAction(action.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {actionType && (
                              <div className="grid grid-cols-2 gap-4">
                                {actionType.fields.map((field) => (
                                  <div key={field.name} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                                    <Label htmlFor={`action-${action.id}-${field.name}`}>
                                      {field.label}
                                      {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    {field.type === 'select' ? (
                                      <Select
                                        value={action.config[field.name] || ""}
                                        onValueChange={(value) => updateActionConfig(action.id, field.name, value)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {field.options?.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : field.type === 'textarea' ? (
                                      <Textarea
                                        id={`action-${action.id}-${field.name}`}
                                        value={action.config[field.name] || ""}
                                        onChange={(e) => updateActionConfig(action.id, field.name, e.target.value)}
                                        placeholder={field.placeholder}
                                        rows={3}
                                      />
                                    ) : (
                                      <Input
                                        id={`action-${action.id}-${field.name}`}
                                        type={field.type === 'number' ? 'number' : 'text'}
                                        value={action.config[field.name] || ""}
                                        onChange={(e) => updateActionConfig(action.id, field.name, e.target.value)}
                                        placeholder={field.placeholder}
                                      />
                                    )}
                                    {field.description && (
                                      <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar for adding triggers/actions */}
          {(showTriggerForm || showActionForm) && (
            <div className="w-80 border-l bg-muted/10">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {showTriggerForm ? 'Add Trigger' : 'Add Action'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowTriggerForm(false);
                      setShowActionForm(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="p-4">
                  {showTriggerForm && (
                    <div className="space-y-4">
                      {Object.entries(
                        triggerTypes.reduce((acc, trigger) => {
                          if (!acc[trigger.category]) acc[trigger.category] = [];
                          acc[trigger.category].push(trigger);
                          return acc;
                        }, {} as Record<string, TriggerType[]>)
                      ).map(([category, categoryTriggers]) => (
                        <div key={category}>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                            {category}
                          </h4>
                          <div className="space-y-2">
                            {categoryTriggers.map((trigger) => {
                              const IconComponent = trigger.icon;
                              return (
                                <Card
                                  key={trigger.id}
                                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => addTrigger(trigger)}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-start gap-3">
                                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                                        <IconComponent className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-medium text-sm">{trigger.name}</h5>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {trigger.description}
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showActionForm && (
                    <div className="space-y-4">
                      {Object.entries(
                        actionTypes.reduce((acc, action) => {
                          if (!acc[action.category]) acc[action.category] = [];
                          acc[action.category].push(action);
                          return acc;
                        }, {} as Record<string, ActionType[]>)
                      ).map(([category, categoryActions]) => (
                        <div key={category}>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                            {category}
                          </h4>
                          <div className="space-y-2">
                            {categoryActions.map((action) => {
                              const IconComponent = action.icon;
                              return (
                                <Card
                                  key={action.id}
                                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => addAction(action)}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-start gap-3">
                                      <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                                        <IconComponent className="h-4 w-4 text-green-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-medium text-sm">{action.name}</h5>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {action.description}
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}