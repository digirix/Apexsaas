import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export function DisplaySettings() {
  const [themeMode, setThemeMode] = useState("system");
  const [compactMode, setCompactMode] = useState(false);
  const [borderRadius, setBorderRadius] = useState([8]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Display Settings</CardTitle>
        <CardDescription>Customize the appearance of your application</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Theme</Label>
          <RadioGroup 
            defaultValue={themeMode} 
            onValueChange={setThemeMode}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="theme-light" />
              <Label htmlFor="theme-light">Light</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="theme-dark" />
              <Label htmlFor="theme-dark">Dark</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="theme-system" />
              <Label htmlFor="theme-system">System</Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="space-y-3">
          <Label>Primary Color</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              className="h-8 w-full bg-blue-500 hover:bg-blue-600"
              aria-label="Blue"
            />
            <Button 
              variant="outline" 
              className="h-8 w-full bg-purple-500 hover:bg-purple-600"
              aria-label="Purple"
            />
            <Button 
              variant="outline" 
              className="h-8 w-full bg-green-500 hover:bg-green-600"
              aria-label="Green"
            />
            <Button 
              variant="outline" 
              className="h-8 w-full bg-red-500 hover:bg-red-600"
              aria-label="Red"
            />
            <Button 
              variant="outline" 
              className="h-8 w-full bg-orange-500 hover:bg-orange-600"
              aria-label="Orange"
            />
            <Button 
              variant="outline" 
              className="h-8 w-full bg-slate-800 hover:bg-slate-900"
              aria-label="Slate"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <Label>Font Size</Label>
          <Select defaultValue="medium">
            <SelectTrigger>
              <SelectValue placeholder="Select font size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label htmlFor="border-radius">Border Radius</Label>
            <span className="text-sm text-muted-foreground">{borderRadius}px</span>
          </div>
          <Slider
            id="border-radius"
            min={0}
            max={16}
            step={1}
            value={borderRadius}
            onValueChange={setBorderRadius}
          />
        </div>
        
        <div className="flex items-center justify-between py-2">
          <div>
            <Label htmlFor="compact-mode">Compact Mode</Label>
            <p className="text-sm text-muted-foreground">Reduce spacing between elements for more content</p>
          </div>
          <Switch 
            id="compact-mode" 
            checked={compactMode}
            onCheckedChange={setCompactMode}
          />
        </div>
        
        <div className="flex items-center justify-between py-2">
          <div>
            <Label htmlFor="animations">Interface Animations</Label>
            <p className="text-sm text-muted-foreground">Enable animations for smoother transitions</p>
          </div>
          <Switch id="animations" defaultChecked />
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button variant="outline" className="mr-2">Reset to Defaults</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  );
}