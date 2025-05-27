import { useState } from "react";
import { Bell, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

interface Notification {
  id: number;
  title: string;
  messageBody: string;
  linkUrl?: string;
  isRead: boolean;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  createdAt: string;
  relatedModule?: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get unread notification count
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['/api/v1/me/notifications/unread-count'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get recent notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/v1/me/notifications'],
    enabled: isOpen,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest(`/api/v1/me/notifications/${notificationId}/read`, 'PUT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/me/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/me/notifications/unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest('/api/v1/me/notifications/mark-all-read', 'PUT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/me/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/me/notifications/unread-count'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to the link if available
    if (notification.linkUrl) {
      setLocation(notification.linkUrl);
      setIsOpen(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 border-red-200 text-red-800';
      case 'WARNING': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'SUCCESS': return 'bg-green-100 border-green-200 text-green-800';
      default: return 'bg-blue-100 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)}>
          <div className="absolute top-16 right-4 w-96" onClick={e => e.stopPropagation()}>
            <Card className="shadow-lg border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Notifications</CardTitle>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllAsReadMutation.mutate()}
                        disabled={markAllAsReadMutation.isPending}
                      >
                        Mark all read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {notifications.map((notification, index) => (
                        <div key={notification.id}>
                          <div
                            className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                              !notification.isRead ? 'bg-blue-50/50' : ''
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                !notification.isRead ? 'bg-blue-500' : 'bg-gray-300'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className={`text-sm font-medium truncate ${
                                    !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                                  }`}>
                                    {notification.title}
                                  </h4>
                                  <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(notification.severity)}`}>
                                    {notification.severity}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                                  {notification.messageBody}
                                </p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>
                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                  </span>
                                  {notification.relatedModule && (
                                    <span className="bg-gray-100 px-2 py-1 rounded">
                                      {notification.relatedModule}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < notifications.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {notifications.length > 0 && (
                  <>
                    <Separator />
                    <div className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setLocation('/notifications');
                          setIsOpen(false);
                        }}
                      >
                        View All Notifications
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}