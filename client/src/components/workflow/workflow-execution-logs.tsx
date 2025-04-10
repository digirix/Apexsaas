import { useQuery } from "@tanstack/react-query";
import { WorkflowExecutionLog, Workflow } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, ArrowLeft, Clock, Info, CheckCircle, XCircle } from "lucide-react";

interface WorkflowExecutionLogsProps {
  workflowId: number;
  onBack: () => void;
}

export function WorkflowExecutionLogs({ workflowId, onBack }: WorkflowExecutionLogsProps) {
  const { toast } = useToast();

  // Fetch workflow details
  const {
    data: workflow,
    isLoading: isLoadingWorkflow,
    error: workflowError,
  } = useQuery<Workflow>({
    queryKey: ['/api/v1/workflows', workflowId],
  });

  // Fetch workflow execution logs
  const {
    data: logs = [],
    isLoading: isLoadingLogs,
    error: logsError,
  } = useQuery<WorkflowExecutionLog[]>({
    queryKey: [`/api/v1/workflows/${workflowId}/logs`],
    refetchInterval: 10000, // Refresh logs every 10 seconds
  });

  // Get status badge based on log status
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Success</Badge>;
      case 'error':
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case 'running':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="h-3 w-3 mr-1" /> Running</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><Info className="h-3 w-3 mr-1" /> {status}</Badge>;
    }
  };

  if (isLoadingWorkflow || isLoadingLogs) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (workflowError || logsError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load workflow execution logs. Please try again later.</p>
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
          <h2 className="text-xl font-semibold">Execution Logs</h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{workflow?.name} - Execution History</CardTitle>
          <CardDescription>
            View the history of executions for this workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-lg">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Execution Logs Found</h3>
              <p className="text-gray-500">
                This workflow hasn't been executed yet. Logs will appear here once the workflow is triggered.
              </p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Date & Time</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Triggered By</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.executedAt), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.triggeredBy}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate">{log.details || "No details available"}</div>
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