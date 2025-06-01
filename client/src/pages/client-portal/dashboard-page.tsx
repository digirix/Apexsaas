import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building2, Calendar, Clock, Receipt, BarChart, User, Eye, 
  AlertCircle, LogOut, Phone, Mail, Home, Shield, Briefcase,
  Sparkles, ArrowRight, TrendingUp, CheckCircle, XCircle,
  MessageCircle, Users, MessageSquare, FileText
} from "lucide-react";
import { EntityFilterDropdown } from "@/components/client-portal/entity-filter-dropdown";

interface ClientPortalUser {
  id: number;
  clientId: number;
  tenantId: number;
  username: string;
  displayName: string;
  email: string;
  passwordResetRequired: boolean;
}

interface ComplianceAnalysis {
  totalServices: number;
  requiredServices: number;
  subscribedServices: number;
  complianceRate: number;
  upcomingDeadlines: number;
  overdueItems: number;
  serviceBreakdown: {
    id: number;
    name: string;
    isRequired: boolean;
    subscribed: boolean;
    frequency: string | null;
    nextDueDate: Date | null;
    status: 'compliant' | 'due_soon' | 'overdue' | 'not_subscribed';
    tasks: any[];
    completionRate: number;
  }[];
}

// Helper functions
const formatDate = (date: string | Date) => {
  if (!date) return "No date";
  const d = new Date(date);
  return d.toLocaleDateString();
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const getTaskCompletionRate = (tasks: any[]) => {
  if (!tasks || tasks.length === 0) return 0;
  const completed = tasks.filter(task => task.statusName === 'Completed').length;
  return Math.round((completed / tasks.length) * 100);
};

export default function ClientPortalDashboardPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useQuery({
    queryKey: ['/api/client-portal/profile']
  });

  // Fetch entities
  const { data: clientEntitiesData } = useQuery({
    queryKey: ['/api/client-portal/entities']
  });
  const clientEntities = Array.isArray(clientEntitiesData) ? clientEntitiesData : [];

  // Fetch tasks (all or filtered by entity)
  const { data: clientTasksData, isLoading: isTasksLoading, error: tasksError, refetch: refetchTasks } = useQuery({
    queryKey: ['/api/client-portal/tasks', selectedEntityId]
  });
  const clientTasks = Array.isArray(clientTasksData) ? clientTasksData : [];

  // Fetch invoices (all or filtered by entity)
  const { data: clientInvoicesData, isLoading: isInvoicesLoading, error: invoicesError, refetch: refetchInvoices } = useQuery({
    queryKey: ['/api/client-portal/invoices', selectedEntityId]
  });
  const clientInvoices = Array.isArray(clientInvoicesData) ? clientInvoicesData : [];

  // Fetch tenant settings for portal customization
  const { data: tenantSettingsData } = useQuery({
    queryKey: ['/api/v1/tenant/settings']
  });
  const tenantSettings = tenantSettingsData || {};

  // Fetch service types for compliance analysis
  const { data: serviceTypesData } = useQuery({
    queryKey: ['/api/v1/setup/service-types']
  });
  const serviceTypes = Array.isArray(serviceTypesData) ? serviceTypesData : [];

  // Fetch entity services for compliance data
  const { data: entityServicesData } = useQuery({
    queryKey: ['/api/v1/entities', selectedEntityId, 'services'],
    enabled: !!selectedEntityId
  });
  const entityServices = Array.isArray(entityServicesData) ? entityServicesData : [];

  // Handle print invoice functionality
  const handlePrintInvoice = useCallback((invoice: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const companyInfo = userProfile?.client || {};
    const entityInfo = clientEntities.find((e: any) => e.id === invoice.entityId) || {};
    
    // Get firm branding and bank details from tenant settings
    const getSetting = (key: string) => {
      const setting = tenantSettings?.find?.((s: any) => s.key === key);
      return setting ? setting.value : "";
    };
    
    const firmName = getSetting("firm_name") || getSetting("company_name") || "Accounting Firm";
    const firmTagline = getSetting("firm_tagline") || "";
    const firmDescription = getSetting("firm_description") || "";
    const firmLogo = getSetting("firm_logo") || "";
    
    const bankName = getSetting("bank_name") || "";
    const accountTitle = getSetting("account_title") || "";
    const accountNumber = getSetting("account_number") || "";
    const routingNumber = getSetting("routing_number") || "";
    const swiftCode = getSetting("swift_code") || "";
    const iban = getSetting("iban") || "";
    const paymentInstructions = getSetting("payment_instructions") || "";
    
    // Find the related task to get actual task details
    // Check multiple possible fields for task information
    const relatedTask = clientTasks.find((task: any) => task.invoiceId === invoice.id);
    const taskDetails = relatedTask?.taskDetails || 
                       relatedTask?.title || 
                       relatedTask?.description || 
                       relatedTask?.serviceName ||
                       invoice.notes ||
                       "Professional Services";

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${invoice.invoiceNumber || invoice.id}</title>
          <style>
            @page { margin: 0.5in; size: A4; }
            body { font-family: Arial, sans-serif; margin: 0; color: #333; line-height: 1.2; font-size: 12px; }
            .firm-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; }
            .firm-logo { max-height: 50px; margin-bottom: 8px; }
            .firm-name { font-size: 24px; font-weight: bold; color: #4f46e5; margin-bottom: 4px; }
            .firm-tagline { font-size: 12px; color: #666; font-style: italic; margin-bottom: 6px; }
            .firm-contact { font-size: 10px; color: #555; }
            .invoice-header { text-align: center; margin-bottom: 20px; }
            .invoice-title { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 6px; }
            .invoice-number { font-size: 14px; color: #666; margin-bottom: 6px; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            .status-paid { background-color: #d4edda; color: #155724; }
            .status-overdue { background-color: #f8d7da; color: #721c24; }
            .status-sent { background-color: #d1ecf1; color: #0c5460; }
            .status-draft { background-color: #e2e3e5; color: #383d41; }
            .details-section { display: flex; justify-content: space-between; margin-bottom: 15px; }
            .details-column { width: 48%; }
            .details-title { font-size: 13px; font-weight: bold; margin-bottom: 6px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
            .details-content { line-height: 1.3; font-size: 11px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .table th, .table td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
            .table th { background-color: #f8f9fa; font-weight: bold; color: #333; }
            .totals { margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
            .total-row.final { font-weight: bold; font-size: 13px; border-top: 2px solid #333; padding-top: 6px; }
            .footer { margin-top: 20px; border-top: 2px solid #4f46e5; padding-top: 15px; page-break-inside: avoid; }
            .payment-section { margin-bottom: 15px; }
            .payment-title { font-size: 14px; font-weight: bold; color: #4f46e5; margin-bottom: 8px; }
            .bank-details { background-color: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 8px; }
            .bank-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 10px; }
            .bank-label { font-weight: bold; color: #555; }
            .firm-footer { text-align: center; font-size: 9px; color: #666; }
            @media print { 
              body { margin: 0; -webkit-print-color-adjust: exact; }
              .footer { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <!-- Firm Header -->
          <div class="firm-header">
            ${firmLogo ? `<img src="${firmLogo}" alt="${firmName}" class="firm-logo">` : ''}
            <div class="firm-name">${firmName}</div>
            ${firmTagline ? `<div class="firm-tagline">${firmTagline}</div>` : ''}
            <div class="firm-contact">
              ${getSetting("address") || ''} | ${getSetting("phone") || ''} | ${getSetting("email") || ''}
            </div>
          </div>
          
          <!-- Invoice Header -->
          <div class="invoice-header">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">#${invoice.invoiceNumber || invoice.id}</div>
            <div class="status-badge status-${invoice.status?.toLowerCase() || 'draft'}">${invoice.status || 'Draft'}</div>
          </div>
          
          <div class="details-section">
            <div class="details-column">
              <div class="details-title">Bill To:</div>
              <div class="details-content">
                <strong>${entityInfo.name || 'Entity Name'}</strong><br>
                ${entityInfo.address || ''}<br>
                ${entityInfo.countryName || ''}<br>
                Tax ID: ${entityInfo.businessTaxId || 'N/A'}
              </div>
            </div>
            
            <div class="details-column">
              <div class="details-title">Invoice Details:</div>
              <div class="details-content">
                <strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}<br>
                <strong>Due Date:</strong> ${formatDate(invoice.dueDate)}<br>
                <strong>Currency:</strong> ${invoice.currencyCode || 'USD'}<br>
                <strong>Client:</strong> ${companyInfo.displayName || 'N/A'}
              </div>
            </div>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.lineItems?.map((item: any) => `
                <tr>
                  <td>${taskDetails}</td>
                  <td>${item.quantity || 1}</td>
                  <td>${(item.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>${(item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('') || `
                <tr>
                  <td>${taskDetails}</td>
                  <td>1</td>
                  <td>${(invoice.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>${(invoice.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${(invoice.subtotal || invoice.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            ${invoice.taxAmount ? `
              <div class="total-row">
                <span>Tax:</span>
                <span>${parseFloat(invoice.taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            ${invoice.discountAmount ? `
              <div class="total-row">
                <span>Discount:</span>
                <span>-${parseFloat(invoice.discountAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            <div class="total-row final">
              <span>Total:</span>
              <span>${(invoice.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            ${invoice.amountPaid ? `
              <div class="total-row">
                <span>Amount Paid:</span>
                <span>${parseFloat(invoice.amountPaid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div class="total-row final" style="color: #dc3545;">
                <span>Amount Due:</span>
                <span>${(invoice.amountDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
          </div>
          
          ${invoice.notes ? `
            <div style="margin-top: 30px;">
              <div class="details-title">Notes:</div>
              <div class="details-content">${invoice.notes}</div>
            </div>
          ` : ''}
          
          <!-- Professional Footer with Payment Details -->
          <div class="footer">
            <div class="payment-section">
              <div class="payment-title">Payment Information</div>
              <div class="bank-details">
                ${bankName ? `
                  <div class="bank-row">
                    <span class="bank-label">Bank Name:</span>
                    <span>${bankName}</span>
                  </div>
                ` : ''}
                ${accountTitle ? `
                  <div class="bank-row">
                    <span class="bank-label">Account Title:</span>
                    <span>${accountTitle}</span>
                  </div>
                ` : ''}
                ${accountNumber ? `
                  <div class="bank-row">
                    <span class="bank-label">Account Number:</span>
                    <span>${accountNumber}</span>
                  </div>
                ` : ''}
                ${routingNumber ? `
                  <div class="bank-row">
                    <span class="bank-label">Routing Number:</span>
                    <span>${routingNumber}</span>
                  </div>
                ` : ''}
                ${swiftCode ? `
                  <div class="bank-row">
                    <span class="bank-label">SWIFT Code:</span>
                    <span>${swiftCode}</span>
                  </div>
                ` : ''}
                ${iban ? `
                  <div class="bank-row">
                    <span class="bank-label">IBAN:</span>
                    <span>${iban}</span>
                  </div>
                ` : ''}
              </div>
              ${paymentInstructions ? `
                <div style="margin-top: 15px;">
                  <div class="bank-label" style="margin-bottom: 8px;">Payment Instructions:</div>
                  <div style="font-size: 14px; line-height: 1.5;">${paymentInstructions}</div>
                </div>
              ` : ''}
            </div>
            
            <div class="firm-footer">
              ${firmDescription ? `<div style="margin-bottom: 10px;">${firmDescription}</div>` : ''}
              <div>&copy; ${new Date().getFullYear()} ${firmName}. All rights reserved.</div>
              <div style="margin-top: 5px;">
                ${getSetting("address") || ''} | Phone: ${getSetting("phone") || ''} | Email: ${getSetting("email") || ''}
              </div>
              ${getSetting("website") ? `<div style="margin-top: 5px;">Website: ${getSetting("website")}</div>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [userProfile, clientEntities]);

  const handleLogout = async () => {
    try {
      await fetch('/api/client-portal/logout', {
        method: 'POST'
      });
      setLocation('/client-portal');
    } catch (error) {
      console.error('Logout error:', error);
      setLocation('/client-portal');
    }
  };

  // Extract customization settings
  const customization = tenantSettings.clientPortalSettings || {};
  const {
    headerTitle = "Client Portal",
    headerSubtitle = "Welcome to your client dashboard",
    headerLogo,
    companyName,
    companyEmail,
    companyPhone,
    headerBusinessHours,
    footerEnabled = true,
    footerCopyright,
    footerSupportEmail,
    footerSupportPhone,
    footerDisclaimerText,
    footerAdditionalLinks
  } = customization;

  // Generate compliance analysis for selected entity
  const generateComplianceAnalysis = (): ComplianceAnalysis | null => {
    if (!selectedEntityId || !Array.isArray(entityServices) || entityServices.length === 0) return null;

    const totalServices = Array.isArray(serviceTypes) ? serviceTypes.length : 0;
    const subscribedServices = entityServices.filter((s: any) => s && s.isSubscribed).length;
    const requiredServices = entityServices.filter((s: any) => s && s.isRequired).length;
    const complianceRate = requiredServices > 0 ? Math.round((subscribedServices / requiredServices) * 100) : 100;

    const entityTasks = Array.isArray(clientTasks) ? clientTasks.filter(task => task && task.entityId === selectedEntityId) : [];
    const upcomingDeadlines = entityTasks.filter(task => {
      if (!task || !task.dueDate) return false;
      try {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
      } catch (error) {
        return false;
      }
    }).length;

    const overdueItems = entityTasks.filter(task => {
      if (!task || !task.dueDate) return false;
      try {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        return dueDate < today && task.statusName !== 'Completed';
      } catch (error) {
        return false;
      }
    }).length;

    const serviceBreakdown = entityServices.map((service: any) => {
      try {
        if (!service) {
          return {
            id: 0,
            name: 'Unknown Service',
            isRequired: false,
            subscribed: false,
            frequency: null,
            nextDueDate: null,
            status: 'not_subscribed' as const,
            tasks: [],
            completionRate: 0
          };
        }

        const serviceTasks = entityTasks.filter(task => {
          if (!task || !service) return false;
          const taskTitle = task.title || '';
          const taskDesc = task.description || '';
          const serviceName = service.name || '';
          return taskTitle.toLowerCase().includes(serviceName.toLowerCase()) ||
                 taskDesc.toLowerCase().includes(serviceName.toLowerCase());
        });
        
        const completionRate = getTaskCompletionRate(serviceTasks);
        
        let status: 'compliant' | 'due_soon' | 'overdue' | 'not_subscribed' = 'compliant';
        if (!service.isSubscribed) {
          status = 'not_subscribed';
        } else if (serviceTasks.some(task => {
          if (!task || !task.dueDate) return false;
          try {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            return dueDate < today && task.statusName !== 'Completed';
          } catch (error) {
            return false;
          }
        })) {
          status = 'overdue';
        } else if (serviceTasks.some(task => {
          if (!task || !task.dueDate) return false;
          try {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 7;
          } catch (error) {
            return false;
          }
        })) {
          status = 'due_soon';
        }

        return {
          id: service.id || 0,
          name: service.name || 'Unknown Service',
          isRequired: Boolean(service.isRequired),
          subscribed: Boolean(service.isSubscribed),
          frequency: service.billingBasis || null,
          nextDueDate: serviceTasks.length > 0 && serviceTasks[0]?.dueDate ? (() => {
            try {
              return new Date(serviceTasks[0].dueDate);
            } catch (error) {
              return null;
            }
          })() : null,
          status,
          tasks: serviceTasks || [],
          completionRate
        };
      } catch (error) {
        console.error('Error processing service in breakdown:', error, service);
        return {
          id: 0,
          name: 'Unknown Service',
          isRequired: false,
          subscribed: false,
          frequency: null,
          nextDueDate: null,
          status: 'not_subscribed' as const,
          tasks: [],
          completionRate: 0
        };
      }
    }).filter(Boolean);

    return {
      totalServices,
      requiredServices,
      subscribedServices,
      complianceRate,
      upcomingDeadlines,
      overdueItems,
      serviceBreakdown
    };
  };

  // Filter entities and related data based on selection with error handling
  const selectedEntity = useMemo(() => {
    try {
      return selectedEntityId && Array.isArray(clientEntities) 
        ? clientEntities.find((e: any) => e && e.id === selectedEntityId) 
        : null;
    } catch (error) {
      console.error('Error finding selected entity:', error);
      return null;
    }
  }, [selectedEntityId, clientEntities]);
  
  const complianceAnalysis = useMemo(() => {
    try {
      if (!selectedEntityId || !Array.isArray(entityServices) || !Array.isArray(serviceTypes) || !Array.isArray(clientTasks)) {
        return null;
      }
      return generateComplianceAnalysis();
    } catch (error) {
      console.error('Error generating compliance analysis:', error);
      return null;
    }
  }, [selectedEntityId, entityServices, serviceTypes, clientTasks]);

  if (isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            Please log in to access the client portal.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-white/30 to-purple-100/20"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>

      {/* Header */}
      <motion.header 
        className="relative bg-white/60 backdrop-blur-lg border-b border-white/30 shadow-lg z-20"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {headerLogo && (
                <img src={headerLogo} alt="Logo" className="h-10 w-auto" />
              )}
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {headerTitle}
                </h1>
                <p className="text-sm text-slate-600">{headerSubtitle}</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {userProfile && (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{userProfile.displayName || 'User'}</p>
                    <p className="text-xs text-slate-500">{userProfile.email || ''}</p>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
              {(companyEmail || companyPhone || headerBusinessHours) && (
                <div className="hidden lg:flex items-center space-x-4 text-xs text-slate-600">
                  {companyEmail && (
                    <div className="flex items-center space-x-1">
                      <Mail className="w-4 h-4" />
                      <span>{companyEmail}</span>
                    </div>
                  )}
                  {companyPhone && (
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4" />
                      <span>{companyPhone}</span>
                    </div>
                  )}
                  {headerBusinessHours && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{headerBusinessHours}</span>
                    </div>
                  )}
                </div>
              )}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center border-2 border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all duration-300"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.header>
      
      {/* Main Content */}
      <motion.main 
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <motion.div 
            className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <motion.div
              className="relative"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl"></div>
              <TabsList className="relative bg-white/60 backdrop-blur-lg border border-white/30 shadow-xl rounded-2xl p-1.5">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl px-6 py-2 font-medium"
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="entities" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl px-6 py-2 font-medium"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  {selectedEntityId ? 'Entity Details' : 'Entities'}
                </TabsTrigger>
                <TabsTrigger 
                  value="tasks" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl px-6 py-2 font-medium"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger 
                  value="invoices" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl px-6 py-2 font-medium"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Invoices
                </TabsTrigger>
              </TabsList>
            </motion.div>
            
            {/* Entity Selector Dropdown - Fix #1: Replace stacked entity cards with dropdown selector */}
            <AnimatePresence>
              {Array.isArray(clientEntities) && clientEntities.length > 0 && (
                <motion.div 
                  className="flex items-center space-x-3"
                  initial={{ opacity: 0, x: 20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-lg rounded-full px-4 py-2 border border-white/30 shadow-lg">
                    <Building2 className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Entity:</span>
                  </div>
                  <EntityFilterDropdown entities={clientEntities || []} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* Overview Tab - Interactive Dashboard */}
          <TabsContent value="overview" className="space-y-6">
            {/* Enhanced Key Metrics */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Active Tasks</CardTitle>
                    <motion.div
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg"
                    >
                      <Calendar className="h-4 w-4 text-white" />
                    </motion.div>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    >
                      {clientTasks.filter(task => task.statusName !== 'Completed').length}
                    </motion.div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-slate-500">
                        {clientTasks.filter(task => {
                          if (!task.dueDate) return false;
                          const dueDate = new Date(task.dueDate);
                          const today = new Date();
                          return dueDate < today && task.statusName !== 'Completed';
                        }).length} overdue • {clientTasks.filter(task => {
                          if (!task.dueDate) return false;
                          const dueDate = new Date(task.dueDate);
                          const today = new Date();
                          const diffTime = dueDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return diffDays >= 0 && diffDays <= 7;
                        }).length} due this week
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Financial Summary</CardTitle>
                    <motion.div
                      whileHover={{ rotate: -10, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg"
                    >
                      <Receipt className="h-4 w-4 text-white" />
                    </motion.div>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                    >
                      {formatCurrency(clientInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0))}
                    </motion.div>
                    <p className="text-xs text-slate-500 mt-2">
                      {clientInvoices.length} invoices • {clientInvoices.filter((inv: any) => inv.status === 'paid').length} paid
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Business Entities</CardTitle>
                    <motion.div
                      whileHover={{ rotate: 15, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg"
                    >
                      <Building2 className="h-4 w-4 text-white" />
                    </motion.div>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                    >
                      {clientEntities.length}
                    </motion.div>
                    <p className="text-xs text-slate-500 mt-2">
                      {clientEntities.filter((entity: any) => entity.stats?.taskCount > 0).length} active • {clientEntities.filter((entity: any) => entity.isVatRegistered).length} VAT registered
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Completion Rate</CardTitle>
                    <motion.div
                      whileHover={{ rotate: -15, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg"
                    >
                      <Shield className="h-4 w-4 text-white" />
                    </motion.div>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                    >
                      {(() => {
                        const totalTasks = clientTasks.length;
                        const completedTasks = clientTasks.filter(task => task.statusName === 'Completed').length;
                        return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                      })()}%
                    </motion.div>
                    <p className="text-xs text-slate-500 mt-2">
                      {clientTasks.filter(task => task.statusName === 'Completed').length} of {clientTasks.length} tasks completed
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Dashboard Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {clientTasks.length} tasks
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="max-h-80 overflow-y-auto">
                    <div className="space-y-4">
                      {clientTasks.slice(0, 5).map((task: any) => (
                        <div key={task.id} className="flex items-start space-x-3 p-3 bg-white/50 rounded-xl border border-white/40">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            task.statusName === 'Completed' ? 'bg-green-500' :
                            task.dueDate && new Date(task.dueDate) < new Date() ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {task.taskDetails || task.title || 'Task'}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-slate-500">
                                {task.entityName} • Due: {formatDate(task.dueDate)}
                              </p>
                              <Badge 
                                variant={task.statusName === 'Completed' ? 'default' : 'secondary'}
                                className={`text-xs ${
                                  task.statusName === 'Completed' ? 'bg-green-100 text-green-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {task.statusName}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                      {clientTasks.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                          <p className="font-medium">No tasks yet</p>
                          <p className="text-sm">Tasks will appear here when assigned.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Entity Performance */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <BarChart className="h-5 w-5 text-purple-500" />
                      <CardTitle className="text-lg">Entity Performance</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {clientEntities.map((entity: any) => {
                        const entityTasks = clientTasks.filter(task => task.entityId === entity.id);
                        const completedTasks = entityTasks.filter(task => task.statusName === 'Completed').length;
                        const completionRate = entityTasks.length > 0 ? (completedTasks / entityTasks.length) * 100 : 0;
                        
                        return (
                          <div key={entity.id} className="p-4 bg-white/50 rounded-xl border border-white/40 hover:bg-white/60 transition-colors cursor-pointer"
                               onClick={() => setLocation(`/client-portal/entities/${entity.id}`)}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Building2 className="h-4 w-4 text-purple-500" />
                                <span className="font-medium text-slate-900">{entity.name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {entity.entityType}
                                </Badge>
                                {entity.isVatRegistered && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                    VAT
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Task Progress</span>
                                <span className="font-medium">{Math.round(completionRate)}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${completionRate}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-slate-500">
                                <span>{entityTasks.length} total tasks</span>
                                <span>{completedTasks} completed</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {clientEntities.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                          <p className="font-medium">No entities registered</p>
                          <p className="text-sm">Your business entities will appear here.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Upcoming Deadlines & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upcoming Deadlines */}
              <motion.div
                className="lg:col-span-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Card className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab("tasks")}>
                        View All
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {clientTasks
                        .filter(task => {
                          if (!task.dueDate) return false;
                          const dueDate = new Date(task.dueDate);
                          const today = new Date();
                          const diffTime = dueDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return diffDays >= -7 && diffDays <= 30 && task.statusName !== 'Completed';
                        })
                        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                        .slice(0, 6)
                        .map((task: any) => {
                          const dueDate = new Date(task.dueDate);
                          const today = new Date();
                          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          const isOverdue = diffDays < 0;
                          const isDueSoon = diffDays <= 7 && diffDays >= 0;
                          
                          return (
                            <div key={task.id} className={`p-3 rounded-xl border ${
                              isOverdue ? 'bg-red-50 border-red-200' :
                              isDueSoon ? 'bg-yellow-50 border-yellow-200' :
                              'bg-blue-50 border-blue-200'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 text-sm">
                                    {task.taskDetails || task.title || 'Task'}
                                  </p>
                                  <p className="text-xs text-slate-600 mt-1">
                                    {task.entityName} • {formatDate(task.dueDate)}
                                  </p>
                                </div>
                                <Badge 
                                  variant="secondary"
                                  className={`text-xs ml-2 ${
                                    isOverdue ? 'bg-red-100 text-red-700' :
                                    isDueSoon ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {isOverdue ? `${Math.abs(diffDays)} days overdue` :
                                   diffDays === 0 ? 'Due today' :
                                   `${diffDays} days left`}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      {clientTasks.filter(task => {
                        if (!task.dueDate) return false;
                        const dueDate = new Date(task.dueDate);
                        const today = new Date();
                        const diffTime = dueDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays >= -7 && diffDays <= 30 && task.statusName !== 'Completed';
                      }).length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                          <p className="font-medium">All caught up!</p>
                          <p className="text-sm">No upcoming deadlines in the next 30 days.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions & Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Card className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-indigo-500" />
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start bg-blue-50 border-blue-200 hover:bg-blue-100"
                      onClick={() => setActiveTab("tasks")}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      View All Tasks
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start bg-purple-50 border-purple-200 hover:bg-purple-100"
                      onClick={() => setActiveTab("entities")}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Manage Entities
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start bg-green-50 border-green-200 hover:bg-green-100"
                      onClick={() => setActiveTab("invoices")}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      View Invoices
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start bg-orange-50 border-orange-200 hover:bg-orange-100"
                      onClick={() => {
                        const firstEntity = clientEntities[0];
                        if (firstEntity) {
                          setLocation(`/client-portal/entities/${firstEntity.id}`);
                        }
                      }}
                      disabled={clientEntities.length === 0}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                    
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">Account Manager</p>
                      <div className="flex items-center space-x-2 p-2 bg-white/50 rounded-lg">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {userProfile?.accountManager?.name || 'Your Account Manager'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {userProfile?.accountManager?.email || 'accountmanager@example.com'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
          
          {/* Entities Tab with Compliance Integration - Fix #2: Add compliance data from admin portal */}
          <TabsContent value="entities" className="space-y-6">
            <motion.div 
              className="grid grid-cols-1 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-blue-500" />
                      <CardTitle>Entity Compliance Details</CardTitle>
                    </div>
                    <CardDescription>
                      {selectedEntityId 
                        ? `Detailed compliance overview for ${clientEntities.find((e: any) => e.id === selectedEntityId)?.name || 'selected entity'}`
                        : 'Select an entity above to view compliance details, service subscriptions, and upcoming deadlines'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedEntity && complianceAnalysis ? (
                      <Tabs defaultValue="analysis" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="analysis">Analysis</TabsTrigger>
                          <TabsTrigger value="upcoming">Upcoming Deadlines</TabsTrigger>
                          <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="analysis" className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-blue-700">Services Subscribed</p>
                                  <p className="text-2xl font-bold text-blue-900">{complianceAnalysis.subscribedServices}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-blue-500" />
                              </div>
                            </div>
                            
                            <div className="bg-yellow-50 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-yellow-700">Upcoming Deadlines</p>
                                  <p className="text-2xl font-bold text-yellow-900">{complianceAnalysis.upcomingDeadlines}</p>
                                </div>
                                <Calendar className="h-8 w-8 text-yellow-500" />
                              </div>
                            </div>
                            
                            <div className="bg-red-50 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-red-700">Overdue Items</p>
                                  <p className="text-2xl font-bold text-red-900">{complianceAnalysis.overdueItems}</p>
                                </div>
                                <XCircle className="h-8 w-8 text-red-500" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="font-semibold text-slate-700">Service Breakdown</h4>
                            {complianceAnalysis.serviceBreakdown.map((service) => (
                              <div key={service.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-3 h-3 rounded-full ${
                                    service.status === 'compliant' ? 'bg-green-500' :
                                    service.status === 'due_soon' ? 'bg-yellow-500' :
                                    service.status === 'overdue' ? 'bg-red-500' :
                                    'bg-gray-400'
                                  }`}></div>
                                  <span className="font-medium">{service.name}</span>
                                  {service.isRequired && <Badge variant="outline">Required</Badge>}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-slate-600">{service.completionRate}% complete</p>
                                  {service.frequency && <p className="text-xs text-slate-500">{service.frequency}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="upcoming" className="space-y-4">
                          <div className="space-y-3">
                            {(() => {
                              const entityTasks = clientTasks.filter(task => task.entityId === selectedEntityId);
                              const upcomingTasks = entityTasks
                                .filter(task => {
                                  if (!task.dueDate || task.statusName === 'Completed') return false;
                                  const dueDate = new Date(task.dueDate);
                                  const today = new Date();
                                  const diffTime = dueDate.getTime() - today.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  return diffDays >= -7 && diffDays <= 60;
                                })
                                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

                              return upcomingTasks.length > 0 ? upcomingTasks.map((task: any) => {
                                const dueDate = new Date(task.dueDate);
                                const today = new Date();
                                const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                const isOverdue = diffDays < 0;
                                const isDueSoon = diffDays <= 7 && diffDays >= 0;
                                
                                return (
                                  <div key={task.id} className={`p-4 rounded-xl border ${
                                    isOverdue ? 'bg-red-50 border-red-200' :
                                    isDueSoon ? 'bg-yellow-50 border-yellow-200' :
                                    'bg-blue-50 border-blue-200'
                                  }`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium text-slate-900">{task.title || task.description}</h4>
                                      <Badge 
                                        variant="secondary"
                                        className={`${
                                          isOverdue ? 'bg-red-100 text-red-700' :
                                          isDueSoon ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-blue-100 text-blue-700'
                                        }`}
                                      >
                                        {isOverdue ? `${Math.abs(diffDays)} days overdue` :
                                         diffDays === 0 ? 'Due today' :
                                         `${diffDays} days left`}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <p className="text-slate-500">Due Date</p>
                                        <p className="font-medium">{formatDate(task.dueDate)}</p>
                                      </div>
                                      <div>
                                        <p className="text-slate-500">Status</p>
                                        <p className="font-medium">{task.statusName}</p>
                                      </div>
                                      <div>
                                        <p className="text-slate-500">Assignee</p>
                                        <p className="font-medium">{task.assigneeName}</p>
                                      </div>
                                      <div>
                                        <p className="text-slate-500">Task Type</p>
                                        <p className="font-medium">{task.taskType}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }) : (
                                <div className="text-center py-8 text-slate-500">
                                  <Calendar className="h-12 w-12 mx-auto mb-3 text-green-500" />
                                  <p className="font-medium">No upcoming deadlines</p>
                                  <p className="text-sm">All compliance requirements are up to date</p>
                                </div>
                              );
                            })()}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="history" className="space-y-4">
                          <div className="space-y-3">
                            {(() => {
                              const entityTasks = clientTasks.filter(task => task.entityId === selectedEntityId);
                              const completedTasks = entityTasks
                                .filter(task => task.statusName === 'Completed')
                                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

                              return completedTasks.length > 0 ? completedTasks.map((task: any) => (
                                <div key={task.id} className="p-4 bg-green-50 rounded-xl border border-green-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-slate-900">{task.title || task.description}</h4>
                                    <Badge className="bg-green-100 text-green-700">
                                      Completed
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-slate-500">Completed Date</p>
                                      <p className="font-medium">{formatDate(task.updatedAt)}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500">Original Due Date</p>
                                      <p className="font-medium">{formatDate(task.dueDate)}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500">Completed By</p>
                                      <p className="font-medium">{task.assigneeName}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500">Task Type</p>
                                      <p className="font-medium">{task.taskType}</p>
                                    </div>
                                  </div>
                                </div>
                              )) : (
                                <div className="text-center py-8 text-slate-500">
                                  <Clock className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                                  <p className="font-medium">No completed tasks</p>
                                  <p className="text-sm">Completed compliance tasks will appear here</p>
                                </div>
                              );
                            })()}
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <div className="space-y-6">
                        {/* Entity Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-white/50 rounded-xl border border-white/40">
                            <h3 className="text-sm font-medium text-slate-600 mb-1">Total Entities</h3>
                            <p className="text-2xl font-bold text-purple-600">{clientEntities.length}</p>
                            <p className="text-xs text-slate-500">
                              {clientEntities.filter((entity: any) => entity.isVatRegistered).length} VAT registered
                            </p>
                          </div>
                          <div className="text-center p-4 bg-white/50 rounded-xl border border-white/40">
                            <h3 className="text-sm font-medium text-slate-600 mb-1">Active Tasks</h3>
                            <p className="text-2xl font-bold text-blue-600">
                              {clientTasks.filter(task => task.statusName !== 'Completed').length}
                            </p>
                            <p className="text-xs text-slate-500">Across all entities</p>
                          </div>
                          <div className="text-center p-4 bg-white/50 rounded-xl border border-white/40">
                            <h3 className="text-sm font-medium text-slate-600 mb-1">Overdue Items</h3>
                            <p className="text-2xl font-bold text-red-600">
                              {clientTasks.filter(task => {
                                if (!task.dueDate || task.statusName === 'Completed') return false;
                                const dueDate = new Date(task.dueDate);
                                const today = new Date();
                                return dueDate < today;
                              }).length}
                            </p>
                            <p className="text-xs text-slate-500">Require attention</p>
                          </div>
                        </div>

                        {/* Entity List */}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Business Entities</h3>
                          {clientEntities.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {clientEntities.map((entity: any) => {
                                const entityTasks = clientTasks.filter(task => task.entityId === entity.id);
                                const completedTasks = entityTasks.filter(task => task.statusName === 'Completed').length;
                                const completionRate = entityTasks.length > 0 ? (completedTasks / entityTasks.length) * 100 : 100;
                                const overdueTasks = entityTasks.filter(task => {
                                  if (!task.dueDate || task.statusName === 'Completed') return false;
                                  const dueDate = new Date(task.dueDate);
                                  const today = new Date();
                                  return dueDate < today;
                                }).length;

                                return (
                                  <div key={entity.id} className="p-4 bg-white/60 rounded-xl border border-white/50 hover:bg-white/70 transition-colors cursor-pointer"
                                       onClick={() => setLocation(`/client-portal/entities/${entity.id}`)}>
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                          <Building2 className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-slate-900">{entity.name}</h4>
                                          <p className="text-sm text-slate-600">{entity.entityType} • {entity.stateName}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {entity.isVatRegistered && (
                                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                            VAT
                                          </Badge>
                                        )}
                                        {overdueTasks > 0 && (
                                          <Badge variant="destructive" className="text-xs">
                                            {overdueTasks} Overdue
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Task Progress */}
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Task Progress</span>
                                        <span className="font-medium">{Math.round(completionRate)}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full transition-all duration-500 ${
                                            completionRate === 100 ? 'bg-green-500' :
                                            completionRate >= 70 ? 'bg-blue-500' :
                                            completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${completionRate}%` }}
                                        />
                                      </div>
                                      <div className="flex justify-between text-xs text-slate-500">
                                        <span>{entityTasks.length} total tasks</span>
                                        <span>{completedTasks} completed</span>
                                      </div>
                                    </div>

                                    {/* Entity Details */}
                                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
                                      <div>
                                        <p className="text-xs text-slate-500">Tax ID</p>
                                        <p className="text-sm font-medium text-slate-900">{entity.businessTaxId || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-500">Location</p>
                                        <p className="text-sm font-medium text-slate-900">{entity.countryName}</p>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-slate-200">
                                      {entity.whatsappGroupLink && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(entity.whatsappGroupLink, '_blank');
                                          }}
                                          className="flex-1 text-xs"
                                        >
                                          <MessageCircle className="h-3 w-3 mr-1" />
                                          WhatsApp
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Navigate to documents section for this entity
                                          setLocation(`/client-portal/entities/${entity.id}#documents`);
                                        }}
                                        className="flex-1 text-xs"
                                      >
                                        <Receipt className="h-3 w-3 mr-1" />
                                        Documents
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-slate-500">
                              <Building2 className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                              <h3 className="text-lg font-medium text-slate-900 mb-2">No Entities Found</h3>
                              <p className="text-sm max-w-md mx-auto mb-6">
                                You don't have any registered business entities yet. Contact your account manager to add entities.
                              </p>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  const accountManagerEmail = userProfile?.accountManager?.email || 'accountmanager@example.com';
                                  window.location.href = `mailto:${accountManagerEmail}?subject=Entity Registration Request`;
                                }}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Contact Account Manager
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
          
          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <CardTitle>Your Tasks</CardTitle>
                    </div>
                    <CardDescription>
                      Track your compliance and service tasks{selectedEntityId ? ` for ${clientEntities.find((e: any) => e.id === selectedEntityId)?.name || 'selected entity'}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isTasksLoading ? (
                      <div className="flex justify-center py-8">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                        />
                      </div>
                    ) : tasksError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Failed to load tasks. Please try again later.
                        </AlertDescription>
                      </Alert>
                    ) : !clientTasks || clientTasks.length === 0 ? (
                      <motion.div 
                        className="text-center py-8 text-slate-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        {selectedEntityId 
                          ? `No tasks found for ${clientEntities.find((e: any) => e.id === selectedEntityId)?.name || 'this entity'}`
                          : "No tasks found"
                        }
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        {clientTasks.map((task: any, index: number) => {
                          const entityName = clientEntities.find((e: any) => e.id === task.entityId)?.name || "Unknown Entity";
                          
                          return (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              whileHover={{ x: 5 }}
                              className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-white/40 shadow-sm hover:shadow-md transition-all duration-300"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium text-slate-900 text-sm truncate">
                                        {task.title || task.taskDetails || 'Task'}
                                      </h4>
                                      <span className={`px-1.5 py-0.5 text-xs rounded-md ${
                                        task.statusName === 'Completed' ? 'bg-green-100 text-green-700' :
                                        task.statusName === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-700'
                                      }`}>
                                        {task.statusName}
                                      </span>
                                    </div>
                                    {(() => {
                                      if (!task.dueDate) return null;
                                      const dueDate = new Date(task.dueDate);
                                      const today = new Date();
                                      const diffTime = dueDate.getTime() - today.getTime();
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                      
                                      if (diffDays < 0 && task.statusName !== 'Completed') {
                                        return (
                                          <span className="px-1.5 py-0.5 text-xs rounded-md bg-red-100 text-red-700">
                                            {Math.abs(diffDays)}d overdue
                                          </span>
                                        );
                                      } else if (diffDays >= 0 && diffDays <= 7 && task.statusName !== 'Completed') {
                                        return (
                                          <span className="px-1.5 py-0.5 text-xs rounded-md bg-yellow-100 text-yellow-700">
                                            {diffDays === 0 ? 'Due today' : `${diffDays}d left`}
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                    <div className="flex items-center space-x-3">
                                      <span className="flex items-center">
                                        <Building2 className="h-3 w-3 mr-1 text-blue-500" />
                                        {entityName}
                                      </span>
                                      <span className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1 text-green-500" />
                                        {formatDate(task.dueDate)}
                                      </span>
                                      <span className="flex items-center">
                                        <User className="h-3 w-3 mr-1 text-purple-500" />
                                        {task.assigneeName || 'Unassigned'}
                                      </span>
                                    </div>
                                    {task.complianceYear && (
                                      <span className="flex items-center text-orange-600">
                                        <Shield className="h-3 w-3 mr-1" />
                                        {task.complianceYear}
                                      </span>
                                    )}
                                  </div>
                                  {task.complianceFrequency && (
                                    <div className="text-xs text-slate-500">
                                      <span className="bg-slate-100 px-2 py-0.5 rounded">
                                        {task.complianceFrequency}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTaskId(task.id);
                                      setShowTaskDetails(true);
                                    }}
                                    className="text-xs h-8 px-3"
                                  >
                                    View Details
                                  </Button>
                                </motion.div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          {/* Invoice Details Modal */}
          {showInvoiceDetails && selectedInvoiceId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                {(() => {
                  const invoice = clientInvoices.find((inv: any) => inv.id === selectedInvoiceId);
                  if (!invoice) return <div className="p-6">Invoice not found</div>;
                  
                  const entityInfo = clientEntities.find((e: any) => e.id === invoice.entityId) || {};
                  const getStatusColor = (status: string) => {
                    switch (status?.toLowerCase()) {
                      case 'paid': return 'bg-green-100 text-green-700 border-green-200';
                      case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
                      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
                      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
                      case 'partially_paid': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
                      default: return 'bg-gray-100 text-gray-700 border-gray-200';
                    }
                  };

                  // Get firm branding information from settings
                  const getSetting = (key: string) => {
                    const setting = tenantSettings?.find?.((s: any) => s.key === key);
                    return setting ? setting.value : "";
                  };
                  
                  const firmName = getSetting("firm_name") || getSetting("company_name") || "Accounting Firm";
                  const firmTagline = getSetting("firm_tagline") || "";
                  const firmLogo = getSetting("firm_logo") || "";
                  
                  // Get task details for this invoice
                  const relatedTask = clientTasks.find((task: any) => task.invoiceId === invoice.id);
                  const taskDetails = relatedTask?.taskDetails || 
                                     relatedTask?.title || 
                                     relatedTask?.description || 
                                     relatedTask?.serviceName ||
                                     invoice.notes ||
                                     "Professional Services";

                  return (
                    <div className="p-0">
                      {/* Firm Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 text-center">
                        {firmLogo && (
                          <img src={firmLogo} alt={firmName} className="h-12 mx-auto mb-3" />
                        )}
                        <h1 className="text-2xl font-bold mb-1">{firmName}</h1>
                        {firmTagline && (
                          <p className="text-blue-100 italic">{firmTagline}</p>
                        )}
                        <div className="text-sm text-blue-100 mt-2">
                          {getSetting("address")} | {getSetting("phone")} | {getSetting("email")}
                        </div>
                      </div>
                      
                      <div className="p-8">
                        <div className="flex items-start justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            Invoice #{invoice.invoiceNumber || invoice.id}
                          </h2>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="outline"
                            onClick={() => handlePrintInvoice(invoice)}
                            className="flex items-center space-x-2"
                          >
                            <Receipt className="h-4 w-4" />
                            <span>Print</span>
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setShowInvoiceDetails(false)}
                            className="flex items-center space-x-2"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Close</span>
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-4">Bill To</h3>
                          <div className="bg-slate-50 rounded-lg p-4">
                            <p className="font-semibold text-slate-900">{entityInfo.name || 'Entity Name'}</p>
                            <p className="text-slate-600">{entityInfo.address || ''}</p>
                            <p className="text-slate-600">{entityInfo.countryName || ''}</p>
                            <p className="text-slate-600">Tax ID: {entityInfo.businessTaxId || 'N/A'}</p>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-4">Invoice Details</h3>
                          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Issue Date:</span>
                              <span className="font-medium">{formatDate(invoice.issueDate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Due Date:</span>
                              <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Currency:</span>
                              <span className="font-medium">{invoice.currencyCode || 'USD'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Line Items</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b-2 border-slate-200">
                                <th className="text-left py-3 px-4 font-semibold text-slate-900">Description</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-900">Quantity</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-900">Rate</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-900">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoice.lineItems && invoice.lineItems.length > 0 ? (
                                invoice.lineItems.map((item: any, idx: number) => (
                                  <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-3 px-4 text-slate-700">{taskDetails}</td>
                                    <td className="py-3 px-4 text-right text-slate-700">{item.quantity || 1}</td>
                                    <td className="py-3 px-4 text-right text-slate-700">
                                      {(item.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                                      {(item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr className="border-b border-slate-100">
                                  <td className="py-3 px-4 text-slate-700">{taskDetails}</td>
                                  <td className="py-3 px-4 text-right text-slate-700">1</td>
                                  <td className="py-3 px-4 text-right text-slate-700">
                                    {(invoice.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3 px-4 text-right font-medium text-slate-900">
                                    {(invoice.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <div className="w-80">
                          <div className="bg-slate-50 rounded-lg p-6">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Subtotal:</span>
                                <span className="font-medium">
                                  {(invoice.subtotal || invoice.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              {invoice.taxAmount && (
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Tax:</span>
                                  <span className="font-medium">
                                    {parseFloat(invoice.taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              {invoice.discountAmount && (
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Discount:</span>
                                  <span className="font-medium text-green-600">
                                    -{parseFloat(invoice.discountAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              <div className="border-t border-slate-200 pt-2 mt-2">
                                <div className="flex justify-between text-lg font-bold">
                                  <span>Total:</span>
                                  <span>{(invoice.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                              {invoice.amountPaid && (
                                <>
                                  <div className="flex justify-between text-green-600">
                                    <span>Amount Paid:</span>
                                    <span>-{parseFloat(invoice.amountPaid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between text-lg font-bold text-red-600">
                                    <span>Amount Due:</span>
                                    <span>{(invoice.amountDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {invoice.notes && (
                        <div className="mt-8">
                          <h3 className="text-lg font-semibold text-slate-900 mb-4">Notes</h3>
                          <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-slate-700">{invoice.notes}</p>
                          </div>
                        </div>
                      )}

                        {/* Professional Footer with Payment Information */}
                        <div className="mt-8 pt-6 border-t-2 border-blue-600">
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-blue-900 mb-4">Payment Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {getSetting("bank_name") && (
                                <div>
                                  <span className="font-medium text-slate-600">Bank:</span>
                                  <span className="ml-2 text-slate-800">{getSetting("bank_name")}</span>
                                </div>
                              )}
                              {getSetting("account_title") && (
                                <div>
                                  <span className="font-medium text-slate-600">Account Title:</span>
                                  <span className="ml-2 text-slate-800">{getSetting("account_title")}</span>
                                </div>
                              )}
                              {getSetting("account_number") && (
                                <div>
                                  <span className="font-medium text-slate-600">Account Number:</span>
                                  <span className="ml-2 text-slate-800">{getSetting("account_number")}</span>
                                </div>
                              )}
                              {getSetting("routing_number") && (
                                <div>
                                  <span className="font-medium text-slate-600">Routing Number:</span>
                                  <span className="ml-2 text-slate-800">{getSetting("routing_number")}</span>
                                </div>
                              )}
                            </div>
                            {getSetting("payment_instructions") && (
                              <div className="mt-4 p-3 bg-white rounded border-l-4 border-blue-600">
                                <p className="text-sm text-slate-700">{getSetting("payment_instructions")}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4 text-center text-sm text-slate-600">
                            <p>&copy; {new Date().getFullYear()} {firmName}. All rights reserved.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </div>
          )}

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Receipt className="h-5 w-5 text-purple-500" />
                      <CardTitle>Your Invoices</CardTitle>
                    </div>
                    <CardDescription>
                      View and manage your invoices{selectedEntityId ? ` for ${clientEntities.find((e: any) => e.id === selectedEntityId)?.name || 'selected entity'}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isInvoicesLoading ? (
                      <div className="flex justify-center py-8">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"
                        />
                      </div>
                    ) : invoicesError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Failed to load invoices. Please try again later.
                        </AlertDescription>
                      </Alert>
                    ) : !clientInvoices || clientInvoices.length === 0 ? (
                      <motion.div 
                        className="text-center py-8 text-slate-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        {selectedEntityId 
                          ? `No invoices found for ${clientEntities.find((e: any) => e.id === selectedEntityId)?.name || 'this entity'}`
                          : "No invoices found"
                        }
                      </motion.div>
                    ) : (
                      <div className="space-y-4">
                        {clientInvoices.map((invoice: any, index: number) => {
                          const getStatusColor = (status: string) => {
                            switch (status?.toLowerCase()) {
                              case 'paid': return 'bg-green-100 text-green-700 border-green-200';
                              case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
                              case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
                              case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
                              case 'partially_paid': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
                              default: return 'bg-gray-100 text-gray-700 border-gray-200';
                            }
                          };
                          
                          return (
                            <motion.div
                              key={invoice.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              whileHover={{ x: 5 }}
                              className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-white/40 shadow-sm hover:shadow-md transition-all duration-300"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium text-slate-900 text-sm">
                                        Invoice #{invoice.invoiceNumber || invoice.id}
                                      </h4>
                                      <span className={`px-1.5 py-0.5 text-xs rounded-md ${getStatusColor(invoice.status)}`}>
                                        {invoice.status}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-slate-900">
                                        {(invoice.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                      {invoice.amountDue && parseFloat(invoice.amountDue) > 0 && (
                                        <p className="text-xs text-red-600">
                                          Due: {parseFloat(invoice.amountDue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                    <div className="flex items-center space-x-3">
                                      <span className="flex items-center">
                                        <Building2 className="h-3 w-3 mr-1 text-blue-500" />
                                        {invoice.entityName || "Unknown Entity"}
                                      </span>
                                      <span className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1 text-green-500" />
                                        Issued: {formatDate(invoice.issueDate)}
                                      </span>
                                      <span className="flex items-center">
                                        <Clock className="h-3 w-3 mr-1 text-red-500" />
                                        Due: {formatDate(invoice.dueDate)}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Compact Line Items Preview */}
                                  {invoice.lineItems && invoice.lineItems.length > 0 && (
                                    <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">
                                      {(() => {
                                        const relatedTask = clientTasks.find((task: any) => task.invoiceId === invoice.id);
                                        const taskDetails = relatedTask?.taskDetails || 
                                                           relatedTask?.title || 
                                                           relatedTask?.description || 
                                                           relatedTask?.serviceName ||
                                                           invoice.notes ||
                                                           invoice.lineItems[0]?.description ||
                                                           "Professional Services";
                                        return (
                                          <span className="truncate">
                                            {taskDetails}
                                            {invoice.lineItems.length > 1 && ` +${invoice.lineItems.length - 1} more`}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInvoiceId(invoice.id);
                                      setShowInvoiceDetails(true);
                                    }}
                                    className="text-xs h-8 px-3"
                                  >
                                    View Details
                                  </Button>
                                </motion.div>
                              </div>
                            </motion.div>
                          );
                        })}
                                
                                <div className="flex flex-col space-y-2 ml-4">
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button 
                                      variant="default" 
                                      size="sm"
                                      onClick={() => {
                                        setSelectedInvoiceId(invoice.id);
                                        setShowInvoiceDetails(true);
                                      }}
                                      className="w-full text-xs h-8 px-4"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Details
                                    </Button>
                                  </motion.div>
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handlePrintInvoice(invoice)}
                                      className="w-full text-xs h-8 px-4"
                                    >
                                      <Receipt className="h-3 w-3 mr-1" />
                                      Print
                                    </Button>
                                  </motion.div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.main>

      {/* Footer */}
      {footerEnabled && (
        <motion.footer 
          className="relative bg-white/60 backdrop-blur-lg border-t border-white/30 py-6 z-10 mt-16"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-center md:text-left">
                <p className="text-sm text-slate-600">
                  {footerCopyright || `© ${new Date().getFullYear()} Client Portal. All rights reserved.`}
                </p>
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-slate-600">
                {footerSupportEmail && (
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <a 
                      href={`mailto:${footerSupportEmail}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {footerSupportEmail}
                    </a>
                  </div>
                )}
                {footerSupportPhone && (
                  <div className="flex items-center space-x-1">
                    <Phone className="w-4 h-4" />
                    <a 
                      href={`tel:${footerSupportPhone}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {footerSupportPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {(footerDisclaimerText || footerAdditionalLinks) && (
              <div className="mt-4 pt-4 border-t border-slate-200/50">
                {footerDisclaimerText && (
                  <p className="text-xs text-slate-500 text-center mb-2">
                    {footerDisclaimerText}
                  </p>
                )}
                {footerAdditionalLinks && (
                  <div className="flex justify-center space-x-4 text-xs">
                    {footerAdditionalLinks.split(',').map((link: string, index: number) => (
                      <span key={index} className="text-slate-500 hover:text-blue-600 cursor-pointer transition-colors">
                        {link.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.footer>
      )}

      {/* Task Details Modal */}
      <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Task Details
            </DialogTitle>
          </DialogHeader>
          
          {(() => {
            const task = clientTasks.find((t: any) => t.id === selectedTaskId);
            if (!task) return <div>Task not found</div>;
            
            const entityName = clientEntities.find((e: any) => e.id === task.entityId)?.name || "Unknown Entity";
            
            return (
              <div className="space-y-6">
                {/* Task Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 mb-2">
                        {task.title || task.taskDetails || 'Task'}
                      </h2>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant="secondary"
                          className={`${
                            task.statusName === 'Completed' ? 'bg-green-100 text-green-700' :
                            task.statusName === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {task.statusName}
                        </Badge>
                        {(() => {
                          if (!task.dueDate) return null;
                          const dueDate = new Date(task.dueDate);
                          const today = new Date();
                          const diffTime = dueDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays < 0 && task.statusName !== 'Completed') {
                            return (
                              <Badge variant="destructive">
                                {Math.abs(diffDays)} days overdue
                              </Badge>
                            );
                          } else if (diffDays >= 0 && diffDays <= 7 && task.statusName !== 'Completed') {
                            return (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                                {diffDays === 0 ? 'Due today' : `${diffDays} days left`}
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Task ID</p>
                      <p className="text-lg font-bold text-slate-900">#{task.id}</p>
                    </div>
                  </div>
                  
                  {task.description && (
                    <div className="bg-white/50 rounded-lg p-4">
                      <p className="text-slate-700">{task.description}</p>
                    </div>
                  )}
                </div>

                {/* Task Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Primary Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Primary Details
                    </h3>
                    
                    <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Entity</span>
                        <span className="text-sm text-slate-900 font-medium">{entityName}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Due Date</span>
                        <span className="text-sm text-slate-900">{formatDate(task.dueDate)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Assignee</span>
                        <span className="text-sm text-slate-900">{task.assigneeName || 'Unassigned'}</span>
                      </div>
                      
                      {task.createdAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-600">Created</span>
                          <span className="text-sm text-slate-900">{formatDate(task.createdAt)}</span>
                        </div>
                      )}
                      
                      {task.updatedAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-600">Last Updated</span>
                          <span className="text-sm text-slate-900">{formatDate(task.updatedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compliance Details */}
                  {(task.complianceYear || task.complianceStartDate || task.complianceEndDate || task.complianceFrequency || task.complianceDeadline) && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        Compliance Information
                      </h3>
                      
                      <div className="space-y-3 bg-green-50 rounded-lg p-4">
                        {task.complianceYear && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Compliance Year</span>
                            <span className="text-sm text-slate-900 font-medium">{task.complianceYear}</span>
                          </div>
                        )}
                        
                        {task.complianceFrequency && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Frequency</span>
                            <span className="text-sm text-slate-900">{task.complianceFrequency}</span>
                          </div>
                        )}
                        
                        {task.complianceStartDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Compliance Start</span>
                            <span className="text-sm text-slate-900">{formatDate(task.complianceStartDate)}</span>
                          </div>
                        )}
                        
                        {task.complianceEndDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Compliance End</span>
                            <span className="text-sm text-slate-900">{formatDate(task.complianceEndDate)}</span>
                          </div>
                        )}
                        
                        {task.complianceDeadline && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Compliance Deadline</span>
                            <span className="text-sm text-slate-900">{formatDate(task.complianceDeadline)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Task Details Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Task Information
                  </h3>
                  
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b">
                      <h4 className="font-medium text-slate-900">Description</h4>
                    </div>
                    <div className="p-4">
                      <p className="text-slate-700 leading-relaxed">
                        {task.description || task.taskDetails || 'No detailed description available for this task.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowTaskDetails(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}