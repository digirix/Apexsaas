import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Bell, RefreshCw, Users, FileText, DollarSign, Workflow, Shield, TrendingUp, Brain, AlertTriangle, Settings, ChevronDown, ChevronRight, Building2, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Integrated notification types (fully working with business logic)
const INTEGRATED_CATEGORIES = {
  "Tasks & Projects": {
    icon: FileText,
    isIntegrated: true,
    types: [
      { key: "TASK_ASSIGNMENT", label: "Task Assignments", description: "When tasks are assigned to you" },
      { key: "TASK_UPDATE", label: "Task Updates", description: "When task details are modified" },
      { key: "TASK_COMPLETED", label: "Task Completions", description: "When tasks are marked complete" },
      { key: "TASK_DUE_SOON", label: "Due Date Reminders", description: "When tasks are approaching due dates" },
      { key: "TASK_OVERDUE", label: "Overdue Tasks", description: "When tasks become overdue" },
      { key: "TASK_STATUS_CHANGED", label: "Status Changes", description: "When task status is updated" },
      { key: "TASK_APPROVED", label: "Task Approvals", description: "When tasks are approved" },
      { key: "TASK_REJECTED", label: "Task Rejections", description: "When tasks are rejected" },
      { key: "TASK_COMMENT_ADDED", label: "Task Comments", description: "When comments are added to tasks" }
    ]
  },
  "Clients & Entities": {
    icon: Users,
    isIntegrated: true,
    types: [
      { key: "CLIENT_CREATED", label: "New Clients", description: "When new clients are added" },
      { key: "CLIENT_UPDATED", label: "Client Updates", description: "When client information is modified" },
      { key: "ENTITY_CREATED", label: "New Entities", description: "When new entities are created" },
      { key: "ENTITY_UPDATED", label: "Entity Updates", description: "When entity information is modified" }
    ]
  },
  "Users & Administration": {
    icon: Shield,
    isIntegrated: true,
    types: [
      { key: "USER_CREATED", label: "New Users", description: "When new users are added to the system" },
      { key: "USER_UPDATED", label: "User Updates", description: "When user information is modified" }
    ]
  },
  "Invoices & Billing": {
    icon: DollarSign,
    isIntegrated: true,
    types: [
      { key: "INVOICE_CREATED", label: "New Invoices", description: "When new invoices are created" },
      { key: "INVOICE_UPDATED", label: "Invoice Updates", description: "When invoice details are modified" },
      { key: "INVOICE_SENT", label: "Invoice Sent", description: "When invoices are sent to clients" },
      { key: "INVOICE_PAID", label: "Payment Received", description: "When invoice payments are received" },
      { key: "INVOICE_OVERDUE", label: "Overdue Invoices", description: "When invoices become overdue" }
    ]
  }
};

// Unintegrated notification types (schema exists but no business logic triggers)
const UNINTEGRATED_CATEGORIES = {
  "User Management": {
    icon: Users,
    isIntegrated: false,
    types: [
      { key: "USER_DELETED", label: "User Deletion", description: "When users are removed from the system" },
      { key: "USER_PERMISSION_CHANGED", label: "Permission Changes", description: "When user permissions are modified" }
    ]
  },
  "Entity Management": {
    icon: Building2,
    isIntegrated: false,
    types: [
      { key: "ENTITY_DELETED", label: "Entity Deletion", description: "When entities are removed" }
    ]
  },
  "Payment Processing": {
    icon: DollarSign,
    isIntegrated: false,
    types: [
      { key: "PAYMENT_RECEIVED", label: "Payment Received", description: "When payments are processed" },
      { key: "PAYMENT_FAILED", label: "Payment Failed", description: "When payment processing fails" },
      { key: "PAYMENT_PENDING", label: "Payment Pending", description: "When payments are pending processing" }
    ]
  },
  "Workflow Automation": {
    icon: Workflow,
    isIntegrated: false,
    types: [
      { key: "WORKFLOW_STARTED", label: "Workflow Started", description: "When automated workflows begin" },
      { key: "WORKFLOW_COMPLETED", label: "Workflow Completed", description: "When workflows finish successfully" },
      { key: "WORKFLOW_FAILED", label: "Workflow Failed", description: "When workflows encounter errors" }
    ]
  },
  "System Administration": {
    icon: Settings,
    isIntegrated: false,
    types: [
      { key: "SYSTEM_MAINTENANCE", label: "System Maintenance", description: "System maintenance notifications" },
      { key: "SYSTEM_UPDATE", label: "System Updates", description: "When system updates are available" },
      { key: "SYSTEM_BACKUP_COMPLETED", label: "Backup Completed", description: "When system backups complete" }
    ]
  },
  "AI & Analytics": {
    icon: Brain,
    isIntegrated: false,
    types: [
      { key: "AI_TASK_COMPLETED", label: "AI Task Completed", description: "When AI processing tasks complete" },
      { key: "AI_ANALYSIS_READY", label: "AI Analysis Ready", description: "When AI analysis results are available" },
      { key: "AI_ERROR", label: "AI Processing Error", description: "When AI processing encounters errors" }
    ]
  },
  "Reporting & Analytics": {
    icon: TrendingUp,
    isIntegrated: false,
    types: [
      { key: "REPORT_GENERATED", label: "Report Generated", description: "When scheduled reports are generated" },
      { key: "REPORT_SCHEDULED", label: "Report Scheduled", description: "When new reports are scheduled" },
      { key: "REPORT_FAILED", label: "Report Failed", description: "When report generation fails" }
    ]
  },
  "Compliance & Tax": {
    icon: AlertTriangle,
    isIntegrated: false,
    types: [
      { key: "COMPLIANCE_DEADLINE_APPROACHING", label: "Compliance Deadline", description: "When compliance deadlines approach" },
      { key: "COMPLIANCE_VIOLATION_DETECTED", label: "Compliance Violation", description: "When compliance violations are detected" },
      { key: "TAX_DEADLINE_APPROACHING", label: "Tax Deadline", description: "When tax deadlines approach" },
      { key: "TAX_FILING_COMPLETED", label: "Tax Filing Completed", description: "When tax filings are completed" }
    ]
  }
};

