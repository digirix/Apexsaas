import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useModulePermissions } from "@/hooks/use-permissions";
import { NoAccess } from "@/components/ui/no-access";

interface WithPermissionsProps {
  module: string;
  action?: "create" | "read" | "update" | "delete";
  children: React.ReactNode;
}

export function WithPermissions({ module, action = "read", children }: WithPermissionsProps) {
  const { user } = useAuth();
  const permissions = useModulePermissions(module);

  // Super Admins have access to everything
  if (user?.isSuperAdmin) {
    return <>{children}</>;
  }

  // Check if user has access to the module
  if (!permissions || permissions.accessLevel === "restricted") {
    return (
      <NoAccess 
        module={module} 
        action="access"
        message={`You don't have access to the ${module} module. Please contact your administrator to request access.`}
      />
    );
  }

  // Check specific CRUD permissions
  const hasPermission = (() => {
    switch (action) {
      case "create":
        return permissions.canCreate;
      case "read":
        return permissions.canRead;
      case "update":
        return permissions.canUpdate;
      case "delete":
        return permissions.canDelete;
      default:
        return permissions.canRead; // Default to read access
    }
  })();

  if (!hasPermission) {
    return (
      <NoAccess 
        module={module} 
        action={action}
        message={`You don't have permission to ${action} in the ${module} module. Please contact your administrator to request access.`}
      />
    );
  }

  return <>{children}</>;
}

// Higher-order component for easier usage
export function withPermissions<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  module: string,
  action: "create" | "read" | "update" | "delete" = "read"
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <WithPermissions module={module} action={action}>
        <WrappedComponent {...props} />
      </WithPermissions>
    );
  };
}