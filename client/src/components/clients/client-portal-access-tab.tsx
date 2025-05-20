import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Check, Copy, Key, Lock, LockKeyhole, ShieldAlert, User, 
  UserCheck, UserX, RefreshCw, Trash2, ClipboardCopy 
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

// Create a schema for portal access form
const portalAccessSchema = z.object({
  username: z.string().min(4, { message: "Username must be at least 4 characters" }),
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
  const { toast } = useToast();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [hasExistingAccess, setHasExistingAccess] = useState(false);
  const [accessData, setAccessData] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [usernameCopied, setUsernameCopied] = useState(false);
  
  // Form configuration
  const form = useForm<PortalAccessFormData>({
    resolver: zodResolver(portalAccessSchema),
    defaultValues: {
      username: "",
      password: "",
      passwordResetRequired: true,
      isActive: true,
    },
  });
  
  // Fetch client portal access data
  const { data: portalAccess, isLoading, isError, refetch } = useQuery({
    queryKey: [`/api/v1/clients/${clientId}/portal-access`],
    enabled: !!clientId,
    retry: false,
    staleTime: 30000,
    gcTime: 60000,
    onSuccess: (data) => {
      setHasExistingAccess(!!data);
      setAccessData(data);
    },
    onError: () => {
      setHasExistingAccess(false);
      setAccessData(null);
    }
  });
  
  // Create portal access mutation
  const createPortalAccessMutation = useMutation({
    mutationFn: async (data: PortalAccessFormData) => {
      const response = await apiRequest("POST", `/api/v1/clients/${clientId}/portal-access`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Portal access created",
        description: "Client portal access has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/clients/${clientId}/portal-access`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/clients/${clientId}`] });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating portal access",
        description: error.message || "There was an error creating client portal access.",
        variant: "destructive",
      });
    },
  });
  
  // Toggle portal access active status
  const togglePortalStatusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/v1/clients/${clientId}/portal-access`, 
        { isActive }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: `Portal access ${data.isActive ? 'activated' : 'deactivated'}`,
        description: `Client portal access has been ${data.isActive ? 'activated' : 'deactivated'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/clients/${clientId}/portal-access`] });
      setAccessData(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating portal access",
        description: error.message || "There was an error updating client portal access.",
        variant: "destructive",
      });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ password, passwordResetRequired }: { password: string, passwordResetRequired: boolean }) => {
      const response = await apiRequest(
        "POST", 
        `/api/v1/clients/${clientId}/portal-access/reset-password`, 
        { password, passwordResetRequired }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset",
        description: "Client portal password has been reset successfully.",
      });
      setIsResetDialogOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error resetting password",
        description: error.message || "There was an error resetting the password.",
        variant: "destructive",
      });
    },
  });
  
  // Delete portal access mutation
  const deletePortalAccessMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "DELETE", 
        `/api/v1/clients/${clientId}/portal-access`
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Portal access deleted",
        description: "Client portal access has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setHasExistingAccess(false);
      setAccessData(null);
      queryClient.invalidateQueries({ queryKey: [`/api/v1/clients/${clientId}`] });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting portal access",
        description: error.message || "There was an error deleting client portal access.",
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  function onSubmit(data: PortalAccessFormData) {
    createPortalAccessMutation.mutate(data);
  }
  
  // Toggle portal active status
  function handleStatusToggle(isActive: boolean) {
    togglePortalStatusMutation.mutate(isActive);
  }
  
  // Password reset handler
  function handlePasswordReset() {
    const newRandomPassword = generateRandomPassword();
    setNewPassword(newRandomPassword);
    setIsResetDialogOpen(true);
  }
  
  // Generate random password
  function generateRandomPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  
  // Generate username based on client name
  function generateUsername() {
    // Get client name from the form
    const clientName = form.getValues().username || "";
    
    if (clientName.trim() === "") {
      return "";
    }
    
    // Convert to lowercase, remove special characters, replace spaces with dots
    const username = clientName.toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, ".")
      .trim();
    
    form.setValue("username", username);
  }
  
  // Generate a password and set it in the form
  function handleGeneratePassword() {
    const newRandomPassword = generateRandomPassword();
    form.setValue("password", newRandomPassword);
    // Make the password visible temporarily
    setIsPasswordVisible(true);
    setTimeout(() => setIsPasswordVisible(false), 10000); // Hide after 10 seconds
  }
  
  // Delete portal access handler
  function handleDeletePortalAccess() {
    setIsDeleteDialogOpen(true);
  }
  
  // Copy text to clipboard
  const copyToClipboard = (text: string, field: 'username' | 'password') => {
    navigator.clipboard.writeText(text).then(
      () => {
        if (field === 'username') {
          setUsernameCopied(true);
          setTimeout(() => setUsernameCopied(false), 2000);
        } else {
          setPasswordCopied(true);
          setTimeout(() => setPasswordCopied(false), 2000);
        }
        
        toast({
          title: "Copied to clipboard",
          description: `${field.charAt(0).toUpperCase() + field.slice(1)} has been copied to clipboard.`,
        });
      },
      (err) => {
        toast({
          title: "Failed to copy",
          description: "Could not copy to clipboard. Please try again.",
          variant: "destructive",
        });
      }
    );
  };
  
  return (
    <div className="space-y-6">
      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : hasExistingAccess && accessData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-500" />
                <span>Client Portal Access</span>
              </div>
              <Badge variant={accessData.isActive ? "success" : "destructive"}>
                {accessData.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Manage client's secure access to the client portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-500">Username</div>
                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 p-2 rounded flex-1 font-mono text-sm">
                    {accessData.username}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => copyToClipboard(accessData.username, 'username')}
                  >
                    {usernameCopied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-500">Last Login</div>
                <div className="bg-slate-100 p-2 rounded font-mono text-sm">
                  {accessData.lastLogin 
                    ? new Date(accessData.lastLogin).toLocaleString() 
                    : "Never logged in"}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-500">Access Status</div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={accessData.isActive} 
                    onCheckedChange={handleStatusToggle}
                    disabled={togglePortalStatusMutation.isPending}
                  />
                  <span className="text-sm">
                    {accessData.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-500">Password Reset Required</div>
                <div className="flex items-center gap-2">
                  <Badge variant={accessData.passwordResetRequired ? "outline" : "secondary"}>
                    {accessData.passwordResetRequired 
                      ? "Reset Required" 
                      : "No Reset Required"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePasswordReset}
              disabled={resetPasswordMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Password
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDeletePortalAccess}
              disabled={deletePortalAccessMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Access
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-blue-500" />
              Create Client Portal Access
            </CardTitle>
            <CardDescription>
              Create secure access credentials for this client to use the portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="client.username" {...field} />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={generateUsername}
                          className="shrink-0"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Generate
                        </Button>
                      </div>
                      <FormDescription>
                        The username the client will use to log in
                      </FormDescription>
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
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            type={isPasswordVisible ? "text" : "password"} 
                            placeholder="••••••••••••"
                            {...field}
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                          className="shrink-0"
                        >
                          {isPasswordVisible ? (
                            <ShieldAlert className="h-4 w-4" />
                          ) : (
                            <Key className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleGeneratePassword}
                          className="shrink-0"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Generate
                        </Button>
                      </div>
                      <FormDescription>
                        The initial password for the client
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="passwordResetRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Require Password Reset</FormLabel>
                        <FormDescription>
                          Client will be required to change their password on first login
                        </FormDescription>
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
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <FormDescription>
                          Enable or disable client's access to the portal
                        </FormDescription>
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
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createPortalAccessMutation.isPending}
                >
                  {createPortalAccessMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating Access...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Create Portal Access
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
      
      {/* Password Reset Dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Client Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the client's portal password to the new password below.
              The client will be required to change their password on next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">New Password</div>
              <div className="relative">
                <div className="flex">
                  <Input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type={isPasswordVisible ? "text" : "password"}
                    className="pr-24 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  >
                    {isPasswordVisible ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewPassword(generateRandomPassword())}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newPassword, 'password')}
                >
                  {passwordCopied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy
                </Button>
              </div>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetPasswordMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={resetPasswordMutation.isPending || !newPassword}
              onClick={(e) => {
                e.preventDefault();
                resetPasswordMutation.mutate({ 
                  password: newPassword, 
                  passwordResetRequired: true 
                });
              }}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Portal Access Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portal Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the client's access to the portal.
              They will no longer be able to log in or access any information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePortalAccessMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePortalAccessMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                deletePortalAccessMutation.mutate();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePortalAccessMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Access"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}