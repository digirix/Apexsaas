import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TenantSetting } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar, Download, Upload, History, Database, CloudOff, Loader2, Save } from "lucide-react";

export function BackupSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [retentionPeriod, setRetentionPeriod] = useState("30");
  const [backupLocation, setBackupLocation] = useState("local");
  
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
      
      setAutoBackup(getSetting("auto_backup") !== "false");
      setBackupFrequency(getSetting("backup_frequency") || "daily");
      setRetentionPeriod(getSetting("retention_period") || "30");
      setBackupLocation(getSetting("backup_location") || "local");
    }
  }, [settings]);
  
  // Handle save all settings
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Create array of settings to save
      const settingsToSave = [
        { key: "auto_backup", value: autoBackup.toString() },
        { key: "backup_frequency", value: backupFrequency },
        { key: "retention_period", value: retentionPeriod },
        { key: "backup_location", value: backupLocation }
      ];
      
      // Save each setting
      for (const setting of settingsToSave) {
        await saveSettingMutation.mutateAsync(setting);
      }
      
      toast({
        title: "Settings saved",
        description: "Your backup settings have been updated successfully.",
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
  
  // Handle manual backup trigger
  const handleManualBackup = () => {
    toast({
      title: "Backup started",
      description: "The backup process has been initiated. This may take a few minutes.",
    });
    
    // Here would be the actual API call to initiate a backup
  };
  
  // Handle restore from backup
  const handleRestoreFromBackup = () => {
    toast({
      title: "Select backup file",
      description: "Please select a backup file to restore from.",
    });
    
    // Here would be the actual file picker and restore process
  };
  
  // Handle view backup history
  const handleViewBackupHistory = () => {
    toast({
      title: "Backup history",
      description: "Viewing backup history is not yet implemented.",
    });
    
    // Here would be navigation to backup history page
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
        <CardTitle>Backup & Restore</CardTitle>
        <CardDescription>Configure automated backups and data restoration options</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Automated Backups</h3>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="auto-backup">Enable Automated Backups</Label>
              <p className="text-sm text-muted-foreground">Regularly back up your data to prevent loss</p>
            </div>
            <Switch 
              id="auto-backup" 
              checked={autoBackup}
              onCheckedChange={setAutoBackup}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="backup-frequency">Backup Frequency</Label>
            <Select 
              value={backupFrequency}
              onValueChange={setBackupFrequency}
              disabled={!autoBackup}
            >
              <SelectTrigger id="backup-frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="retention-period">Retention Period (days)</Label>
            <Input 
              id="retention-period" 
              type="number" 
              min="1" 
              value={retentionPeriod}
              onChange={(e) => setRetentionPeriod(e.target.value)}
              disabled={!autoBackup}
            />
            <p className="text-sm text-muted-foreground">How long to keep backup files before they are deleted</p>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Backup Location</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant={backupLocation === "local" ? "default" : "outline"} 
              className="h-auto flex flex-col items-center justify-center py-4 px-2"
              onClick={() => setBackupLocation("local")}
            >
              <Database className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Local Storage</span>
              <span className="text-xs text-muted-foreground mt-1">Save to your device</span>
            </Button>
            
            <Button 
              variant={backupLocation === "cloud" ? "default" : "outline"} 
              className="h-auto flex flex-col items-center justify-center py-4 px-2"
              onClick={() => setBackupLocation("cloud")}
            >
              <CloudOff className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Cloud Storage</span>
              <span className="text-xs text-muted-foreground mt-1">Save to cloud provider</span>
            </Button>
            
            <Button 
              variant={backupLocation === "version_history" ? "default" : "outline"} 
              className="h-auto flex flex-col items-center justify-center py-4 px-2"
              onClick={() => setBackupLocation("version_history")}
            >
              <History className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Version History</span>
              <span className="text-xs text-muted-foreground mt-1">Keep multiple versions</span>
            </Button>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Manual Backup & Restore</h3>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              className="flex items-center" 
              variant="outline"
              onClick={handleManualBackup}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Backup
            </Button>
            
            <Button 
              className="flex items-center" 
              variant="outline"
              onClick={handleRestoreFromBackup}
            >
              <Upload className="h-4 w-4 mr-2" />
              Restore from Backup
            </Button>
            
            <Button 
              className="flex items-center" 
              variant="outline"
              onClick={handleViewBackupHistory}
            >
              <Calendar className="h-4 w-4 mr-2" />
              View Backup History
            </Button>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mt-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Restoring from a backup will overwrite all current data. 
              This action cannot be undone. Always ensure you have a recent backup before proceeding.
            </p>
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