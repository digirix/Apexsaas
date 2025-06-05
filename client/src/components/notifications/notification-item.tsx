import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  User,
  Bell,
  AlertTriangle,
  FileText,
  DollarSign,
  Bot,
  Settings,
  MessageSquare,
  Clock,
  AlertCircle,
  Info,
  CheckCircle
} from "lucide-react";

interface NotificationItemProps {
  notification: {
    id: number;
    title: string;
    messageBody: string;
    type: string;
    severity: string;
    isRead: boolean;
    createdAt: string;
    linkUrl?: string;
  };
  onClick: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNMENT':
      case 'TASK_UPDATE':
      case 'TASK_COMPLETED':
        return CheckSquare;
      case 'TASK_DUE_SOON':
      case 'TASK_OVERDUE':
        return Clock;
      case 'MENTION':
        return MessageSquare;
      case 'WORKFLOW_APPROVAL':
      case 'WORKFLOW_ALERT':
      case 'WORKFLOW_COMPLETION':
        return Settings;
      case 'CLIENT_ASSIGNMENT':
      case 'CLIENT_MESSAGE':
        return User;
      case 'CLIENT_DOCUMENT':
        return FileText;
      case 'INVOICE_PAID':
      case 'PAYMENT_REVIEW':
        return DollarSign;
      case 'AI_SUGGESTION':
      case 'AI_RISK_ALERT':
        return Bot;
      case 'SYSTEM_ALERT':
        return AlertTriangle;
      case 'BROADCAST':
        return Bell;
      default:
        return Bell;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'ERROR':
        return 'text-red-500';
      case 'WARNING':
        return 'text-yellow-500';
      case 'SUCCESS':
        return 'text-green-500';
      default:
        return 'text-blue-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'ERROR':
        return AlertCircle;
      case 'WARNING':
        return AlertTriangle;
      case 'SUCCESS':
        return CheckCircle;
      default:
        return Info;
    }
  };

  const Icon = getNotificationIcon(notification.type);
  const SeverityIcon = getSeverityIcon(notification.severity);
  const severityColor = getSeverityColor(notification.severity);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
        !notification.isRead && "bg-blue-50/50 border-l-4 border-l-blue-500"
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn("flex-shrink-0 p-1.5 rounded-full", severityColor)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn(
            "text-sm font-medium line-clamp-2",
            !notification.isRead && "font-semibold"
          )}>
            {notification.title}
          </h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            {notification.severity !== 'INFO' && (
              <SeverityIcon className={cn("h-3 w-3", severityColor)} />
            )}
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {notification.messageBody}
        </p>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
          
          <Badge variant="outline" className="text-xs">
            {notification.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        </div>
      </div>
    </div>
  );
}