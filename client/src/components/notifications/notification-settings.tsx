import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Settings, 
  Mail, 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  PlayCircle, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  Clock, 
  Filter,
  BarChart3,
  Eye,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Email Provider Configuration Schema
const emailProviderSchema = z.object({
  provider: z.enum(['SENDGRID', 'SMTP', 'MAILGUN', 'SES', 'POSTMARK', 'RESEND']),
  fromEmail: z.string().email('Please enter a valid email address'),
  fromName: z.string().min(1, 'From name is required'),
  replyToEmail: z.string().email().optional().or(z.literal('')),
  apiKey: z.string().min(1, 'API key is required'),
  apiSecret: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpSecure: z.boolean().optional(),
  configData: z.string().optional(),
  isActive: z.boolean().default(false)
});

// Notification Trigger Schema
const notificationTriggerSchema = z.object({
  triggerName: z.string().min(1, 'Trigger name is required'),
  triggerModule: z.string().min(1, 'Module is required'),
  triggerEvent: z.string().min(1, 'Event is required'),
  notificationType: z.string().min(1, 'Notification type is required'),
  severity: z.enum(['INFO', 'SUCCESS', 'WARNING', 'CRITICAL']),
  titleTemplate: z.string().min(1, 'Title template is required'),
  messageTemplate: z.string().min(1, 'Message template is required'),
  linkTemplate: z.string().optional(),
  recipientType: z.enum(['all_users', 'specific_users', 'role_based', 'department_based', 'conditional']),
  recipientConfig: z.string().default('{}'),
  deliveryChannels: z.array(z.string()).default(['in_app']),
  deliveryDelay: z.number().default(0),
  batchDelivery: z.boolean().default(false),
  triggerConditions: z.string().optional(),
  isActive: z.boolean().default(true)
});

type EmailProvider = z.infer<typeof emailProviderSchema> & { id: number; createdAt: string; updatedAt: string };
type NotificationTrigger = z.infer<typeof notificationTriggerSchema> & { id: number; createdAt: string; updatedAt: string };

interface NotificationPreference {
  id?: number;
  notificationType: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  digestFrequency: string;
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
}

