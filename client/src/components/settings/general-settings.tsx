import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TenantSetting } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save } from "lucide-react";

export function GeneralSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Core tenant information
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("accounting_firm");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [taxId, setTaxId] = useState("");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  
  // Custom labels for branding
  const [useCustomLabels, setUseCustomLabels] = useState(false);
  const [clientsLabel, setClientsLabel] = useState("Clients");
  const [tasksLabel, setTasksLabel] = useState("Tasks");
  const [invoicesLabel, setInvoicesLabel] = useState("Invoices");
  
  // Client Portal Header & Footer
  const [headerEnabled, setHeaderEnabled] = useState(true);
  const [headerTitle, setHeaderTitle] = useState("");
  const [headerSubtitle, setHeaderSubtitle] = useState("");
  const [headerLogoText, setHeaderLogoText] = useState("");
  const [headerContactInfo, setHeaderContactInfo] = useState(true);
  const [headerBusinessHours, setHeaderBusinessHours] = useState("");
  
  const [footerEnabled, setFooterEnabled] = useState(true);
  const [footerCompanyInfo, setFooterCompanyInfo] = useState(true);
  const [footerCopyright, setFooterCopyright] = useState("");
  const [footerSupportEmail, setFooterSupportEmail] = useState("");
  const [footerSupportPhone, setFooterSupportPhone] = useState("");
  const [footerDisclaimerText, setFooterDisclaimerText] = useState("");
  const [footerAdditionalLinks, setFooterAdditionalLinks] = useState("");
  
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
      
      setCompanyName(getSetting("company_name") || "");
      setBusinessType(getSetting("business_type") || "accounting_firm");
      setEmail(getSetting("email") || "");
      setPhone(getSetting("phone") || "");
      setAddress(getSetting("address") || "");
      setWebsite(getSetting("website") || "");
      setTaxId(getSetting("tax_id") || "");
      setLanguage(getSetting("language") || "en");
      setTimezone(getSetting("timezone") || "UTC");
      setUseCustomLabels(getSetting("use_custom_labels") === "true");
      setClientsLabel(getSetting("clients_label") || "Clients");
      setTasksLabel(getSetting("tasks_label") || "Tasks");
      setInvoicesLabel(getSetting("invoices_label") || "Invoices");
      
      // Client Portal Header & Footer
      setHeaderEnabled(getSetting("header_enabled") !== "false");
      setHeaderTitle(getSetting("header_title") || "");
      setHeaderSubtitle(getSetting("header_subtitle") || "");
      setHeaderLogoText(getSetting("header_logo_text") || "");
      setHeaderContactInfo(getSetting("header_contact_info") !== "false");
      setHeaderBusinessHours(getSetting("header_business_hours") || "");
      
      setFooterEnabled(getSetting("footer_enabled") !== "false");
      setFooterCompanyInfo(getSetting("footer_company_info") !== "false");
      setFooterCopyright(getSetting("footer_copyright") || "");
      setFooterSupportEmail(getSetting("footer_support_email") || "");
      setFooterSupportPhone(getSetting("footer_support_phone") || "");
      setFooterDisclaimerText(getSetting("footer_disclaimer_text") || "");
      setFooterAdditionalLinks(getSetting("footer_additional_links") || "");
    }
  }, [settings]);
  
  // Handle save all settings
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Create array of settings to save
      const settingsToSave = [
        { key: "company_name", value: companyName },
        { key: "business_type", value: businessType },
        { key: "email", value: email },
        { key: "phone", value: phone },
        { key: "address", value: address },
        { key: "website", value: website },
        { key: "tax_id", value: taxId },
        { key: "language", value: language },
        { key: "timezone", value: timezone },
        { key: "use_custom_labels", value: useCustomLabels.toString() },
        { key: "clients_label", value: clientsLabel },
        { key: "tasks_label", value: tasksLabel },
        { key: "invoices_label", value: invoicesLabel },
        
        // Client Portal Header & Footer
        { key: "header_enabled", value: headerEnabled.toString() },
        { key: "header_title", value: headerTitle },
        { key: "header_subtitle", value: headerSubtitle },
        { key: "header_logo_text", value: headerLogoText },
        { key: "header_contact_info", value: headerContactInfo.toString() },
        { key: "header_business_hours", value: headerBusinessHours },
        
        { key: "footer_enabled", value: footerEnabled.toString() },
        { key: "footer_company_info", value: footerCompanyInfo.toString() },
        { key: "footer_copyright", value: footerCopyright },
        { key: "footer_support_email", value: footerSupportEmail },
        { key: "footer_support_phone", value: footerSupportPhone },
        { key: "footer_disclaimer_text", value: footerDisclaimerText },
        { key: "footer_additional_links", value: footerAdditionalLinks }
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
    <div className="space-y-6">
      <Card className="w-full">
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Manage your company information and branding preferences</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Company Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input 
                id="company-name" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company Name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business-type">Business Type</Label>
              <Select 
                value={businessType}
                onValueChange={setBusinessType}
              >
                <SelectTrigger id="business-type">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accounting_firm">Accounting Firm</SelectItem>
                  <SelectItem value="tax_firm">Tax Firm</SelectItem>
                  <SelectItem value="bookkeeping">Bookkeeping Service</SelectItem>
                  <SelectItem value="accounting_consultant">Accounting Consultant</SelectItem>
                  <SelectItem value="financial_advisor">Financial Advisor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-email">Company Email</Label>
              <Input 
                id="company-email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@yourcompany.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone Number</Label>
              <Input 
                id="company-phone" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="company-address">Business Address</Label>
              <Textarea 
                id="company-address" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Business Ave, Suite 500, City, State, ZIP"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-website">Website</Label>
              <Input 
                id="company-website" 
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourcompany.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tax-id">Tax ID / VAT Number</Label>
              <Input 
                id="tax-id" 
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Tax identification number"
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Localization</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Default Language</Label>
              <Select 
                value={language}
                onValueChange={setLanguage}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={timezone}
                onValueChange={setTimezone}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                  <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Custom Labels</h3>
              <p className="text-sm text-muted-foreground">
                Customize how key terms appear throughout the application
              </p>
            </div>
            <Switch 
              checked={useCustomLabels}
              onCheckedChange={setUseCustomLabels}
            />
          </div>
          
          {useCustomLabels && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clients-label">Clients Label</Label>
                <Input 
                  id="clients-label" 
                  value={clientsLabel}
                  onChange={(e) => setClientsLabel(e.target.value)}
                  placeholder="Clients"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tasks-label">Tasks Label</Label>
                <Input 
                  id="tasks-label" 
                  value={tasksLabel}
                  onChange={(e) => setTasksLabel(e.target.value)}
                  placeholder="Tasks"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invoices-label">Invoices Label</Label>
                <Input 
                  id="invoices-label" 
                  value={invoicesLabel}
                  onChange={(e) => setInvoicesLabel(e.target.value)}
                  placeholder="Invoices"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      </Card>

      {/* Client Portal Header & Footer Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-gradient-to-r from-blue-500 to-purple-500"></div>
            Client Portal Header & Footer
          </CardTitle>
          <CardDescription>
            Configure the header and footer that appear in your client portal. These settings will be immediately visible to your clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Header Configuration */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded"></div>
              <h3 className="text-lg font-semibold">Header Configuration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="header-enabled"
                    checked={headerEnabled}
                    onCheckedChange={setHeaderEnabled}
                  />
                  <Label htmlFor="header-enabled" className="font-medium">Enable Header</Label>
                </div>
                <p className="text-sm text-muted-foreground">Show header section in client portal</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="header-contact-info"
                    checked={headerContactInfo}
                    onCheckedChange={setHeaderContactInfo}
                    disabled={!headerEnabled}
                  />
                  <Label htmlFor="header-contact-info" className="font-medium">Show Contact Info</Label>
                </div>
                <p className="text-sm text-muted-foreground">Display contact information in header</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="header-title">Header Title</Label>
                <Input
                  id="header-title"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  placeholder="Welcome to Client Portal"
                  disabled={!headerEnabled}
                />
                <p className="text-sm text-muted-foreground">Main title displayed in header</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="header-subtitle">Header Subtitle</Label>
                <Input
                  id="header-subtitle"
                  value={headerSubtitle}
                  onChange={(e) => setHeaderSubtitle(e.target.value)}
                  placeholder="Your trusted accounting partner"
                  disabled={!headerEnabled}
                />
                <p className="text-sm text-muted-foreground">Subtitle or tagline</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="header-logo-text">Logo Text</Label>
                <Input
                  id="header-logo-text"
                  value={headerLogoText}
                  onChange={(e) => setHeaderLogoText(e.target.value)}
                  placeholder="Company Logo Text"
                  disabled={!headerEnabled}
                />
                <p className="text-sm text-muted-foreground">Text to display as logo</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="header-business-hours">Business Hours</Label>
                <Input
                  id="header-business-hours"
                  value={headerBusinessHours}
                  onChange={(e) => setHeaderBusinessHours(e.target.value)}
                  placeholder="Mon-Fri: 9AM-5PM"
                  disabled={!headerEnabled}
                />
                <p className="text-sm text-muted-foreground">Business hours to display</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer Configuration */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded"></div>
              <h3 className="text-lg font-semibold">Footer Configuration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="footer-enabled"
                    checked={footerEnabled}
                    onCheckedChange={setFooterEnabled}
                  />
                  <Label htmlFor="footer-enabled" className="font-medium">Enable Footer</Label>
                </div>
                <p className="text-sm text-muted-foreground">Show footer section in client portal</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="footer-company-info"
                    checked={footerCompanyInfo}
                    onCheckedChange={setFooterCompanyInfo}
                    disabled={!footerEnabled}
                  />
                  <Label htmlFor="footer-company-info" className="font-medium">Show Company Info</Label>
                </div>
                <p className="text-sm text-muted-foreground">Display company details in footer</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="footer-copyright">Copyright Text</Label>
                <Input
                  id="footer-copyright"
                  value={footerCopyright}
                  onChange={(e) => setFooterCopyright(e.target.value)}
                  placeholder="© 2025 Your Company Name"
                  disabled={!footerEnabled}
                />
                <p className="text-sm text-muted-foreground">Copyright notice</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="footer-support-email">Support Email</Label>
                <Input
                  id="footer-support-email"
                  type="email"
                  value={footerSupportEmail}
                  onChange={(e) => setFooterSupportEmail(e.target.value)}
                  placeholder="support@company.com"
                  disabled={!footerEnabled}
                />
                <p className="text-sm text-muted-foreground">Email for client support</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="footer-support-phone">Support Phone</Label>
                <Input
                  id="footer-support-phone"
                  value={footerSupportPhone}
                  onChange={(e) => setFooterSupportPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  disabled={!footerEnabled}
                />
                <p className="text-sm text-muted-foreground">Phone number for client support</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="footer-additional-links">Additional Links</Label>
                <Input
                  id="footer-additional-links"
                  value={footerAdditionalLinks}
                  onChange={(e) => setFooterAdditionalLinks(e.target.value)}
                  placeholder="Privacy Policy | Terms of Service"
                  disabled={!footerEnabled}
                />
                <p className="text-sm text-muted-foreground">Links separated by |</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer-disclaimer">Disclaimer Text</Label>
              <Textarea
                id="footer-disclaimer"
                value={footerDisclaimerText}
                onChange={(e) => setFooterDisclaimerText(e.target.value)}
                placeholder="Professional disclaimer or legal notice for your clients..."
                rows={3}
                disabled={!footerEnabled}
              />
              <p className="text-sm text-muted-foreground">Legal disclaimer or important notice</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <CardFooter>
        <Button 
          onClick={handleSaveSettings}
          disabled={loading}
          className="ml-auto"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </CardFooter>
    </div>
  );
}