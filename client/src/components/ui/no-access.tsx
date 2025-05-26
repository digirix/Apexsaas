import { Shield, Lock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface NoAccessProps {
  module: string;
  action?: string;
  message?: string;
  showContactAdmin?: boolean;
}

export function NoAccess({ 
  module, 
  action = "access", 
  message,
  showContactAdmin = true 
}: NoAccessProps) {
  // Create user-friendly module names
  const moduleDisplayNames: Record<string, string> = {
    clients: "Client Management",
    users: "User Management", 
    tasks: "Task Management",
    finance: "Finance Module",
    setup: "System Setup",
    dashboard: "Dashboard",
    reports: "Reports"
  };

  const displayModule = moduleDisplayNames[module] || module;
  
  // Create user-friendly action names
  const actionDisplayNames: Record<string, string> = {
    create: "add new records to",
    read: "view information in",
    update: "edit records in", 
    delete: "remove records from",
    access: "access"
  };

  const displayAction = actionDisplayNames[action] || action;
  
  const defaultMessage = message || `You don't have permission to ${displayAction} the ${displayModule}. Please contact your administrator to request access to this feature.`;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-lg w-full text-center border-orange-200 shadow-lg">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-xl text-slate-800">
            <Lock className="h-5 w-5" />
            Access Restricted
          </CardTitle>
          <CardDescription className="text-base text-slate-600 mt-2 leading-relaxed">
            {defaultMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showContactAdmin && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">
                  Need access to this feature?
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Contact your system administrator to request permission for the {displayModule}.
                </p>
              </div>
              <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Administrator
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}