import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Key, Edit, Trash2, AlertTriangle, RefreshCw, 
  Shield, ShieldOff, InfoIcon, EyeIcon, EyeOffIcon, 
  Copy, Check, User, UserPlus 
} from "lucide-react";
import { DeleteConfirmationDialog } from "../ui/delete-confirmation-dialog";

// Schema for client portal access
const portalAccessSchema = z.object({
  username: z.string().min(4, "Username must be at least 4 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  passwordResetRequired: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

type PortalAccessFormData = z.infer<typeof portalAccessSchema>;

interface ClientPortalAccessTabProps {
  clientId: number;
  tenantId: number;
}

export function ClientPortalAccessTab({ clientId, tenantId }: ClientPortalAccessTabProps) {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordCopied, setIsPasswordCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch client portal access data
  const { 
    data: portalAccess, 
    isLoading: isPortalAccessLoading,
    error: portalAccessError,
    refetch: refetchPortalAccess
  } = useQuery({
    queryKey: [`/api/v1/clients/${clientId}/portal-access`],
    enabled: !!clientId,
  });

  // Fetch client data to get the hasPortalAccess property
  const { 
    data: client,
    refetch: refetchClient
  } = useQuery({
    queryKey: [`/api/v1/clients/${clientId}`],
    enabled: !!clientId,
  });

  // Form for creating/editing portal access
  const form = useForm<PortalAccessFormData>({
    resolver: zodResolver(portalAccessSchema),
    defaultValues: {
      username: "",
      password: "",
      passwordResetRequired: true,
      isActive: true,
    },
  });

  // Reset form when the modal is opened
  useEffect(() => {
    if (isCreateModalOpen) {
      form.reset({
        username: "",
        password: "",
        passwordResetRequired: true,
        isActive: true,
      });
    }
  }, [isCreateModalOpen, form]);

  // Set form values when editing existing portal access
  useEffect(() => {
    if (isEditModalOpen && portalAccess) {
      form.reset({
        username: portalAccess.username,
        password: "", // Don't show existing password
        passwordResetRequired: portalAccess.passwordResetRequired,
        isActive: portalAccess.isActive,
      });
    }
  }, [isEditModalOpen, portalAccess, form]);

  // Create portal access mutation
  const createPortalAccessMutation = useMutation({
    mutationFn: async (data: PortalAccessFormData) => {
      const response = await apiRequest(
        "POST",
        `/api/v1/clients/${clientId}/portal-access`,
        data
      );
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Portal access created",
        description: "Client portal access has been created successfully.",
      });
      setIsCreateModalOpen(false);
      refetchPortalAccess();
      refetchClient();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create portal access",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update portal access mutation
  const updatePortalAccessMutation = useMutation({
    mutationFn: async (data: Partial<PortalAccessFormData>) => {
      const response = await apiRequest(
        "PATCH",
        `/api/v1/clients/${clientId}/portal-access`,
        data
      );
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Portal access updated",
        description: "Client portal access has been updated successfully.",
      });
      setIsEditModalOpen(false);
      refetchPortalAccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update portal access",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle portal access status mutation
  const togglePortalAccessStatusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const response = await apiRequest(
        "PATCH",
        `/api/v1/clients/${clientId}/portal-access`,
        { isActive }
      );
      
      return response.json();
    },
    onSuccess: (_, isActive) => {
      toast({
        title: isActive ? "Portal access activated" : "Portal access deactivated",
        description: `Client portal access has been ${isActive ? "activated" : "deactivated"} successfully.`,
      });
      refetchPortalAccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update portal access status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete portal access mutation
  const deletePortalAccessMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "DELETE",
        `/api/v1/clients/${clientId}/portal-access`,
        {}
      );
      
      return response.status === 204 ? true : response.json();
    },
    onSuccess: () => {
      toast({
        title: "Portal access deleted",
        description: "Client portal access has been deleted successfully.",
      });
      setIsDeleteModalOpen(false);
      refetchPortalAccess();
      refetchClient();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete portal access",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const response = await apiRequest(
        "PATCH",
        `/api/v1/clients/${clientId}/portal-access/reset-password`,
        { password: newPassword, passwordResetRequired: true }
      );
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset",
        description: "Client portal password has been reset successfully.",
      });
      refetchPortalAccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler for form submission
  const onSubmit = async (data: PortalAccessFormData) => {
    setLoading(true);
    
    try {
      if (isCreateModalOpen) {
        await createPortalAccessMutation.mutateAsync(data);
      } else if (isEditModalOpen) {
        // Only include password if it's changed (not empty)
        const updateData: Partial<PortalAccessFormData> = {
          username: data.username,
          isActive: data.isActive,
          passwordResetRequired: data.passwordResetRequired,
        };
        
        if (data.password.trim() !== "") {
          updateData.password = data.password;
        }
        
        await updatePortalAccessMutation.mutateAsync(updateData);
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate a random password
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue("password", password);
    setShowPassword(true);
  };

  // Copy password to clipboard
  const copyPassword = (password: string) => {
    navigator.clipboard.writeText(password);
    setIsPasswordCopied(true);
    setTimeout(() => setIsPasswordCopied(false), 3000);
    toast({
      title: "Password copied",
      description: "Password has been copied to clipboard.",
    });
  };

  const getPortalUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/client-portal/login`;
  };

  // Copy portal URL to clipboard
  const copyPortalUrl = () => {
    navigator.clipboard.writeText(getPortalUrl());
    toast({
      title: "URL copied",
      description: "Portal URL has been copied to clipboard.",
    });
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Client Portal Access</CardTitle>
            <CardDescription>
              Manage this client's access to the portal
            </CardDescription>
          </div>
          {portalAccess ? (
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Access
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit portal credentials</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Access
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove portal access</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Portal Access
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isPortalAccessLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : portalAccessError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load portal access information.
              </AlertDescription>
            </Alert>
          ) : !portalAccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Portal Access</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                This client doesn't have access to the portal yet. Create portal access credentials to allow them to log in and view their information.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Portal Access
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Username</h4>
                      <p className="font-medium">{portalAccess.username}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Status</h4>
                      <div className="flex items-center mt-1">
                        <Badge variant={portalAccess.isActive ? "success" : "destructive"}>
                          {portalAccess.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <div className="ml-4">
                          <Switch
                            checked={portalAccess.isActive}
                            onCheckedChange={(checked) => {
                              togglePortalAccessStatusMutation.mutate(checked);
                            }}
                            disabled={togglePortalAccessStatusMutation.isPending}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Password Reset Required</h4>
                      <Badge variant={portalAccess.passwordResetRequired ? "warning" : "outline"} className="mt-1">
                        {portalAccess.passwordResetRequired ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Created At</h4>
                      <p>{formatDate(portalAccess.createdAt)}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Last Login</h4>
                      <p>{formatDate(portalAccess.lastLogin)}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Last Updated</h4>
                      <p>{formatDate(portalAccess.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-md p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Client Portal URL</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyPortalUrl}
                    className="h-8"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <div className="mt-2">
                  <Input 
                    value={getPortalUrl()}
                    readOnly
                    onClick={(e) => e.currentTarget.select()}
                    className="bg-white font-mono text-sm"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset Client Password</DialogTitle>
                      <DialogDescription>
                        This will generate a new password for the client. You'll need to provide this password to them.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="flex space-x-2">
                          <div className="relative flex-1">
                            <Input
                              id="new-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter new password"
                              value={form.watch("password")}
                              onChange={(e) => form.setValue("password", e.target.value)}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOffIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <Button type="button" variant="outline" onClick={generateRandomPassword}>
                            Generate
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="password-reset-required"
                          checked={form.watch("passwordResetRequired")}
                          onCheckedChange={(checked) => 
                            form.setValue("passwordResetRequired", checked === true)
                          }
                        />
                        <label
                          htmlFor="password-reset-required"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Require password change on next login
                        </label>
                      </div>
                      
                      <Alert>
                        <InfoIcon className="h-4 w-4" />
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                          Make sure to securely share this password with the client. They'll need it to log in to the portal.
                        </AlertDescription>
                      </Alert>
                    </div>
                    
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        type="button"
                        onClick={() => resetPasswordMutation.mutate(form.watch("password"))}
                        disabled={!form.watch("password") || resetPasswordMutation.isPending}
                      >
                        {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Button 
                  variant={portalAccess.isActive ? "destructive" : "default"}
                  onClick={() => togglePortalAccessStatusMutation.mutate(!portalAccess.isActive)}
                  disabled={togglePortalAccessStatusMutation.isPending}
                >
                  {portalAccess.isActive ? (
                    <>
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Deactivate Access
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Activate Access
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create Portal Access Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Portal Access</DialogTitle>
            <DialogDescription>
              Create login credentials for this client to access the portal.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <FormControl>
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            {...field}
                            className="pr-10"
                          />
                        </FormControl>
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOffIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <Button type="button" variant="outline" onClick={generateRandomPassword}>
                        Generate
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex flex-col space-y-4">
                <FormField
                  control={form.control}
                  name="passwordResetRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Require password change on first login
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Account is active
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Access"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Portal Access Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Portal Access</DialogTitle>
            <DialogDescription>
              Update the portal access settings for this client.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Password {" "}
                      <span className="text-sm font-normal text-gray-500">
                        (Leave blank to keep current password)
                      </span>
                    </FormLabel>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <FormControl>
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            {...field}
                            className="pr-10"
                          />
                        </FormControl>
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOffIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <Button type="button" variant="outline" onClick={generateRandomPassword}>
                        Generate
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex flex-col space-y-4">
                <FormField
                  control={form.control}
                  name="passwordResetRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Require password change on next login
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Account is active
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update Access"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deletePortalAccessMutation.mutate()}
        isLoading={deletePortalAccessMutation.isPending}
        title="Delete Portal Access"
        description="Are you sure you want to delete this client's portal access? This action cannot be undone."
      />
    </div>
  );
}