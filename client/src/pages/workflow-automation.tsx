import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Settings, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  History, 
  Activity,
  Workflow,
  Zap
} from "lucide-react";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { WorkflowList } from "@/components/workflow/workflow-list";
import { WorkflowLogs } from "@/components/workflow/workflow-logs";
import { WorkflowTemplates } from "@/components/workflow/workflow-templates";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function WorkflowAutomation() {
  const [activeTab, setActiveTab] = useState("workflows");
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch workflows
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["/api/v1/workflows"],
  });

  // Toggle workflow status mutation
  const toggleWorkflowMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PUT", `/api/v1/workflows/${id}`, {
        workflow: { isActive },
        triggers: [],
        actions: []
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/workflows"] });
      toast({
        title: "Success",
        description: "Workflow status updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow status.",
        variant: "destructive",
      });
    },
  });

  // Delete workflow mutation
  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/v1/workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/workflows"] });
      toast({
        title: "Success",
        description: "Workflow deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete workflow.",
        variant: "destructive",
      });
    },
  });

  const handleCreateWorkflow = () => {
    setEditingWorkflow(null);
    setShowBuilder(true);
  };

  const handleEditWorkflow = (workflow: any) => {
    setEditingWorkflow(workflow);
    setShowBuilder(true);
  };

  const handleToggleWorkflow = (workflow: any) => {
    toggleWorkflowMutation.mutate({
      id: workflow.id,
      isActive: !workflow.isActive
    });
  };

  const handleDeleteWorkflow = (workflow: any) => {
    if (confirm(`Are you sure you want to delete "${workflow.name}"?`)) {
      deleteWorkflowMutation.mutate(workflow.id);
    }
  };

  const handleBuilderClose = () => {
    setShowBuilder(false);
    setEditingWorkflow(null);
  };

  if (showBuilder) {
    return (
      <WorkflowBuilder
        workflow={editingWorkflow}
        onClose={handleBuilderClose}
        onSave={() => {
          handleBuilderClose();
          queryClient.invalidateQueries({ queryKey: ["/api/v1/workflows"] });
        }}
      />
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Workflow className="h-8 w-8 text-primary" />
            Workflow Automation
          </h2>
          <p className="text-muted-foreground">
            Automate your business processes and reduce manual work with intelligent workflows.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreateWorkflow}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Execution Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Workflows
                </CardTitle>
                <Workflow className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workflows.length}</div>
                <p className="text-xs text-muted-foreground">
                  {workflows.filter((w: any) => w.isActive).length} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Workflows
                </CardTitle>
                <Play className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {workflows.filter((w: any) => w.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently running
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Draft Workflows
                </CardTitle>
                <Edit className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {workflows.filter((w: any) => w.status === 'draft').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Need configuration
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Inactive Workflows
                </CardTitle>
                <Pause className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {workflows.filter((w: any) => !w.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Paused or disabled
                </p>
              </CardContent>
            </Card>
          </div>

          <WorkflowList
            workflows={workflows}
            isLoading={isLoading}
            onEdit={handleEditWorkflow}
            onToggle={handleToggleWorkflow}
            onDelete={handleDeleteWorkflow}
            onViewLogs={(workflow) => {
              setSelectedWorkflow(workflow);
              setActiveTab("logs");
            }}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <WorkflowTemplates
            onCreateFromTemplate={(template) => {
              setEditingWorkflow(template);
              setShowBuilder(true);
            }}
          />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <WorkflowLogs selectedWorkflow={selectedWorkflow} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Performance</CardTitle>
                <CardDescription>
                  Average execution times and success rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">98.5%</div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Executions Today</CardTitle>
                <CardDescription>
                  Number of workflow executions in the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">127</div>
                  <p className="text-sm text-muted-foreground">Executions</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time Saved</CardTitle>
                <CardDescription>
                  Estimated manual work time saved this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">45h</div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}