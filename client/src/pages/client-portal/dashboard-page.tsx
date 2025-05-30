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
  MessageCircle, Users
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
    if (!selectedEntityId || !entityServices.length) return null;

    const totalServices = serviceTypes.length;
    const subscribedServices = entityServices.filter((s: any) => s.isSubscribed).length;
    const requiredServices = entityServices.filter((s: any) => s.isRequired).length;
    const complianceRate = requiredServices > 0 ? Math.round((subscribedServices / requiredServices) * 100) : 100;

    const entityTasks = clientTasks.filter(task => task.entityId === selectedEntityId);
    const upcomingDeadlines = entityTasks.filter(task => {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length;

    const overdueItems = entityTasks.filter(task => {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      return dueDate < today && task.statusName !== 'Completed';
    }).length;

    const serviceBreakdown = entityServices.map((service: any) => {
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
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        return dueDate < today && task.statusName !== 'Completed';
      })) {
        status = 'overdue';
      } else if (serviceTasks.some(task => {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      })) {
        status = 'due_soon';
      }

      return {
        id: service.id,
        name: service.name || 'Unknown Service',
        isRequired: service.isRequired,
        subscribed: service.isSubscribed,
        frequency: service.billingBasis,
        nextDueDate: serviceTasks.length > 0 ? new Date(serviceTasks[0].dueDate) : null,
        status,
        tasks: serviceTasks,
        completionRate
      };
    });

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
              {clientEntities.length > 0 && (
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
                    <Select 
                      value={selectedEntityId?.toString() || "all"} 
                      onValueChange={(value) => {
                        try {
                          const newEntityId = value === "all" || !value ? null : parseInt(value);
                          setSelectedEntityId(newEntityId);
                        } catch (error) {
                          console.error('Error setting entity ID:', error);
                          setSelectedEntityId(null);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white/80 backdrop-blur-lg border border-white/40 shadow-lg rounded-xl px-4 py-2 h-10 hover:bg-white/90 transition-all duration-300">
                        <SelectValue placeholder="Select an entity..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-xl rounded-xl">
                        <SelectItem value="all">
                          <div className="flex items-center space-x-2">
                            <Home className="h-4 w-4 text-slate-500" />
                            <span>All Entities</span>
                          </div>
                        </SelectItem>
                        {clientEntities.map((entity: any) => (
                          <SelectItem key={entity.id} value={entity.id.toString()}>
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">{entity.name}</span>
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {entity.entityType}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Summary Cards */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Active Tasks</CardTitle>
                    <motion.div
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"
                    >
                      <Clock className="h-4 w-4 text-white" />
                    </motion.div>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                    >
                      {clientTasks.length}
                    </motion.div>
                    <p className="text-xs text-slate-500 mt-2">
                      {getTaskCompletionRate(clientTasks)}% completion rate
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Total Invoices</CardTitle>
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
                      className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                    >
                      {clientInvoices.length}
                    </motion.div>
                    <p className="text-xs text-slate-500 mt-2">
                      {formatCurrency(clientInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0))} total value
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
                      Registered entities
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Compliance Rate</CardTitle>
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
                      {complianceAnalysis ? `${complianceAnalysis.complianceRate}%` : "—"}
                    </motion.div>
                    <p className="text-xs text-slate-500 mt-2">
                      {selectedEntity ? `For ${selectedEntity.name}` : "Select entity to view"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
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
                          <div className="text-center py-8 text-slate-500">
                            <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p>Upcoming compliance deadlines will be displayed here</p>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="history" className="space-y-4">
                          <div className="text-center py-8 text-slate-500">
                            <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p>Compliance history will be displayed here</p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <motion.div 
                        className="text-center py-12 text-slate-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Building2 className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">Select an Entity</h3>
                        <p className="text-sm mb-6 max-w-md mx-auto">
                          Choose an entity from the dropdown above to view:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                            <h4 className="font-medium text-slate-700">Compliance Analysis</h4>
                            <p className="text-xs text-slate-500">Service subscriptions and compliance rates</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <Calendar className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <h4 className="font-medium text-slate-700">Upcoming Deadlines</h4>
                            <p className="text-xs text-slate-500">Future compliance requirements</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                            <h4 className="font-medium text-slate-700">Compliance History</h4>
                            <p className="text-xs text-slate-500">Past submissions and completions</p>
                          </div>
                        </div>
                      </motion.div>
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