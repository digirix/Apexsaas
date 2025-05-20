import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Shield, Key, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const portalAccessSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  passwordResetRequired: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

type PortalAccessFormData = z.infer<typeof portalAccessSchema>;

interface ClientPortalAccessTabProps {
  clientId: number;
  tenantId: number;
}

export function ClientPortalAccessTab({ clientId, tenantId }: ClientPortalAccessTabProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize form with validation
  const form = useForm<PortalAccessFormData>({
    resolver: zodResolver(portalAccessSchema),
    defaultValues: {
      username: "",
      password: "",
      passwordResetRequired: true,
      isActive: true,
    },
  });
  
  // Fetch client details
  const { data: client } = useQuery({
    queryKey: [`/api/v1/clients/${clientId}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/v1/clients/${clientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client");
      }
      return response.json();
    },
  });
  
  // Fetch portal access
  const { 
    data: portalAccess, 
    isLoading: isLoadingAccess,
    refetch: refetchAccess
  } = useQuery({
    queryKey: [`/api/v1/clients/${clientId}/portal-access`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/v1/clients/${clientId}/portal-access`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No portal access created yet
        }
        throw new Error("Failed to fetch portal access");
      }
      return response.json();
    },
  });
  
  // Create portal access mutation
  const createPortalAccessMutation = useMutation({
    mutationFn: async (data: PortalAccessFormData) => {
      const response = await apiRequest("POST", `/api/v1/clients/${clientId}/portal-access`, {
        ...data,
        tenantId,
        clientId,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create portal access");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Portal access created",
        description: "Client portal access credentials have been created successfully",
      });
      
      // Update client's hasPortalAccess flag
      updateClientMutation.mutate({ hasPortalAccess: true });
      
      // Reset form and update UI
      form.reset();
      setIsCreating(false);
      refetchAccess();
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [`/api/v1/clients/${clientId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create portal access",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/v1/clients/${clientId}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update client");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/clients/${clientId}`] });
    },
  });
  
  // Update portal access mutation
  const updatePortalAccessMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/v1/clients/${clientId}/portal-access`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update portal access");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Portal access updated",
        description: "Client portal access has been updated successfully",
      });
      refetchAccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update portal access",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { password: string, passwordResetRequired: boolean }) => {
      const response = await apiRequest("POST", `/api/v1/clients/${clientId}/portal-access/reset-password`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset",
        description: "Client portal password has been reset successfully",
      });
      refetchAccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete portal access mutation
  const deletePortalAccessMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/v1/clients/${clientId}/portal-access`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete portal access");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Portal access removed",
        description: "Client portal access has been removed successfully",
      });
      
      // Update client's hasPortalAccess flag
      updateClientMutation.mutate({ hasPortalAccess: false });
      
      refetchAccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete portal access",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  function onSubmit(data: PortalAccessFormData) {
    createPortalAccessMutation.mutate(data);
  }
  
  // Handle status toggle
  function handleStatusToggle(isActive: boolean) {
    updatePortalAccessMutation.mutate({ isActive });
  }
  
  // Handle password reset
  function handlePasswordReset() {
    const newPassword = generateRandomPassword();
    resetPasswordMutation.mutate({ 
      password: newPassword,
      passwordResetRequired: true
    });
  }
  
  // Generate random password
  function generateRandomPassword() {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  }
  
  // Generate username based on client name
  function generateUsername() {
    if (!client) return;
    
    // Remove spaces and special characters, convert to lowercase
    const username = client.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 15); // Limit to 15 characters
    
    form.setValue("username", username);
  }
  
  // Generate password
  function handleGeneratePassword() {
    const password = generateRandomPassword();
    form.setValue("password", password);
  }
  
  // Handle delete portal access
  function handleDeletePortalAccess() {
    if (confirm("Are you sure you want to delete client portal access? This action cannot be undone.")) {
      deletePortalAccessMutation.mutate();
    }
  }
  
  if (isLoadingAccess) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If creating new portal access
  if (isCreating || !portalAccess) {
    return (
      <div className="space-y-6">
        {!isCreating && !portalAccess && (
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Client Portal Access</h3>
              <p className="text-sm text-gray-500">
                Create credentials for client to access their secure portal
              </p>
            </div>
            <Button onClick={() => setIsCreating(true)}>
              <Shield className="mr-2 h-4 w-4" />
              Create Portal Access
            </Button>
          </div>
        )}
        
        {(isCreating || !portalAccess) && (
          <Card>
            <CardHeader>
              <CardTitle>Create Portal Access</CardTitle>
              <CardDescription>
                Set up credentials for the client to access their information through the portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="username">Username</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={generateUsername}
                    >
                      Generate
                    </Button>
                  </div>
                  <Input
                    id="username"
                    {...form.register("username")}
                  />
                  {form.formState.errors.username && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Password</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGeneratePassword}
                    >
                      Generate Secure Password
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type="text" // Visible for admin to share with client
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="password-reset"
                    checked={form.watch("passwordResetRequired")}
                    onCheckedChange={(checked) => form.setValue("passwordResetRequired", checked)}
                  />
                  <Label htmlFor="password-reset">
                    Require password change on first login
                  </Label>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  {isCreating && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreating(false)}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button 
                    type="submit"
                    disabled={createPortalAccessMutation.isPending}
                  >
                    {createPortalAccessMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Portal Access"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
  
  // Display existing portal access
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Client Portal Access</h3>
          <p className="text-sm text-gray-500">
            Manage client's access to their secure portal
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Portal Access Credentials
          </CardTitle>
          <CardDescription>
            The client can use these credentials to access their information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${portalAccess.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">Status: {portalAccess.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {portalAccess.isActive ? 'Disable access' : 'Enable access'}
              </span>
              <Switch
                checked={portalAccess.isActive}
                onCheckedChange={handleStatusToggle}
                disabled={updatePortalAccessMutation.isPending}
              />
            </div>
          </div>
          
          {/* Username */}
          <div className="space-y-1">
            <Label htmlFor="portal-username">Username</Label>
            <div className="flex items-center">
              <Input
                id="portal-username"
                value={portalAccess.username}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>
          
          {/* Last login information */}
          <div className="pt-2">
            <p className="text-sm text-gray-500">
              {portalAccess.lastLogin ? (
                <>Last login: {new Date(portalAccess.lastLogin).toLocaleString()}</>
              ) : (
                <>Client has never logged in</>
              )}
            </p>
            
            {portalAccess.passwordResetRequired && (
              <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  Client will be required to change password on first login
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handlePasswordReset}
              disabled={resetPasswordMutation.isPending}
              className="flex-1"
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDeletePortalAccess}
              disabled={deletePortalAccessMutation.isPending}
              className="flex-1"
            >
              {deletePortalAccessMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Portal Access"
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="bg-gray-50 border-t px-6 py-3">
          <div className="flex items-center text-sm text-gray-500">
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            Client portal access is enabled for this client
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}