import { DatabaseStorage } from "../database-storage";

// Interface for tenant data response
interface TenantDataResponse {
  tenantId: number;
  query: string;
  tenantData: Record<string, any>;
  timestamp: string;
}

// Function to fetch data from the tenant's database based on the user's query
export const fetchDataForChatbot = async (
  db: DatabaseStorage,
  tenantId: number,
  query: string
): Promise<TenantDataResponse | null> => {
  // Initialize the data structure
  const data: TenantDataResponse = {
    tenantId,
    query,
    tenantData: {},
    timestamp: new Date().toISOString()
  };
  
  // Convert query to lowercase for easier matching
  const lowercaseQuery = query.toLowerCase();
  
  try {
    // Check if query is about clients
    if (
      lowercaseQuery.includes("client") || 
      lowercaseQuery.includes("customers") ||
      lowercaseQuery.includes("customer list")
    ) {
      const clients = await db.getClients(tenantId);
      data.tenantData.clients = clients;
    }
    
    // Check if query is about invoices
    if (
      lowercaseQuery.includes("invoice") || 
      lowercaseQuery.includes("invoices") ||
      lowercaseQuery.includes("billing")
    ) {
      const invoices = await db.getInvoices(tenantId);
      data.tenantData.invoices = invoices;
      
      // If the query specifically asks about overdue invoices
      if (lowercaseQuery.includes("overdue") || lowercaseQuery.includes("past due")) {
        const overdueInvoices = invoices.filter(invoice => invoice.status === "overdue");
        data.tenantData.overdueInvoices = overdueInvoices;
      }
    }
    
    // Check if query is about tasks
    if (
      lowercaseQuery.includes("task") || 
      lowercaseQuery.includes("tasks") ||
      lowercaseQuery.includes("to do") ||
      lowercaseQuery.includes("todo")
    ) {
      const tasks = await db.getTasks(tenantId);
      data.tenantData.tasks = tasks;
      
      // If asking about task statuses
      if (lowercaseQuery.includes("status")) {
        const taskStatuses = await db.getTaskStatuses(tenantId);
        data.tenantData.taskStatuses = taskStatuses;
      }
    }
    
    // Check if query is about finances or chart of accounts
    if (
      lowercaseQuery.includes("finance") || 
      lowercaseQuery.includes("account") ||
      lowercaseQuery.includes("chart of accounts") ||
      lowercaseQuery.includes("coa") ||
      lowercaseQuery.includes("ledger")
    ) {
      const accounts = await db.getChartOfAccounts(tenantId);
      data.tenantData.chartOfAccounts = accounts;
    }
    
    // Check if query is about payments
    if (
      lowercaseQuery.includes("payment") || 
      lowercaseQuery.includes("payments") ||
      lowercaseQuery.includes("transaction")
    ) {
      const payments = await db.getPayments(tenantId);
      data.tenantData.payments = payments;
    }
    
    // Check if query is about journal entries
    if (
      lowercaseQuery.includes("journal") || 
      lowercaseQuery.includes("entries") ||
      lowercaseQuery.includes("accounting entries")
    ) {
      const journalEntries = await db.getJournalEntries(tenantId);
      data.tenantData.journalEntries = journalEntries;
    }
    
    // Check if query is about AI configurations
    if (
      lowercaseQuery.includes("ai") || 
      lowercaseQuery.includes("artificial intelligence") ||
      lowercaseQuery.includes("machine learning") ||
      lowercaseQuery.includes("config")
    ) {
      const aiConfigs = await db.getAiConfigurations(tenantId);
      // Remove sensitive information like API keys
      const safeConfigs = aiConfigs.map(config => ({
        id: config.id,
        provider: config.provider,
        modelId: config.modelId,
        isActive: config.isActive,
        createdAt: config.createdAt
      }));
      data.tenantData.aiConfigurations = safeConfigs;
    }
    
    // If we didn't find any specific data to return
    if (Object.keys(data.tenantData).length === 0) {
      // Get basic tenant information as a fallback
      const tenantInfo = {
        clientCount: (await db.getClients(tenantId)).length,
        taskCount: (await db.getTasks(tenantId)).length,
        invoiceCount: (await db.getInvoices(tenantId)).length
      };
      data.tenantData.tenantInfo = tenantInfo;
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching data for tenant ${tenantId}:`, error);
    return null;
  }
};

// Generate a system prompt for the AI with tenant context
export const generateSystemPrompt = (tenantId: number): string => {
  return `
You are an AI assistant for Accountant.io, a multi-tenant accounting management platform for accounting professionals.
You are currently helping a user from tenant ID: ${tenantId}.

Your role is to help with:
1. Answering questions about how to use the Accountant.io platform
2. Providing information about the tenant's clients, tasks, and financial data
3. Explaining accounting concepts and best practices
4. Helping users navigate the application

Important guidelines:
- Only provide information related to the specific tenant (${tenantId})
- Do not share data from other tenants
- Be clear, concise, and professional in your responses
- If you don't know the answer, say so rather than making something up
- For security reasons, never provide or ask for passwords, API keys, or other sensitive credentials
- When showing financial data, format currency values appropriately with proper currency symbols

Always think about context when answering questions and provide relevant, accurate information based on the tenant's data.
`;
};