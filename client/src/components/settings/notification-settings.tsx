import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

export function NotificationSettings() {
  return (
    <Card>
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
                <Switch id="task-assigned" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="task-due">Task Due Soon</Label>
                  <p className="text-sm text-muted-foreground">When a task is due within the next few days</p>
                </div>
                <Switch id="task-due" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="task-status">Task Status Changes</Label>
                  <p className="text-sm text-muted-foreground">When the status of a task you're involved with changes</p>
                </div>
                <Switch id="task-status" defaultChecked />
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
                <Switch id="new-client" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="client-portal">Client Portal Activity</Label>
                  <p className="text-sm text-muted-foreground">When a client takes action in their portal</p>
                </div>
                <Switch id="client-portal" defaultChecked />
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
                <Switch id="invoice-paid" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="invoice-overdue">Invoice Overdue</Label>
                  <p className="text-sm text-muted-foreground">When an invoice becomes overdue</p>
                </div>
                <Switch id="invoice-overdue" defaultChecked />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="app" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="notification-limit">Maximum Unread Notifications</Label>
              <Input id="notification-limit" type="number" min="5" defaultValue="50" />
              <p className="text-sm text-muted-foreground">Maximum number of unread notifications to keep</p>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">Show browser notifications when you receive new alerts</p>
              </div>
              <Switch id="desktop-notifications" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="sound-alerts">Sound Alerts</Label>
                <p className="text-sm text-muted-foreground">Play a sound when you receive important notifications</p>
              </div>
              <Switch id="sound-alerts" defaultChecked />
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notification Preferences</h3>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="notify-task">Task Updates</Label>
                  <p className="text-sm text-muted-foreground">Show in-app notifications for task updates</p>
                </div>
                <Switch id="notify-task" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="notify-client">Client Updates</Label>
                  <p className="text-sm text-muted-foreground">Show in-app notifications for client updates</p>
                </div>
                <Switch id="notify-client" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="notify-finance">Finance Updates</Label>
                  <p className="text-sm text-muted-foreground">Show in-app notifications for finance updates</p>
                </div>
                <Switch id="notify-finance" defaultChecked />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button variant="outline" className="mr-2">Reset to Defaults</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}