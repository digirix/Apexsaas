import { Request, Response, NextFunction } from 'express';
import { IStorage } from '../storage';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

/**
 * Enhanced permission checking middleware
 * Checks if user has required permission for a specific module and action
 */
export function requirePermission(storage: IStorage, module: string, action: PermissionAction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip permission check for Super Admins
      if (req.user?.isSuperAdmin) {
        console.log(`Permission middleware: Super admin ${req.user.id} bypassing ${action} check for ${module}`);
        return next();
      }

      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        console.log(`Permission middleware: Authentication required for ${action} on ${module}`);
        return res.status(401).json({ message: 'Authentication required' });
      }

      console.log(`Permission middleware: Checking ${action} permission for user ${userId} on ${module} module`);

      // Get user permission for the module
      const permission = await storage.getUserPermission(tenantId, userId, module);
      
      console.log(`Permission middleware: Found permission for user ${userId}, module ${module}:`, permission);

      if (!permission) {
        return res.status(403).json({ 
          message: `Access denied to ${module} module`,
          code: 'MODULE_ACCESS_DENIED'
        });
      }

      // Check access level
      if (permission.accessLevel === 'restricted') {
        return res.status(403).json({ 
          message: `Restricted access to ${module} module`,
          code: 'MODULE_RESTRICTED'
        });
      }

      // For full access, allow everything
      if (permission.accessLevel === 'full') {
        return next();
      }

      // For partial access, check specific CRUD permissions
      let hasPermission = false;
      switch (action) {
        case 'create':
          hasPermission = permission.canCreate;
          break;
        case 'read':
          hasPermission = permission.canRead;
          break;
        case 'update':
          hasPermission = permission.canUpdate;
          break;
        case 'delete':
          hasPermission = permission.canDelete;
          break;
      }

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Permission denied: Cannot ${action} in ${module} module`,
          code: 'ACTION_PERMISSION_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Internal server error during permission check' });
    }
  };
}

/**
 * Check if user has any access to a module (read at minimum)
 */
export function requireModuleAccess(storage: IStorage, module: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Skip for Super Admins
      if (req.user?.isSuperAdmin) {
        return next();
      }

      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const permission = await storage.getUserPermission(tenantId, userId, module);

      if (!permission || permission.accessLevel === 'restricted') {
        return res.status(403).json({ 
          message: `Access denied to ${module} module`,
          code: 'MODULE_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Module access check error:', error);
      res.status(500).json({ message: 'Internal server error during access check' });
    }
  };
}

/**
 * Helper function to get user permissions for frontend components
 */
export async function getUserModulePermissions(storage: IStorage, tenantId: number, userId: number, module: string) {
  try {
    const permission = await storage.getUserPermission(tenantId, userId, module);
    
    if (!permission) {
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
      hasAccess: permission.accessLevel !== 'restricted',
      accessLevel: permission.accessLevel,
      canCreate: permission.accessLevel === 'full' || permission.canCreate,
      canRead: permission.accessLevel === 'full' || permission.canRead,
      canUpdate: permission.accessLevel === 'full' || permission.canUpdate,
      canDelete: permission.accessLevel === 'full' || permission.canDelete
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return {
      hasAccess: false,
      accessLevel: 'restricted',
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false
    };
  }
}