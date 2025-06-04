import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Filter, 
  Search, 
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface Notification {
  id: number;
  title: string;
  messageBody: string;
  linkUrl?: string;
  type: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  isRead: boolean;
  createdAt: string;
  relatedModule?: string;
  relatedEntityId?: string;
}

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState({
    types: [] as string[],
    severities: [] as string[],
    isRead: undefined as boolean | undefined,
    modules: [] as string[]
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['/api/v1/notifications', filter, searchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filter.types.length > 0) params.set('types', filter.types.join(','));
      if (filter.severities.length > 0) params.set('severities', filter.severities.join(','));
      if (filter.modules.length > 0) params.set('modules', filter.modules.join(','));
      if (typeof filter.isRead === 'boolean') params.set('isRead', filter.isRead.toString());
      if (searchTerm) params.set('search', searchTerm);
      
      return apiRequest(`/api/v1/notifications?${params.toString()}`);
    }
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationIds: number[]) =>
      apiRequest('/api/v1/notifications/bulk-mark-read', {
        method: 'POST',
        body: { notificationIds }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/v1/notifications/mark-all-read', {
        method: 'POST'
      }),
    onSuccess: () => {
      toast({ title: 'All notifications marked as read' });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/notifications'] });
    }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <Info className="h-4 w-4 text-info" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'destructive';
      case 'WARNING':
        return 'secondary';
      case 'SUCCESS':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate([notification.id]);
    }
    
    if (notification.linkUrl) {
      window.location.href = notification.linkUrl;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("relative", className)}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={filter.isRead === undefined ? 'all' : filter.isRead ? 'read' : 'unread'}
              onValueChange={(value) => 
                setFilter(prev => ({ 
                  ...prev, 
                  isRead: value === 'all' ? undefined : value === 'read' 
                }))
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.severities.length === 1 ? filter.severities[0] : 'all'}
              onValueChange={(value) => 
                setFilter(prev => ({ 
                  ...prev, 
                  severities: value === 'all' ? [] : [value] 
                }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No notifications</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filter.types.length > 0 || filter.severities.length > 0 || typeof filter.isRead === 'boolean'
                  ? 'No notifications match your filters'
                  : 'You\'re all caught up!'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                    !notification.isRead && "bg-blue-50/50 border-l-4 border-l-blue-500"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getSeverityIcon(notification.severity)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium truncate">
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-1">
                          <Badge variant={getSeverityBadgeVariant(notification.severity)} className="text-xs">
                            {notification.severity}
                          </Badge>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.messageBody}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatRelativeTime(notification.createdAt)}</span>
                        <div className="flex items-center gap-1">
                          {notification.relatedModule && (
                            <Badge variant="outline" className="text-xs">
                              {notification.relatedModule}
                            </Badge>
                          )}
                          {notification.linkUrl && (
                            <ExternalLink className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-4 border-t text-center">
            <Button variant="outline" size="sm" className="w-full">
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}