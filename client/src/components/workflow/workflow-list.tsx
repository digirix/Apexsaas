import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  History, 
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WorkflowListProps {
  workflows: any[];
  isLoading: boolean;
  onEdit: (workflow: any) => void;
  onToggle: (workflow: any) => void;
  onDelete: (workflow: any) => void;
  onViewLogs: (workflow: any) => void;
}

export function WorkflowList({ 
  workflows, 
  isLoading, 
  onEdit, 
  onToggle, 
  onDelete, 
  onViewLogs 
}: WorkflowListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading workflows...</div>
        </CardContent>
      </Card>
    );
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Workflows Found</CardTitle>
          <CardDescription>
            You haven't created any workflows yet. Click "Create Workflow" to get started.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflows</CardTitle>
        <CardDescription>
          Manage your automated workflows and monitor their performance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{workflow.name}</div>
                    {workflow.description && (
                      <div className="text-sm text-muted-foreground">
                        {workflow.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={workflow.isActive ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {workflow.isActive ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {workflow.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">
                      {workflow.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggle(workflow)}
                      title={workflow.isActive ? "Pause workflow" : "Activate workflow"}
                    >
                      {workflow.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(workflow)}
                      title="Edit workflow"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewLogs(workflow)}
                      title="View execution logs"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(workflow)}
                      title="Delete workflow"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}