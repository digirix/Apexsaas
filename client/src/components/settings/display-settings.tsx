import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TenantSetting } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";

export function DisplaySettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [themeMode, setThemeMode] = useState("system");
  const [designStyle, setDesignStyle] = useState("classic"); // classic or animated
  const [primaryColor, setPrimaryColor] = useState("blue");
  const [fontSize, setFontSize] = useState("medium");
  const [borderRadius, setBorderRadius] = useState([8]);
  const [compactMode, setCompactMode] = useState(false);
  const [enableAnimations, setEnableAnimations] = useState(true);
  
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
      
      setThemeMode(getSetting("theme_mode") || "system");
      setDesignStyle(getSetting("design_style") || "classic");
      setPrimaryColor(getSetting("primary_color") || "blue");
      setFontSize(getSetting("font_size") || "medium");
      setBorderRadius([parseInt(getSetting("border_radius") || "8", 10)]);
      setCompactMode(getSetting("compact_mode") === "true");
      setEnableAnimations(getSetting("enable_animations") !== "false");
    }
  }, [settings]);
  
  // Handle save all settings
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Create array of settings to save
      const settingsToSave = [
        { key: "theme_mode", value: themeMode },
        { key: "design_style", value: designStyle },
        { key: "primary_color", value: primaryColor },
        { key: "font_size", value: fontSize },
        { key: "border_radius", value: borderRadius[0].toString() },
        { key: "compact_mode", value: compactMode.toString() },
        { key: "enable_animations", value: enableAnimations.toString() }
      ];
      
      // Save each setting
      for (const setting of settingsToSave) {
        await saveSettingMutation.mutateAsync(setting);
      }
      
      toast({
        title: "Settings saved",
        description: "Your display settings have been updated successfully.",
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
  
  // Function to determine color class for buttons
  const getColorClass = (color: string) => {
    switch(color) {
      case 'blue': return 'bg-blue-500 hover:bg-blue-600';
      case 'purple': return 'bg-purple-500 hover:bg-purple-600';
      case 'green': return 'bg-green-500 hover:bg-green-600';
      case 'red': return 'bg-red-500 hover:bg-red-600';
      case 'orange': return 'bg-orange-500 hover:bg-orange-600';
      case 'slate': return 'bg-slate-800 hover:bg-slate-900';
      default: return 'bg-blue-500 hover:bg-blue-600';
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
        <CardTitle>Display Settings</CardTitle>
        <CardDescription>Customize the appearance of your application</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Theme</Label>
          <RadioGroup 
            value={themeMode} 
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
          <Label>Design Style</Label>
          <RadioGroup 
            value={designStyle} 
            onValueChange={setDesignStyle}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="classic" id="style-classic" />
              <Label htmlFor="style-classic">
                <div>
                  <div className="font-medium">Classic</div>
                  <div className="text-sm text-muted-foreground">Traditional clean interface with standard styling</div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="animated" id="style-animated" />
              <Label htmlFor="style-animated">
                <div>
                  <div className="font-medium">Animated</div>
                  <div className="text-sm text-muted-foreground">Modern interface with stunning animations and glass-morphism effects</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="space-y-3">
          <Label>Primary Color</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              className={`h-8 w-full ${primaryColor === 'blue' ? 'ring-2 ring-offset-2 ring-blue-500' : ''} ${getColorClass('blue')}`}
              aria-label="Blue"
              onClick={() => setPrimaryColor('blue')}
            />
            <Button 
              variant="outline" 
              className={`h-8 w-full ${primaryColor === 'purple' ? 'ring-2 ring-offset-2 ring-purple-500' : ''} ${getColorClass('purple')}`}
              aria-label="Purple"
              onClick={() => setPrimaryColor('purple')}
            />
            <Button 
              variant="outline" 
              className={`h-8 w-full ${primaryColor === 'green' ? 'ring-2 ring-offset-2 ring-green-500' : ''} ${getColorClass('green')}`}
              aria-label="Green"
              onClick={() => setPrimaryColor('green')}
            />
            <Button 
              variant="outline" 
              className={`h-8 w-full ${primaryColor === 'red' ? 'ring-2 ring-offset-2 ring-red-500' : ''} ${getColorClass('red')}`}
              aria-label="Red"
              onClick={() => setPrimaryColor('red')}
            />
            <Button 
              variant="outline" 
              className={`h-8 w-full ${primaryColor === 'orange' ? 'ring-2 ring-offset-2 ring-orange-500' : ''} ${getColorClass('orange')}`}
              aria-label="Orange"
              onClick={() => setPrimaryColor('orange')}
            />
            <Button 
              variant="outline" 
              className={`h-8 w-full ${primaryColor === 'slate' ? 'ring-2 ring-offset-2 ring-slate-500' : ''} ${getColorClass('slate')}`}
              aria-label="Slate"
              onClick={() => setPrimaryColor('slate')}
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <Label>Font Size</Label>
          <Select 
            value={fontSize}
            onValueChange={setFontSize}
          >
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
          <Switch 
            id="animations" 
            checked={enableAnimations}
            onCheckedChange={setEnableAnimations}
          />
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          variant="outline" 
          className="mr-2"
          onClick={() => {
            setThemeMode("system");
            setPrimaryColor("blue");
            setFontSize("medium");
            setBorderRadius([8]);
            setCompactMode(false);
            setEnableAnimations(true);
          }}
        >
          Reset to Defaults
        </Button>
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