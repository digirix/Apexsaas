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
import { Loader2, Save, HelpCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function InvoiceSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [invoiceNextNumber, setInvoiceNextNumber] = useState("1001");
  const [invoiceNumberFormat, setInvoiceNumberFormat] = useState("{prefix}{number}");
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("14");
  const [defaultNotes, setDefaultNotes] = useState("");
  const [defaultInvoiceTemplate, setDefaultInvoiceTemplate] = useState("standard");
  const [sendEmailAutomatically, setSendEmailAutomatically] = useState(false);
  const [includePaymentLink, setIncludePaymentLink] = useState(true);
  
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
      
      setInvoicePrefix(getSetting("invoice_prefix") || "INV-");
      setInvoiceNextNumber(getSetting("invoice_next_number") || "1001");
      setInvoiceNumberFormat(getSetting("invoice_number_format") || "{prefix}{number}");
      setDefaultPaymentTerms(getSetting("default_payment_terms") || "14");
      setDefaultNotes(getSetting("default_invoice_notes") || "");
      setDefaultInvoiceTemplate(getSetting("default_invoice_template") || "standard");
      setSendEmailAutomatically(getSetting("send_invoice_email") === "true");
      setIncludePaymentLink(getSetting("include_payment_link") === "true");
    }
  }, [settings]);
  
  // Handle save all settings
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Create array of settings to save
      const settingsToSave = [
        { key: "invoice_prefix", value: invoicePrefix },
        { key: "invoice_next_number", value: invoiceNextNumber },
        { key: "invoice_number_format", value: invoiceNumberFormat },
        { key: "default_payment_terms", value: defaultPaymentTerms },
        { key: "default_invoice_notes", value: defaultNotes },
        { key: "default_invoice_template", value: defaultInvoiceTemplate },
        { key: "send_invoice_email", value: sendEmailAutomatically.toString() },
        { key: "include_payment_link", value: includePaymentLink.toString() },
      ];
      
      // Save each setting
      for (const setting of settingsToSave) {
        await saveSettingMutation.mutateAsync(setting);
      }
      
      toast({
        title: "Settings saved",
        description: "Your invoice settings have been updated successfully.",
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
  
  // Preview the invoice number format
  const getPreviewInvoiceNumber = () => {
    let preview = invoiceNumberFormat;
    preview = preview.replace("{prefix}", invoicePrefix);
    preview = preview.replace("{number}", invoiceNextNumber);
    preview = preview.replace("{year}", new Date().getFullYear().toString());
    preview = preview.replace("{month}", (new Date().getMonth() + 1).toString().padStart(2, '0'));
    
    return preview;
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
        <CardTitle>Invoice Settings</CardTitle>
        <CardDescription>
          Configure how invoices are created, numbered, and processed
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="numbering">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="numbering">Numbering</TabsTrigger>
            <TabsTrigger value="defaults">Default Content</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="numbering" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="invoice-prefix" className="mr-2">Invoice Prefix</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-80">
                          Set a prefix for your invoice numbers. For example, "INV-" will result in invoice numbers like INV-1001.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input 
                  id="invoice-prefix" 
                  value={invoicePrefix} 
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="INV-"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="invoice-next-number" className="mr-2">Next Invoice Number</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The system will use this number for the next generated invoice and increment it afterward.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input 
                  id="invoice-next-number" 
                  type="number"
                  min="1"
                  value={invoiceNextNumber} 
                  onChange={(e) => setInvoiceNextNumber(e.target.value)}
                  placeholder="1001"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="invoice-format" className="mr-2">Invoice Number Format</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-80">
                          Use placeholders to customize the invoice number format:
                          <br />
                          {"{prefix}"} - The prefix you specified above
                          <br />
                          {"{number}"} - The sequential invoice number
                          <br />
                          {"{year}"} - The current year (YYYY)
                          <br />
                          {"{month}"} - The current month (MM)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input 
                  id="invoice-format" 
                  value={invoiceNumberFormat} 
                  onChange={(e) => setInvoiceNumberFormat(e.target.value)}
                  placeholder="{prefix}{number}"
                />
              </div>
              
              <div className="p-4 bg-blue-50 rounded-md">
                <p className="text-sm font-medium">Preview: <span className="text-blue-700">{getPreviewInvoiceNumber()}</span></p>
                <p className="text-xs text-muted-foreground mt-1">This is how your next invoice number will appear</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="defaults" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="payment-terms">Default Payment Terms (days)</Label>
              <Input 
                id="payment-terms" 
                type="number"
                min="0"
                value={defaultPaymentTerms} 
                onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                placeholder="14"
              />
              <p className="text-sm text-muted-foreground">
                Number of days clients have to pay after invoice issuance
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-template">Default Invoice Template</Label>
              <Select 
                value={defaultInvoiceTemplate} 
                onValueChange={setDefaultInvoiceTemplate}
              >
                <SelectTrigger id="default-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                The default template used for new invoices
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-notes">Default Invoice Notes</Label>
              <Textarea 
                id="default-notes" 
                value={defaultNotes} 
                onChange={(e) => setDefaultNotes(e.target.value)}
                placeholder="Thank you for your business..."
                className="min-h-32"
              />
              <p className="text-sm text-muted-foreground">
                These notes will appear at the bottom of each invoice
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="automation" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-email">Send Invoice Email Automatically</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically email invoices to clients when finalized
                  </p>
                </div>
                <Switch 
                  id="auto-email" 
                  checked={sendEmailAutomatically}
                  onCheckedChange={setSendEmailAutomatically}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="payment-link">Include Online Payment Link</Label>
                  <p className="text-sm text-muted-foreground">
                    Include a link for clients to pay online through your payment gateway
                  </p>
                </div>
                <Switch 
                  id="payment-link" 
                  checked={includePaymentLink}
                  onCheckedChange={setIncludePaymentLink}
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