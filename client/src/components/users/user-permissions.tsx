import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserPermission, InsertUserPermission, accessLevelEnum } from "@shared/schema";

// Define available modules - comprehensive list covering all application areas
const availableModules = [
  { id: "users", name: "User Management" },
  { id: "clients", name: "Clients Management" },
  { id: "tasks", name: "Tasks Management" },
  { id: "finance", name: "Finance Module" },
  { id: "setup", name: "System Setup" },
  { id: "auto-generated-tasks", name: "Auto Generated Tasks" },
  { id: "compliance-calendar", name: "Compliance Calendar" },
  { id: "ai-features", name: "AI Features" },
  { id: "ai-reporting", name: "AI Reporting" },
  { id: "settings", name: "System Settings" },
  { id: "reports", name: "Financial Reports" },
  { id: "workflow-automation", name: "Workflow Automation" },
  { id: "client-portal", name: "Client Portal Management" },
  { id: "dashboard", name: "Dashboard Access" }
];

interface UserPermissionsProps {
  userId: number;
}

export function UserPermissions({ userId }: UserPermissionsProps) {
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [permissionForm, setPermissionForm] = useState<Partial<InsertUserPermission>>({
    accessLevel: "restricted",
    canRead: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false
  });

  // Define user type
  interface UserDetails {
    id: number;
    tenantId: number;
    displayName: string;
    email: string;
    isSuperAdmin?: boolean;
  }
  
  // Fetch user details
  const { data: user } = useQuery<UserDetails>({
    queryKey: [`/api/v1/users/${userId}`],
    enabled: !!userId
  });

  // Fetch user permissions
  const { data: permissions, isLoading: permissionsLoading, refetch: refetchPermissions } = useQuery<UserPermission[]>({
    queryKey: [`/api/v1/users/${userId}/permissions`, Date.now()],
    enabled: !!userId,
    staleTime: 0,
    gcTime: 0
  });

  // Get permission for selected module
  const selectedPermission = selectedModule
    ? permissions?.find(p => p.module === selectedModule)
    : null;

  // Update permission form when selected module changes
  useEffect(() => {
    if (selectedModule && permissions) {
      const existingPermission = permissions.find(p => p.module === selectedModule);
      
      if (existingPermission) {
        // Load existing permission data
        setPermissionForm({
          accessLevel: existingPermission.accessLevel,
          canRead: existingPermission.canRead,
          canCreate: existingPermission.canCreate,
          canUpdate: existingPermission.canUpdate,
          canDelete: existingPermission.canDelete
        });
      } else {
        // Default values for new permission
        setPermissionForm({
          accessLevel: "restricted",
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false
        });
      }
    }
  }, [selectedModule, permissions]);

  // Delete permission mutation
  const deletePermissionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/v1/user-permissions/${id}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/users/${userId}/permissions`] });
      refetchPermissions();
      setSelectedModule(null);
      toast({
        title: "Permission deleted",
        description: "The permission has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create or update permission mutation
  const permissionMutation = useMutation({
    mutationFn: async (data: InsertUserPermission) => {
      // Check if permission already exists for this module
      const existingPermission = permissions?.find(p => p.module === selectedModule);
      
      if (existingPermission) {
        const response = await apiRequest('PUT', `/api/v1/user-permissions/${existingPermission.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/v1/user-permissions', data);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/users/${userId}/permissions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/users/permissions`] });
      refetchPermissions();
      toast({
        title: "Permission saved",
        description: `The permission for ${selectedModule} module has been saved.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle save permission
  const handleSavePermission = () => {
    if (!selectedModule || !userId) return;

    // Use the correct tenant ID from the authenticated user
    const tenantId = user?.tenantId || 5;
    
    // Create the permission data with proper typing
    const permissionData = {
      tenantId,
      userId,
      module: selectedModule,
      accessLevel: permissionForm.accessLevel,
      canRead: !!permissionForm.canRead,
      canCreate: !!permissionForm.canCreate,
      canUpdate: !!permissionForm.canUpdate,
      canDelete: !!permissionForm.canDelete
    } as InsertUserPermission;

    permissionMutation.mutate(permissionData);
  };

  // Handle permission change
  const handlePermissionChange = (field: keyof InsertUserPermission, value: any) => {
    if (field === 'accessLevel') {
      // Ensure accessLevel is one of the allowed values
      const accessLevel = value as 'full' | 'partial' | 'restricted';
      setPermissionForm(prev => ({ ...prev, accessLevel }));
    } else {
      // Handle other field types normally
      setPermissionForm(prev => ({ ...prev, [field]: value }));
    }
  };

  // Function to determine if this is a SuperAdmin
  const isSuperAdmin = user?.isSuperAdmin;

  // Function to check if modifications are locked
  const isPermissionLocked = () => {
    return isSuperAdmin || selectedModule === 'users' && userId === user?.id;
  };

  return (
    <div>
      {user ? (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <h2 className="text-xl font-semibold">
              Permissions for {user.displayName}
            </h2>
            {isSuperAdmin && (
              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Super Admin
              </Badge>
            )}
          </div>
          <p className="text-slate-500 mt-2">
            {isSuperAdmin 
              ? "Super Admins automatically have full access to all system modules"
              : "Configure what this user can access and modify in each module"}
          </p>
          {isSuperAdmin && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm text-blue-700">
                Super Admin permissions cannot be modified
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Module selector */}
        <div className="col-span-12 md:col-span-4">
          <Card className="h-full">
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Modules</h3>
              {permissionsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {availableModules.map(module => {
                    const modulePermission = permissions?.find(p => p.module === module.id);
                    const hasPermission = !!modulePermission;

                    // If user is SuperAdmin, show all modules as configured
                    const effectiveHasPermission = isSuperAdmin || hasPermission;
                    
                    // Set badge styles based on permission level
                    let badgeVariant = "default";
                    let badgeText = "No Access";
                    
                    if (isSuperAdmin) {
                      badgeVariant = "default";
                      badgeText = "Full Access";
                    } else if (hasPermission) {
                      if (modulePermission?.accessLevel === "full") {
                        badgeVariant = "default";
                        badgeText = "Full Access";
                      } else if (modulePermission?.accessLevel === "partial") {
                        badgeVariant = "secondary";
                        badgeText = "Partial";
                      } else {
                        badgeVariant = "outline";
                        badgeText = "Limited";
                      }
                    }
                    
                    return (
                      <div
                        key={module.id}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${
                          selectedModule === module.id
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-slate-50 border border-transparent"
                        }`}
                        onClick={() => setSelectedModule(module.id)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{module.name}</span>
                          {effectiveHasPermission && (
                            <Badge variant={badgeVariant as any} className={
                              badgeVariant === "default" ? "bg-green-600 hover:bg-green-700" : ""
                            }>
                              {badgeText}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Permission editor */}
        <div className="col-span-12 md:col-span-8">
          <Card>
            <CardContent className="pt-6">
              {permissionsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-64 mb-4" />
                  <Skeleton className="h-24 w-full mb-2" />
                  <Skeleton className="h-12 w-full mb-2" />
                  <Skeleton className="h-12 w-full mb-2" />
                  <Skeleton className="h-12 w-full mb-2" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : selectedModule ? (
                <>
                  <h3 className="text-lg font-medium mb-6">
                    {availableModules.find(m => m.id === selectedModule)?.name} Permissions
                  </h3>

                  {isPermissionLocked() ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-md mb-6">
                      <div className="flex items-center">
                        <ShieldAlert className="h-5 w-5 text-slate-500 mr-2" />
                        <span className="font-medium text-slate-700">
                          {isSuperAdmin 
                            ? "Super Admin permissions cannot be modified" 
                            : "You cannot modify your own permissions for the Users module"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-2">
                        {isSuperAdmin
                          ? "Super Admins have full access to all modules by default"
                          : "This is a security measure to prevent users from locking themselves out"}
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-6">
                    {/* Access Level */}
                    <div className="space-y-2">
                      <Label htmlFor="accessLevel">Access Level</Label>
                      <Select
                        value={permissionForm.accessLevel}
                        onValueChange={(value) => handlePermissionChange("accessLevel", value)}
                        disabled={isPermissionLocked()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select access level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Access</SelectItem>
                          <SelectItem value="partial">Partial Access</SelectItem>
                          <SelectItem value="restricted">Restricted Access</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        {permissionForm.accessLevel === "full" 
                          ? "User has unrestricted access to all features within this module" 
                          : permissionForm.accessLevel === "partial"
                          ? "User has access to most features with some restrictions"
                          : "User has minimal access with significant restrictions"}
                      </p>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium">CRUD Permissions</h4>

                      {/* Read Permission */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="read">View Records</Label>
                          <p className="text-xs text-slate-500">
                            Can view information in this module
                          </p>
                        </div>
                        <Switch
                          id="read"
                          checked={isSuperAdmin ? true : permissionForm.canRead}
                          onCheckedChange={(checked) => handlePermissionChange("canRead", checked)}
                          disabled={isPermissionLocked()}
                        />
                      </div>

                      {/* Create Permission */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="create">Create Records</Label>
                          <p className="text-xs text-slate-500">
                            Can add new records in this module
                          </p>
                        </div>
                        <Switch
                          id="create"
                          checked={isSuperAdmin ? true : permissionForm.canCreate}
                          onCheckedChange={(checked) => handlePermissionChange("canCreate", checked)}
                          disabled={isPermissionLocked()}
                        />
                      </div>

                      {/* Update Permission */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="update">Edit Records</Label>
                          <p className="text-xs text-slate-500">
                            Can modify existing records in this module
                          </p>
                        </div>
                        <Switch
                          id="update"
                          checked={isSuperAdmin ? true : permissionForm.canUpdate}
                          onCheckedChange={(checked) => handlePermissionChange("canUpdate", checked)}
                          disabled={isPermissionLocked()}
                        />
                      </div>

                      {/* Delete Permission */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="delete">Delete Records</Label>
                          <p className="text-xs text-slate-500">
                            Can remove records from this module
                          </p>
                        </div>
                        <Switch
                          id="delete"
                          checked={isSuperAdmin ? true : permissionForm.canDelete}
                          onCheckedChange={(checked) => handlePermissionChange("canDelete", checked)}
                          disabled={isPermissionLocked()}
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-between">
                      <div>
                        <Button 
                          onClick={handleSavePermission}
                          disabled={permissionMutation.isPending || isPermissionLocked()}
                        >
                          {permissionMutation.isPending ? "Saving..." : "Save Permissions"}
                        </Button>
                      </div>
                      
                      {selectedPermission && !isPermissionLocked() && (
                        <div>
                          <Button 
                            variant="destructive"
                            onClick={() => {
                              if (selectedPermission?.id && confirm("Are you sure you want to delete this permission?")) {
                                deletePermissionMutation.mutate(selectedPermission.id);
                              }
                            }}
                            disabled={deletePermissionMutation.isPending}
                          >
                            {deletePermissionMutation.isPending ? "Deleting..." : "Remove Access"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-slate-400 mb-2">No module selected</h3>
                  <p className="text-sm text-slate-500">
                    Select a module from the list on the left to configure permissions
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}