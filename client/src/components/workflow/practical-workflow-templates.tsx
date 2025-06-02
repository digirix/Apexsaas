import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  UserPlus,
  Flag,
  Zap,
  Calendar,
  Plus,
  Database,
  Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PracticalWorkflowTemplatesProps {
  onCreateFromTemplate: (template: any) => void;
}

export function PracticalWorkflowTemplates({ onCreateFromTemplate }: PracticalWorkflowTemplatesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current application data to show realistic templates
  const { data: clients = [] } = useQuery({ queryKey: ["/api/v1/clients"] });
  const { data: entities = [] } = useQuery({ queryKey: ["/api/v1/entities"] });
  const { data: users = [] } = useQuery({ queryKey: ["/api/v1/users"] });
  const { data: taskCategories = [] } = useQuery({ queryKey: ["/api/v1/setup/task-categories"] });

  // Practical workflow templates based on real accounting firm scenarios
  const practicalTemplates = [
    {
      id: "new_client_onboarding",
      name: "New Client Onboarding Automation",
      description: "Automatically create onboarding tasks when a new client is added",
      category: "Client Management",
      icon: UserPlus,
      estimatedTimeSaved: "2 hours per client",
      popularity: "High",
      triggers: [
        {
          type: "client_created",
          name: "New Client Added",
          config: {
            clientType: "" // Any client type
          }
        }
      ],
      actions: [
        {
          type: "create_follow_up_task",
          name: "Create Client Information Gathering Task",
          config: {
            taskTitle: "Gather client documentation for {{client.name}}",
            taskDescription: "Collect required documents:\n- Business registration\n- Previous tax returns\n- Financial statements\n- Banking details",
            assignToUser: users[0]?.id?.toString() || "1",
            categoryId: taskCategories.find(cat => cat.name.toLowerCase().includes('onboard'))?.id?.toString() || taskCategories[0]?.id?.toString() || "1",
            dueInDays: "3"
          }
        },
        {
          type: "create_follow_up_task",
          name: "Create Entity Setup Task",
          config: {
            taskTitle: "Set up entities for {{client.name}}",
            taskDescription: "Create all necessary entities and configure tax jurisdictions",
            assignToUser: users[0]?.id?.toString() || "1",
            categoryId: taskCategories.find(cat => cat.name.toLowerCase().includes('setup'))?.id?.toString() || taskCategories[0]?.id?.toString() || "1",
            dueInDays: "5"
          }
        },
        {
          type: "send_team_alert",
          name: "Notify Team of New Client",
          config: {
            alertTitle: "New client onboarded: {{client.name}}",
            alertMessage: "A new client has been added to the system. Please review and assign appropriate team members.",
            severity: "INFO",
            targetUsers: "all"
          }
        }
      ]
    },
    {
      id: "overdue_task_escalation",
      name: "Overdue Task Escalation",
      description: "Automatically escalate and reassign overdue tasks to managers",
      category: "Task Management",
      icon: AlertTriangle,
      estimatedTimeSaved: "30 minutes per overdue task",
      popularity: "High",
      triggers: [
        {
          type: "task_overdue",
          name: "Task Becomes Overdue",
          config: {
            categoryFilter: "",
            overdueHours: "24"
          }
        }
      ],
      actions: [
        {
          type: "send_team_alert",
          name: "Send Escalation Alert",
          config: {
            alertTitle: "URGENT: Task overdue for {{client.name}}",
            alertMessage: "Task '{{task.title}}' is overdue by {{overdue.hours}} hours for client {{client.name}} - {{entity.name}}. Immediate attention required.",
            severity: "CRITICAL",
            targetUsers: "managers"
          }
        },
        {
          type: "create_follow_up_task",
          name: "Create Manager Review Task",
          config: {
            taskTitle: "Review overdue task: {{task.title}}",
            taskDescription: "Review and address overdue task for {{client.name}}. Original task was due on {{task.dueDate}}.",
            assignToUser: users.find(u => u.displayName.toLowerCase().includes('manager') || u.displayName.toLowerCase().includes('senior'))?.id?.toString() || users[0]?.id?.toString() || "1",
            categoryId: taskCategories.find(cat => cat.name.toLowerCase().includes('review'))?.id?.toString() || taskCategories[0]?.id?.toString() || "1",
            dueInDays: "1"
          }
        }
      ]
    },
    {
      id: "compliance_deadline_reminder",
      name: "Compliance Deadline Reminders",
      description: "Send reminders and create tasks for upcoming compliance deadlines",
      category: "Compliance",
      icon: Flag,
      estimatedTimeSaved: "1 hour per compliance deadline",
      popularity: "Critical",
      triggers: [
        {
          type: "entity_compliance_due",
          name: "Compliance Deadline Approaching",
          config: {
            daysBefore: "14",
            entityFilter: ""
          }
        }
      ],
      actions: [
        {
          type: "create_compliance_task",
          name: "Create Compliance Preparation Task",
          config: {
            complianceType: "tax_filing",
            taskTitle: "Prepare {{complianceType}} for {{entity.name}}",
            priorityLevel: "high"
          }
        },
        {
          type: "send_team_alert",
          name: "Send Compliance Alert",
          config: {
            alertTitle: "Compliance deadline approaching: {{entity.name}}",
            alertMessage: "{{entity.name}} has a compliance deadline in {{deadline.daysLeft}} days. Please ensure all preparations are completed.",
            severity: "WARNING",
            targetUsers: "all"
          }
        },
        {
          type: "update_entity_data",
          name: "Update Entity Status",
          config: {
            fieldToUpdate: "notes",
            newValue: "Compliance deadline reminder sent on {{current.date}} - Due in {{deadline.daysLeft}} days"
          }
        }
      ]
    },
    {
      id: "task_completion_workflow",
      name: "Task Completion Follow-up",
      description: "Automatically create follow-up actions when important tasks are completed",
      category: "Task Management",
      icon: CheckCircle,
      estimatedTimeSaved: "45 minutes per completed task",
      popularity: "Medium",
      triggers: [
        {
          type: "task_status_changed",
          name: "Task Marked Complete",
          config: {
            fromStatus: "",
            toStatus: taskCategories.find(cat => cat.name.toLowerCase().includes('complete'))?.id?.toString() || "3"
          }
        }
      ],
      actions: [
        {
          type: "update_client_status",
          name: "Update Client Notes",
          config: {
            statusUpdate: "",
            addNote: "Task completed: {{task.title}} - Completed on {{completion.date}}"
          }
        },
        {
          type: "create_follow_up_task",
          name: "Create Quality Review Task",
          config: {
            taskTitle: "Quality review for {{task.title}}",
            taskDescription: "Review completed work for {{client.name}} - {{entity.name}}",
            assignToUser: users.find(u => u.displayName.toLowerCase().includes('senior') || u.displayName.toLowerCase().includes('manager'))?.id?.toString() || users[0]?.id?.toString() || "1",
            categoryId: taskCategories.find(cat => cat.name.toLowerCase().includes('review'))?.id?.toString() || taskCategories[0]?.id?.toString() || "1",
            dueInDays: "2"
          }
        }
      ]
    },
    {
      id: "weekly_status_report",
      name: "Weekly Team Status Reports",
      description: "Generate automated weekly status reports for team performance",
      category: "Reporting",
      icon: FileText,
      estimatedTimeSaved: "3 hours per week",
      popularity: "Medium",
      triggers: [
        {
          type: "schedule_trigger",
          name: "Weekly Schedule",
          config: {
            scheduleType: "weekly",
            time: "09:00",
            cronExpression: ""
          }
        }
      ],
      actions: [
        {
          type: "send_team_alert",
          name: "Send Weekly Report",
          config: {
            alertTitle: "Weekly Status Report - Week of {{week.start}}",
            alertMessage: "Weekly performance summary:\n- Tasks completed: {{stats.completed}}\n- Tasks overdue: {{stats.overdue}}\n- New clients: {{stats.newClients}}\n- Compliance deadlines this week: {{stats.deadlines}}",
            severity: "INFO",
            targetUsers: "managers"
          }
        }
      ]
    },
    {
      id: "client_data_maintenance",
      name: "Client Data Maintenance",
      description: "Regular maintenance and updates of client information",
      category: "Data Management",
      icon: Database,
      estimatedTimeSaved: "2 hours per month per client",
      popularity: "Low",
      triggers: [
        {
          type: "schedule_trigger",
          name: "Monthly Maintenance",
          config: {
            scheduleType: "monthly",
            time: "10:00",
            cronExpression: ""
          }
        }
      ],
      actions: [
        {
          type: "create_follow_up_task",
          name: "Create Data Review Task",
          config: {
            taskTitle: "Monthly client data review",
            taskDescription: "Review and update client information, verify contact details, and check for any required document updates",
            assignToUser: users[0]?.id?.toString() || "1",
            categoryId: taskCategories.find(cat => cat.name.toLowerCase().includes('review') || cat.name.toLowerCase().includes('maintenance'))?.id?.toString() || taskCategories[0]?.id?.toString() || "1",
            dueInDays: "15"
          }
        }
      ]
    }
  ];

  const createFromTemplate = (template: any) => {
    // Transform template into workflow format
    const workflowFromTemplate = {
      name: template.name,
      description: template.description,
      isActive: false, // Start as draft
      triggers: template.triggers,
      actions: template.actions
    };

    onCreateFromTemplate(workflowFromTemplate);
    
    toast({
      title: "Template Loaded",
      description: `"${template.name}" template has been loaded into the workflow builder.`,
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Client Management": return UserPlus;
      case "Task Management": return CheckCircle;
      case "Compliance": return Flag;
      case "Reporting": return FileText;
      case "Data Management": return Database;
      default: return Settings;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Client Management": return "bg-blue-100 text-blue-800";
      case "Task Management": return "bg-green-100 text-green-800";
      case "Compliance": return "bg-red-100 text-red-800";
      case "Reporting": return "bg-purple-100 text-purple-800";
      case "Data Management": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPopularityColor = (popularity: string) => {
    switch (popularity) {
      case "High": return "bg-green-100 text-green-800";
      case "Critical": return "bg-red-100 text-red-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Group templates by category
  const templatesByCategory = practicalTemplates.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, typeof practicalTemplates>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Practical Workflow Templates</h3>
          <p className="text-sm text-muted-foreground">
            Pre-built workflows designed for accounting firms with real-world scenarios
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4" />
          <span>{practicalTemplates.length} templates available</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Available Data</p>
                <p className="text-xs text-muted-foreground">{clients.length} clients, {entities.length} entities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Time Savings</p>
                <p className="text-xs text-muted-foreground">Up to 8+ hours/week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Team Members</p>
                <p className="text-xs text-muted-foreground">{users.length} users available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Categories</p>
                <p className="text-xs text-muted-foreground">{taskCategories.length} task types</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Categories */}
      <div className="space-y-6">
        {Object.entries(templatesByCategory).map(([category, templates]) => {
          const CategoryIcon = getCategoryIcon(category);
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-medium">{category}</h4>
                <Badge variant="outline" className="text-xs">
                  {templates.length} template{templates.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => {
                  const TemplateIcon = template.icon;
                  return (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <TemplateIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                            </div>
                          </div>
                        </div>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {/* Badges */}
                          <div className="flex flex-wrap gap-2">
                            <Badge 
                              variant="outline" 
                              className={getCategoryColor(template.category)}
                            >
                              {template.category}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={getPopularityColor(template.popularity)}
                            >
                              {template.popularity}
                            </Badge>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {template.triggers.length} trigger{template.triggers.length !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <Settings className="h-3 w-3" />
                              {template.actions.length} action{template.actions.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Time saved */}
                          <div className="p-2 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">
                                Saves: {template.estimatedTimeSaved}
                              </span>
                            </div>
                          </div>

                          {/* Use Template Button */}
                          <Button 
                            onClick={() => createFromTemplate(template)}
                            className="w-full"
                            size="sm"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Use This Template
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Note */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-blue-100 rounded">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h5 className="font-medium text-blue-900 mb-1">Using Templates with Your Data</h5>
            <p className="text-sm text-blue-700">
              These templates are configured with your current application data including {clients.length} clients, 
              {entities.length} entities, and {users.length} team members. When you use a template, 
              the workflow will be automatically populated with appropriate assignments and categories 
              based on your existing setup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}