import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { TenantSetting } from "@shared/schema";

interface TenantInfo {
  companyName: string;
  businessType: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  taxId: string;
  language: string;
  timezone: string;
  useCustomLabels: boolean;
  clientsLabel: string;
  tasksLabel: string;
  invoicesLabel: string;
}

interface TenantContextType extends TenantInfo {
  isLoading: boolean;
  getDisplayName: () => string;
  getBusinessTypeDisplay: () => string;
  getContactInfo: () => { email: string; phone: string; address: string; website: string };
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenantInfo, setTenantInfo] = useState<TenantInfo>({
    companyName: "",
    businessType: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    taxId: "",
    language: "en",
    timezone: "UTC",
    useCustomLabels: false,
    clientsLabel: "Clients",
    tasksLabel: "Tasks",
    invoicesLabel: "Invoices",
  });

  // Fetch tenant settings
  const { data: settings = [], isLoading } = useQuery<TenantSetting[]>({
    queryKey: ["/api/v1/tenant/settings"],
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (settings.length > 0) {
      const getSetting = (key: string) => settings.find(s => s.key === key)?.value || "";
      
      setTenantInfo({
        companyName: getSetting("company_name"),
        businessType: getSetting("business_type"),
        email: getSetting("email"),
        phone: getSetting("phone"),
        address: getSetting("address"),
        website: getSetting("website"),
        taxId: getSetting("tax_id"),
        language: getSetting("language") || "en",
        timezone: getSetting("timezone") || "UTC",
        useCustomLabels: getSetting("use_custom_labels") === "true",
        clientsLabel: getSetting("clients_label") || "Clients",
        tasksLabel: getSetting("tasks_label") || "Tasks",
        invoicesLabel: getSetting("invoices_label") || "Invoices",
      });
    }
  }, [settings]);

  const getDisplayName = () => {
    return tenantInfo.companyName || "Your Company";
  };

  const getBusinessTypeDisplay = () => {
    const typeMap: Record<string, string> = {
      accounting_firm: "Accounting Firm",
      tax_firm: "Tax Firm",
      bookkeeping: "Bookkeeping Service",
      accounting_consultant: "Accounting Consultant",
      financial_advisor: "Financial Advisor",
      other: "Professional Services"
    };
    return typeMap[tenantInfo.businessType] || "Professional Services";
  };

  const getContactInfo = () => ({
    email: tenantInfo.email,
    phone: tenantInfo.phone,
    address: tenantInfo.address,
    website: tenantInfo.website
  });

  const contextValue: TenantContextType = {
    ...tenantInfo,
    isLoading,
    getDisplayName,
    getBusinessTypeDisplay,
    getContactInfo,
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}