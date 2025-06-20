import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Users, 
  FileText, 
  Mail, 
  Clock, 
  DollarSign,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface WorkflowTemplatesProps {
  onCreateFromTemplate: (template: any) => void;
}

const workflowTemplates = [
  {
    id: "compliance-deadline-management",
    name: "Compliance Deadline Management",
    description: "Automatically create tasks and follow-ups for upcoming compliance deadlines",
    icon: AlertTriangle,
    category: "Compliance",
    popularity: "Most Popular",
    triggers: ["Compliance Deadline Alert"],
    actions: ["Create Tasks", "Send Email", "Generate Report"],
    estimatedTime: "4 minutes",
    template: {
      name: "Compliance Deadline Management Workflow",
      description: "Automate compliance deadline tracking and task creation for regulatory requirements",
      triggers: [
        {
          triggerModule: "compliance_deadline",
          triggerEvent: "deadline_approaching",
          triggerConditions: { alertDays: "14 days", filingType: "All Filings" }
        }
      ],
      actions: [
        {
          actionType: "create_task",
          actionConfiguration: {
            taskTitle: "Prepare {{filingType}} for {{entity.name}}",
            taskDescription: "Complete compliance filing due {{deadline.date}}",
            assignToUser: "Compliance Team",
            dueDateOffset: "1 Week",
            priority: "High",
            taskCategory: "Compliance Review"
          }
        },
        {
          actionType: "send_email",
          actionConfiguration: {
            recipientType: "Client",
            emailTemplate: "Compliance Alert",
            subject: "Important: {{filingType}} Due {{deadline.date}}",
            emailBody: "Dear {{client.name}},\n\nThis is a reminder that your {{filingType}} is due on {{deadline.date}}. We are preparing the necessary documents and will contact you if we need additional information.",
            urgent: "High Priority"
          }
        }
      ]
    }
  },
  {
    id: "task-completion-followup",
    name: "Task Completion Follow-up",
    description: "Automatically create review tasks and update statuses when tasks are completed",
    icon: CheckCircle,
    category: "Task Management",
    popularity: "Recommended",
    triggers: ["Task Status Changed"],
    actions: ["Create Follow-up Task", "Update Status", "Send Email"],
    estimatedTime: "3 minutes",
    template: {
      name: "Task Completion Follow-up Workflow",
      description: "Automate quality control and client communication when tasks are completed",
      triggers: [
        {
          triggerModule: "task_status_change",
          triggerEvent: "status_changed",
          triggerConditions: { toStatus: "Completed", taskCategory: "All Tasks" }
        }
      ],
      actions: [
        {
          actionType: "create_task",
          actionConfiguration: {
            taskTitle: "Quality Review: {{original.task.title}}",
            taskDescription: "Review completed work for quality and accuracy",
            assignToUser: "Manager",
            dueDateOffset: "1 Day",
            priority: "Medium",
            taskCategory: "Quality Control"
          }
        },
        {
          actionType: "send_email",
          actionConfiguration: {
            recipientType: "Client",
            emailTemplate: "Task Completion",
            subject: "Update: {{task.title}} Completed",
            emailBody: "Dear {{client.name}},\n\nWe have completed {{task.title}}. The work has been reviewed and is ready for your review if needed.",
            urgent: "Normal"
          }
        }
      ]
    }
  },
  {
    id: "document-processing",
    name: "Client Document Processing",
    description: "Automatically process and create tasks when clients upload documents",
    icon: FileText,
    category: "Document Management",
    popularity: "Popular",
    triggers: ["Client Document Upload"],
    actions: ["Create Task", "Send Email", "Update Status"],
    estimatedTime: "4 minutes",
    template: {
      name: "Document Processing Workflow",
      description: "Automate document review and processing when clients upload files",
      triggers: [
        {
          triggerModule: "client_document_upload",
          triggerEvent: "document_uploaded",
          triggerConditions: { documentTypes: "pdf,xlsx,csv", requiresReview: "Yes" }
        }
      ],
      actions: [
        {
          actionType: "create_task",
          actionConfiguration: {
            taskTitle: "Review {{document.type}} from {{client.name}}",
            taskDescription: "Review and process uploaded document: {{document.filename}}",
            assignToUser: "Compliance Team",
            dueDateOffset: "3 Days",
            priority: "Medium",
            taskCategory: "Document Review"
          }
        },
        {
          actionType: "send_email",
          actionConfiguration: {
            recipientType: "Client",
            emailTemplate: "Document Request",
            subject: "Document Received - {{document.filename}}",
            emailBody: "Dear {{client.name}},\n\nWe have received your document {{document.filename}}. Our team will review it within 3 business days and contact you if we need any additional information.",
            urgent: "Normal"
          }
        }
      ]
    }
  },
  {
    id: "monthly-reporting",
    name: "Monthly Reporting Automation",
    description: "Automatically generate and distribute monthly reports to clients",
    icon: FileText,
    category: "Reporting",
    popularity: "Essential",
    triggers: ["Recurring Schedule"],
    actions: ["Generate Report", "Send Email", "Create Task"],
    estimatedTime: "6 minutes",
    template: {
      name: "Monthly Reporting Workflow",
      description: "Automate monthly report generation and distribution",
      triggers: [
        {
          triggerModule: "recurring_schedule",
          triggerEvent: "scheduled_time",
          triggerConditions: { frequency: "Monthly", dayOfWeek: "Friday", timeOfDay: "09:00" }
        }
      ],
      actions: [
        {
          actionType: "generate_report",
          actionConfiguration: {
            reportType: "Client Status",
            reportFormat: "PDF",
            includeData: "Last 30 Days",
            recipients: "{{client.email}}",
            saveLocation: "reports/monthly/{{client.name}}_{{current.month}}.pdf"
          }
        },
        {
          actionType: "send_email",
          actionConfiguration: {
            recipientType: "Client",
            emailTemplate: "Custom",
            subject: "Monthly Report - {{current.month}} {{current.year}}",
            emailBody: "Dear {{client.name}},\n\nPlease find attached your monthly report for {{current.month}}. If you have any questions, please don't hesitate to contact us.",
            includeAttachments: "Related Documents"
          }
        }
      ]
    }
  },
  {
    id: "quality-assurance",
    name: "Quality Assurance Review",
    description: "Automatically create quality review tasks for completed work",
    icon: CheckCircle,
    category: "Quality Control",
    popularity: "Useful",
    triggers: ["Document Uploaded"],
    actions: ["Send Email", "Create Task", "Update Status"],
    estimatedTime: "5 minutes",
    template: {
      name: "Document Approval Workflow",
      description: "Streamline document review and approval processes",
      triggers: [
        {
          triggerModule: "documents",
          triggerEvent: "document_uploaded",
          triggerConditions: { requires_approval: true }
        }
      ],
      actions: [
        {
          actionType: "create_task",
          actionConfiguration: {
            title: "Review and approve {{document_name}}",
            description: "Review uploaded document and provide approval or feedback",
            taskCategoryId: "4",
            dueDateOffset: 2,
            priority: "medium"
          }
        },
        {
          actionType: "send_email",
          actionConfiguration: {
            template: "approval_request",
            subject: "Document Approval Required: {{document_name}}",
            message: "A new document has been uploaded and requires your approval."
          }
        }
      ]
    }
  },
  {
    id: "client-check-in",
    name: "Regular Client Check-ins",
    description: "Schedule periodic check-ins with clients to maintain relationships",
    icon: Mail,
    category: "Client Relations",
    popularity: "Recommended",
    triggers: ["Scheduled Interval"],
    actions: ["Create Task", "Send Email"],
    estimatedTime: "4 minutes",
    template: {
      name: "Client Check-in Workflow",
      description: "Maintain strong client relationships with regular check-ins",
      triggers: [
        {
          triggerModule: "schedule",
          triggerEvent: "quarterly_interval",
          triggerConditions: { client_type: "active" }
        }
      ],
      actions: [
        {
          actionType: "create_task",
          actionConfiguration: {
            title: "Quarterly check-in with {{client_name}}",
            description: "Conduct quarterly business review and address any concerns",
            taskCategoryId: "1",
            dueDateOffset: 7,
            priority: "medium"
          }
        }
      ]
    }
  }
];

