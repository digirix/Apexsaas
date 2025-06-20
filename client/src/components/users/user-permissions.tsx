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
  const [isLoadingPermission, setIsLoadingPermission] = useState(false);
  const [permissionForm, setPermissionForm] = useState<Partial<InsertUserPermission>>({
    accessLevel: "restricted",
    canRead: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false
  });
  
  // Track unsaved changes for each module separately
  const [unsavedModulePermissions, setUnsavedModulePermissions] = useState<Record<string, Partial<InsertUserPermission>>>({});
  
  // Track if current form has been modified
  const [isFormDirty, setIsFormDirty] = useState(false);

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

  // Fetch user permissions with cache busting
  const { data: permissions, isLoading: permissionsLoading, refetch: refetchPermissions } = useQuery<UserPermission[]>({
    queryKey: [`/api/v1/users/${userId}/permissions`],
    queryFn: async () => {
      const response = await fetch(`/api/v1/users/${userId}/permissions?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    },
    enabled: !!userId,
    staleTime: 0,
    gcTime: 0
  });

  // Get permission for selected module
  const selectedPermission = selectedModule
    ? permissions?.find(p => p.module === selectedModule)
    : null;

  // Helper function to detect unsaved changes for current module
  const hasUnsavedChangesForCurrentModule = (): boolean => {
    if (!selectedModule) return false;
    return !!unsavedModulePermissions[selectedModule];
  };

  // Handle module selection - now just switches modules, unsaved changes are preserved
  const handleModuleSelect = (newModuleId: string) => {
    setSelectedModule(newModuleId);
  };

  // Only sync CRUD toggles when CRUD permissions change (not when access level changes)
  useEffect(() => {
    if (isLoadingPermission) return; // Don't auto-sync while loading data
    
    const { canRead, canCreate, canUpdate, canDelete } = permissionForm;
    
    // Use the helper function for consistent access level calculation
    const calculatedAccessLevel = calculateAccessLevel(canRead!, canCreate!, canUpdate!, canDelete!);
    
    if (permissionForm.accessLevel !== calculatedAccessLevel) {
      setPermissionForm(prev => ({
        ...prev,
        accessLevel: calculatedAccessLevel
      }));
    }
  }, [permissionForm.canRead, permissionForm.canCreate, permissionForm.canUpdate, permissionForm.canDelete, isLoadingPermission]);

  // Update permission form when selected module changes - with priority-based loading
  useEffect(() => {
    if (selectedModule && permissions) {
      setIsLoadingPermission(true); // Prevent auto-sync during loading
      
      let newFormState: Partial<InsertUserPermission>;
      
      // Priority 1: Check for existing saved permission from database
      const existingPermission = permissions.find(p => p.module === selectedModule);
      if (existingPermission) {
        newFormState = {
          accessLevel: existingPermission.accessLevel,
          canRead: existingPermission.canRead,
          canCreate: existingPermission.canCreate,
          canUpdate: existingPermission.canUpdate,
          canDelete: existingPermission.canDelete
        };
      } 
      // Priority 2: Check for unsaved changes (only if no saved permission exists)
      else if (unsavedModulePermissions[selectedModule]) {
        newFormState = { ...unsavedModulePermissions[selectedModule] };
      } 
      // Priority 3: Default restricted state
      else {
        newFormState = {
          accessLevel: "restricted",
          canRead: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false
        };
      }
      
      setPermissionForm(newFormState);
      setIsFormDirty(false); // Reset dirty state when loading saved data
      
      // Reset loading state after data is set
      setTimeout(() => setIsLoadingPermission(false), 50);
    }
  }, [selectedModule, permissions]);

  // Store changes to unsavedModulePermissions when permissionForm changes
  useEffect(() => {
    if (selectedModule && !isLoadingPermission && isFormDirty) {
      // Only track unsaved changes if form has been modified by user
      setUnsavedModulePermissions(prev => ({
        ...prev,
        [selectedModule]: { ...permissionForm }
      }));
    }
  }, [permissionForm, selectedModule, isLoadingPermission, isFormDirty]);

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

  // Check if user should be demoted from admin status
  const checkAdminDemotion = async (updatedPermissions: UserPermission[]) => {
    try {
      // Get current user data
      const userResponse = await apiRequest('GET', `/api/v1/users/${userId}`);
      const userData = await userResponse.json();
      
      // Only check for non-super admins who are currently admins
      if (userData.isSuperAdmin || !userData.isAdmin) return;
      
      // Define all required modules for admin status
      const requiredModules = [
        "users", "clients", "tasks", "finance", "setup", "auto-generated-tasks",
        "compliance-calendar", "ai-features", "ai-reporting", "settings", "reports",
        "workflow-automation", "client-portal", "dashboard"
      ];
      
      // Check if user has full access to all modules
      const hasFullAccess = requiredModules.every(module => {
        const permission = updatedPermissions.find(p => p.module === module);
        return permission && 
               permission.accessLevel === 'full' &&
               permission.canRead && 
               permission.canCreate && 
               permission.canUpdate && 
               permission.canDelete;
      });
      
      // If user doesn't have full access, demote from admin
      if (!hasFullAccess) {
        await apiRequest('PUT', `/api/v1/users/${userId}/admin-status`, { isAdmin: false });
        
        // Invalidate user list to update UI
        queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
        
        toast({
          title: "Admin status removed",
          description: "User has been demoted to regular member due to reduced permissions.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Failed to check admin demotion:', error);
    }
  };

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
    onSuccess: (savedPermission) => {
      console.log('=== FRONTEND SAVE SUCCESS DEBUG ===');
      console.log('Permission save successful - API returned:', savedPermission);
      console.log('Current permissionForm state:', permissionForm);
      console.log('selectedModule:', selectedModule);
      
      if (selectedModule) {
        // Step 1: Use the ACTUAL saved permission from backend API response
        const actualSavedState = {
          accessLevel: savedPermission.accessLevel,
          canRead: savedPermission.canRead,
          canCreate: savedPermission.canCreate,
          canUpdate: savedPermission.canUpdate,
          canDelete: savedPermission.canDelete
        };
        
        console.log('Setting form state to ACTUAL saved data:', actualSavedState);
        setPermissionForm(actualSavedState);
        setIsFormDirty(false); // Clear dirty state after successful save
        
        // Step 2: Update React Query cache with the COMPLETE saved permission object
        console.log('Updating cache with complete saved permission...');
        queryClient.setQueryData([`/api/v1/users/${userId}/permissions`], (oldPermissions: UserPermission[] | undefined) => {
          console.log('Old permissions in cache:', oldPermissions);
          
          if (!oldPermissions) {
            console.log('No old permissions, creating new array with saved permission');
            return [savedPermission];
          }
          
          const existingIndex = oldPermissions.findIndex(p => p.module === selectedModule);
          console.log('Existing permission index for module:', existingIndex);
          
          if (existingIndex >= 0) {
            // Update existing permission with the complete saved object
            const updatedPermissions = [...oldPermissions];
            updatedPermissions[existingIndex] = savedPermission; // Use complete saved object
            console.log('Updated existing permission at index', existingIndex, 'with:', savedPermission);
            return updatedPermissions;
          } else {
            // Add new permission
            const newPermissions = [...oldPermissions, savedPermission];
            console.log('Added new permission to cache:', newPermissions);
            return newPermissions;
          }
        });
        
        // Step 3: Remove from unsaved changes
        setUnsavedModulePermissions(prev => {
          const updated = { ...prev };
          delete updated[selectedModule];
          console.log('Removed unsaved changes for module:', selectedModule);
          return updated;
        });
        
        // Step 4: Fetch canonical state from server after short delay
        setTimeout(async () => {
          console.log('Invalidating cache to fetch canonical state...');
          await queryClient.invalidateQueries({ queryKey: [`/api/v1/users/${userId}/permissions`] });
          
          // Step 5: Check if user should be demoted from admin after permission update
          const updatedPermissions = queryClient.getQueryData([`/api/v1/users/${userId}/permissions`]) as UserPermission[] | undefined;
          if (updatedPermissions) {
            await checkAdminDemotion(updatedPermissions);
          }
        }, 300);
      }
      
      console.log('=== END FRONTEND SAVE SUCCESS DEBUG ===');
      
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
  const handleSavePermission = (): Promise<void> => {
    if (!selectedModule || !userId) return Promise.resolve();

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

    return new Promise((resolve, reject) => {
      permissionMutation.mutate(permissionData, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  };

  // Handle permission change
  const handlePermissionChange = (field: keyof InsertUserPermission, value: any) => {
    // Mark form as dirty when user makes changes
    setIsFormDirty(true);
    
    if (field === 'accessLevel') {
      // Ensure accessLevel is one of the allowed values
      const accessLevel = value as 'full' | 'partial' | 'restricted';
      
      // Update access level and corresponding CRUD permissions in one go
      if (accessLevel === 'full') {
        setPermissionForm(prev => ({
          ...prev,
          accessLevel,
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true
        }));
      } else if (accessLevel === 'restricted') {
        setPermissionForm(prev => ({
          ...prev,
          accessLevel,
          canRead: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false
        }));
      } else if (accessLevel === 'partial') {
        setPermissionForm(prev => ({
          ...prev,
          accessLevel,
          canRead: true
          // Keep other CRUD permissions as they are for partial
        }));
      }
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

  // Helper function to calculate access level based on CRUD permissions - ensures consistency
  const calculateAccessLevel = (canRead: boolean, canCreate: boolean, canUpdate: boolean, canDelete: boolean) => {
    if (canRead && canCreate && canUpdate && canDelete) {
      return 'full';
    } else if (!canRead && !canCreate && !canUpdate && !canDelete) {
      return 'restricted';
    } else {
      return 'partial';
    }
  };

  // Helper function to get effective permission data for display (including unsaved changes)
  const getEffectivePermission = (moduleId: string) => {
    // Priority 1: Unsaved changes
    if (unsavedModulePermissions[moduleId]) {
      const unsaved = unsavedModulePermissions[moduleId];
      return {
        ...unsaved,
        accessLevel: calculateAccessLevel(unsaved.canRead!, unsaved.canCreate!, unsaved.canUpdate!, unsaved.canDelete!)
      };
    }
    
    // Priority 2: Saved permissions
    const savedPermission = permissions?.find(p => p.module === moduleId);
    if (savedPermission) {
      return {
        ...savedPermission,
        accessLevel: calculateAccessLevel(savedPermission.canRead, savedPermission.canCreate, savedPermission.canUpdate, savedPermission.canDelete)
      };
    }
    
    // Priority 3: Default (no permission)
    return null;
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
                    // Get effective permission data (including unsaved changes)
                    const effectivePermission = getEffectivePermission(module.id);
                    const hasPermission = !!effectivePermission;

                    // Set badge styles based on permission level - using consistent logic
                    let badgeVariant = "destructive";
                    let badgeText = "No Access";
                    let badgeIcon = <ShieldAlert className="h-3 w-3" />;
                    
                    if (isSuperAdmin) {
                      badgeVariant = "default";
                      badgeText = "Full Access";
                      badgeIcon = <ShieldCheck className="h-3 w-3" />;
                    } else if (hasPermission) {
                      // Use the calculated access level for consistency
                      if (effectivePermission.accessLevel === "full") {
                        badgeVariant = "default";
                        badgeText = "Full Access";
                        badgeIcon = <ShieldCheck className="h-3 w-3" />;
                      } else if (effectivePermission.accessLevel === "partial") {
                        badgeVariant = "secondary";
                        badgeText = "Partial Access";
                        badgeIcon = <CheckCircle2 className="h-3 w-3" />;
                      } else {
                        badgeVariant = "outline";
                        badgeText = "Restricted Access";
                        badgeIcon = <AlertCircle className="h-3 w-3" />;
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
                        onClick={() => handleModuleSelect(module.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{module.name}</span>
                            {unsavedModulePermissions[module.id] && (
                              <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Unsaved changes" />
                            )}
                          </div>
                          <Badge variant={badgeVariant as any} className={`
                            flex items-center gap-1
                            ${badgeVariant === "default" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                            ${badgeVariant === "secondary" ? "bg-yellow-100 text-yellow-800 border-yellow-300" : ""}
                            ${badgeVariant === "destructive" ? "bg-red-100 text-red-800 border-red-300" : ""}
                            ${badgeVariant === "outline" ? "bg-gray-100 text-gray-700 border-gray-300" : ""}
                          `}>
                            {badgeIcon}
                            {badgeText}
                          </Badge>
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
                      <h4 className="font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Specific Permissions
                      </h4>

                      {/* Read Permission */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="read" className="font-medium">View Records</Label>
                            {(isSuperAdmin || permissionForm.canRead) ? (
                              <Badge variant="default" className="bg-green-600 text-white text-xs">
                                ✓ Granted
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                ✗ Denied
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">
                            Can view and access information in this module
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
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="create" className="font-medium">Create Records</Label>
                            {(isSuperAdmin || permissionForm.canCreate) ? (
                              <Badge variant="default" className="bg-green-600 text-white text-xs">
                                ✓ Granted
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                ✗ Denied
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">
                            Can add new records and data in this module
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
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="update" className="font-medium">Edit Records</Label>
                            {(isSuperAdmin || permissionForm.canUpdate) ? (
                              <Badge variant="default" className="bg-green-600 text-white text-xs">
                                ✓ Granted
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                ✗ Denied
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">
                            Can modify and update existing records in this module
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
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="delete" className="font-medium">Delete Records</Label>
                            {(isSuperAdmin || permissionForm.canDelete) ? (
                              <Badge variant="default" className="bg-green-600 text-white text-xs">
                                ✓ Granted
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                ✗ Denied
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">
                            Can permanently remove records from this module
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