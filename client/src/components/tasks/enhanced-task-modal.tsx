import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskChat } from "./task-chat";
import { TaskTimeTracking } from "./task-time-tracking";
import { 
  MessageSquare, 
  Clock, 
  User, 
  Calendar, 
  AlertCircle,
  CheckCircle2,
  Timer,
  Users
} from "lucide-react";
import type { Task } from "@shared/schema";

interface EnhancedTaskModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhancedTaskModal({ task, open, onOpenChange }: EnhancedTaskModalProps) {
  const [activeTab, setActiveTab] = useState("details");

  // Fetch users for mentions in chat
  const { data: users = [] } = useQuery({
    queryKey: ["/api/v1/users"],
    enabled: open && !!task,
  });

  if (!task) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Not set";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{task.title}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getStatusColor(task.status || "")}>
                  {task.status || "No Status"}
                </Badge>
                {task.priority && (
                  <Badge variant="outline" className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                )}
                {task.taskType && (
                  <Badge variant="secondary">{task.taskType}</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Discussion
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Time Tracking
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="details" className="h-full overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Task Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Task Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <p className="text-sm mt-1">{task.description || "No description provided"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Type</label>
                      <p className="text-sm mt-1">{task.taskType || "General"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Category</label>
                      <p className="text-sm mt-1">{task.taskCategoryId ? `Category ${task.taskCategoryId}` : "Uncategorized"}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Assignment & Dates */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Assignment & Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {task.assigneeId ? "U" : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {task.assigneeId ? `User ${task.assigneeId}` : "Unassigned"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(task.dueDate)}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Created</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(task.createdAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Client & Entity Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Client & Entity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Client</label>
                      <p className="text-sm mt-1">
                        {task.clientId ? `Client ${task.clientId}` : "No client assigned"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Entity</label>
                      <p className="text-sm mt-1">
                        {task.entityId ? `Entity ${task.entityId}` : "No entity assigned"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Service Type</label>
                      <p className="text-sm mt-1">
                        {task.serviceTypeId ? `Service ${task.serviceTypeId}` : "No service type"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Task Progress */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Status</label>
                      <Badge className={`${getStatusColor(task.status || "")} mt-1`}>
                        {task.status || "No Status"}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Last Updated</label>
                      <p className="text-sm mt-1">{formatDate(task.updatedAt)}</p>
                    </div>
                    {task.notes && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Notes</label>
                        <p className="text-sm mt-1 bg-muted p-2 rounded text-muted-foreground">
                          {task.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="h-full overflow-hidden">
              <TaskChat taskId={task.id} users={users} />
            </TabsContent>

            <TabsContent value="time" className="h-full overflow-y-auto">
              <TaskTimeTracking taskId={task.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}