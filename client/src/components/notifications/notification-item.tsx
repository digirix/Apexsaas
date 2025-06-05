import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  XCircle,
  User,
  FileText,
  DollarSign,
  Settings,
  MessageSquare,
  Calendar,
  Users,
  Bell
} from "lucide-react";

interface NotificationItemProps {
  notification: {
    id: number;
    title: string;
    messageBody: string;
    type: string;
    severity: string;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
    linkUrl?: string;
  };
  onClick?: () => void;
  onMarkAsRead?: (id: number) => void;
  showMarkAsRead?: boolean;
}

const typeIcons = {
  TASK_ASSIGNMENT: User,
  TASK_UPDATE: FileText,
  TASK_COMPLETED: CheckCircle,
  TASK_DUE_SOON: Calendar,
  WORKFLOW_APPROVAL: Settings,
  CLIENT_MESSAGE: MessageSquare,
  INVOICE_PAID: DollarSign,
  INVOICE_OVERDUE: AlertTriangle,
  SYSTEM_ALERT: Bell,
  BROADCAST: Users,
  MENTION: MessageSquare,
  CUSTOM: Info,
  COMPLIANCE_DEADLINE: Calendar,
  DOCUMENT_UPLOADED: FileText,
  PAYMENT_REMINDER: DollarSign,
  STAFF_UPDATE: User,
  CLIENT_PORTAL_ACCESS: Users,
  TASK_REMINDER: Calendar,
  PERFORMANCE_ALERT: AlertTriangle
};

const severityColors = {
  INFO: "bg-blue-50 text-blue-700 border-blue-200",
  SUCCESS: "bg-green-50 text-green-700 border-green-200", 
  WARNING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  ERROR: "bg-red-50 text-red-700 border-red-200"
};

const severityBadgeColors = {
  INFO: "bg-blue-100 text-blue-800",
  SUCCESS: "bg-green-100 text-green-800",
  WARNING: "bg-yellow-100 text-yellow-800", 
  ERROR: "bg-red-100 text-red-800"
};

export function NotificationItem({ 
  notification, 
  onClick, 
  onMarkAsRead, 
  showMarkAsRead = false 
}: NotificationItemProps) {
  const IconComponent = typeIcons[notification.type as keyof typeof typeIcons] || Info;
  const severityClass = severityColors[notification.severity as keyof typeof severityColors] || severityColors.INFO;
  const badgeClass = severityBadgeColors[notification.severity as keyof typeof severityBadgeColors] || severityBadgeColors.INFO;

  return (
    <div 
      className={`p-4 border-l-4 cursor-pointer transition-colors hover:bg-muted/50 ${
        !notification.isRead ? 'bg-blue-50/30 border-l-blue-500' : 'border-l-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${severityClass}`}>
          <IconComponent className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                {notification.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {notification.messageBody}
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className={`text-xs ${badgeClass}`}>
                {notification.severity}
              </Badge>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            
            {showMarkAsRead && !notification.isRead && onMarkAsRead && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs h-6 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
              >
                Mark as read
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}