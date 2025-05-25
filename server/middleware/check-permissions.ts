import { Request, Response, NextFunction } from "express";
import { DatabaseStorage } from "../database-storage";

type PermissionAction = "create" | "read" | "update" | "delete";

export function checkPermission(module: string, action: PermissionAction) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const { user } = req;
      
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Super Admins have access to everything
      if (user.isSuperAdmin) {
        return next();
      }

      const storage = new DatabaseStorage();
      const permissions = await storage.getUserPermissions(user.tenantId, user.id);
      
      // Find permission for the specific module
      const modulePermission = permissions.find(p => p.module === module);
      
      // Check if user has access to the module
      if (!modulePermission || modulePermission.accessLevel === "restricted") {
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

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Access denied. You don't have permission to ${action} in the ${module} module.`,
          requiredPermission: module,
          requiredAction: action
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Internal server error during permission check" });
    }
  };
}