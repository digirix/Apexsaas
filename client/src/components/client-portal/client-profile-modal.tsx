import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Building, 
  Calendar, 
  Shield, 
  Edit3, 
  Save, 
  X,
  Phone,
  MapPin 
} from "lucide-react";

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
  stats: any;
}

export function ClientProfileModal({ isOpen, onClose, client, stats }: ClientProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState(client || {});

  const handleSave = () => {
    // Here you would typically make an API call to update the client profile
    setIsEditing(false);
    // For now, we'll just close editing mode
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Client Profile</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>Your account details and contact information</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              >
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  {isEditing ? (
                    <Input
                      id="displayName"
                      value={editedClient.displayName || ''}
                      onChange={(e) => setEditedClient({...editedClient, displayName: e.target.value})}
                    />
                  ) : (
                    <div className="flex items-center space-x-2 mt-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{client?.displayName || 'Not provided'}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{client?.email || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">Account Status:</span>
                <Badge variant={client?.status === 'Active' ? 'default' : 'secondary'}>
                  {client?.status || 'Unknown'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Account Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Overview</CardTitle>
              <CardDescription>Your business metrics and activity summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Building className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-blue-700">{stats?.entityCount || 0}</div>
                  <div className="text-xs text-blue-600">Entities</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-green-700">{stats?.totalSubscribedServices || 0}</div>
                  <div className="text-xs text-green-600">Services</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-purple-700">{stats?.totalTasks || 0}</div>
                  <div className="text-xs text-purple-600">Tasks</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <User className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-orange-700">
                    {stats?.totalTasks > 0 ? Math.round((stats.totalCompletedTasks / stats.totalTasks) * 100) : 0}%
                  </div>
                  <div className="text-xs text-orange-600">Completion</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Your latest interactions with our platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Portal Access</p>
                    <p className="text-xs text-gray-500">Last login: Today</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                  <Building className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Entity Management</p>
                    <p className="text-xs text-gray-500">Managing {stats?.entityCount || 0} business entities</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Compliance Tracking</p>
                    <p className="text-xs text-gray-500">{stats?.totalCompletedTasks || 0} tasks completed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}