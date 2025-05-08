import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TenantSetting, TaskStatus } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, HelpCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function TaskSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [defaultAssigneeId, setDefaultAssigneeId] = useState("");
  const [defaultTaskStatusId, setDefaultTaskStatusId] = useState("");
  const [showComplianceCalendarReminders, setShowComplianceCalendarReminders] = useState(true);
  const [taskReminderDays, setTaskReminderDays] = useState("3,7,1");
  const [defaultLeadTime, setDefaultLeadTime] = useState("30");
  const [autoCreateInvoice, setAutoCreateInvoice] = useState(false);
  const [markCompletedOnInvoice, setMarkCompletedOnInvoice] = useState(true);
  
  // Fetch settings
  const { data: settings = [], isLoading: settingsLoading } = useQuery<TenantSetting[]>({
    queryKey: ["/api/v1/tenant/settings"],
    refetchOnWindowFocus: false
  });
  
  // Fetch task statuses for dropdown
  const { data: taskStatuses = [], isLoading: statusesLoading } = useQuery<TaskStatus[]>({
    queryKey: ["/api/v1/setup/task-statuses"],
    refetchOnWindowFocus: false
  });
  
  // Fetch users for dropdown
  const { data: users = [], isLoading: usersLoading } = useQuery({
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
      
      setDefaultAssigneeId(getSetting("default_assignee_id") || "");
      setDefaultTaskStatusId(getSetting("default_task_status_id") || "");
      setShowComplianceCalendarReminders(getSetting("show_compliance_calendar_reminders") !== "false");
      setTaskReminderDays(getSetting("task_reminder_days") || "3,7,1");
      setDefaultLeadTime(getSetting("default_lead_time") || "30");
      setAutoCreateInvoice(getSetting("auto_create_invoice") === "true");
      setMarkCompletedOnInvoice(getSetting("mark_completed_on_invoice") !== "false");
    }
  }, [settings]);
  
  // Handle save all settings
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Create array of settings to save
      const settingsToSave = [
        { key: "default_assignee_id", value: defaultAssigneeId },
        { key: "default_task_status_id", value: defaultTaskStatusId },
        { key: "show_compliance_calendar_reminders", value: showComplianceCalendarReminders.toString() },
        { key: "task_reminder_days", value: taskReminderDays },
        { key: "default_lead_time", value: defaultLeadTime },
        { key: "auto_create_invoice", value: autoCreateInvoice.toString() },
        { key: "mark_completed_on_invoice", value: markCompletedOnInvoice.toString() }
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
  
  const isLoading = settingsLoading || statusesLoading || usersLoading;
  
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
        <CardDescription>
          Configure default task behavior and automation settings
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="defaults">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="defaults">Default Values</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="defaults" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-assignee">Default Assignee</Label>
                <Select 
                  value={defaultAssigneeId} 
                  onValueChange={setDefaultAssigneeId}
                >
                  <SelectTrigger id="default-assignee">
                    <SelectValue placeholder="Select a default assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Default</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  The default user assigned to new tasks
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="default-status">Default Task Status</Label>
                <Select 
                  value={defaultTaskStatusId} 
                  onValueChange={setDefaultTaskStatusId}
                >
                  <SelectTrigger id="default-status">
                    <SelectValue placeholder="Select a default status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Default</SelectItem>
                    {taskStatuses.map(status => (
                      <SelectItem key={status.id} value={status.id.toString()}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  The default status for new tasks
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lead-time">Default Lead Time (days)</Label>
                <Input 
                  id="lead-time" 
                  type="number"
                  min="0"
                  value={defaultLeadTime} 
                  onChange={(e) => setDefaultLeadTime(e.target.value)}
                  placeholder="30"
                />
                <p className="text-sm text-muted-foreground">
                  Number of days before compliance deadlines to generate tasks
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="reminders" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-reminders">Show Calendar Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Display reminders for upcoming compliance deadlines in the calendar
                </p>
              </div>
              <Switch 
                id="show-reminders" 
                checked={showComplianceCalendarReminders}
                onCheckedChange={setShowComplianceCalendarReminders}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="reminder-days" className="mr-2">Reminder Days</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-80">
                        Comma-separated list of days before the due date to show reminders. For example, "3,7,1" will show reminders 7 days, 3 days, and 1 day before the due date.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input 
                id="reminder-days" 
                value={taskReminderDays} 
                onChange={(e) => setTaskReminderDays(e.target.value)}
                placeholder="3,7,1"
              />
              <p className="text-sm text-muted-foreground">
                Number of days before due date to show reminders (comma-separated)
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="automation" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-invoice">Automatically Create Invoice</Label>
                  <p className="text-sm text-muted-foreground">
                    Create an invoice automatically when a billable task is completed
                  </p>
                </div>
                <Switch 
                  id="auto-invoice" 
                  checked={autoCreateInvoice}
                  onCheckedChange={setAutoCreateInvoice}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mark-completed">Mark Task Completed on Invoice Creation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically mark tasks as completed when an invoice is created
                  </p>
                </div>
                <Switch 
                  id="mark-completed" 
                  checked={markCompletedOnInvoice}
                  onCheckedChange={setMarkCompletedOnInvoice}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
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