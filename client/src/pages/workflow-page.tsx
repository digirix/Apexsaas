import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { WorkflowList } from "@/components/workflow/workflow-list";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { WorkflowExecutionLogs } from "@/components/workflow/workflow-execution-logs";

export function WorkflowPage() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [showExecutionLogs, setShowExecutionLogs] = useState(false);

  // Handle workflow selection for editing
  const handleSelectWorkflow = (id: number) => {
    setSelectedWorkflowId(id);
    setShowExecutionLogs(false);
  };

  // Handle workflow creation
  const handleCreateWorkflow = (id: number) => {
    setSelectedWorkflowId(id);
    setShowExecutionLogs(false);
  };

  // Handle back navigation in workflow builder or execution logs
  const handleBack = () => {
    setSelectedWorkflowId(null);
    setShowExecutionLogs(false);
  };

  // Handle viewing execution logs
  const handleViewExecutionLogs = (id: number) => {
    setSelectedWorkflowId(id);
    setShowExecutionLogs(true);
  };

  // Render the appropriate view based on state
  const renderContent = () => {
    if (selectedWorkflowId) {
      if (showExecutionLogs) {
        return (
          <WorkflowExecutionLogs
            workflowId={selectedWorkflowId}
            onBack={handleBack}
          />
        );
      } else {
        return (
          <WorkflowBuilder
            workflowId={selectedWorkflowId}
            onBack={handleBack}
          />
        );
      }
    } else {
      return (
        <WorkflowList
          onSelectWorkflow={handleSelectWorkflow}
          onCreateWorkflow={handleCreateWorkflow}
          onViewExecutionLogs={handleViewExecutionLogs}
        />
      );
    }
  };

  return (
    <AppLayout title="Workflow Automation">
      {renderContent()}
    </AppLayout>
  );
}