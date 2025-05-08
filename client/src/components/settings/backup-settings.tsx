import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar, Download, Upload, History, Database, CloudOff } from "lucide-react";

export function BackupSettings() {
  return (
    <Card>
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
            <Switch id="auto-backup" defaultChecked />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="backup-frequency">Backup Frequency</Label>
            <Select defaultValue="daily">
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
            <Input id="retention-period" type="number" min="1" defaultValue="30" />
            <p className="text-sm text-muted-foreground">How long to keep backup files before they are deleted</p>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Backup Location</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto flex flex-col items-center justify-center py-4 px-2">
              <Database className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Local Storage</span>
              <span className="text-xs text-muted-foreground mt-1">Save to your device</span>
            </Button>
            
            <Button variant="outline" className="h-auto flex flex-col items-center justify-center py-4 px-2">
              <CloudOff className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Cloud Storage</span>
              <span className="text-xs text-muted-foreground mt-1">Save to cloud provider</span>
            </Button>
            
            <Button variant="outline" className="h-auto flex flex-col items-center justify-center py-4 px-2">
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
            <Button className="flex items-center" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Backup
            </Button>
            
            <Button className="flex items-center" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Restore from Backup
            </Button>
            
            <Button className="flex items-center" variant="outline">
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
        <Button variant="outline" className="mr-2">Reset to Defaults</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}