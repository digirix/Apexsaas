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
  const defaultMessage = message || `You don't have permission to ${action} ${module}. Please contact your administrator to request access.`;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-slate-700">
            <Lock className="h-5 w-5" />
            Access Restricted
          </CardTitle>
          <CardDescription className="text-slate-600">
            {defaultMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showContactAdmin && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                To request access to this feature, please contact your system administrator.
              </p>
              <Button variant="outline" className="w-full">
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