export function WorkflowTemplates({ onCreateFromTemplate }: WorkflowTemplatesProps) {
  const getPopularityColor = (popularity: string) => {
    switch (popularity) {
      case "Most Popular":
        return "bg-green-100 text-green-800";
      case "Popular":
        return "bg-blue-100 text-blue-800";
      case "Recommended":
        return "bg-purple-100 text-purple-800";
      case "Essential":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      "Client Management": "border-l-blue-500",
      "Task Management": "border-l-green-500",
      "Financial Management": "border-l-yellow-500",
      "Compliance": "border-l-red-500",
      "Document Management": "border-l-purple-500",
      "Client Relations": "border-l-pink-500"
    };
    return colors[category as keyof typeof colors] || "border-l-gray-500";
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Workflow Templates</h3>
        <p className="text-muted-foreground">
          Get started quickly with pre-built workflow templates designed for accounting firms.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workflowTemplates.map((template) => {
          const IconComponent = template.icon;
          return (
            <Card 
              key={template.id} 
              className={`relative transition-all hover:shadow-lg border-l-4 ${getCategoryColor(template.category)}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <Badge className={`text-xs ${getPopularityColor(template.popularity)}`}>
                    {template.popularity}
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Category</div>
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Triggers</div>
                  <div className="flex flex-wrap gap-1">
                    {template.triggers.map((trigger, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {trigger}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Actions</div>
                  <div className="flex flex-wrap gap-1">
                    {template.actions.map((action, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Setup: {template.estimatedTime}
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => onCreateFromTemplate(template.template)}
                    className="text-xs"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
          <h4 className="font-semibold mb-2">Need a Custom Workflow?</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Don't see a template that fits your needs? Create a custom workflow from scratch.
          </p>
          <Button variant="outline" onClick={() => onCreateFromTemplate(null)}>
            Create Custom Workflow
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}