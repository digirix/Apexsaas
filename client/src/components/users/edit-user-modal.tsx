import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, UserCog, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { User, insertUserSchema, Department, Designation } from "@shared/schema";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: () => void;
}

export function EditUserModal({ isOpen, onClose, user, onSuccess }: EditUserModalProps) {
  const { toast } = useToast();

  // Modified schema for editing (without password)
  const editUserSchema = insertUserSchema.omit({ password: true });
  type FormValues = z.infer<typeof editUserSchema>;

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      departmentId: user.departmentId,
      designationId: user.designationId,
      isActive: user.isActive,
    },
  });

  // Fetch departments for dropdown
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['/api/v1/departments'],
  });

  // Fetch designations for dropdown
  const { data: designations } = useQuery<Designation[]>({
    queryKey: ['/api/v1/designations'],
  });

  // Update user when props change
  useEffect(() => {
    form.reset({
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      departmentId: user.departmentId,
      designationId: user.designationId,
      isActive: user.isActive,
    });
  }, [user, form]);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: FormValues) => {
      return fetch(`/api/v1/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      }).then(res => {
        if (!res.ok) throw new Error("Failed to update user");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/users/${user.id}`] });
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateUserMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Edit User</DialogTitle>
            {user.isSuperAdmin && (
              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
          <DialogDescription>
            Update user information and account settings
          </DialogDescription>
        </DialogHeader>

        {user.isSuperAdmin && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4 flex items-start">
            <ShieldAlert className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-700">Super Admin Account</p>
              <p className="text-xs text-blue-600">
                This is a Super Admin account with full system privileges. Some settings cannot be modified.
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="profile" className="mt-2">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile Info</TabsTrigger>
            <TabsTrigger value="account">Account Settings</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <TabsContent value="profile">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Used for login purposes
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Shown throughout the application
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="departmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                            value={field.value?.toString() || "none"}
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="designationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Designation</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                            value={field.value?.toString() || "none"}
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="account">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Account Status</FormLabel>
                          <div className="text-sm text-slate-500">
                            {field.value 
                              ? "User can currently log in and access the system" 
                              : "User is currently unable to log in to the system"}
                          </div>
                        </div>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={field.value ? "default" : "secondary"}
                              className={field.value ? "bg-green-600 hover:bg-green-700" : ""}
                            >
                              {field.value ? "Active" : "Inactive"}
                            </Badge>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={user.isSuperAdmin}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {user.isSuperAdmin && (
                    <div className="text-xs text-slate-500 italic">
                      Super Admin accounts cannot be deactivated for security reasons
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Password Management</h4>
                    <Button type="button" variant="outline" className="w-full" disabled>
                      Send Password Reset Link
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">
                      This will send a password reset email to the user's email address
                    </p>
                  </div>
                </div>
              </TabsContent>

              <Separator className="my-4" />
                
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} className="mr-2">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}