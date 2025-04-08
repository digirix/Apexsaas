import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, UserPlus } from "lucide-react";
import { AddUserModal } from "../users/add-user-modal";
import { EditUserModal } from "../users/edit-user-modal";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

interface UserListProps {
  onUserSelect: (userId: number) => void;
}

export function UserList({ onUserSelect }: UserListProps) {
  const { toast } = useToast();
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Fetch users data
  const { data: users, isLoading, error, refetch } = useQuery<User[]>({
    queryKey: ['/api/v1/users'],
  });

  // Handle opening edit modal
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditUserModalOpen(true);
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Team Members</h2>
        <Button onClick={() => setIsAddUserModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading users...</div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">Failed to load users</div>
      ) : users && users.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.displayName}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.departmentId ? user.departmentId : '-'}</TableCell>
                <TableCell>{user.designationId ? user.designationId : '-'}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "success" : "destructive"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUserSelect(user.id)}
                    className="mr-1"
                  >
                    Permissions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(user)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 border rounded-md bg-slate-50">
          <p className="text-slate-500 mb-4">No users found</p>
          <Button onClick={() => setIsAddUserModalOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add First User
          </Button>
        </div>
      )}

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
    </div>
  );
}