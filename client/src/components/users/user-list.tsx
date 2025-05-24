import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PlusCircle, 
  Edit, 
  UserPlus, 
  UserCog, 
  ShieldCheck, 
  MoreHorizontal,
  AlertCircle,
  UserX,
  Trash2 
} from "lucide-react";
import { AddUserModal } from "../users/add-user-modal";
import { EditUserModal } from "../users/edit-user-modal";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

interface UserListProps {
  onUserSelect: (userId: number) => void;
}

export function UserList({ onUserSelect }: UserListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Fetch users data
  const { data: users, isLoading, error, refetch } = useQuery<User[]>({
    queryKey: ['/api/v1/users'],
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('DELETE', `/api/v1/users/${userId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users'] });
      toast({
        title: "User deleted",
        description: "The user has been successfully removed from your team.",
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle opening edit modal
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditUserModalOpen(true);
  };

  // Handle delete user request
  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  // Confirm delete user
  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  // Handle user creation success
  const handleUserCreated = () => {
    setIsAddUserModalOpen(false);
    toast({
      title: "User created",
      description: "The user has been created successfully.",
    });
    refetch();
  };

  // Handle user update success
  const handleUserUpdated = () => {
    setIsEditUserModalOpen(false);
    toast({
      title: "User updated",
      description: "The user has been updated successfully.",
    });
    refetch();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Team Members</h2>
          <p className="text-sm text-slate-500">Manage users and their access to your system</p>
        </div>
        <Button onClick={() => setIsAddUserModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-32" />
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4 py-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 px-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-red-800 mb-1">Error Loading Users</h3>
            <p className="text-sm text-slate-500 mb-4">
              We encountered a problem loading the team members list.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : users && users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role/Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium flex items-center gap-2">
                    {user.displayName}
                    {user.isSuperAdmin && (
                      <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 ml-1">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.departmentId ? (
                      <span className="inline-flex items-center">
                        <span className="mr-1">{user.departmentId}</span>
                        {user.designationId && (
                          <Badge variant="outline" className="ml-1">{user.designationId}</Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"} 
                        className={user.isActive ? "bg-green-600 hover:bg-green-700" : ""}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onUserSelect(user.id)}>
                          <UserCog className="h-4 w-4 mr-2" />
                          Permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.isSuperAdmin || deleteUserMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 px-4">
            <UserPlus className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No users found</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              Add team members to give them access to the system based on their roles
            </p>
            <Button onClick={() => setIsAddUserModalOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add First User
            </Button>
          </div>
        )}
      </Card>

      {isAddUserModalOpen && (
        <AddUserModal 
          isOpen={isAddUserModalOpen} 
          onClose={() => setIsAddUserModalOpen(false)} 
          onSuccess={handleUserCreated}
        />
      )}

      {isEditUserModalOpen && editingUser && (
        <EditUserModal 
          isOpen={isEditUserModalOpen} 
          onClose={() => setIsEditUserModalOpen(false)} 
          user={editingUser}
          onSuccess={handleUserUpdated}
        />
      )}

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold">{userToDelete?.displayName}</span>?
              <br />
              <br />
              This action cannot be undone. The user will lose all access to the system and all their associated data will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}