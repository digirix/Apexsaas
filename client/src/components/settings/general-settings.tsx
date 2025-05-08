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
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("accounting_firm");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [taxId, setTaxId] = useState("");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [timeFormat, setTimeFormat] = useState("12h");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [fiscalYearStart, setFiscalYearStart] = useState("01");
  const [useCustomLabels, setUseCustomLabels] = useState(false);
  const [clientsLabel, setClientsLabel] = useState("Clients");
  const [tasksLabel, setTasksLabel] = useState("Tasks");
  const [invoicesLabel, setInvoicesLabel] = useState("Invoices");
  
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
      setDateFormat(getSetting("date_format") || "MM/DD/YYYY");
      setTimeFormat(getSetting("time_format") || "12h");
      setCurrencyCode(getSetting("currency_code") || "USD");
      setFiscalYearStart(getSetting("fiscal_year_start") || "01");
      setUseCustomLabels(getSetting("use_custom_labels") === "true");
      setClientsLabel(getSetting("clients_label") || "Clients");
      setTasksLabel(getSetting("tasks_label") || "Tasks");
      setInvoicesLabel(getSetting("invoices_label") || "Invoices");
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
        { key: "date_format", value: dateFormat },
        { key: "time_format", value: timeFormat },
        { key: "currency_code", value: currencyCode },
        { key: "fiscal_year_start", value: fiscalYearStart },
        { key: "use_custom_labels", value: useCustomLabels.toString() },
        { key: "clients_label", value: clientsLabel },
        { key: "tasks_label", value: tasksLabel },
        { key: "invoices_label", value: invoicesLabel }
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
        <CardDescription>Manage basic company information and preferences</CardDescription>
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
              <Label htmlFor="company-email">Email</Label>
              <Input 
                id="company-email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@yourcompany.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone</Label>
              <Input 
                id="company-phone" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="company-address">Address</Label>
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
          <h3 className="text-lg font-medium">Regional Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
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
            
            <div className="space-y-2">
              <Label htmlFor="date-format">Date Format</Label>
              <Select 
                value={dateFormat}
                onValueChange={setDateFormat}
              >
                <SelectTrigger id="date-format">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (Europe)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                  <SelectItem value="MMM D, YYYY">MMM D, YYYY (Jan 1, 2025)</SelectItem>
                  <SelectItem value="D MMM YYYY">D MMM YYYY (1 Jan 2025)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time-format">Time Format</Label>
              <Select 
                value={timeFormat}
                onValueChange={setTimeFormat}
              >
                <SelectTrigger id="time-format">
                  <SelectValue placeholder="Select time format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (1:30 PM)</SelectItem>
                  <SelectItem value="24h">24-hour (13:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={currencyCode}
                onValueChange={setCurrencyCode}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                  <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar (C$)</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar (A$)</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fiscal-year">Fiscal Year Start (Month)</Label>
              <Select 
                value={fiscalYearStart}
                onValueChange={setFiscalYearStart}
              >
                <SelectTrigger id="fiscal-year">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">January</SelectItem>
                  <SelectItem value="02">February</SelectItem>
                  <SelectItem value="03">March</SelectItem>
                  <SelectItem value="04">April</SelectItem>
                  <SelectItem value="05">May</SelectItem>
                  <SelectItem value="06">June</SelectItem>
                  <SelectItem value="07">July</SelectItem>
                  <SelectItem value="08">August</SelectItem>
                  <SelectItem value="09">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
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
          
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${!useCustomLabels ? 'opacity-50' : ''}`}>
            <div className="space-y-2">
              <Label htmlFor="clients-label">Clients Label</Label>
              <Input 
                id="clients-label" 
                value={clientsLabel}
                onChange={(e) => setClientsLabel(e.target.value)}
                placeholder="Clients"
                disabled={!useCustomLabels}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tasks-label">Tasks Label</Label>
              <Input 
                id="tasks-label" 
                value={tasksLabel}
                onChange={(e) => setTasksLabel(e.target.value)}
                placeholder="Tasks"
                disabled={!useCustomLabels}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invoices-label">Invoices Label</Label>
              <Input 
                id="invoices-label" 
                value={invoicesLabel}
                onChange={(e) => setInvoicesLabel(e.target.value)}
                placeholder="Invoices"
                disabled={!useCustomLabels}
              />
            </div>
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