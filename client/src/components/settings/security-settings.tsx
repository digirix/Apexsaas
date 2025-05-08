import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export function SecuritySettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage your password and account security preferences</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Password Rules</h3>
          
          <div className="space-y-2">
            <Label htmlFor="min-length">Minimum Password Length</Label>
            <Input id="min-length" type="number" min="8" defaultValue="8" />
            <p className="text-sm text-muted-foreground">Minimum required characters for user passwords</p>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="require-uppercase">Require Uppercase Letter</Label>
              <p className="text-sm text-muted-foreground">Passwords must contain at least one uppercase letter</p>
            </div>
            <Switch id="require-uppercase" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="require-number">Require Number</Label>
              <p className="text-sm text-muted-foreground">Passwords must contain at least one numeric character</p>
            </div>
            <Switch id="require-number" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="require-special">Require Special Character</Label>
              <p className="text-sm text-muted-foreground">Passwords must contain at least one special character</p>
            </div>
            <Switch id="require-special" defaultChecked />
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Session Settings</h3>
          
          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input id="session-timeout" type="number" min="5" defaultValue="60" />
            <p className="text-sm text-muted-foreground">Time after which inactive users are automatically logged out</p>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="force-logout">Force Logout After Password Change</Label>
              <p className="text-sm text-muted-foreground">Log users out of all devices after they change their password</p>
            </div>
            <Switch id="force-logout" defaultChecked />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button variant="outline" className="mr-2">Cancel</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}