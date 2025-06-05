import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, CheckCheck } from "lucide-react";
import { useLocation } from "wouter";

interface Notification {
  id: number;
  title: string;
  messageBody: string;
  linkUrl?: string;
  type: string;
  severity: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    // Mark as read first
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate to the specific task or page
    if (notification.linkUrl) {
      console.log('Navigating to:', notification.linkUrl);
      setLocation(notification.linkUrl);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div 
      className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
        !notification.isRead ? 'bg-blue-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`text-sm font-medium ${
              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {notification.title}
            </h4>
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {notification.messageBody}
          </p>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getSeverityColor(notification.severity)}>
              {notification.type.replace(/_/g, ' ').toLowerCase()}
            </Badge>
            
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          {notification.linkUrl && (
            <ExternalLink className="w-4 h-4 text-gray-400" />
          )}
          {notification.isRead && (
            <CheckCheck className="w-4 h-4 text-green-500" />
          )}
        </div>
      </div>
    </div>
  );
}