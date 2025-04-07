import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger, DialogClose 
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Edit, Trash, EyeOff, Eye, User, UserPlus, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

// Define the form schema
const memberFormSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  designationId: z.string().optional(),
  departmentId: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Define permission form schema
const permissionFormSchema = z.object({
  module: z.string(),
  accessLevel: z.enum(['full', 'partial', 'restricted']),
  canCreate: z.boolean().optional(),
  canRead: z.boolean().optional(),
  canUpdate: z.boolean().optional(),
  canDelete: z.boolean().optional(),
});

type Member = {
  id: number;
  displayName: string;
  email: string;
  username: string;
  designationId: number | null;
  departmentId: number | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
};

type Permission = {
  id: number;
  userId: number;
  tenantId: number;
  module: string;
  accessLevel: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  createdAt: string;
};

type Designation = {
  id: number;
  name: string;
};

type Department = {
  id: number;
  name: string;
};

const MembersManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Fetch all members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['/api/v1/members'],
    queryFn: () => apiRequest<Member[]>({ url: '/api/v1/members' })
  });
  
  // Fetch all designations
  const { data: designations = [], isLoading: designationsLoading } = useQuery({
    queryKey: ['/api/v1/designations'],
    queryFn: () => apiRequest<Designation[]>({ url: '/api/v1/designations' })
  });
  
  // Fetch all departments
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['/api/v1/departments'],
    queryFn: () => apiRequest<Department[]>({ url: '/api/v1/departments' })
  });
  
  // Fetch selected member's permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['/api/v1/members', selectedMember?.id, 'permissions'],
    queryFn: () => apiRequest<Permission[]>({ 
      url: `/api/v1/members/${selectedMember?.id}/permissions` 
    }),
    enabled: !!selectedMember
  });
  
  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: (data: z.infer<typeof memberFormSchema>) => {
      return apiRequest<any>({
        url: '/api/v1/members',
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/members'] });
      toast({
        title: "Member created successfully",
        description: "The new team member has been added to the system.",
      });
      setIsAddModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating member",
        description: error.message || "An error occurred while creating the member.",
        variant: "destructive",
      });
    },
  });
  
  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: (data: { id: number; member: Partial<z.infer<typeof memberFormSchema>> }) => {
      return apiRequest<any>({
        url: `/api/v1/members/${data.id}`,
        method: 'PUT',
        data: data.member,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/members'] });
      toast({
        title: "Member updated successfully",
        description: "The team member's information has been updated.",
      });
      setIsEditModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating member",
        description: error.message || "An error occurred while updating the member.",
        variant: "destructive",
      });
    },
  });
  
  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest<any>({
        url: `/api/v1/members/${id}`,
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/members'] });
      toast({
        title: "Member deleted successfully",
        description: "The team member has been removed from the system.",
      });
      setIsDeleteModalOpen(false);
      setSelectedMember(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting member",
        description: error.message || "An error occurred while deleting the member.",
        variant: "destructive",
      });
    },
  });
  
  // Add permission mutation
  const addPermissionMutation = useMutation({
    mutationFn: (data: { userId: number; permission: z.infer<typeof permissionFormSchema> }) => {
      return apiRequest<any>({
        url: `/api/v1/members/${data.userId}/permissions`,
        method: 'POST',
        data: data.permission,
      });
    },
    onSuccess: () => {
      if (selectedMember) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/v1/members', selectedMember.id, 'permissions'] 
        });
      }
      toast({
        title: "Permission added successfully",
        description: "The permission has been added to the member.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding permission",
        description: error.message || "An error occurred while adding the permission.",
        variant: "destructive",
      });
    },
  });
  
  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: (data: { 
      userId: number; 
      permissionId: number; 
      permission: Partial<z.infer<typeof permissionFormSchema>> 
    }) => {
      return apiRequest<any>({
        url: `/api/v1/members/${data.userId}/permissions/${data.permissionId}`,
        method: 'PUT',
        data: data.permission,
      });
    },
    onSuccess: () => {
      if (selectedMember) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/v1/members', selectedMember.id, 'permissions'] 
        });
      }
      toast({
        title: "Permission updated successfully",
        description: "The permission has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating permission",
        description: error.message || "An error occurred while updating the permission.",
        variant: "destructive",
      });
    },
  });
  
  // Delete permission mutation
  const deletePermissionMutation = useMutation({
    mutationFn: (data: { userId: number; permissionId: number }) => {
      return apiRequest<any>({
        url: `/api/v1/members/${data.userId}/permissions/${data.permissionId}`,
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      if (selectedMember) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/v1/members', selectedMember.id, 'permissions'] 
        });
      }
      toast({
        title: "Permission deleted successfully",
        description: "The permission has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting permission",
        description: error.message || "An error occurred while deleting the permission.",
        variant: "destructive",
      });
    },
  });
  
  // Add member form
  const addForm = useForm<z.infer<typeof memberFormSchema>>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      displayName: "",
      email: "",
      username: "",
      password: "",
      isActive: true,
    },
  });
  
  // Edit member form
  const editForm = useForm<z.infer<typeof memberFormSchema>>({
    resolver: zodResolver(memberFormSchema.partial({ password: true })),
    defaultValues: {
      displayName: "",
      email: "",
      username: "",
      password: "",
      isActive: true,
    },
  });
  
  // Permission form
  const permissionForm = useForm<z.infer<typeof permissionFormSchema>>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: {
      module: "",
      accessLevel: "restricted",
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    },
  });
  
  // Handle adding a new member
  const onAddMember = (data: z.infer<typeof memberFormSchema>) => {
    addMemberMutation.mutate(data);
  };
  
  // Handle editing a member
  const onEditMember = (data: z.infer<typeof memberFormSchema>) => {
    if (!selectedMember) return;
    
    // Only include the password if it's provided
    const memberData: Partial<z.infer<typeof memberFormSchema>> = { ...data };
    if (!memberData.password) {
      delete memberData.password;
    }
    
    updateMemberMutation.mutate({ 
      id: selectedMember.id, 
      member: memberData 
    });
  };
  
  // Handle deleting a member
  const onDeleteMember = () => {
    if (!selectedMember) return;
    deleteMemberMutation.mutate(selectedMember.id);
  };
  
  // Handle adding a permission
  const onAddPermission = (data: z.infer<typeof permissionFormSchema>) => {
    if (!selectedMember) return;
    
    // Set CRUD permissions according to access level
    let permissionData = { ...data };
    if (data.accessLevel === 'full') {
      permissionData.canCreate = true;
      permissionData.canRead = true;
      permissionData.canUpdate = true;
      permissionData.canDelete = true;
    } else if (data.accessLevel === 'restricted') {
      permissionData.canCreate = false;
      permissionData.canRead = false;
      permissionData.canUpdate = false;
      permissionData.canDelete = false;
    }
    
    addPermissionMutation.mutate({ 
      userId: selectedMember.id, 
      permission: permissionData 
    });
    
    // Reset form
    permissionForm.reset({
      module: "",
      accessLevel: "restricted",
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    });
  };
  
  // Handle updating a permission
  const handlePermissionUpdate = (permission: Permission, field: string, value: any) => {
    if (!selectedMember) return;
    
    let updateData: Partial<z.infer<typeof permissionFormSchema>> = {
      [field]: value,
    };
    
    // If changing access level, also update CRUD permissions
    if (field === 'accessLevel') {
      if (value === 'full') {
        updateData = {
          ...updateData,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        };
      } else if (value === 'restricted') {
        updateData = {
          ...updateData,
          canCreate: false,
          canRead: false,
          canUpdate: false,
          canDelete: false,
        };
      }
    }
    
    updatePermissionMutation.mutate({
      userId: selectedMember.id,
      permissionId: permission.id,
      permission: updateData,
    });
  };
  
  // Handle deleting a permission
  const handleDeletePermission = (permissionId: number) => {
    if (!selectedMember) return;
    
    deletePermissionMutation.mutate({
      userId: selectedMember.id,
      permissionId,
    });
  };
  
  // Open edit modal with member data
  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    editForm.reset({
      displayName: member.displayName,
      email: member.email,
      username: member.username,
      designationId: member.designationId?.toString(),
      departmentId: member.departmentId?.toString(),
      isActive: member.isActive,
    });
    setIsEditModalOpen(true);
  };
  
  // Open permissions modal
  const openPermissionsModal = (member: Member) => {
    setSelectedMember(member);
    setIsPermissionsModalOpen(true);
  };
  
  // Open delete confirmation modal
  const openDeleteModal = (member: Member) => {
    setSelectedMember(member);
    setIsDeleteModalOpen(true);
  };
  
  // Render module options for permission form
  const moduleOptions = [
    { value: "clients", label: "Clients" },
    { value: "entities", label: "Entities" },
    { value: "tasks", label: "Tasks" },
    { value: "setup", label: "Setup" },
    { value: "reports", label: "Reports" },
  ];
  
  // Get module label
  const getModuleLabel = (moduleValue: string) => {
    const option = moduleOptions.find(opt => opt.value === moduleValue);
    return option ? option.label : moduleValue;
  };
  
  // Get designation name
  const getDesignationName = (id: number | null) => {
    if (!id) return "None";
    const designation = designations.find(d => d.id === id);
    return designation ? designation.name : "Unknown";
  };
  
  // Get department name
  const getDepartmentName = (id: number | null) => {
    if (!id) return "None";
    const department = departments.find(d => d.id === id);
    return department ? department.name : "Unknown";
  };
  
  if (membersLoading || designationsLoading || departmentsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Team Members Management</h2>
          <p className="text-muted-foreground">Manage your team members and their permissions</p>
        </div>
        <Button 
          onClick={() => {
            addForm.reset({
              displayName: "",
              email: "",
              username: "",
              password: "",
              isActive: true,
            });
            setIsAddModalOpen(true);
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>
      
      {/* Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <Card key={member.id} className={member.isActive ? "" : "opacity-60"}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span className="truncate">{member.displayName}</span>
                {member.isSuperAdmin && (
                  <Badge variant="default">Super Admin</Badge>
                )}
              </CardTitle>
              <CardDescription>
                <div className="space-y-1">
                  <div className="text-sm">{member.email}</div>
                  <div className="text-xs">Username: {member.username}</div>
                  <div className="flex gap-2 text-xs mt-1">
                    <div>
                      <span className="font-semibold">Designation:</span> {getDesignationName(member.designationId)}
                    </div>
                    <div>
                      <span className="font-semibold">Department:</span> {getDepartmentName(member.departmentId)}
                    </div>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-xs mr-2">Status:</span>
                    {member.isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openEditModal(member)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openPermissionsModal(member)}
                >
                  <Key className="h-4 w-4 mr-1" />
                  Permissions
                </Button>
              </div>
              {!member.isSuperAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => openDeleteModal(member)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Add Member Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Team Member</DialogTitle>
            <DialogDescription>
              Add a new member to your team. They will be able to log in with the provided credentials.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddMember)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
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
              
              <FormField
                control={addForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          {...field} 
                        />
                        <Button
                          type="button"
                          variant="ghost" 
                          size="sm" 
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="designationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select designation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {designations.map((designation) => (
                            <SelectItem 
                              key={designation.id} 
                              value={designation.id.toString()}
                            >
                              {designation.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((department) => (
                            <SelectItem 
                              key={department.id} 
                              value={department.id.toString()}
                            >
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={addForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Whether this member can log in to the system
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
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Member Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the member's information. Leave the password field empty to keep the current password.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditMember)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
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
              
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (Leave empty to keep current)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          {...field} 
                        />
                        <Button
                          type="button"
                          variant="ghost" 
                          size="sm" 
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="designationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select designation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {designations.map((designation) => (
                            <SelectItem 
                              key={designation.id} 
                              value={designation.id.toString()}
                            >
                              {designation.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((department) => (
                            <SelectItem 
                              key={department.id} 
                              value={department.id.toString()}
                            >
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Whether this member can log in to the system
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
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateMemberMutation.isPending}
                >
                  {updateMemberMutation.isPending ? "Updating..." : "Update Member"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Permissions Modal */}
      <Dialog open={isPermissionsModalOpen} onOpenChange={setIsPermissionsModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Manage Permissions: {selectedMember?.displayName}</DialogTitle>
            <DialogDescription>
              Configure what modules this team member can access and their permission levels.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="current" className="pt-2">
            <TabsList className="mb-4">
              <TabsTrigger value="current">Current Permissions</TabsTrigger>
              <TabsTrigger value="add">Add Permission</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="space-y-4">
              {permissionsLoading ? (
                <div>Loading permissions...</div>
              ) : permissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="mx-auto h-12 w-12 opacity-20 mb-2" />
                  <p>This user has no permissions configured.</p>
                  <p className="text-sm">Use the "Add Permission" tab to grant access to modules.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {permissions.map((permission) => (
                    <Card key={permission.id}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>{getModuleLabel(permission.module)}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500"
                            onClick={() => handleDeletePermission(permission.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <FormLabel className="text-sm font-medium">Access Level</FormLabel>
                            <Select 
                              value={permission.accessLevel}
                              onValueChange={(value) => 
                                handlePermissionUpdate(permission, 'accessLevel', value)
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full">Full Access</SelectItem>
                                <SelectItem value="partial">Partial Access</SelectItem>
                                <SelectItem value="restricted">Restricted</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {permission.accessLevel === 'partial' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center justify-between space-x-2 rounded-md border p-2">
                                <label 
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  htmlFor={`create-${permission.id}`}
                                >
                                  Create
                                </label>
                                <Switch
                                  id={`create-${permission.id}`}
                                  checked={permission.canCreate}
                                  onCheckedChange={(checked) => 
                                    handlePermissionUpdate(permission, 'canCreate', checked)
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-between space-x-2 rounded-md border p-2">
                                <label 
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  htmlFor={`read-${permission.id}`}
                                >
                                  Read
                                </label>
                                <Switch
                                  id={`read-${permission.id}`}
                                  checked={permission.canRead}
                                  onCheckedChange={(checked) => 
                                    handlePermissionUpdate(permission, 'canRead', checked)
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-between space-x-2 rounded-md border p-2">
                                <label 
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  htmlFor={`update-${permission.id}`}
                                >
                                  Update
                                </label>
                                <Switch
                                  id={`update-${permission.id}`}
                                  checked={permission.canUpdate}
                                  onCheckedChange={(checked) => 
                                    handlePermissionUpdate(permission, 'canUpdate', checked)
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-between space-x-2 rounded-md border p-2">
                                <label 
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  htmlFor={`delete-${permission.id}`}
                                >
                                  Delete
                                </label>
                                <Switch
                                  id={`delete-${permission.id}`}
                                  checked={permission.canDelete}
                                  onCheckedChange={(checked) => 
                                    handlePermissionUpdate(permission, 'canDelete', checked)
                                  }
                                />
                              </div>
                            </div>
                          )}
                          
                          {permission.accessLevel === 'full' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center space-x-2 rounded-md border p-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Create</span>
                              </div>
                              <div className="flex items-center space-x-2 rounded-md border p-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Read</span>
                              </div>
                              <div className="flex items-center space-x-2 rounded-md border p-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Update</span>
                              </div>
                              <div className="flex items-center space-x-2 rounded-md border p-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Delete</span>
                              </div>
                            </div>
                          )}
                          
                          {permission.accessLevel === 'restricted' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center space-x-2 rounded-md border p-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-sm">Create</span>
                              </div>
                              <div className="flex items-center space-x-2 rounded-md border p-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-sm">Read</span>
                              </div>
                              <div className="flex items-center space-x-2 rounded-md border p-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-sm">Update</span>
                              </div>
                              <div className="flex items-center space-x-2 rounded-md border p-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-sm">Delete</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="add">
              <Form {...permissionForm}>
                <form onSubmit={permissionForm.handleSubmit(onAddPermission)} className="space-y-4">
                  <FormField
                    control={permissionForm.control}
                    name="module"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Module</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select module" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {moduleOptions.map((option) => (
                              <SelectItem 
                                key={option.value} 
                                value={option.value}
                                disabled={permissions.some(p => p.module === option.value)}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the module this user should have access to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={permissionForm.control}
                    name="accessLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Access Level</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Automatically set CRUD permissions based on access level
                            if (value === 'full') {
                              permissionForm.setValue('canCreate', true);
                              permissionForm.setValue('canRead', true);
                              permissionForm.setValue('canUpdate', true);
                              permissionForm.setValue('canDelete', true);
                            } else if (value === 'restricted') {
                              permissionForm.setValue('canCreate', false);
                              permissionForm.setValue('canRead', false);
                              permissionForm.setValue('canUpdate', false);
                              permissionForm.setValue('canDelete', false);
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select access level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full">Full Access</SelectItem>
                            <SelectItem value="partial">Partial Access</SelectItem>
                            <SelectItem value="restricted">Restricted</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Full: All permissions granted
                          <br />
                          Partial: Configure individual permissions
                          <br />
                          Restricted: No permissions granted
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {permissionForm.watch('accessLevel') === 'partial' && (
                    <div className="space-y-4">
                      <FormField
                        control={permissionForm.control}
                        name="canCreate"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Create Permission</FormLabel>
                              <FormDescription>
                                Allow creating new items in this module
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
                        control={permissionForm.control}
                        name="canRead"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Read Permission</FormLabel>
                              <FormDescription>
                                Allow viewing items in this module
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
                        control={permissionForm.control}
                        name="canUpdate"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Update Permission</FormLabel>
                              <FormDescription>
                                Allow editing items in this module
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
                        control={permissionForm.control}
                        name="canDelete"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Delete Permission</FormLabel>
                              <FormDescription>
                                Allow deleting items in this module
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
                    </div>
                  )}
                  
                  <DialogFooter>
                    <Button 
                      type="submit"
                      disabled={addPermissionMutation.isPending || !permissionForm.watch('module')}
                    >
                      {addPermissionMutation.isPending ? "Adding..." : "Add Permission"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Delete Member Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onDelete={onDeleteMember}
        title="Delete Team Member"
        description={`Are you sure you want to remove ${selectedMember?.displayName} from your team? This action cannot be undone.`}
        isPending={deleteMemberMutation.isPending}
      />
    </div>
  );
};

export default MembersManager;