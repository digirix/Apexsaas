import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Task, User, TaskStatus, Client, Entity } from "@shared/schema";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Minimize2, 
  Maximize2, 
  X, 
  MessageSquare, 
  Timer,
  FileText,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  ArrowRight,
  Building2,
  User as UserIcon
} from "lucide-react";
import { TaskChat } from "./task-chat";
import { TaskTimeTracking } from "./task-time-tracking";
import { ModernAddTaskModal } from "./modern-add-task-modal";

interface ModernTaskViewModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModernTaskViewModal({ task, open, onOpenChange }: ModernTaskViewModalProps) {
  const { toast } = useToast();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isEditing, setIsEditing] = useState(false);

  // Fetch related data
  const { data: users = [] } = useQuery({
    queryKey: ["/api/v1/users"],
    enabled: open && !!task,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/v1/clients"],
    enabled: open && !!task,
  });

  const { data: taskStatuses = [] } = useQuery({
    queryKey: ["/api/v1/setup/task-statuses"],
    enabled: open && !!task,
  });

  if (!task) {
    return null;
  }

  const assignee = users.find((u: User) => u.id === task.assigneeId);
  const client = clients.find((c: Client) => c.id === task.clientId);
  const status = taskStatuses.find((s: TaskStatus) => s.id === task.statusId);

  const getStatusColor = (statusName: string) => {
    switch (statusName?.toLowerCase()) {
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

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Not set";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "Not set";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleClose = () => {
    setActiveTab("details");
    setIsMinimized(false);
    setIsMaximized(false);
    setIsEditing(false);
    onOpenChange(false);
  };

  const handleEditComplete = () => {
    setIsEditing(false);
    queryClient.invalidateQueries({ queryKey: ["/api/v1/tasks"] });
    toast({
      title: "Task Updated",
      description: "The task has been updated successfully.",
    });
  };

  return (
    <>
      <Dialog open={open && !isEditing} onOpenChange={handleClose}>
        <DialogContent 
          className={`
            ${isMaximized 
              ? 'max-w-[95vw] max-h-[95vh] w-full h-full' 
              : 'max-w-5xl max-h-[85vh]'
            } 
            ${isMinimized ? 'h-16' : ''} 
            p-0 gap-0 bg-background border shadow-2xl transition-all duration-200
          `}
        >
          {/* Modern Window Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-semibold truncate">
                  {task.taskDetails || "Task Details"}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor(status?.name || "")}>
                    {status?.name || "No Status"}
                  </Badge>
                  <Badge variant="outline">
                    {task.taskType}
                  </Badge>
                  {task.isRecurring && (
                    <Badge variant="secondary">Recurring</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8 p-0"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          {!isMinimized && (
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="px-4 pt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Task Details
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
                </div>

                <div className="flex-1 overflow-hidden px-4 pb-4">
                  <TabsContent value="details" className="h-full">
                    <ScrollArea className="h-full pr-4">
                      <div className="space-y-6">
                        {/* Task Overview */}
                        <Card>
                          <CardHeader className="pb-3">
                            <h3 className="font-medium flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Task Overview
                            </h3>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Description</label>
                              <p className="text-sm mt-1 p-3 bg-muted/50 rounded-md">
                                {task.taskDetails || "No description provided"}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Task Type</label>
                                <p className="text-sm mt-1 font-medium">{task.taskType || "General"}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Category</label>
                                <p className="text-sm mt-1 font-medium">
                                  {task.taskCategoryId ? `Category ${task.taskCategoryId}` : "Uncategorized"}
                                </p>
                              </div>
                            </div>

                            {task.nextToDo && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Next To Do</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <ArrowRight className="h-4 w-4 text-blue-500" />
                                  <p className="text-sm">{task.nextToDo}</p>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Assignment & Timeline */}
                        <Card>
                          <CardHeader className="pb-3">
                            <h3 className="font-medium flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Assignment & Timeline
                            </h3>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                              <div className="flex items-center gap-3 mt-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-sm">
                                    {assignee?.displayName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{assignee?.displayName || "Unassigned"}</p>
                                  <p className="text-xs text-muted-foreground">{assignee?.email}</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{formatDate(task.dueDate)}</span>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <div className="mt-1">
                                  <Badge className={getStatusColor(status?.name || "")}>
                                    {status?.name || "No Status"}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Created</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{formatDateTime(task.createdAt)}</span>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{formatDateTime(task.updatedAt)}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Client & Entity Information */}
                        <Card>
                          <CardHeader className="pb-3">
                            <h3 className="font-medium flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Client & Entity Information
                            </h3>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Client</label>
                              {client ? (
                                <div className="flex items-center gap-3 mt-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-sm">
                                      {client.displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">{client.displayName}</p>
                                    <p className="text-xs text-muted-foreground">{client.email}</p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm mt-1 text-muted-foreground">No client assigned</p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Entity</label>
                                <p className="text-sm mt-1">
                                  {task.entityId ? `Entity ${task.entityId}` : "No entity assigned"}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Service Type</label>
                                <p className="text-sm mt-1">
                                  {task.serviceTypeId ? `Service ${task.serviceTypeId}` : "No service type"}
                                </p>
                              </div>
                            </div>

                            {(task.serviceRate || task.currency) && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Service Rate</label>
                                  <p className="text-sm mt-1 font-medium">
                                    {task.currency} {task.serviceRate}
                                  </p>
                                </div>
                                {task.isRecurring && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Frequency</label>
                                    <p className="text-sm mt-1">{task.complianceFrequency}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Additional Information */}
                        {(task.isAdmin || task.activatedAt) && (
                          <Card>
                            <CardHeader className="pb-3">
                              <h3 className="font-medium flex items-center gap-2">
                                <UserIcon className="h-4 w-4" />
                                Additional Information
                              </h3>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {task.isAdmin && (
                                <div>
                                  <Badge variant="outline">Administrative Task</Badge>
                                </div>
                              )}
                              {task.activatedAt && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Activated At</label>
                                  <p className="text-sm mt-1">{formatDateTime(task.activatedAt)}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="chat" className="h-full">
                    <TaskChat taskId={task.id} users={users} />
                  </TabsContent>

                  <TabsContent value="time" className="h-full">
                    <TaskTimeTracking taskId={task.id} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <ModernAddTaskModal
        isOpen={isEditing}
        onClose={handleEditComplete}
        taskType={task.isAdmin ? "admin" : "revenue"}
        editingTask={task}
      />
    </>
  );
}