// Legacy categories structure for backward compatibility
const NOTIFICATION_CATEGORIES = {
  ...INTEGRATED_CATEGORIES,
  "Clients & Entities (Legacy)": {
    icon: Users,
    types: [
      { key: "CLIENT_CREATED", label: "New Clients", description: "When new clients are added" },
      { key: "CLIENT_UPDATED", label: "Client Updates", description: "When client information changes" },
      { key: "CLIENT_DEACTIVATED", label: "Client Deactivations", description: "When clients are deactivated" },
      { key: "CLIENT_PORTAL_ACCESS_GRANTED", label: "Portal Access Granted", description: "When clients gain portal access" },
      { key: "CLIENT_PORTAL_ACCESS_REVOKED", label: "Portal Access Revoked", description: "When client portal access is removed" },
      { key: "CLIENT_DOCUMENT_UPLOADED", label: "Document Uploads", description: "When clients upload documents" },
      { key: "CLIENT_MESSAGE_RECEIVED", label: "Client Messages", description: "When clients send messages" },
      { key: "ENTITY_CREATED", label: "New Entities", description: "When new entities are created" },
      { key: "ENTITY_UPDATED", label: "Entity Updates", description: "When entity information changes" },
      { key: "ENTITY_DEACTIVATED", label: "Entity Deactivations", description: "When entities are deactivated" },
      { key: "ENTITY_SERVICE_SUBSCRIPTION_CHANGED", label: "Service Changes", description: "When entity services are modified" }
    ]
  },
  "Finance & Payments": {
    icon: DollarSign,
    types: [
      { key: "INVOICE_CREATED", label: "New Invoices", description: "When invoices are created" },
      { key: "INVOICE_SENT", label: "Invoice Sent", description: "When invoices are sent to clients" },
      { key: "INVOICE_PAID", label: "Payment Received", description: "When invoices are paid" },
      { key: "INVOICE_OVERDUE", label: "Overdue Invoices", description: "When invoices become overdue" },
      { key: "PAYMENT_RECEIVED", label: "Payments", description: "When payments are processed" },
      { key: "PAYMENT_FAILED", label: "Payment Failures", description: "When payments fail to process" }
    ]
  },
  "Users & System": {
    icon: Settings,
    types: [
      { key: "USER_CREATED", label: "New Users", description: "When new users are added" },
      { key: "USER_UPDATED", label: "User Updates", description: "When user information changes" },
      { key: "USER_DEACTIVATED", label: "User Deactivations", description: "When users are deactivated" },
      { key: "USER_PERMISSION_CHANGED", label: "Permission Changes", description: "When user permissions are modified" },
      { key: "SYSTEM_MAINTENANCE", label: "System Maintenance", description: "During scheduled maintenance" },
      { key: "SYSTEM_UPDATE", label: "System Updates", description: "When system is updated" },
      { key: "SYSTEM_ERROR", label: "System Errors", description: "When system errors occur" }
    ]
  },
  "Workflows & Automation": {
    icon: Workflow,
    types: [
      { key: "WORKFLOW_STARTED", label: "Workflow Started", description: "When workflows begin execution" },
      { key: "WORKFLOW_COMPLETED", label: "Workflow Completed", description: "When workflows finish successfully" },
      { key: "WORKFLOW_FAILED", label: "Workflow Failures", description: "When workflows encounter errors" },
      { key: "WORKFLOW_ACTION_REQUIRED", label: "Action Required", description: "When workflows need user input" }
    ]
  },
  "AI & Reports": {
    icon: Brain,
    types: [
      { key: "AI_INTERACTION_COMPLETED", label: "AI Interactions", description: "When AI interactions complete" },
      { key: "REPORT_GENERATED", label: "Reports Generated", description: "When reports are created" },
      { key: "REPORT_FAILED", label: "Report Failures", description: "When report generation fails" }
    ]
  },
  "Compliance & Tax": {
    icon: Shield,
    types: [
      { key: "COMPLIANCE_DEADLINE_APPROACHING", label: "Compliance Due Soon", description: "When compliance deadlines approach" },
      { key: "COMPLIANCE_DEADLINE_MISSED", label: "Missed Deadlines", description: "When compliance deadlines are missed" },
      { key: "TAX_FILING_DUE", label: "Tax Filing Due", description: "When tax filings are due" },
      { key: "TAX_FILING_SUBMITTED", label: "Tax Filing Submitted", description: "When tax filings are submitted" }
    ]
  },
  "Custom": {
    icon: AlertTriangle,
    types: [
      { key: "CUSTOM", label: "Custom Notifications", description: "Custom notification types" }
    ]
  }
};

