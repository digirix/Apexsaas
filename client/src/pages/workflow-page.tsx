import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { WorkflowList } from "@/components/workflow/workflow-list";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { WorkflowExecutionLogs } from "@/components/workflow/workflow-execution-logs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export default function WorkflowPage() {
  const [selectedTab, setSelectedTab] = useState("list");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);

  // Handler for when a workflow is selected from the list
  const handleWorkflowSelect = (workflowId: number) => {
    setSelectedWorkflowId(workflowId);
    setSelectedTab("builder");
  };

  // Handler for when a new workflow is created
  const handleWorkflowCreate = (workflowId: number) => {
    setSelectedWorkflowId(workflowId);
    setSelectedTab("builder");
  };

  return (
    <AppLayout title="Workflow Management">
      <Card className="p-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="list">Workflow List</TabsTrigger>
            <TabsTrigger value="builder" disabled={!selectedWorkflowId && selectedTab !== "builder"}>
              Workflow Builder
            </TabsTrigger>
            <TabsTrigger value="logs" disabled={!selectedWorkflowId}>
              Execution Logs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list">
            <WorkflowList 
              onSelectWorkflow={handleWorkflowSelect}
              onCreateWorkflow={handleWorkflowCreate}
            />
          </TabsContent>
          
          <TabsContent value="builder">
            {selectedWorkflowId ? (
              <WorkflowBuilder 
                workflowId={selectedWorkflowId}
                onBack={() => setSelectedTab("list")}
              />
            ) : (
              <WorkflowBuilder 
                onBack={() => setSelectedTab("list")}
              />
            )}
          </TabsContent>
          
          <TabsContent value="logs">
            {selectedWorkflowId && (
              <WorkflowExecutionLogs 
                workflowId={selectedWorkflowId}
                onBack={() => setSelectedTab("list")}
              />
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </AppLayout>
  );
}