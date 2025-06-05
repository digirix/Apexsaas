import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { NotificationItem } from "./notification-item";
import { 
  CheckCheck, 
  Loader2,
  Bell,
  ExternalLink 
} from "lucide-react";
import { useLocation } from "wouter";

interface NotificationPanelProps {
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export function NotificationPanel({ onMarkAllAsRead, onClose }: NotificationPanelProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch recent notifications (limited set for panel)
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["/api/v1/notifications", { page: 1, limit: 10 }],
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest("PUT", `/api/v1/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/notifications/unread-count"] });
    },
  });

  const notifications = (notificationsData as { notifications: any[] } | undefined)?.notifications || [];
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const handleNotificationClick = (notification: any) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to the linked page if linkUrl exists
    if (notification.linkUrl) {
      setLocation(notification.linkUrl);
      onClose();
    }
  };

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleViewAllClick = () => {
    setLocation("/notifications");
    onClose();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <ScrollArea className="max-h-96">
          <div className="p-2">
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <NotificationItem
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
                {index < notifications.length - 1 && (
                  <Separator className="my-1" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAllClick}
              className="w-full justify-center text-xs"
            >
              View all notifications
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}