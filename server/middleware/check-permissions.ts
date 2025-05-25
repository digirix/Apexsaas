import { Request, Response, NextFunction } from "express";
import { DatabaseStorage } from "../database-storage";

type PermissionAction = "create" | "read" | "update" | "delete";

export function checkPermission(module: string, action: PermissionAction) {
  console.log(`Creating permission middleware for ${module}:${action}`);
  
  return async (req: any, res: Response, next: NextFunction) => {
    console.log(`=== PERMISSION MIDDLEWARE EXECUTING ===`);
    console.log(`Module: ${module}, Action: ${action}`);
    
    try {
      const { user } = req;
      
      console.log(`Permission check: User ${user?.id} trying to ${action} in ${module} module`);
      console.log(`User object:`, user);
      
      if (!user) {
        console.log("Permission denied: No user found");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Super Admins have access to everything
      if (user.isSuperAdmin) {
        console.log("Permission granted: Super admin access");
        return next();
      }

      console.log(`Getting permissions for user ${user.id} in tenant ${user.tenantId}`);
      const storage = new DatabaseStorage();
      const permissions = await storage.getUserPermissions(user.tenantId, user.id);
      
      console.log(`Found ${permissions.length} permissions for user ${user.id}:`, permissions);
      
      // Find permission for the specific module
      const modulePermission = permissions.find(p => p.module === module);
      
      console.log(`Module permission for ${module}:`, modulePermission);
      
      // Check if user has access to the module
      if (!modulePermission || modulePermission.accessLevel === "restricted") {
        console.log(`Permission denied: No access to ${module} module`);
        return res.status(403).json({ 
          message: `Access denied. You don't have permission to access the ${module} module.`,
          requiredPermission: module,
          requiredAction: action
        });
      }

      // Check specific CRUD permission
      const hasPermission = (() => {
        switch (action) {
          case "create":
            return modulePermission.canCreate;
          case "read":
            return modulePermission.canRead;
          case "update":
            return modulePermission.canUpdate;
          case "delete":
            return modulePermission.canDelete;
          default:
            return false;
        }
      })();

      console.log(`Permission check result: ${hasPermission} for ${action} action`);

      if (!hasPermission) {
        console.log(`Permission denied: Cannot ${action} in ${module} module`);
        return res.status(403).json({ 
          message: `Access denied. You don't have permission to ${action} in the ${module} module.`,
          requiredPermission: module,
          requiredAction: action
        });
      }

      console.log(`Permission granted: User can ${action} in ${module} module`);
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Internal server error during permission check" });
    }
  };
}