import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Calendar
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface WorkflowLogsProps {
  selectedWorkflow?: any;
}

export function WorkflowLogs({ selectedWorkflow }: WorkflowLogsProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch execution logs
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["/api/v1/workflows/logs", selectedWorkflow?.id, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedWorkflow?.id) {
        params.append("workflowId", selectedWorkflow.id.toString());
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      const response = await fetch(`/api/v1/workflows/logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch logs");
      return response.json();
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "running":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "success":
        return "default";
      case "error":
        return "destructive";
      case "running":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading execution logs...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Execution Logs
                {selectedWorkflow && (
                  <span className="text-sm font-normal text-muted-foreground">
                    for "{selectedWorkflow.name}"
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Monitor workflow execution history and troubleshoot issues.
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedWorkflow 
                ? `No execution logs found for "${selectedWorkflow.name}".`
                : "No execution logs found. Workflows will appear here after they run."
              }
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-medium">{log.workflowName || "Unknown Workflow"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getStatusBadgeVariant(log.status)}
                        className="flex items-center gap-1 w-fit"
                      >
                        {getStatusIcon(log.status)}
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(log.startedAt), "MMM dd, yyyy HH:mm")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.startedAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.completedAt ? (
                        <div className="text-sm">
                          {Math.round(
                            (new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000
                          )}s
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Running...</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {log.triggerData ? JSON.parse(log.triggerData).triggerType || "Manual" : "Manual"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.errorMessage ? (
                        <div className="text-sm text-red-600 max-w-xs truncate" title={log.errorMessage}>
                          {log.errorMessage}
                        </div>
                      ) : log.result ? (
                        <div className="text-sm text-green-600">
                          Actions completed successfully
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {log.status === "running" ? "In progress..." : "No details"}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Executions
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Success Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {logs.length > 0 
                ? Math.round((logs.filter((l: any) => l.status === "success").length / logs.length) * 100)
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              {logs.filter((l: any) => l.status === "success").length} successful
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Failed Executions
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {logs.filter((l: any) => l.status === "error").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}