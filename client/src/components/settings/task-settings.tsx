import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TenantSetting } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Save, X } from "lucide-react";

export function TaskSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [defaultTaskPriority, setDefaultTaskPriority] = useState("medium");
  const [defaultDueDays, setDefaultDueDays] = useState("7");
  const [enableAutomaticAssignment, setEnableAutomaticAssignment] = useState(false);
  const [enableTaskDeadlines, setEnableTaskDeadlines] = useState(true);
  const [enableTaskReminders, setEnableTaskReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState("1,3");
  const [enableRecurringTasks, setEnableRecurringTasks] = useState(true);
  const [showCompletedTasks, setShowCompletedTasks] = useState("30");
  const [defaultTaskView, setDefaultTaskView] = useState("list");
  const [defaultAssignee, setDefaultAssignee] = useState("0");
  const [enableTaskDependencies, setEnableTaskDependencies] = useState(true);
  const [taskTimeTracking, setTaskTimeTracking] = useState(true);
  const [enableTaskComments, setEnableTaskComments] = useState(true);
  const [enableTaskAttachments, setEnableTaskAttachments] = useState(true);
  const [enableTaskNotes, setEnableTaskNotes] = useState(true);
  
  // Fetch settings
  const { data: settings = [], isLoading: isSettingsLoading } = useQuery<TenantSetting[]>({
    queryKey: ["/api/v1/tenant/settings"],
    refetchOnWindowFocus: false
  });
  
  // Fetch users for assignee selection
  const { data: users = [], isLoading: isUsersLoading } = useQuery<any[]>({
    queryKey: ["/api/v1/users"],
    refetchOnWindowFocus: false
  });
  
  // Set up mutations for saving settings
  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/tenant/settings",
        { key, value }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tenant/settings"] });
    }
  });
  
  // Initialize form from settings
  useEffect(() => {
    if (settings.length > 0) {
      // Lookup function for settings
      const getSetting = (key: string) => {
        const setting = settings.find(s => s.key === key);
        return setting ? setting.value : "";
      };
      
      setDefaultTaskPriority(getSetting("default_task_priority") || "medium");
      setDefaultDueDays(getSetting("default_task_due_days") || "7");
      setEnableAutomaticAssignment(getSetting("enable_automatic_assignment") === "true");
      setEnableTaskDeadlines(getSetting("enable_task_deadlines") !== "false");
      setEnableTaskReminders(getSetting("enable_task_reminders") !== "false");
      setReminderDays(getSetting("task_reminder_days") || "1,3");
      setEnableRecurringTasks(getSetting("enable_recurring_tasks") !== "false");
      setShowCompletedTasks(getSetting("show_completed_tasks_days") || "30");
      setDefaultTaskView(getSetting("default_task_view") || "list");
      setDefaultAssignee(getSetting("default_assignee") || "0");
      setEnableTaskDependencies(getSetting("enable_task_dependencies") !== "false");
      setTaskTimeTracking(getSetting("task_time_tracking") !== "false");
      setEnableTaskComments(getSetting("enable_task_comments") !== "false");
      setEnableTaskAttachments(getSetting("enable_task_attachments") !== "false");
      setEnableTaskNotes(getSetting("enable_task_notes") !== "false");
    }
  }, [settings]);
  
  // Handle save all settings
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Create array of settings to save
      const settingsToSave = [
        { key: "default_task_priority", value: defaultTaskPriority },
        { key: "default_task_due_days", value: defaultDueDays },
        { key: "enable_automatic_assignment", value: enableAutomaticAssignment.toString() },
        { key: "enable_task_deadlines", value: enableTaskDeadlines.toString() },
        { key: "enable_task_reminders", value: enableTaskReminders.toString() },
        { key: "task_reminder_days", value: reminderDays },
        { key: "enable_recurring_tasks", value: enableRecurringTasks.toString() },
        { key: "show_completed_tasks_days", value: showCompletedTasks },
        { key: "default_task_view", value: defaultTaskView },
        { key: "default_assignee", value: defaultAssignee },
        { key: "enable_task_dependencies", value: enableTaskDependencies.toString() },
        { key: "task_time_tracking", value: taskTimeTracking.toString() },
        { key: "enable_task_comments", value: enableTaskComments.toString() },
        { key: "enable_task_attachments", value: enableTaskAttachments.toString() },
        { key: "enable_task_notes", value: enableTaskNotes.toString() }
      ];
      
      // Save each setting
      for (const setting of settingsToSave) {
        await saveSettingMutation.mutateAsync(setting);
      }
      
      toast({
        title: "Settings saved",
        description: "Your task settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Note: Task Categories and Task Statuses are now managed in the Setup Module
  
  const isLoading = isSettingsLoading || isUsersLoading;
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Task Settings</CardTitle>
        <CardDescription>Configure task behavior and default options</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Task Defaults</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-priority">Default Priority</Label>
              <Select 
                value={defaultTaskPriority}
                onValueChange={setDefaultTaskPriority}
              >
                <SelectTrigger id="default-priority">
                  <SelectValue placeholder="Select default priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-due-days">Default Due Days</Label>
              <Input 
                id="default-due-days" 
                type="number"
                min="1"
                value={defaultDueDays}
                onChange={(e) => setDefaultDueDays(e.target.value)}
                placeholder="7"
              />
              <p className="text-xs text-muted-foreground">Days until a new task is due</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-assignee">Default Assignee</Label>
              <Select 
                value={defaultAssignee}
                onValueChange={setDefaultAssignee}
              >
                <SelectTrigger id="default-assignee">
                  <SelectValue placeholder="Select default assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Default Assignee</SelectItem>
                  <SelectItem value="current_user">Current User</SelectItem>
                  {users && users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-view">Default Task View</Label>
              <Select 
                value={defaultTaskView}
                onValueChange={setDefaultTaskView}
              >
                <SelectTrigger id="default-view">
                  <SelectValue placeholder="Select default view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List View</SelectItem>
                  <SelectItem value="kanban">Kanban Board</SelectItem>
                  <SelectItem value="calendar">Calendar View</SelectItem>
                  <SelectItem value="gantt">Gantt Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="completed-visibility">Show Completed Tasks</Label>
              <Select 
                value={showCompletedTasks}
                onValueChange={setShowCompletedTasks}
              >
                <SelectTrigger id="completed-visibility">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="-1">Always show all</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Task Features</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="automatic-assignment">Automatic Assignment</Label>
                <p className="text-sm text-muted-foreground">Automatically assign tasks based on workload</p>
              </div>
              <Switch 
                id="automatic-assignment" 
                checked={enableAutomaticAssignment}
                onCheckedChange={setEnableAutomaticAssignment}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="task-deadlines">Task Deadlines</Label>
                <p className="text-sm text-muted-foreground">Enable due dates for tasks</p>
              </div>
              <Switch 
                id="task-deadlines" 
                checked={enableTaskDeadlines}
                onCheckedChange={setEnableTaskDeadlines}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="recurring-tasks">Recurring Tasks</Label>
                <p className="text-sm text-muted-foreground">Allow tasks to recur on a schedule</p>
              </div>
              <Switch 
                id="recurring-tasks" 
                checked={enableRecurringTasks}
                onCheckedChange={setEnableRecurringTasks}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="task-dependencies">Task Dependencies</Label>
                <p className="text-sm text-muted-foreground">Allow tasks to depend on completion of other tasks</p>
              </div>
              <Switch 
                id="task-dependencies" 
                checked={enableTaskDependencies}
                onCheckedChange={setEnableTaskDependencies}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="time-tracking">Time Tracking</Label>
                <p className="text-sm text-muted-foreground">Enable tracking time spent on tasks</p>
              </div>
              <Switch 
                id="time-tracking" 
                checked={taskTimeTracking}
                onCheckedChange={setTaskTimeTracking}
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Task Reminders</h3>
              <p className="text-sm text-muted-foreground">
                Configure when to send task reminders
              </p>
            </div>
            <Switch 
              checked={enableTaskReminders}
              onCheckedChange={setEnableTaskReminders}
            />
          </div>
          
          <div className={`space-y-2 ${!enableTaskReminders ? 'opacity-50' : ''}`}>
            <Label htmlFor="reminder-days">Reminder Days</Label>
            <Input 
              id="reminder-days" 
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
              placeholder="1,3"
              disabled={!enableTaskReminders}
            />
            <p className="text-xs text-muted-foreground">Days before due date to send reminders (e.g., 1,3)</p>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Task Content</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="task-comments">Task Comments</Label>
                <p className="text-sm text-muted-foreground">Allow adding comments to tasks</p>
              </div>
              <Switch 
                id="task-comments" 
                checked={enableTaskComments}
                onCheckedChange={setEnableTaskComments}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="task-attachments">Task Attachments</Label>
                <p className="text-sm text-muted-foreground">Allow file attachments on tasks</p>
              </div>
              <Switch 
                id="task-attachments" 
                checked={enableTaskAttachments}
                onCheckedChange={setEnableTaskAttachments}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="task-notes">Task Notes</Label>
                <p className="text-sm text-muted-foreground">Allow adding detailed notes to tasks</p>
              </div>
              <Switch 
                id="task-notes" 
                checked={enableTaskNotes}
                onCheckedChange={setEnableTaskNotes}
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Task Categories and Statuses</h3>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-sm">
              Task Categories and Statuses are now managed in the Setup Module to ensure consistency across the application.
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/setup?category=task-management'}
              className="mt-2"
            >
              Go to Task Management Setup
            </Button>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}