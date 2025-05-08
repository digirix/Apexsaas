import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TenantSetting } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";

export function NotificationSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  // Email notifications
  const [notifyTaskAssigned, setNotifyTaskAssigned] = useState(true);
  const [notifyTaskDue, setNotifyTaskDue] = useState(true);
  const [notifyTaskStatus, setNotifyTaskStatus] = useState(true);
  const [notifyNewClient, setNotifyNewClient] = useState(true);
  const [notifyClientPortal, setNotifyClientPortal] = useState(true);
  const [notifyInvoicePaid, setNotifyInvoicePaid] = useState(true);
  const [notifyInvoiceOverdue, setNotifyInvoiceOverdue] = useState(true);
  
  // In-app notifications
  const [notificationLimit, setNotificationLimit] = useState("50");
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [notifyTaskUpdates, setNotifyTaskUpdates] = useState(true);
  const [notifyClientUpdates, setNotifyClientUpdates] = useState(true);
  const [notifyFinanceUpdates, setNotifyFinanceUpdates] = useState(true);
  
  // Fetch settings
  const { data: settings = [], isLoading } = useQuery<TenantSetting[]>({
    queryKey: ["/api/v1/tenant/settings"],
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
      
      // Email notifications
      setNotifyTaskAssigned(getSetting("notify_task_assigned") !== "false");
      setNotifyTaskDue(getSetting("notify_task_due") !== "false");
      setNotifyTaskStatus(getSetting("notify_task_status") !== "false");
      setNotifyNewClient(getSetting("notify_new_client") !== "false");
      setNotifyClientPortal(getSetting("notify_client_portal") !== "false");
      setNotifyInvoicePaid(getSetting("notify_invoice_paid") !== "false");
      setNotifyInvoiceOverdue(getSetting("notify_invoice_overdue") !== "false");
      
      // In-app notifications
      setNotificationLimit(getSetting("notification_limit") || "50");
      setDesktopNotifications(getSetting("desktop_notifications") !== "false");
      setSoundAlerts(getSetting("sound_alerts") !== "false");
      setNotifyTaskUpdates(getSetting("notify_task_updates") !== "false");
      setNotifyClientUpdates(getSetting("notify_client_updates") !== "false");
      setNotifyFinanceUpdates(getSetting("notify_finance_updates") !== "false");
    }
  }, [settings]);
  
  // Handle save all settings
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Create array of settings to save
      const settingsToSave = [
        // Email notifications
        { key: "notify_task_assigned", value: notifyTaskAssigned.toString() },
        { key: "notify_task_due", value: notifyTaskDue.toString() },
        { key: "notify_task_status", value: notifyTaskStatus.toString() },
        { key: "notify_new_client", value: notifyNewClient.toString() },
        { key: "notify_client_portal", value: notifyClientPortal.toString() },
        { key: "notify_invoice_paid", value: notifyInvoicePaid.toString() },
        { key: "notify_invoice_overdue", value: notifyInvoiceOverdue.toString() },
        
        // In-app notifications
        { key: "notification_limit", value: notificationLimit },
        { key: "desktop_notifications", value: desktopNotifications.toString() },
        { key: "sound_alerts", value: soundAlerts.toString() },
        { key: "notify_task_updates", value: notifyTaskUpdates.toString() },
        { key: "notify_client_updates", value: notifyClientUpdates.toString() },
        { key: "notify_finance_updates", value: notifyFinanceUpdates.toString() }
      ];
      
      // Save each setting
      for (const setting of settingsToSave) {
        await saveSettingMutation.mutateAsync(setting);
      }
      
      toast({
        title: "Settings saved",
        description: "Your notification settings have been updated successfully.",
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
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Configure how and when you receive notifications</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="email">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email Notifications</TabsTrigger>
            <TabsTrigger value="app">In-App Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-4 pt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Task Notifications</h3>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="task-assigned">Task Assigned</Label>
                  <p className="text-sm text-muted-foreground">When a task is assigned to you</p>
                </div>
                <Switch 
                  id="task-assigned" 
                  checked={notifyTaskAssigned}
                  onCheckedChange={setNotifyTaskAssigned}
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="task-due">Task Due Soon</Label>
                  <p className="text-sm text-muted-foreground">When a task is due within the next few days</p>
                </div>
                <Switch 
                  id="task-due" 
                  checked={notifyTaskDue}
                  onCheckedChange={setNotifyTaskDue}
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="task-status">Task Status Changes</Label>
                  <p className="text-sm text-muted-foreground">When the status of a task you're involved with changes</p>
                </div>
                <Switch 
                  id="task-status" 
                  checked={notifyTaskStatus}
                  onCheckedChange={setNotifyTaskStatus}
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Client Notifications</h3>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="new-client">New Client</Label>
                  <p className="text-sm text-muted-foreground">When a new client is added to the system</p>
                </div>
                <Switch 
                  id="new-client" 
                  checked={notifyNewClient}
                  onCheckedChange={setNotifyNewClient}
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="client-portal">Client Portal Activity</Label>
                  <p className="text-sm text-muted-foreground">When a client takes action in their portal</p>
                </div>
                <Switch 
                  id="client-portal" 
                  checked={notifyClientPortal}
                  onCheckedChange={setNotifyClientPortal}
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Finance Notifications</h3>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="invoice-paid">Invoice Paid</Label>
                  <p className="text-sm text-muted-foreground">When a client pays an invoice</p>
                </div>
                <Switch 
                  id="invoice-paid" 
                  checked={notifyInvoicePaid}
                  onCheckedChange={setNotifyInvoicePaid}
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="invoice-overdue">Invoice Overdue</Label>
                  <p className="text-sm text-muted-foreground">When an invoice becomes overdue</p>
                </div>
                <Switch 
                  id="invoice-overdue" 
                  checked={notifyInvoiceOverdue}
                  onCheckedChange={setNotifyInvoiceOverdue}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="app" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="notification-limit">Maximum Unread Notifications</Label>
              <Input 
                id="notification-limit" 
                type="number" 
                min="5" 
                value={notificationLimit}
                onChange={(e) => setNotificationLimit(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">Maximum number of unread notifications to keep</p>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">Show browser notifications when you receive new alerts</p>
              </div>
              <Switch 
                id="desktop-notifications" 
                checked={desktopNotifications}
                onCheckedChange={setDesktopNotifications}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="sound-alerts">Sound Alerts</Label>
                <p className="text-sm text-muted-foreground">Play a sound when you receive important notifications</p>
              </div>
              <Switch 
                id="sound-alerts" 
                checked={soundAlerts}
                onCheckedChange={setSoundAlerts}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notification Preferences</h3>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="notify-task">Task Updates</Label>
                  <p className="text-sm text-muted-foreground">Show in-app notifications for task updates</p>
                </div>
                <Switch 
                  id="notify-task" 
                  checked={notifyTaskUpdates}
                  onCheckedChange={setNotifyTaskUpdates}
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="notify-client">Client Updates</Label>
                  <p className="text-sm text-muted-foreground">Show in-app notifications for client updates</p>
                </div>
                <Switch 
                  id="notify-client" 
                  checked={notifyClientUpdates}
                  onCheckedChange={setNotifyClientUpdates}
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="notify-finance">Finance Updates</Label>
                  <p className="text-sm text-muted-foreground">Show in-app notifications for finance updates</p>
                </div>
                <Switch 
                  id="notify-finance" 
                  checked={notifyFinanceUpdates}
                  onCheckedChange={setNotifyFinanceUpdates}
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