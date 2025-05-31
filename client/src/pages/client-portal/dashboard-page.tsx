import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building2, Calendar, Clock, Receipt, BarChart, User, Eye, 
  AlertCircle, LogOut, Phone, Mail, Home, Shield, Briefcase,
  Sparkles, ArrowRight, TrendingUp, CheckCircle, XCircle,
  MessageCircle, Users, MessageSquare, FileText
} from "lucide-react";

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
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="min-w-[280px]"
                  >
                    <div className="relative">
                      <button
                        onClick={() => {
                          // Create a simple menu with entity options
                          const menu = document.createElement('div');
                          menu.className = 'absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border border-white/50 shadow-xl rounded-xl mt-1 z-50 max-h-60 overflow-y-auto';
                          menu.innerHTML = `
                            <div class="p-2">
                              <div class="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer" onclick="this.parentElement.parentElement.remove()">
                                <svg class="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                                <span>All Entities</span>
                              </div>
                              ${clientEntities.map(entity => entity && entity.id && entity.name ? `
                                <div class="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer" onclick="window.location.href='/client-portal/entities/${entity.id}'; this.parentElement.parentElement.remove();">
                                  <svg class="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                  <span class="font-medium">${entity.name}</span>
                                  <span class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">${entity.entityType || 'Unknown'}</span>
                                </div>
                              ` : '').join('')}
                            </div>
                          `;
                          
                          // Remove any existing menus
                          document.querySelectorAll('[data-entity-menu]').forEach(el => el.remove());
                          menu.setAttribute('data-entity-menu', 'true');
                          
                          // Position and show menu
                          const button = event.currentTarget;
                          button.parentElement.appendChild(menu);
                          
                          // Close menu when clicking outside
                          setTimeout(() => {
                            document.addEventListener('click', function closeMenu(e) {
                              if (!menu.contains(e.target)) {
                                menu.remove();
                                document.removeEventListener('click', closeMenu);
                              }
                            });
                          }, 0);
                        }}
                        className="w-full bg-white/80 backdrop-blur-lg border border-white/40 shadow-lg rounded-xl px-4 py-2 h-10 hover:bg-white/90 transition-all duration-300 text-left flex items-center justify-between"
                      >
                        <span className="text-slate-600">Select an entity...</span>
                        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
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
                              className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-sm hover:shadow-md transition-all duration-300"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="font-medium text-slate-900 truncate">
                                      {task.title || task.taskDetails || 'Task'}
                                    </h4>
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      task.statusName === 'Completed' ? 'bg-green-100 text-green-700' :
                                      task.statusName === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {task.statusName}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 mb-2">
                                    {task.description || 'No description'}
                                  </p>
                                  <div className="flex items-center space-x-4 text-xs text-slate-500">
                                    <span className="flex items-center">
                                      <Building2 className="h-3 w-3 mr-1" />
                                      {entityName}
                                    </span>
                                    <span className="flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      Due: {formatDate(task.dueDate)}
                                    </span>
                                    <span className="flex items-center">
                                      <User className="h-3 w-3 mr-1" />
                                      {task.assigneeName || 'Unassigned'}
                                    </span>
                                  </div>
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
                      <div className="space-y-3">
                        {clientInvoices.map((invoice: any, index: number) => {
                          const entityName = clientEntities.find((e: any) => e.id === invoice.entityId)?.name || "Unknown Entity";
                          
                          return (
                            <motion.div
                              key={invoice.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              whileHover={{ x: 5 }}
                              className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-sm hover:shadow-md transition-all duration-300"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="font-medium text-slate-900 truncate">
                                      Invoice #{invoice.invoiceNumber || invoice.id}
                                    </h4>
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      invoice.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                      invoice.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {invoice.status}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 mb-2">
                                    Amount: {formatCurrency(invoice.amount || 0)}
                                  </p>
                                  <div className="flex items-center space-x-4 text-xs text-slate-500">
                                    <span className="flex items-center">
                                      <Building2 className="h-3 w-3 mr-1" />
                                      {entityName}
                                    </span>
                                    <span className="flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      Due: {formatDate(invoice.dueDate)}
                                    </span>
                                  </div>
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
    </div>
  );
}