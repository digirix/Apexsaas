import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NotificationItem } from "@/components/notifications/notification-item";
import { 
  Bell, 
  CheckCheck, 
  Filter,
  Loader2,
  RefreshCw,
  Search
} from "lucide-react";
import { useLocation } from "wouter";

export function NotificationsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Filters and pagination state
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    isRead: undefined as boolean | undefined,
    type: 'ALL_TYPES',
    severity: 'ALL_SEVERITIES',
    search: ''
  });

  // Build query parameters
  const queryParams = {
    page,
    limit: 20,
    ...(filters.isRead !== undefined && { isRead: filters.isRead }),
    ...(filters.type && filters.type !== 'ALL_TYPES' && { type: filters.type }),
    ...(filters.severity && filters.severity !== 'ALL_SEVERITIES' && { severity: filters.severity })
  };

  // Fetch notifications
  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: ["/api/v1/notifications", queryParams],
  });

  // Fetch unread count
  const { data: unreadCountData } = useQuery({
    queryKey: ["/api/v1/notifications/unread-count"],
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

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/v1/notifications/mark-all-read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/notifications/unread-count"] });
    },
  });

  const notifications = notificationsData?.notifications || [];
  const total = notificationsData?.total || 0;
  const hasMore = notificationsData?.hasMore || false;
  const unreadCount = unreadCountData?.count || 0;

  // Filter notifications by search term
  const filteredNotifications = filters.search
    ? notifications.filter(n => 
        n.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        n.messageBody.toLowerCase().includes(filters.search.toLowerCase())
      )
    : notifications;

  const handleNotificationClick = (notification: any) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to the linked page if linkUrl exists
    if (notification.linkUrl) {
      setLocation(notification.linkUrl);
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const clearFilters = () => {
    setFilters({
      isRead: undefined,
      type: 'ALL_TYPES',
      severity: 'ALL_SEVERITIES', 
      search: ''
    });
    setPage(1);
  };

  return (
    <AppLayout title="Notifications">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-muted-foreground">
                {total} total notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount} unread
                  </Badge>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                size="sm"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Read Status Filter */}
            <Select
              value={filters.isRead === undefined ? 'all' : filters.isRead ? 'read' : 'unread'}
              onValueChange={(value) => 
                handleFilterChange('isRead', value === 'all' ? undefined : value === 'read')
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={filters.type}
              onValueChange={(value) => handleFilterChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_TYPES">All Types</SelectItem>
                <SelectItem value="TASK_ASSIGNMENT">Task Assignment</SelectItem>
                <SelectItem value="TASK_UPDATE">Task Update</SelectItem>
                <SelectItem value="MENTION">Mention</SelectItem>
                <SelectItem value="WORKFLOW_APPROVAL">Workflow Approval</SelectItem>
                <SelectItem value="CLIENT_MESSAGE">Client Message</SelectItem>
                <SelectItem value="INVOICE_PAID">Invoice Paid</SelectItem>
                <SelectItem value="SYSTEM_ALERT">System Alert</SelectItem>
                <SelectItem value="BROADCAST">Broadcast</SelectItem>
              </SelectContent>
            </Select>

            {/* Severity Filter */}
            <Select
              value={filters.severity}
              onValueChange={(value) => handleFilterChange('severity', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_SEVERITIES">All Severities</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {(filters.isRead !== undefined || (filters.type && filters.type !== 'ALL_TYPES') || (filters.severity && filters.severity !== 'ALL_SEVERITIES') || filters.search) && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No notifications found</h3>
              <p className="text-muted-foreground">
                {filters.search || filters.isRead !== undefined || filters.type || filters.severity
                  ? "Try adjusting your filters"
                  : "You're all caught up! Check back later for new notifications."
                }
              </p>
            </div>
          ) : (
            <>
              <div className="bg-card rounded-lg border divide-y">
                {filteredNotifications.map((notification) => (
                  <div key={notification.id} className="p-1">
                    <NotificationItem
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  </div>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    Load more notifications
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}