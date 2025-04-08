import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "../components/users/user-list";
import { UserPermissions } from "../components/users/user-permissions";

export default function UsersPage() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("members");

  // Function to handle user selection
  const handleUserSelect = (userId: number) => {
    setSelectedUserId(userId);
    setActiveTab("permissions");
  };

  return (
    <AppLayout title="User Management">
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="permissions" disabled={!selectedUserId}>
              Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage your firm's staff members and their roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserList onUserSelect={handleUserSelect} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>User Permissions</CardTitle>
                <CardDescription>
                  Manage module-specific permissions for the selected user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedUserId ? (
                  <UserPermissions userId={selectedUserId} />
                ) : (
                  <p>Please select a user first</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}