import { useAuth } from "@/hooks/use-auth";
import { useModulePermissions } from "@/hooks/use-permissions";
import { Loader2, Lock } from "lucide-react";
import { Redirect, Route } from "wouter";

// Map routes to their corresponding module permissions
const routeToModuleMap: Record<string, string> = {
  "/users": "users",
  "/auto-generated-tasks": "auto-generated-tasks", 
  "/compliance-calendar": "compliance-calendar",
  "/ai-reporting": "ai-reporting",
  "/workflow": "workflow-automation",
  "/settings": "settings",
  "/finance": "finance",
  "/tasks": "tasks",
  "/clients": "clients",
  "/setup": "setup",
  "/reports": "reports",
};

function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="text-center space-y-4">
        <Lock className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You don't have permission to access this module. Contact your administrator to request access.
        </p>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  path,
  component: Component,
  requireModule,
}: {
  path: string;
  component: () => React.JSX.Element;
  requireModule?: string;
}) {
  const { user, isLoading } = useAuth();
  
  // Determine the required module from the path if not explicitly provided
  const moduleRequired = requireModule || routeToModuleMap[path] || routeToModuleMap[path.split('/:')[0]];
  
  const modulePermission = useModulePermissions(moduleRequired);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Super admins have access to everything
  if (user.isSuperAdmin) {
    return <Route path={path} component={Component} />;
  }

  // Check module permissions for regular users
  if (moduleRequired && modulePermission?.accessLevel === "restricted") {
    return <Route path={path} component={AccessDeniedPage} />;
  }

  return <Route path={path} component={Component} />;
}