export function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('preferences');
  const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);
  const [isTriggerDialogOpen, setIsTriggerDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<EmailProvider | null>(null);
  const [editingTrigger, setEditingTrigger] = useState<NotificationTrigger | null>(null);
  const [testEmail, setTestEmail] = useState('');

  // Fetch notification preferences
  const { data: preferences = [], isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/v1/notifications/preferences']
  });

  // Fetch email providers
  const { data: emailProviders = [], isLoading: providersLoading } = useQuery({
    queryKey: ['/api/v1/notifications/email-providers']
  });

  // Fetch notification triggers
  const { data: triggers = [], isLoading: triggersLoading } = useQuery({
    queryKey: ['/api/v1/notifications/triggers']
  });

  // Fetch email delivery logs
  const { data: emailLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/v1/notifications/email-logs?limit=100']
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/v1/notifications/analytics']
  });

  // Mutations
  const updatePreferencesMutation = useMutation({
    mutationFn: (data: NotificationPreference[]) => 
      apiRequest('PUT', '/api/v1/notifications/preferences', data),
    onSuccess: () => {
      toast({ title: 'Preferences updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications/preferences'] });
    },
    onError: () => {
      toast({ title: 'Failed to update preferences', variant: 'destructive' });
    }
  });

  const createProviderMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('POST', '/api/v1/notifications/email-providers', data),
    onSuccess: () => {
      toast({ title: 'Email provider created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications/email-providers'] });
      setIsProviderDialogOpen(false);
      setEditingProvider(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create email provider', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const updateProviderMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/v1/notifications/email-providers/${id}`, data),
    onSuccess: () => {
      toast({ title: 'Email provider updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications/email-providers'] });
      setIsProviderDialogOpen(false);
      setEditingProvider(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update email provider', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const deleteProviderMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/v1/notifications/email-providers/${id}`),
    onSuccess: () => {
      toast({ title: 'Email provider deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications/email-providers'] });
    }
  });

  const testProviderMutation = useMutation({
    mutationFn: ({ id, email }: { id: number; email: string }) => 
      apiRequest('POST', `/api/v1/notifications/email-providers/${id}/test`, { testEmail: email }),
    onSuccess: () => {
      toast({ title: 'Test email sent successfully' });
      setTestEmail('');
    },
    onError: () => {
      toast({ title: 'Failed to send test email', variant: 'destructive' });
    }
  });

  const createTriggerMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('POST', '/api/v1/notifications/triggers', data),
    onSuccess: () => {
      toast({ title: 'Notification trigger created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications/triggers'] });
      setIsTriggerDialogOpen(false);
      setEditingTrigger(null);
    }
  });

  const updateTriggerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/v1/notifications/triggers/${id}`, data),
    onSuccess: () => {
      toast({ title: 'Notification trigger updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications/triggers'] });
      setIsTriggerDialogOpen(false);
      setEditingTrigger(null);
    }
  });

  const deleteTriggerMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/v1/notifications/triggers/${id}`),
    onSuccess: () => {
      toast({ title: 'Notification trigger deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications/triggers'] });
    }
  });

  // Email Provider Form
  const providerForm = useForm({
    resolver: zodResolver(emailProviderSchema),
    defaultValues: {
      provider: 'SENDGRID' as const,
      fromEmail: '',
      fromName: '',
      replyToEmail: '',
      apiKey: '',
      apiSecret: '',
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      configData: '',
      isActive: false
    }
  });

  // Trigger Form
  const triggerForm = useForm({
    resolver: zodResolver(notificationTriggerSchema),
    defaultValues: {
      triggerName: '',
      triggerModule: '',
      triggerEvent: '',
      notificationType: '',
      severity: 'INFO' as const,
      titleTemplate: '',
      messageTemplate: '',
      linkTemplate: '',
      recipientType: 'all_users' as const,
      recipientConfig: '{}',
      deliveryChannels: ['in_app'],
      deliveryDelay: 0,
      batchDelivery: false,
      triggerConditions: '',
      isActive: true
    }
  });

  // Handle provider form submission
  const onProviderSubmit = (data: any) => {
    if (editingProvider) {
      updateProviderMutation.mutate({ id: editingProvider.id, data });
    } else {
      createProviderMutation.mutate(data);
    }
  };

  // Handle trigger form submission
  const onTriggerSubmit = (data: any) => {
    if (editingTrigger) {
      updateTriggerMutation.mutate({ id: editingTrigger.id, data });
    } else {
      createTriggerMutation.mutate(data);
    }
  };

  // Reset forms when editing changes
  useEffect(() => {
    if (editingProvider) {
      providerForm.reset({
        provider: editingProvider.provider,
        fromEmail: editingProvider.fromEmail,
        fromName: editingProvider.fromName,
        replyToEmail: editingProvider.replyToEmail || '',
        apiKey: editingProvider.apiKey === '***' ? '' : editingProvider.apiKey,
        apiSecret: editingProvider.apiSecret || '',
        smtpHost: editingProvider.smtpHost || '',
        smtpPort: editingProvider.smtpPort || 587,
        smtpSecure: editingProvider.smtpSecure || false,
        configData: editingProvider.configData || '',
        isActive: editingProvider.isActive
      });
    } else {
      providerForm.reset();
    }
  }, [editingProvider, providerForm]);

  useEffect(() => {
    if (editingTrigger) {
      triggerForm.reset(editingTrigger);
    } else {
      triggerForm.reset();
    }
  }, [editingTrigger, triggerForm]);

  const notificationTypes = [
    'TASK_CREATED', 'TASK_UPDATED', 'TASK_COMPLETED', 'TASK_OVERDUE',
    'INVOICE_CREATED', 'INVOICE_SENT', 'INVOICE_PAID', 'INVOICE_OVERDUE',
    'PAYMENT_RECEIVED', 'PAYMENT_FAILED',
    'CLIENT_CREATED', 'CLIENT_UPDATED',
    'ENTITY_CREATED', 'ENTITY_UPDATED',
    'DEADLINE_APPROACHING', 'DEADLINE_MISSED',
    'SYSTEM_MESSAGE', 'SECURITY_ALERT',
    'WORKFLOW_COMPLETED', 'WORKFLOW_FAILED'
  ];

  const modules = [
    'tasks', 'finance', 'clients', 'entities', 'compliance', 
    'system', 'security', 'workflow', 'reports'
  ];

  const events = [
    'created', 'updated', 'deleted', 'completed', 'failed',
    'approved', 'rejected', 'sent', 'received', 'overdue',
    'approaching_deadline', 'status_changed'
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Settings</h1>
          <p className="text-muted-foreground">
            Configure notification preferences, email providers, and automation triggers
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="task-assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Task Assignments
          </TabsTrigger>
          <TabsTrigger value="email-providers" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Providers
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Triggers
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Email Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Task Assignment Notifications Tab */}
        <TabsContent value="task-assignments" className="space-y-6">
          <div className="grid gap-6">
            {/* Task Assignment Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Task Assignment Notification Controls
                </CardTitle>
                <CardDescription>
                  Configure how users are notified when tasks are created, updated, or assigned to them
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Immediate Assignment Notifications */}
                <div className="space-y-4">
                  <h4 className="font-medium">Immediate Assignment Notifications</h4>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">Task Assigned to User</Label>
                        <p className="text-sm text-muted-foreground">
                          Send instant notification when a task is assigned to a user
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch id="task-assign-email" />
                          <Label htmlFor="task-assign-email" className="text-sm">Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="task-assign-app" defaultChecked />
                          <Label htmlFor="task-assign-app" className="text-sm">In-App</Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">Task Status Changed</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify relevant users when task status is updated
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch id="task-status-email" />
                          <Label htmlFor="task-status-email" className="text-sm">Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="task-status-app" defaultChecked />
                          <Label htmlFor="task-status-app" className="text-sm">In-App</Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">Task Completed</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify supervisors and clients when tasks are completed
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch id="task-complete-email" defaultChecked />
                          <Label htmlFor="task-complete-email" className="text-sm">Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="task-complete-app" defaultChecked />
                          <Label htmlFor="task-complete-app" className="text-sm">In-App</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Recipient Configuration */}
                <div className="space-y-4">
                  <h4 className="font-medium">Notification Recipients</h4>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">Assigned User</Label>
                        <p className="text-sm text-muted-foreground">
                          Always notify the user when a task is assigned to them
                        </p>
                      </div>
                      <Switch defaultChecked disabled />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">Task Creator</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify the user who created the task when status changes
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">Client Managers</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify users with client access for client-related tasks
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">Administrators</Label>
                        <p className="text-sm text-muted-foreground">
                          Always notify admin users of task updates
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Timing and Delivery Options */}
                <div className="space-y-4">
                  <h4 className="font-medium">Delivery Timing</h4>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Task Assignment Delay</Label>
                        <Select defaultValue="immediate">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="5min">5 minutes</SelectItem>
                            <SelectItem value="15min">15 minutes</SelectItem>
                            <SelectItem value="30min">30 minutes</SelectItem>
                            <SelectItem value="1hour">1 hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Status Change Delay</Label>
                        <Select defaultValue="immediate">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="5min">5 minutes</SelectItem>
                            <SelectItem value="15min">15 minutes</SelectItem>
                            <SelectItem value="30min">30 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">Batch Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Group multiple task updates into digest emails
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">Quiet Hours</Label>
                        <p className="text-sm text-muted-foreground">
                          Respect user quiet hours for non-urgent notifications
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Priority-Based Notifications */}
                <div className="space-y-4">
                  <h4 className="font-medium">Priority-Based Notifications</h4>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">High Priority Tasks</Label>
                        <p className="text-sm text-muted-foreground">
                          Always send immediate notifications for high priority tasks
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch id="high-priority-email" defaultChecked />
                          <Label htmlFor="high-priority-email" className="text-sm">Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="high-priority-app" defaultChecked />
                          <Label htmlFor="high-priority-app" className="text-sm">In-App</Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="font-medium">Overdue Tasks</Label>
                        <p className="text-sm text-muted-foreground">
                          Send escalating notifications for overdue tasks
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch id="overdue-email" defaultChecked />
                          <Label htmlFor="overdue-email" className="text-sm">Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="overdue-app" defaultChecked />
                          <Label htmlFor="overdue-app" className="text-sm">In-App</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Test Notifications
                  </Button>
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Save Task Assignment Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Template Customization */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Templates</CardTitle>
                <CardDescription>
                  Customize the content and format of task assignment notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Task Assignment Email Template</Label>
                    <Textarea 
                      placeholder="Hello {{assignee_name}}, you have been assigned a new task: {{task_title}}. Due date: {{due_date}}. Priority: {{priority}}."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Task Status Change Template</Label>
                    <Textarea 
                      placeholder="Task '{{task_title}}' has been updated. Status changed from {{old_status}} to {{new_status}} by {{updated_by}}."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Task Completion Template</Label>
                    <Textarea 
                      placeholder="Great news! Task '{{task_title}}' has been completed by {{completed_by}} on {{completion_date}}."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Template Variables</AlertTitle>
                  <AlertDescription>
                    Available variables: {`{{assignee_name}}, {{task_title}}, {{due_date}}, {{priority}}, {{client_name}}, {{status}}, {{updated_by}}, {{completion_date}}`}
                  </AlertDescription>
                </Alert>

                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Templates
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notification Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you want to receive notifications for different types of events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {preferencesLoading ? (
                <div className="text-center py-8">Loading preferences...</div>
              ) : (
                <div className="space-y-4">
                  {notificationTypes.map((type) => {
                    const pref = preferences.find((p: any) => p.notificationType === type);
                    return (
                      <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{type.replace(/_/g, ' ').toLowerCase()}</h4>
                          <p className="text-sm text-muted-foreground">
                            Notifications for {type.toLowerCase().replace(/_/g, ' ')} events
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={pref?.inAppEnabled ?? true}
                              onCheckedChange={(checked) => {
                                const newPreferences = preferences.map((p: any) => 
                                  p.notificationType === type 
                                    ? { ...p, inAppEnabled: checked }
                                    : p
                                );
                                if (!pref) {
                                  newPreferences.push({
                                    notificationType: type,
                                    inAppEnabled: checked,
                                    emailEnabled: false,
                                    digestFrequency: 'immediate',
                                    quietHours: false,
                                    quietStart: '22:00',
                                    quietEnd: '08:00'
                                  });
                                }
                                updatePreferencesMutation.mutate(newPreferences);
                              }}
                            />
                            <Label>In-App</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={pref?.emailEnabled ?? false}
                              onCheckedChange={(checked) => {
                                const newPreferences = preferences.map((p: any) => 
                                  p.notificationType === type 
                                    ? { ...p, emailEnabled: checked }
                                    : p
                                );
                                if (!pref) {
                                  newPreferences.push({
                                    notificationType: type,
                                    inAppEnabled: true,
                                    emailEnabled: checked,
                                    digestFrequency: 'immediate',
                                    quietHours: false,
                                    quietStart: '22:00',
                                    quietEnd: '08:00'
                                  });
                                }
                                updatePreferencesMutation.mutate(newPreferences);
                              }}
                            />
                            <Label>Email</Label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Providers Tab */}
        <TabsContent value="email-providers" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Email Providers</h2>
              <p className="text-muted-foreground">Configure email service providers for sending notifications</p>
            </div>
            <Dialog open={isProviderDialogOpen} onOpenChange={setIsProviderDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingProvider(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProvider ? 'Edit Email Provider' : 'Add Email Provider'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure an email service provider for sending notifications
                  </DialogDescription>
                </DialogHeader>
                <Form {...providerForm}>
                  <form onSubmit={providerForm.handleSubmit(onProviderSubmit)} className="space-y-4">
                    <FormField
                      control={providerForm.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select email provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SENDGRID">SendGrid</SelectItem>
                              <SelectItem value="SMTP">SMTP</SelectItem>
                              <SelectItem value="MAILGUN">Mailgun</SelectItem>
                              <SelectItem value="SES">AWS SES</SelectItem>
                              <SelectItem value="POSTMARK">Postmark</SelectItem>
                              <SelectItem value="RESEND">Resend</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={providerForm.control}
                        name="fromEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Email</FormLabel>
                            <FormControl>
                              <Input placeholder="notifications@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={providerForm.control}
                        name="fromName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Company Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={providerForm.control}
                      name="replyToEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reply To Email (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="support@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={providerForm.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Your API key" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {providerForm.watch('provider') === 'SMTP' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={providerForm.control}
                            name="smtpHost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMTP Host</FormLabel>
                                <FormControl>
                                  <Input placeholder="smtp.example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={providerForm.control}
                            name="smtpPort"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMTP Port</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="587" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={providerForm.control}
                          name="smtpSecure"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Use TLS/SSL</FormLabel>
                                <FormDescription>
                                  Enable secure connection for SMTP
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {providerForm.watch('provider') === 'MAILGUN' && (
                      <FormField
                        control={providerForm.control}
                        name="configData"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain Configuration</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder='{"domain": "mg.example.com"}' 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              JSON configuration with your Mailgun domain
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={providerForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active Provider</FormLabel>
                            <FormDescription>
                              Set this as the active email provider for notifications
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsProviderDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createProviderMutation.isPending || updateProviderMutation.isPending}
                      >
                        {createProviderMutation.isPending || updateProviderMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {providersLoading ? (
              <div className="text-center py-8">Loading email providers...</div>
            ) : emailProviders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Email Providers</h3>
                  <p className="text-muted-foreground mb-4">
                    Add an email provider to start sending email notifications
                  </p>
                </CardContent>
              </Card>
            ) : (
              emailProviders.map((provider: EmailProvider) => (
                <Card key={provider.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{provider.provider}</h3>
                            {provider.isActive && (
                              <Badge variant="default">Active</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {provider.fromName} &lt;{provider.fromEmail}&gt;
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="test@example.com"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            className="w-48"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testProviderMutation.mutate({ id: provider.id, email: testEmail })}
                            disabled={!testEmail || testProviderMutation.isPending}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProvider(provider);
                            setIsProviderDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteProviderMutation.mutate(provider.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Notification Triggers Tab */}
        <TabsContent value="triggers" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Notification Triggers</h2>
              <p className="text-muted-foreground">Automate notifications based on system events</p>
            </div>
            <Dialog open={isTriggerDialogOpen} onOpenChange={setIsTriggerDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingTrigger(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trigger
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTrigger ? 'Edit Notification Trigger' : 'Add Notification Trigger'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure automatic notifications based on system events
                  </DialogDescription>
                </DialogHeader>
                <Form {...triggerForm}>
                  <form onSubmit={triggerForm.handleSubmit(onTriggerSubmit)} className="space-y-4">
                    <FormField
                      control={triggerForm.control}
                      name="triggerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Task Overdue Alert" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={triggerForm.control}
                        name="triggerModule"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Module</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select module" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {modules.map((module) => (
                                  <SelectItem key={module} value={module}>
                                    {module}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={triggerForm.control}
                        name="triggerEvent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select event" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {events.map((event) => (
                                  <SelectItem key={event} value={event}>
                                    {event.replace(/_/g, ' ')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={triggerForm.control}
                        name="severity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Severity</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select severity" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="INFO">Info</SelectItem>
                                <SelectItem value="SUCCESS">Success</SelectItem>
                                <SelectItem value="WARNING">Warning</SelectItem>
                                <SelectItem value="CRITICAL">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={triggerForm.control}
                      name="notificationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notification Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select notification type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {notificationTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type.replace(/_/g, ' ').toLowerCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={triggerForm.control}
                      name="titleTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title Template</FormLabel>
                          <FormControl>
                            <Input placeholder="Task {{taskName}} is overdue" {...field} />
                          </FormControl>
                          <FormDescription>
                            Use {"{{variableName}}"} for dynamic content
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={triggerForm.control}
                      name="messageTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Template</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="The task {{taskName}} assigned to {{assigneeName}} is overdue by {{daysPastDue}} days."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={triggerForm.control}
                      name="linkTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link Template (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="/tasks/{{taskId}}" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={triggerForm.control}
                      name="recipientType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipients</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recipient type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all_users">All Users</SelectItem>
                              <SelectItem value="specific_users">Specific Users</SelectItem>
                              <SelectItem value="role_based">Role Based</SelectItem>
                              <SelectItem value="department_based">Department Based</SelectItem>
                              <SelectItem value="conditional">Conditional</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={triggerForm.control}
                        name="deliveryDelay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Delay (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={triggerForm.control}
                        name="batchDelivery"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Batch Delivery</FormLabel>
                              <FormDescription>
                                Process recipients in batches
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={triggerForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active Trigger</FormLabel>
                            <FormDescription>
                              Enable this notification trigger
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsTriggerDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createTriggerMutation.isPending || updateTriggerMutation.isPending}
                      >
                        {createTriggerMutation.isPending || updateTriggerMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {triggersLoading ? (
              <div className="text-center py-8">Loading notification triggers...</div>
            ) : triggers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Notification Triggers</h3>
                  <p className="text-muted-foreground mb-4">
                    Create automated notification triggers based on system events
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Module/Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {triggers.map((trigger: NotificationTrigger) => (
                    <TableRow key={trigger.id}>
                      <TableCell className="font-medium">{trigger.triggerName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{trigger.triggerModule}</div>
                          <div className="text-muted-foreground">{trigger.triggerEvent}</div>
                        </div>
                      </TableCell>
                      <TableCell>{trigger.notificationType.replace(/_/g, ' ').toLowerCase()}</TableCell>
                      <TableCell>
                        <Badge variant={trigger.severity === 'CRITICAL' ? 'destructive' : 
                                       trigger.severity === 'WARNING' ? 'secondary' : 'default'}>
                          {trigger.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={trigger.isActive ? 'default' : 'secondary'}>
                          {trigger.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTrigger(trigger);
                              setIsTriggerDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteTriggerMutation.mutate(trigger.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Email Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Delivery Logs</CardTitle>
              <CardDescription>
                Monitor email delivery status and troubleshoot issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8">Loading email logs...</div>
              ) : emailLogs?.logs?.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Email Logs</h3>
                  <p className="text-muted-foreground">
                    Email delivery logs will appear here once emails are sent
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Delivered At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs?.logs?.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.recipientEmail}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell>{log.providerName}</TableCell>
                        <TableCell>
                          <Badge variant={
                            log.status === 'sent' ? 'default' :
                            log.status === 'delivered' ? 'default' :
                            log.status === 'failed' ? 'destructive' : 'secondary'
                          }>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.sentAt ? new Date(log.sentAt).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          {log.deliveredAt ? new Date(log.deliveredAt).toLocaleString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsLoading ? '...' : analytics?.notifications?.total || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unread</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsLoading ? '...' : analytics?.notifications?.unread || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsLoading ? '...' : 
                    Object.values(analytics?.emailDelivery || {}).reduce((a: any, b: any) => a + b, 0)
                  }
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsLoading ? '...' : 
                    analytics?.emailDelivery ? 
                      Math.round((analytics.emailDelivery.delivered || 0) / 
                        Math.max(Object.values(analytics.emailDelivery).reduce((a: any, b: any) => a + b, 0), 1) * 100) + '%'
                      : '0%'
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notifications by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.notifications.byType || {}).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{type.replace(/_/g, ' ').toLowerCase()}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Delivery Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.emailDelivery || {}).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{status}</span>
                        <Badge variant={
                          status === 'delivered' ? 'default' :
                          status === 'failed' ? 'destructive' : 'secondary'
                        }>
                          {count as number}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}