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

export function InvoiceSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [invoiceStartNumber, setInvoiceStartNumber] = useState("1001");
  const [invoiceNumberFormat, setInvoiceNumberFormat] = useState("{prefix}-{number}");
  const [defaultDueDays, setDefaultDueDays] = useState("30");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [footnotes, setFootnotes] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [enableLateFees, setEnableLateFees] = useState(false);
  const [lateFeePercent, setLateFeePercent] = useState("1.5");
  const [lateFeeFixed, setLateFeeFixed] = useState("0");
  const [sendReminders, setSendReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState("3,7,14");
  const [accentColor, setAccentColor] = useState("#4f46e5");
  const [showPaymentOptions, setShowPaymentOptions] = useState(true);
  const [enableOnlinePayments, setEnableOnlinePayments] = useState(false);
  const [enableBankTransfer, setEnableBankTransfer] = useState(true);
  const [enableChequePayments, setEnableChequePayments] = useState(true);
  const [bankDetails, setBankDetails] = useState("");
  
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
      
      setInvoicePrefix(getSetting("invoice_prefix") || "INV");
      setInvoiceStartNumber(getSetting("invoice_start_number") || "1001");
      setInvoiceNumberFormat(getSetting("invoice_number_format") || "{prefix}-{number}");
      setDefaultDueDays(getSetting("default_due_days") || "30");
      setTermsAndConditions(getSetting("terms_and_conditions") || "");
      setFootnotes(getSetting("invoice_footnotes") || "");
      setCompanyLogo(getSetting("company_logo") || "");
      setEnableLateFees(getSetting("enable_late_fees") === "true");
      setLateFeePercent(getSetting("late_fee_percent") || "1.5");
      setLateFeeFixed(getSetting("late_fee_fixed") || "0");
      setSendReminders(getSetting("send_reminders") !== "false");
      setReminderDays(getSetting("reminder_days") || "3,7,14");
      setAccentColor(getSetting("invoice_accent_color") || "#4f46e5");
      setShowPaymentOptions(getSetting("show_payment_options") !== "false");
      setEnableOnlinePayments(getSetting("enable_online_payments") === "true");
      setEnableBankTransfer(getSetting("enable_bank_transfer") !== "false");
      setEnableChequePayments(getSetting("enable_cheque_payments") !== "false");
      setBankDetails(getSetting("bank_details") || "");
    }
  }, [settings]);
  
  // Handle save all settings
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Create array of settings to save
      const settingsToSave = [
        { key: "invoice_prefix", value: invoicePrefix },
        { key: "invoice_start_number", value: invoiceStartNumber },
        { key: "invoice_number_format", value: invoiceNumberFormat },
        { key: "default_due_days", value: defaultDueDays },
        { key: "terms_and_conditions", value: termsAndConditions },
        { key: "invoice_footnotes", value: footnotes },
        { key: "company_logo", value: companyLogo },
        { key: "enable_late_fees", value: enableLateFees.toString() },
        { key: "late_fee_percent", value: lateFeePercent },
        { key: "late_fee_fixed", value: lateFeeFixed },
        { key: "send_reminders", value: sendReminders.toString() },
        { key: "reminder_days", value: reminderDays },
        { key: "invoice_accent_color", value: accentColor },
        { key: "show_payment_options", value: showPaymentOptions.toString() },
        { key: "enable_online_payments", value: enableOnlinePayments.toString() },
        { key: "enable_bank_transfer", value: enableBankTransfer.toString() },
        { key: "enable_cheque_payments", value: enableChequePayments.toString() },
        { key: "bank_details", value: bankDetails }
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
  
  // Simulate file upload for logo
  const handleLogoUpload = () => {
    toast({
      title: "Logo Upload",
      description: "File upload feature not implemented in this demo.",
    });
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
        <CardDescription>Customize how your invoices appear and function</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Invoice Numbering</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-prefix">Invoice Prefix</Label>
              <Input 
                id="invoice-prefix" 
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invoice-start-number">Starting Number</Label>
              <Input 
                id="invoice-start-number" 
                type="number"
                min="1"
                value={invoiceStartNumber}
                onChange={(e) => setInvoiceStartNumber(e.target.value)}
                placeholder="1001"
              />
              <p className="text-xs text-muted-foreground">For new invoices</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invoice-number-format">Number Format</Label>
              <Select 
                value={invoiceNumberFormat}
                onValueChange={setInvoiceNumberFormat}
              >
                <SelectTrigger id="invoice-number-format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="{prefix}-{number}">PREFIX-NUMBER</SelectItem>
                  <SelectItem value="{prefix}{number}">PREFIXNUMBER</SelectItem>
                  <SelectItem value="{prefix}/{number}">PREFIX/NUMBER</SelectItem>
                  <SelectItem value="{prefix}-{year}-{number}">PREFIX-YEAR-NUMBER</SelectItem>
                  <SelectItem value="{year}{month}{number}">YEARMONTH-NUMBER</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Invoice Defaults</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-due-days">Default Due Days</Label>
              <Input 
                id="default-due-days" 
                type="number"
                min="0"
                value={defaultDueDays}
                onChange={(e) => setDefaultDueDays(e.target.value)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">Days until invoice is due after issue date</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-md border" 
                  style={{ backgroundColor: accentColor }}
                />
                <Input 
                  id="accent-color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#4f46e5"
                />
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="terms-conditions">Terms and Conditions</Label>
              <Textarea 
                id="terms-conditions" 
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Enter your standard terms and conditions"
                rows={4}
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="footnotes">Invoice Footnotes</Label>
              <Textarea 
                id="footnotes" 
                value={footnotes}
                onChange={(e) => setFootnotes(e.target.value)}
                placeholder="Additional information to display at bottom of invoice"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-logo">Company Logo</Label>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={handleLogoUpload}
                >
                  Upload Logo
                </Button>
                <span className="text-sm text-muted-foreground">
                  {companyLogo ? "Logo uploaded" : "No logo uploaded"}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Late Fees</h3>
              <p className="text-sm text-muted-foreground">
                Configure fees for overdue invoices
              </p>
            </div>
            <Switch 
              checked={enableLateFees}
              onCheckedChange={setEnableLateFees}
            />
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!enableLateFees ? 'opacity-50' : ''}`}>
            <div className="space-y-2">
              <Label htmlFor="late-fee-percent">Percentage Fee (%)</Label>
              <Input 
                id="late-fee-percent" 
                type="number"
                min="0"
                step="0.01"
                value={lateFeePercent}
                onChange={(e) => setLateFeePercent(e.target.value)}
                placeholder="1.5"
                disabled={!enableLateFees}
              />
              <p className="text-xs text-muted-foreground">Percentage of invoice amount</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="late-fee-fixed">Fixed Fee Amount</Label>
              <Input 
                id="late-fee-fixed" 
                type="number"
                min="0"
                step="0.01"
                value={lateFeeFixed}
                onChange={(e) => setLateFeeFixed(e.target.value)}
                placeholder="0"
                disabled={!enableLateFees}
              />
              <p className="text-xs text-muted-foreground">Additional fixed amount</p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Payment Reminders</h3>
              <p className="text-sm text-muted-foreground">
                Configure automatic payment reminders
              </p>
            </div>
            <Switch 
              checked={sendReminders}
              onCheckedChange={setSendReminders}
            />
          </div>
          
          <div className={`space-y-2 ${!sendReminders ? 'opacity-50' : ''}`}>
            <Label htmlFor="reminder-days">Reminder Days</Label>
            <Input 
              id="reminder-days" 
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
              placeholder="3,7,14"
              disabled={!sendReminders}
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of days to send reminders (e.g., 3,7,14)</p>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Payment Options</h3>
              <p className="text-sm text-muted-foreground">
                Configure payment methods displayed on invoices
              </p>
            </div>
            <Switch 
              checked={showPaymentOptions}
              onCheckedChange={setShowPaymentOptions}
            />
          </div>
          
          <div className={`space-y-4 ${!showPaymentOptions ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="online-payments">Online Payments</Label>
                <p className="text-sm text-muted-foreground">Accept credit card payments</p>
              </div>
              <Switch 
                id="online-payments" 
                checked={enableOnlinePayments}
                onCheckedChange={setEnableOnlinePayments}
                disabled={!showPaymentOptions}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="bank-transfer">Bank Transfer</Label>
                <p className="text-sm text-muted-foreground">Accept bank transfers</p>
              </div>
              <Switch 
                id="bank-transfer" 
                checked={enableBankTransfer}
                onCheckedChange={setEnableBankTransfer}
                disabled={!showPaymentOptions}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="cheque-payments">Cheque Payments</Label>
                <p className="text-sm text-muted-foreground">Accept payments by cheque</p>
              </div>
              <Switch 
                id="cheque-payments" 
                checked={enableChequePayments}
                onCheckedChange={setEnableChequePayments}
                disabled={!showPaymentOptions}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bank-details">Bank Account Details</Label>
              <Textarea 
                id="bank-details" 
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                placeholder="Enter your bank account details for bank transfers"
                rows={3}
                disabled={!showPaymentOptions || !enableBankTransfer}
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