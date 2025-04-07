import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Pencil, Trash, PlusCircle, User } from "lucide-react";

// Form schemas
const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  designationId: z.number().nullable(),
  departmentId: z.number().nullable(),
  isActive: z.boolean().default(true),
  isSuperAdmin: z.boolean().default(false),
});

type UserFormValues = z.infer<typeof userFormSchema>;

// Role form schema
const roleFormSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional(),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

// User-Role form schema
const userRoleFormSchema = z.object({
  roleId: z.number(),
});

type UserRoleFormValues = z.infer<typeof userRoleFormSchema>;

export default function UsersManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [isDeleteRoleDialogOpen, setIsDeleteRoleDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [roleToDelete, setRoleToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserRoleModalOpen, setIsUserRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("users");

  // Fetch data
  interface User {
    id: number;
    username: string;
    email: string;
    displayName: string;
    departmentId: number | null;
    designationId: number | null;
    isActive: boolean;
    isSuperAdmin: boolean;
    tenantId: number;
  }

  interface Department {
    id: number;
    name: string;
    tenantId: number;
  }

  interface Designation {
    id: number;
    name: string;
    tenantId: number;
  }

  interface Role {
    id: number;
    name: string;
    description: string | null;
    tenantId: number;
  }

  interface Permission {
    id: number;
    name: string;
    resource: string;
    action: string;
    description: string | null;
  }

  const { data: users = [] as User[], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/v1/users'],
    refetchOnWindowFocus: false,
  });

  const { data: designations = [] as Designation[], isLoading: isLoadingDesignations } = useQuery({
    queryKey: ['/api/v1/setup/designations'],
    refetchOnWindowFocus: false,
  });

  const { data: departments = [] as Department[], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['/api/v1/setup/departments'],
    refetchOnWindowFocus: false,
  });

  const { data: roles = [] as Role[], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['/api/v1/roles'],
    refetchOnWindowFocus: false,
  });

  const { data: userRoles = [] as Role[], isLoading: isLoadingUserRoles } = useQuery({
    queryKey: ['/api/v1/users', selectedUserForRole?.id, 'roles'],
    refetchOnWindowFocus: false,
    enabled: !!selectedUserForRole,
  });

  const { data: permissions = [] as Permission[], isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['/api/v1/permissions'],
    refetchOnWindowFocus: false,
  });

  // Add user form
  const addUserForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      displayName: "",
      departmentId: null,
      designationId: null,
      isActive: true,
      isSuperAdmin: false,
    },
  });

  // Edit user form
  const editUserForm = useForm<Partial<UserFormValues>>({
    resolver: zodResolver(userFormSchema.partial()),
    defaultValues: {
      username: "",
      email: "",
      displayName: "",
      departmentId: null,
      designationId: null,
      isActive: true,
      isSuperAdmin: false,
    },
  });

  // Add role form
  const addRoleForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Edit role form
  const editRoleForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // User-Role form
  const userRoleForm = useForm<UserRoleFormValues>({
    resolver: zodResolver(userRoleFormSchema),
    defaultValues: {
      roleId: 0,
    },
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (data: UserFormValues) => apiRequest('/api/v1/users', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      setIsAddUserOpen(false);
      addUserForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<UserFormValues> }) => 
      apiRequest(`/api/v1/users/${id}`, 'PUT', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      setIsEditUserOpen(false);
      editUserForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/v1/users/${id}`, 'DELETE'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      setIsDeleteUserDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: RoleFormValues) => apiRequest('/api/v1/roles', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/roles'] });
      setIsAddRoleOpen(false);
      addRoleForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: RoleFormValues }) => 
      apiRequest(`/api/v1/roles/${id}`, 'PUT', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/roles'] });
      setIsEditRoleOpen(false);
      editRoleForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/v1/roles/${id}`, 'DELETE'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/roles'] });
      setIsDeleteRoleDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  const addRoleToUserMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number, roleId: number }) => 
      apiRequest(`/api/v1/users/${userId}/roles`, 'POST', { roleId }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role assigned to user successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users', selectedUserForRole?.id, 'roles'] });
      userRoleForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign role to user",
        variant: "destructive",
      });
    },
  });

  const removeRoleFromUserMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number, roleId: number }) => 
      apiRequest(`/api/v1/users/${userId}/roles/${roleId}`, 'DELETE'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role removed from user successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users', selectedUserForRole?.id, 'roles'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove role from user",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onAddUserSubmit = (data: UserFormValues) => {
    createUserMutation.mutate(data);
  };

  const onEditUserSubmit = (data: Partial<UserFormValues>) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, data });
    }
  };

  const onAddRoleSubmit = (data: RoleFormValues) => {
    createRoleMutation.mutate(data);
  };

  const onEditRoleSubmit = (data: RoleFormValues) => {
    if (selectedRole) {
      updateRoleMutation.mutate({ id: selectedRole.id, data });
    }
  };

  const onUserRoleSubmit = (data: UserRoleFormValues) => {
    if (selectedUserForRole) {
      addRoleToUserMutation.mutate({ 
        userId: selectedUserForRole.id, 
        roleId: data.roleId 
      });
    }
  };

  // Edit user handlers
  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    editUserForm.reset({
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      departmentId: user.departmentId,
      designationId: user.designationId,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
    });
    setIsEditUserOpen(true);
  };

  // Delete user handlers
  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
    setIsDeleteUserDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  // Edit role handlers
  const handleEditRole = (role: any) => {
    setSelectedRole(role);
    editRoleForm.reset({
      name: role.name,
      description: role.description || "",
    });
    setIsEditRoleOpen(true);
  };

  // Delete role handlers
  const handleDeleteRole = (role: any) => {
    setRoleToDelete(role);
    setIsDeleteRoleDialogOpen(true);
  };

  const confirmDeleteRole = () => {
    if (roleToDelete) {
      deleteRoleMutation.mutate(roleToDelete.id);
    }
  };

  // User roles handler
  const handleManageUserRoles = (user: any) => {
    setSelectedUserForRole(user);
    setIsUserRoleModalOpen(true);
  };

  const handleRemoveRoleFromUser = (roleId: number) => {
    if (selectedUserForRole) {
      removeRoleFromUserMutation.mutate({
        userId: selectedUserForRole.id,
        roleId
      });
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter((user: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.displayName?.toLowerCase().includes(searchLower)
    );
  });

  // Get department and designation names
  const getDepartmentName = (departmentId: number | null) => {
    if (!departmentId) return "N/A";
    const department = departments.find((d: any) => d.id === departmentId);
    return department ? department.name : "N/A";
  };

  const getDesignationName = (designationId: number | null) => {
    if (!designationId) return "N/A";
    const designation = designations.find((d: any) => d.id === designationId);
    return designation ? designation.name : "N/A";
  };

  // Effect to clear forms when dialogs close
  useEffect(() => {
    if (!isAddUserOpen) addUserForm.reset();
    if (!isEditUserOpen) editUserForm.reset();
    if (!isAddRoleOpen) addRoleForm.reset();
    if (!isEditRoleOpen) editRoleForm.reset();
  }, [isAddUserOpen, isEditUserOpen, isAddRoleOpen, isEditRoleOpen]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="flex justify-between items-center mb-4">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              
              <Button onClick={() => setIsAddUserOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add User
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.displayName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getDepartmentName(user.departmentId)}</TableCell>
                      <TableCell>{getDesignationName(user.designationId)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {user.isSuperAdmin && (
                          <span className="ml-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                            Admin
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleManageUserRoles(user)}>
                          <User className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setIsAddRoleOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Role
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role: any) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditRole(role)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {roles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        No roles found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a new user account
            </DialogDescription>
          </DialogHeader>
          
          <Form {...addUserForm}>
            <form onSubmit={addUserForm.handleSubmit(onAddUserSubmit)} className="space-y-4">
              <FormField
                control={addUserForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addUserForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addUserForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addUserForm.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {departments.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addUserForm.control}
                name="designationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a designation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {designations.map((desig: any) => (
                          <SelectItem key={desig.id} value={desig.id.toString()}>
                            {desig.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addUserForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
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
                control={addUserForm.control}
                name="isSuperAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Super Admin</FormLabel>
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
              
              <DialogFooter>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(onEditUserSubmit)} className="space-y-4">
              <FormField
                control={editUserForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUserForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUserForm.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {departments.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUserForm.control}
                name="designationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a designation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {designations.map((desig: any) => (
                          <SelectItem key={desig.id} value={desig.id.toString()}>
                            {desig.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUserForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
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
                control={editUserForm.control}
                name="isSuperAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Super Admin</FormLabel>
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
              
              <DialogFooter>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Create a new role for permission management
            </DialogDescription>
          </DialogHeader>
          
          <Form {...addRoleForm}>
            <form onSubmit={addRoleForm.handleSubmit(onAddRoleSubmit)} className="space-y-4">
              <FormField
                control={addRoleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addRoleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createRoleMutation.isPending}>
                  {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role information
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editRoleForm}>
            <form onSubmit={editRoleForm.handleSubmit(onEditRoleSubmit)} className="space-y-4">
              <FormField
                control={editRoleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editRoleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Role Dialog */}
      <AlertDialog open={isDeleteRoleDialogOpen} onOpenChange={setIsDeleteRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role? This will remove the role from all users it's assigned to and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteRole}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteRoleMutation.isPending}
            >
              {deleteRoleMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Roles Dialog */}
      <Dialog open={isUserRoleModalOpen} onOpenChange={setIsUserRoleModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Manage Roles for {selectedUserForRole?.displayName}
            </DialogTitle>
            <DialogDescription>
              Assign or remove roles from this user
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current roles */}
            <div>
              <h3 className="text-sm font-medium mb-2">Current Roles</h3>
              {userRoles?.length > 0 ? (
                <div className="space-y-2">
                  {userRoles.map((role: any) => (
                    <div key={role.id} className="flex justify-between items-center p-2 border rounded-md">
                      <div>
                        <span className="font-medium">{role.name}</span>
                        {role.description && (
                          <p className="text-sm text-gray-500">{role.description}</p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveRoleFromUser(role.id)}
                        disabled={removeRoleFromUserMutation.isPending}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No roles assigned</p>
              )}
            </div>

            <Separator />

            {/* Add new role */}
            <div>
              <h3 className="text-sm font-medium mb-2">Add New Role</h3>
              <Form {...userRoleForm}>
                <form onSubmit={userRoleForm.handleSubmit(onUserRoleSubmit)} className="space-y-4">
                  <FormField
                    control={userRoleForm.control}
                    name="roleId"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value ? field.value.toString() : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles
                              .filter((role: any) => !userRoles?.some((ur: any) => ur.id === role.id))
                              .map((role: any) => (
                                <SelectItem key={role.id} value={role.id.toString()}>
                                  {role.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    disabled={addRoleToUserMutation.isPending}
                    className="w-full"
                  >
                    {addRoleToUserMutation.isPending ? "Adding..." : "Add Role"}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}