export function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [integratedOpen, setIntegratedOpen] = useState(false);
  const [unintegratedOpen, setUnintegratedOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch notification preferences
  const { data: preferences = [], isLoading, error } = useQuery({
    queryKey: ["/api/v1/notification-preferences"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update preference mutation
  const updatePreferenceMutation = useMutation({
    mutationFn: async ({ notificationType, isEnabled }: { notificationType: string; isEnabled: boolean }) => {
      return apiRequest(`/api/v1/notification-preferences/${notificationType}`, {
        method: "PUT",
        body: { isEnabled, deliveryChannels: '["in_app"]' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/notification-preferences"] });
      toast({
        title: "Settings Updated",
        description: "Notification preference saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update notification preference",
        variant: "destructive",
      });
    },
  });

  // Reset to defaults mutation
  const resetDefaultsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/v1/notification-preferences/reset", {
        method: "POST"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/notification-preferences"] });
      toast({
        title: "Settings Reset",
        description: "All notification preferences reset to defaults",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset notification preferences",
        variant: "destructive",
      });
    },
  });

  const handleTogglePreference = (notificationType: string, isEnabled: boolean) => {
    updatePreferenceMutation.mutate({ notificationType, isEnabled });
  };

  const handleResetDefaults = () => {
    resetDefaultsMutation.mutate();
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getPreferenceValue = (notificationType: string): boolean => {
    const preference = preferences.find((p: any) => p.notificationType === notificationType);
    return preference?.isEnabled ?? true; // Default to enabled if not found
  };

  const getEnabledCount = (categoryTypes: any[]): number => {
    return categoryTypes.filter(type => getPreferenceValue(type.key)).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading notification settings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Settings Unavailable</h3>
              <p className="text-muted-foreground mb-4">Unable to load notification preferences</p>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderCategorySection = (categories: any, isIntegrated: boolean) => {
    return Object.entries(categories).map(([categoryName, category]: [string, any]) => {
      const IconComponent = category.icon;
      const isExpanded = expandedCategories.has(categoryName);
      const enabledCount = getEnabledCount(category.types);
      const totalCount = category.types.length;

      return (
        <div key={categoryName} className="space-y-3">
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
            onClick={() => toggleCategory(categoryName)}
          >
            <div className="flex items-center space-x-3">
              <IconComponent className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {categoryName}
                  {isIntegrated ? (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Coming Soon
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {enabledCount} of {totalCount} notifications enabled
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={enabledCount === totalCount ? "default" : enabledCount === 0 ? "secondary" : "outline"}>
                {enabledCount}/{totalCount}
              </Badge>
              <Button variant="ghost" size="sm">
                {isExpanded ? "Collapse" : "Expand"}
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="ml-8 space-y-3">
              {category.types.map((notificationType: any) => {
                const isEnabled = getPreferenceValue(notificationType.key);
                const isUpdating = updatePreferenceMutation.isPending;

                return (
                  <div key={notificationType.key} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{notificationType.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {notificationType.key}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notificationType.description}
                      </p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleTogglePreference(notificationType.key, checked)}
                      disabled={isUpdating || !isIntegrated}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-muted-foreground">
            Control which notifications you receive for different system activities
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleResetDefaults}
          disabled={resetDefaultsMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${resetDefaultsMutation.isPending ? 'animate-spin' : ''}`} />
          Reset Defaults
        </Button>
      </div>

      {/* Integrated Notifications Section */}
      <Collapsible open={integratedOpen} onOpenChange={setIntegratedOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Active Notification Types</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {Object.keys(INTEGRATED_CATEGORIES).length} modules
                  </Badge>
                </div>
                {integratedOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </CardTitle>
              <CardDescription>
                Fully integrated notification types that work with your current business modules
              </CardDescription>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          {renderCategorySection(INTEGRATED_CATEGORIES, true)}
        </CollapsibleContent>
      </Collapsible>

      {/* Unintegrated Notifications Section */}
      <Collapsible open={unintegratedOpen} onOpenChange={setUnintegratedOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-500" />
                  <span>Upcoming Notification Types</span>
                  <Badge variant="secondary">
                    {Object.keys(UNINTEGRATED_CATEGORIES).length} modules
                  </Badge>
                </div>
                {unintegratedOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </CardTitle>
              <CardDescription>
                Notification types planned for future releases - preferences can be configured but won't trigger yet
              </CardDescription>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          {renderCategorySection(UNINTEGRATED_CATEGORIES, false)}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}