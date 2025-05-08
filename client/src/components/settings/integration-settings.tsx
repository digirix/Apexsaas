import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, ExternalLink, ArrowRightLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function IntegrationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connect with external services and applications</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="payment">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="accounting">Accounting</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>
          
          <TabsContent value="payment" className="space-y-4 pt-4">
            <div className="grid gap-6">
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="font-semibold text-blue-700">S</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Stripe</h3>
                    <p className="text-sm text-muted-foreground">Accept credit card payments</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge className="mr-2 bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                  <Button variant="ghost" size="sm">Configure</Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-md flex items-center justify-center">
                    <span className="font-semibold text-indigo-700">P</span>
                  </div>
                  <div>
                    <h3 className="font-medium">PayPal</h3>
                    <p className="text-sm text-muted-foreground">Accept PayPal payments</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge className="mr-2 bg-red-100 text-red-800 hover:bg-red-100">
                    <XCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="accounting" className="space-y-4 pt-4">
            <div className="grid gap-6">
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-md flex items-center justify-center">
                    <span className="font-semibold text-green-700">QB</span>
                  </div>
                  <div>
                    <h3 className="font-medium">QuickBooks</h3>
                    <p className="text-sm text-muted-foreground">Sync accounting data</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge className="mr-2 bg-red-100 text-red-800 hover:bg-red-100">
                    <XCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="font-semibold text-blue-700">X</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Xero</h3>
                    <p className="text-sm text-muted-foreground">Sync accounting data</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge className="mr-2 bg-red-100 text-red-800 hover:bg-red-100">
                    <XCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="communications" className="space-y-4 pt-4">
            <div className="grid gap-6">
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="font-semibold text-blue-700">M</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Mailchimp</h3>
                    <p className="text-sm text-muted-foreground">Email marketing integration</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge className="mr-2 bg-red-100 text-red-800 hover:bg-red-100">
                    <XCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-md flex items-center justify-center">
                    <span className="font-semibold text-purple-700">T</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Twilio</h3>
                    <p className="text-sm text-muted-foreground">SMS notifications</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge className="mr-2 bg-red-100 text-red-800 hover:bg-red-100">
                    <XCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="storage" className="space-y-4 pt-4">
            <div className="grid gap-6">
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="font-semibold text-blue-700">GD</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Google Drive</h3>
                    <p className="text-sm text-muted-foreground">Cloud storage integration</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge className="mr-2 bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                  <Button variant="ghost" size="sm">Configure</Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between border p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="font-semibold text-blue-700">OD</span>
                  </div>
                  <div>
                    <h3 className="font-medium">OneDrive</h3>
                    <p className="text-sm text-muted-foreground">Microsoft cloud storage</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge className="mr-2 bg-red-100 text-red-800 hover:bg-red-100">
                    <XCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Webhook Settings</h3>
          
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <div className="flex">
              <Input 
                id="webhook-url" 
                placeholder="https://your-app.com/webhook" 
                className="flex-1 rounded-r-none"
              />
              <Button variant="outline" className="rounded-l-none">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              URL to receive notifications from our system
            </p>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="enable-webhook">Enable Webhooks</Label>
              <p className="text-sm text-muted-foreground">Send events to your webhook URL</p>
            </div>
            <Switch id="enable-webhook" defaultChecked />
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
          <div className="flex">
            <ArrowRightLeft className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              <strong>API Access:</strong> You can access our API for deeper integrations. 
              Visit our <a href="#" className="underline">API documentation</a> to learn more.
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