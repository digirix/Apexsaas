import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { UserPermission, InsertUserPermission, accessLevelEnum } from "@shared/schema";

// Define available modules
const availableModules = [
  { id: "clients", name: "Clients Management" },
  { id: "tasks", name: "Tasks Management" },
  { id: "finance", name: "Finance" },
  { id: "reports", name: "Reports" },
  { id: "setup", name: "System Setup" }
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
  }
  
  // Fetch user details
  const { data: user } = useQuery<UserDetails>({
    queryKey: [`/api/v1/users/${userId}`],
    enabled: !!userId
  });

  // Fetch user permissions
  const { data: permissions, isLoading: permissionsLoading, refetch: refetchPermissions } = useQuery<UserPermission[]>({
    queryKey: [`/api/v1/users/${userId}/permissions`],
    enabled: !!userId
  });

  // Get permission for selected module
  const selectedPermission = selectedModule
    ? permissions?.find(p => p.module === selectedModule)
    : null;

  // Update permission form when selected module changes
  useEffect(() => {
    if (selectedPermission) {
      setPermissionForm({
        accessLevel: selectedPermission.accessLevel,
        canRead: selectedPermission.canRead,
        canCreate: selectedPermission.canCreate,
        canUpdate: selectedPermission.canUpdate,
        canDelete: selectedPermission.canDelete
      });
    } else if (selectedModule) {
      // Default values for new permission
      setPermissionForm({
        accessLevel: "restricted",
        canRead: true,
        canCreate: false,
        canUpdate: false,
        canDelete: false
      });
    }
  }, [selectedPermission, selectedModule]);

  // Delete permission mutation
  const deletePermissionMutation = useMutation({
    mutationFn: async (id: number) => {
      return fetch(`/api/v1/user-permissions/${id}`, {
        method: "DELETE"
      }).then(res => {
        if (!res.ok) throw new Error("Failed to delete permission");
        return true;
      });
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
      if (selectedPermission) {
        return fetch(`/api/v1/user-permissions/${selectedPermission.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        }).then(res => {
          if (!res.ok) throw new Error("Failed to update permission");
          return res.json();
        });
      } else {
        return fetch("/api/v1/user-permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        }).then(res => {
          if (!res.ok) throw new Error("Failed to create permission");
          return res.json();
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/users/${userId}/permissions`] });
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

    // For now, we'll use 1 as the default tenant ID (this would normally come from the user context)
    const tenantId = user?.tenantId || 1;
    
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

  return (
    <div>
      {user ? (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            Permissions for {user.displayName}
          </h2>
          <p className="text-slate-500">
            Configure what this user can access and modify in each module
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Loading user information...</h2>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Module selector */}
        <div className="col-span-12 md:col-span-4">
          <Card className="h-full">
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Modules</h3>
              <div className="space-y-1">
                {availableModules.map(module => {
                  const hasPermission = permissions?.some(p => p.module === module.id);
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
                        {hasPermission && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                            Configured
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permission editor */}
        <div className="col-span-12 md:col-span-8">
          <Card>
            <CardContent className="pt-6">
              {selectedModule ? (
                <>
                  <h3 className="text-lg font-medium mb-6">
                    {availableModules.find(m => m.id === selectedModule)?.name} Permissions
                  </h3>

                  <div className="space-y-6">
                    {/* Access Level */}
                    <div className="space-y-2">
                      <Label htmlFor="accessLevel">Access Level</Label>
                      <Select
                        value={permissionForm.accessLevel}
                        onValueChange={(value) => handlePermissionChange("accessLevel", value)}
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
                          checked={permissionForm.canRead}
                          onCheckedChange={(checked) => handlePermissionChange("canRead", checked)}
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
                          checked={permissionForm.canCreate}
                          onCheckedChange={(checked) => handlePermissionChange("canCreate", checked)}
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
                          checked={permissionForm.canUpdate}
                          onCheckedChange={(checked) => handlePermissionChange("canUpdate", checked)}
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
                          checked={permissionForm.canDelete}
                          onCheckedChange={(checked) => handlePermissionChange("canDelete", checked)}
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-between">
                      <div>
                        <Button 
                          onClick={handleSavePermission}
                          disabled={permissionMutation.isPending}
                        >
                          {permissionMutation.isPending ? "Saving..." : "Save Permissions"}
                        </Button>
                      </div>
                      
                      {selectedPermission && (
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
                            {deletePermissionMutation.isPending ? "Deleting..." : "Delete Permission"}
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