import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ArrowRight, CheckCircle, ChevronRight, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { InsertUser, insertUserSchema, Department, Designation } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Define the module permissions
const availableModules = [
  { id: "clients", name: "Clients Management" },
  { id: "tasks", name: "Tasks Management" },
  { id: "setup", name: "System Setup" },
  { id: "users", name: "User Management" },
  { id: "reports", name: "Reports" },
  { id: "finance", name: "Finance" }
];

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basicInfo");
  const [userPermissions, setUserPermissions] = useState<Record<string, any>>({});
  
  // Fetch departments for dropdown
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['/api/v1/departments'],
  });

  // Fetch designations for dropdown
  const { data: designations } = useQuery<Designation[]>({
    queryKey: ['/api/v1/designations'],
  });

  // Extended schema with password confirmation
  const basicInfoSchema = z.object({
    displayName: z.string().min(1, "Display name is required"),
    designationId: z.number().optional(),
    departmentId: z.number().optional(),
  });
  
  const credentialsSchema = z.object({
    email: z.string().email("Invalid email format"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    isActive: z.boolean().default(true),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

  type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;
  type CredentialsFormValues = z.infer<typeof credentialsSchema>;
  
  // Form setups
  const basicInfoForm = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      displayName: "",
      designationId: undefined,
      departmentId: undefined,
    },
  });
  
  const credentialsForm = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      isActive: true,
    },
  });

  // Initialize permissions for each module
  const initializePermissions = () => {
    const initialPermissions: Record<string, any> = {};
    availableModules.forEach(module => {
      initialPermissions[module.id] = {
        accessLevel: "restricted",
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false
      };
    });
    return initialPermissions;
  };

  // Reset all forms and state
  const resetForms = () => {
    basicInfoForm.reset();
    credentialsForm.reset();
    setUserPermissions(initializePermissions());
    setActiveTab("basicInfo");
  };

  // Handle permission changes
  const handlePermissionChange = (moduleId: string, field: string, value: any) => {
    setUserPermissions(prev => {
      const updated = { ...prev };
      
      // If changing access level, update CRUD permissions automatically
      if (field === 'accessLevel') {
        if (value === 'full') {
          updated[moduleId] = {
            ...updated[moduleId],
            accessLevel: value,
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true
          };
        } else if (value === 'restricted') {
          updated[moduleId] = {
            ...updated[moduleId],
            accessLevel: value,
            canRead: false,
            canCreate: false,
            canUpdate: false,
            canDelete: false
          };
        } else {
          // For 'partial', just update the access level
          updated[moduleId] = {
            ...updated[moduleId],
            accessLevel: value
          };
        }
      } else {
        // Update individual permission
        updated[moduleId] = {
          ...updated[moduleId], 
          [field]: value
        };
        
        // If all permissions are enabled, set access level to full
        const allEnabled = updated[moduleId].canRead && 
                           updated[moduleId].canCreate && 
                           updated[moduleId].canUpdate && 
                           updated[moduleId].canDelete;
                           
        // If all permissions are disabled, set access level to restricted
        const allDisabled = !updated[moduleId].canRead && 
                            !updated[moduleId].canCreate && 
                            !updated[moduleId].canUpdate && 
                            !updated[moduleId].canDelete;
                            
        if (allEnabled) {
          updated[moduleId].accessLevel = 'full';
        } else if (allDisabled) {
          updated[moduleId].accessLevel = 'restricted';
        } else {
          updated[moduleId].accessLevel = 'partial';
        }
      }
      
      return updated;
    });
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      console.log("Creating user with data:", userData);
      
      try {
        // First create the user
        const response = await fetch('/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData.user),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
          throw new Error(errorData.message || "Failed to create user");
        }
        
        const userResult = await response.json();
        console.log("User created:", userResult);
        
        // Now create permissions for the user
        const permissionPromises = Object.keys(userData.permissions).map(async (moduleId) => {
          const permission = userData.permissions[moduleId];
          // Only create permissions that are not restricted
          if (permission.accessLevel !== 'restricted') {
            const permissionData = {
              userId: userResult.id,
              tenantId: userResult.tenantId,
              module: moduleId,
              accessLevel: permission.accessLevel,
              canRead: permission.canRead,
              canCreate: permission.canCreate, 
              canUpdate: permission.canUpdate,
              canDelete: permission.canDelete
            };
            
            return fetch('/api/v1/user-permissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(permissionData),
              credentials: 'include'
            });
          }
          return Promise.resolve();
        });
        
        await Promise.all(permissionPromises);
        
        return userResult;
      } catch (error) {
        console.error("API Request Failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("User created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      toast({
        title: "User created",
        description: "The user has been created successfully with all permissions.",
      });
      resetForms();
      onClose();
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Error in mutation:", error);
      toast({
        title: "Error creating user",
        description: error.message || "An error occurred while creating the user",
        variant: "destructive",
      });
      setSubmitting(false);
    },
  });

  // Next button handler for basic info
  const handleBasicInfoNext = async () => {
    try {
      const valid = await basicInfoForm.trigger();
      if (valid) {
        setActiveTab("permissions");
      }
    } catch (error) {
      console.error("Error validating basic info:", error);
    }
  };

  // Next button handler for permissions
  const handlePermissionsNext = () => {
    setActiveTab("credentials");
  };

  // Submit handler for the entire form
  const handleSubmit = async () => {
    try {
      const valid = await credentialsForm.trigger();
      if (!valid) {
        console.error("Credentials validation failed:", credentialsForm.formState.errors);
        return;
      }
      
      setSubmitting(true);
      
      // Combine all form data
      const basicInfo = basicInfoForm.getValues();
      const credentials = credentialsForm.getValues();
      
      const userData = {
        displayName: basicInfo.displayName,
        departmentId: basicInfo.departmentId,
        designationId: basicInfo.designationId,
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
        isActive: credentials.isActive,
      };
      
      // Submit data
      createUserMutation.mutate({
        user: userData,
        permissions: userPermissions
      });
      
    } catch (error) {
      console.error("Error in form submission:", error);
      setSubmitting(false);
      toast({
        title: "Error",
        description: "An unexpected error occurred while submitting the form",
        variant: "destructive",
      });
    }
  };

  // Handle close
  const handleClose = () => {
    if (!submitting) {
      resetForms();
      onClose();
    }
  };

  // Initialize permissions on first open
  useState(() => {
    setUserPermissions(initializePermissions());
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Create a new team member with specific permissions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="basicInfo">1. Basic Information</TabsTrigger>
            <TabsTrigger value="permissions">2. Access Permissions</TabsTrigger>
            <TabsTrigger value="credentials">3. Credentials</TabsTrigger>
          </TabsList>
          
          {/* Basic Information */}
          <TabsContent value="basicInfo">
            <Card>
              <CardHeader>
                <CardTitle>Member Information</CardTitle>
                <CardDescription>
                  Enter the basic details for the new team member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...basicInfoForm}>
                  <form className="space-y-4">
                    <FormField
                      control={basicInfoForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Member Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={basicInfoForm.control}
                        name="designationId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Designation</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                              value={field.value?.toString() || "none"}
                              disabled={!designations?.length}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select designation" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {designations?.map((designation) => (
                                  <SelectItem key={designation.id} value={designation.id.toString()}>
                                    {designation.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {!designations?.length && (
                              <p className="text-xs text-amber-600 mt-1">
                                No designations available. Add them in Setup first.
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={basicInfoForm.control}
                        name="departmentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                              value={field.value?.toString() || "none"}
                              disabled={!departments?.length}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {departments?.map((department) => (
                                  <SelectItem key={department.id} value={department.id.toString()}>
                                    {department.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {!departments?.length && (
                              <p className="text-xs text-amber-600 mt-1">
                                No departments available. Add them in Setup first.
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        type="button" 
                        onClick={handleBasicInfoNext}
                      >
                        Next Step
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Access Permissions */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>Module Permissions</CardTitle>
                <CardDescription>
                  Set access levels for each module in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {availableModules.map((module) => (
                    <div key={module.id} className="border rounded-md p-4">
                      <h3 className="text-lg font-medium mb-3">{module.name}</h3>
                      
                      <div className="mb-4">
                        <label className="text-sm font-medium">Access Level</label>
                        <div className="flex space-x-4 mt-1">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="radio" 
                              id={`${module.id}-full`} 
                              checked={userPermissions[module.id]?.accessLevel === 'full'} 
                              onChange={() => handlePermissionChange(module.id, 'accessLevel', 'full')}
                              className="rounded text-primary"
                            />
                            <label htmlFor={`${module.id}-full`} className="text-sm">Full</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="radio" 
                              id={`${module.id}-partial`} 
                              checked={userPermissions[module.id]?.accessLevel === 'partial'} 
                              onChange={() => handlePermissionChange(module.id, 'accessLevel', 'partial')}
                              className="rounded text-primary"
                            />
                            <label htmlFor={`${module.id}-partial`} className="text-sm">Partial</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="radio" 
                              id={`${module.id}-restricted`} 
                              checked={userPermissions[module.id]?.accessLevel === 'restricted'} 
                              onChange={() => handlePermissionChange(module.id, 'accessLevel', 'restricted')}
                              className="rounded text-primary"
                            />
                            <label htmlFor={`${module.id}-restricted`} className="text-sm">Restricted</label>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`grid grid-cols-2 gap-x-6 gap-y-2 ${userPermissions[module.id]?.accessLevel === 'restricted' || userPermissions[module.id]?.accessLevel === 'full' ? 'opacity-50' : ''}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-sm">Create Records</label>
                          <Switch 
                            checked={userPermissions[module.id]?.canCreate} 
                            onCheckedChange={(checked) => handlePermissionChange(module.id, 'canCreate', checked)}
                            disabled={userPermissions[module.id]?.accessLevel !== 'partial'}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm">View Records</label>
                          <Switch 
                            checked={userPermissions[module.id]?.canRead} 
                            onCheckedChange={(checked) => handlePermissionChange(module.id, 'canRead', checked)}
                            disabled={userPermissions[module.id]?.accessLevel !== 'partial'}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm">Edit Records</label>
                          <Switch 
                            checked={userPermissions[module.id]?.canUpdate} 
                            onCheckedChange={(checked) => handlePermissionChange(module.id, 'canUpdate', checked)}
                            disabled={userPermissions[module.id]?.accessLevel !== 'partial'}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm">Delete Records</label>
                          <Switch 
                            checked={userPermissions[module.id]?.canDelete} 
                            onCheckedChange={(checked) => handlePermissionChange(module.id, 'canDelete', checked)}
                            disabled={userPermissions[module.id]?.accessLevel !== 'partial'}
                          />
                        </div>
                      </div>
                      
                      {userPermissions[module.id]?.accessLevel === 'full' && (
                        <p className="text-xs text-blue-600 mt-2">Full access automatically grants all permissions</p>
                      )}
                      
                      {userPermissions[module.id]?.accessLevel === 'restricted' && (
                        <p className="text-xs text-slate-500 mt-2">Restricted access denies all permissions</p>
                      )}
                    </div>
                  ))}
                  
                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setActiveTab("basicInfo")}
                    >
                      Back
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handlePermissionsNext}
                    >
                      Next Step
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Credentials */}
          <TabsContent value="credentials">
            <Card>
              <CardHeader>
                <CardTitle>Login Credentials</CardTitle>
                <CardDescription>
                  Set login credentials for the new member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...credentialsForm}>
                  <form className="space-y-4">
                    <FormField
                      control={credentialsForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john.doe@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={credentialsForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="johndoe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={credentialsForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={credentialsForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={credentialsForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Active Status</FormLabel>
                            <div className="text-sm text-slate-500">
                              Users with active status can log in to the system
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setActiveTab("permissions")}
                      >
                        Back
                      </Button>
                      <Button 
                        type="button" 
                        onClick={handleSubmit}
                        disabled={submitting}
                      >
                        {submitting ? "Creating Member..." : "Create Member"}
                        <UserPlus className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}