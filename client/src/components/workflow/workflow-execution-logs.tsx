import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { WorkflowExecutionLog } from "@shared/schema";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, InfoIcon } from "lucide-react";

interface WorkflowExecutionLogsProps {
  workflowId: number;
  onBack: () => void;
}

export function WorkflowExecutionLogs({ workflowId, onBack }: WorkflowExecutionLogsProps) {
  // Fetch workflow execution logs
  const {
    data: logs = [],
    isLoading,
    error,
  } = useQuery<WorkflowExecutionLog[]>({
    queryKey: [`/api/v1/workflows/${workflowId}/execution-logs`],
  });

  // Format execution status with badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Success
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Spinner size="sm" className="mr-1" />
            Processing
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <InfoIcon className="h-3 w-3" />
            {status}
          </Badge>
        );
    }
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
            <p>Failed to load execution logs. Please try again later.</p>
            <Button onClick={onBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workflow
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">Workflow Execution Logs</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
          <CardDescription>
            View the execution history of this workflow to track its performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-lg">
              <p className="text-gray-500 mb-2">
                No execution logs found for this workflow.
              </p>
              <p className="text-gray-500 text-sm">
                Logs will appear here once the workflow has been triggered.
              </p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.executedAt), "yyyy-MM-dd HH:mm:ss")}
                      </TableCell>
                      <TableCell>{log.triggerData}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.executionData || log.errorMessage || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}