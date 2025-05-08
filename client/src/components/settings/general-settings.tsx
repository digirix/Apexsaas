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

export function GeneralSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [defaultLeadTime, setDefaultLeadTime] = useState("30");
  const [autoGenerateTasks, setAutoGenerateTasks] = useState(true);
  const [autoApproveTasks, setAutoApproveTasks] = useState(false);
  
  // Fetch settings
  const { data: settings = [], isLoading, refetch } = useQuery<TenantSetting[]>({
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
      
      setCompanyName(getSetting("company_name") || "");
      setContactEmail(getSetting("contact_email") || "");
      setContactPhone(getSetting("contact_phone") || "");
      setDefaultLeadTime(getSetting("default_lead_time") || "30");
      setAutoGenerateTasks(getSetting("auto_generate_tasks") === "true");
      setAutoApproveTasks(getSetting("auto_approve_tasks") === "true");
    }
  }, [settings]);
  
  // Handle save all settings
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Create array of settings to save
      const settingsToSave = [
        { key: "company_name", value: companyName },
        { key: "contact_email", value: contactEmail },
        { key: "contact_phone", value: contactPhone },
        { key: "default_lead_time", value: defaultLeadTime },
        { key: "auto_generate_tasks", value: autoGenerateTasks.toString() },
        { key: "auto_approve_tasks", value: autoApproveTasks.toString() }
      ];
      
      // Save each setting
      for (const setting of settingsToSave) {
        await saveSettingMutation.mutateAsync(setting);
      }
      
      toast({
        title: "Settings saved",
        description: "Your general settings have been updated successfully.",
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
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Manage your organization's basic information and default settings
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="company">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company">Company Info</TabsTrigger>
            <TabsTrigger value="defaults">Defaults & Automation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="company" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input 
                id="company-name" 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input 
                  id="contact-email" 
                  type="email" 
                  value={contactEmail} 
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input 
                  id="contact-phone" 
                  value={contactPhone} 
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="defaults" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="lead-time">Default Lead Time (days)</Label>
              <Input 
                id="lead-time" 
                type="number" 
                min="0"
                value={defaultLeadTime} 
                onChange={(e) => setDefaultLeadTime(e.target.value)}
                placeholder="30"
              />
              <p className="text-sm text-muted-foreground">
                Number of days before compliance deadlines to generate tasks
              </p>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Task Automation</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-generate">Auto-generate Recurring Tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create new tasks based on recurring schedules
                  </p>
                </div>
                <Switch 
                  id="auto-generate" 
                  checked={autoGenerateTasks}
                  onCheckedChange={setAutoGenerateTasks}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-approve">Auto-approve Generated Tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    Skip approval process for auto-generated tasks
                  </p>
                </div>
                <Switch 
                  id="auto-approve" 
                  checked={autoApproveTasks}
                  onCheckedChange={setAutoApproveTasks}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
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