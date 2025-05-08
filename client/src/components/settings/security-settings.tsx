import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TenantSetting } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save } from "lucide-react";

export function SecuritySettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [minPasswordLength, setMinPasswordLength] = useState("8");
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [requireNumber, setRequireNumber] = useState(true);
  const [requireSpecial, setRequireSpecial] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [forceLogoutAfterPasswordChange, setForceLogoutAfterPasswordChange] = useState(true);
  
  // Fetch settings
  const { data: settings = [], isLoading } = useQuery<TenantSetting[]>({
    queryKey: ["/api/v1/tenant/settings"],
    refetchOnWindowFocus: false
  });
  
  // Set up mutations for saving settings
  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/tenant/settings",
        { key, value }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tenant/settings"] });
    }
  });
  
  // Initialize form from settings
  useEffect(() => {
    if (settings.length > 0) {
      // Lookup function for settings
      const getSetting = (key: string) => {
        const setting = settings.find(s => s.key === key);
        return setting ? setting.value : "";
      };
      
      setMinPasswordLength(getSetting("min_password_length") || "8");
      setRequireUppercase(getSetting("require_uppercase") === "true");
      setRequireNumber(getSetting("require_number") === "true");
      setRequireSpecial(getSetting("require_special") === "true");
      setSessionTimeout(getSetting("session_timeout") || "60");
      setForceLogoutAfterPasswordChange(getSetting("force_logout_after_password_change") === "true");
    }
  }, [settings]);
  
  // Handle save all settings
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Create array of settings to save
      const settingsToSave = [
        { key: "min_password_length", value: minPasswordLength },
        { key: "require_uppercase", value: requireUppercase.toString() },
        { key: "require_number", value: requireNumber.toString() },
        { key: "require_special", value: requireSpecial.toString() },
        { key: "session_timeout", value: sessionTimeout },
        { key: "force_logout_after_password_change", value: forceLogoutAfterPasswordChange.toString() }
      ];
      
      // Save each setting
      for (const setting of settingsToSave) {
        await saveSettingMutation.mutateAsync(setting);
      }
      
      toast({
        title: "Settings saved",
        description: "Your security settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage your password and account security preferences</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Password Rules</h3>
          
          <div className="space-y-2">
            <Label htmlFor="min-length">Minimum Password Length</Label>
            <Input 
              id="min-length" 
              type="number" 
              min="8" 
              value={minPasswordLength}
              onChange={(e) => setMinPasswordLength(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">Minimum required characters for user passwords</p>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="require-uppercase">Require Uppercase Letter</Label>
              <p className="text-sm text-muted-foreground">Passwords must contain at least one uppercase letter</p>
            </div>
            <Switch 
              id="require-uppercase" 
              checked={requireUppercase}
              onCheckedChange={setRequireUppercase}
            />
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="require-number">Require Number</Label>
              <p className="text-sm text-muted-foreground">Passwords must contain at least one numeric character</p>
            </div>
            <Switch 
              id="require-number"
              checked={requireNumber}
              onCheckedChange={setRequireNumber}
            />
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="require-special">Require Special Character</Label>
              <p className="text-sm text-muted-foreground">Passwords must contain at least one special character</p>
            </div>
            <Switch 
              id="require-special"
              checked={requireSpecial}
              onCheckedChange={setRequireSpecial}
            />
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Session Settings</h3>
          
          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input 
              id="session-timeout" 
              type="number" 
              min="5" 
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">Time after which inactive users are automatically logged out</p>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="force-logout">Force Logout After Password Change</Label>
              <p className="text-sm text-muted-foreground">Log users out of all devices after they change their password</p>
            </div>
            <Switch 
              id="force-logout"
              checked={forceLogoutAfterPasswordChange}
              onCheckedChange={setForceLogoutAfterPasswordChange}
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}