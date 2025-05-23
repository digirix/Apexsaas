import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { UserPermission } from "@shared/schema";

export interface ModulePermissions {
  hasAccess: boolean;
  accessLevel: 'full' | 'partial' | 'restricted';
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

/**
 * Hook to check user permissions for a specific module
 */
export function useModulePermissions(module: string): ModulePermissions {
  const { user } = useUser();
  
  const { data: permissions } = useQuery<UserPermission[]>({
    queryKey: [`/api/v1/users/${user?.id}/permissions`],
    enabled: !!user?.id
  });

  // Super Admins have full access to everything
  if (user?.isSuperAdmin) {
    return {
      hasAccess: true,
      accessLevel: 'full',
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true
    };
  }

  // Find permission for the specific module
  const permission = permissions?.find(p => p.module === module);

  if (!permission || permission.accessLevel === 'restricted') {
    return {
      hasAccess: false,
      accessLevel: 'restricted',
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false
    };
  }

  return {
    hasAccess: true,
    accessLevel: permission.accessLevel,
    canCreate: permission.accessLevel === 'full' || permission.canCreate,
    canRead: permission.accessLevel === 'full' || permission.canRead,
    canUpdate: permission.accessLevel === 'full' || permission.canUpdate,
    canDelete: permission.accessLevel === 'full' || permission.canDelete
  };
}

/**
 * Hook to check if user has access to multiple modules
 */
export function useMultiplePermissions(modules: string[]) {
  const { user } = useUser();
  
  const { data: permissions } = useQuery<UserPermission[]>({
    queryKey: [`/api/v1/users/${user?.id}/permissions`],
    enabled: !!user?.id
  });

  const modulePermissions: Record<string, ModulePermissions> = {};

  modules.forEach(module => {
    // Super Admins have full access to everything
    if (user?.isSuperAdmin) {
      modulePermissions[module] = {
        hasAccess: true,
        accessLevel: 'full',
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true
      };
      return;
    }

    const permission = permissions?.find(p => p.module === module);

    if (!permission || permission.accessLevel === 'restricted') {
      modulePermissions[module] = {
        hasAccess: false,
        accessLevel: 'restricted',
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false
      };
    } else {
      modulePermissions[module] = {
        hasAccess: true,
        accessLevel: permission.accessLevel,
        canCreate: permission.accessLevel === 'full' || permission.canCreate,
        canRead: permission.accessLevel === 'full' || permission.canRead,
        canUpdate: permission.accessLevel === 'full' || permission.canUpdate,
        canDelete: permission.accessLevel === 'full' || permission.canDelete
      };
    }
  });

  return modulePermissions;
}

/**
 * Helper hook to check if user can perform a specific action on a module
 */
export function useCanPerformAction(module: string, action: 'create' | 'read' | 'update' | 'delete'): boolean {
  const permissions = useModulePermissions(module);
  
  switch (action) {
    case 'create':
      return permissions.canCreate;
    case 'read':
      return permissions.canRead;
    case 'update':
      return permissions.canUpdate;
    case 'delete':
      return permissions.canDelete;
    default:
      return false;
  }
}