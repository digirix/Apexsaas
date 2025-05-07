import { DatabaseStorage } from '../database-storage';

// Helper function to get data from the database
export const fetchDataForChatbot = async (
  db: DatabaseStorage,
  tenantId: number,
  query: string
): Promise<any> => {
  // Normalize the query to lowercase for easier matching
  const normalizedQuery = query.toLowerCase();
  
  // Container for all the data we'll return
  const data: any = {
    query,
    tenantData: {
      clients: [],
      entities: [],
      tasks: [],
      users: [],
      invoices: [],
      chartOfAccounts: [],
      financialReports: [],
      taskCategories: [],
      taskStatuses: [],
    }
  };
  
  // Fetch clients data if the query seems to be about clients
  if (
    normalizedQuery.includes('client') || 
    normalizedQuery.includes('customers') ||
    normalizedQuery.includes('list of client')
  ) {
    const clients = await db.getClients(tenantId);
    data.tenantData.clients = clients;
  }
  
  // Fetch entities data if the query seems to be about entities
  if (
    normalizedQuery.includes('entity') || 
    normalizedQuery.includes('entities') ||
    normalizedQuery.includes('company')
  ) {
    const entities = await db.getEntities(tenantId);
    data.tenantData.entities = entities;
  }
  
  // Fetch tasks data if the query seems to be about tasks
  if (
    normalizedQuery.includes('task') || 
    normalizedQuery.includes('todo') ||
    normalizedQuery.includes('to do') ||
    normalizedQuery.includes('assignment')
  ) {
    const tasks = await db.getTasks(tenantId);
    data.tenantData.tasks = tasks;
    
    // Also fetch related task categories and statuses for context
    data.tenantData.taskCategories = await db.getTaskCategories(tenantId);
    data.tenantData.taskStatuses = await db.getTaskStatuses(tenantId);
  }
  
  // Fetch users data if the query seems to be about users/staff
  if (
    normalizedQuery.includes('user') || 
    normalizedQuery.includes('staff') ||
    normalizedQuery.includes('employee') ||
    normalizedQuery.includes('team')
  ) {
    const users = await db.getUsers(tenantId);
    data.tenantData.users = users;
  }
  
  // Fetch invoice data if the query seems to be about invoices/billing
  if (
    normalizedQuery.includes('invoice') || 
    normalizedQuery.includes('bill') ||
    normalizedQuery.includes('payment') ||
    normalizedQuery.includes('financial')
  ) {
    const invoices = await db.getInvoices(tenantId);
    data.tenantData.invoices = invoices;
  }

  // Fetch chart of accounts data if the query seems to be about accounting
  if (
    normalizedQuery.includes('account') || 
    normalizedQuery.includes('chart') ||
    normalizedQuery.includes('coa') ||
    normalizedQuery.includes('ledger') ||
    normalizedQuery.includes('financial')
  ) {
    try {
      const chartOfAccounts = await db.getChartOfAccounts(tenantId);
      data.tenantData.chartOfAccounts = chartOfAccounts;
    } catch (error) {
      console.error('Error fetching chart of accounts:', error);
    }
  }
  
  return data;
};

// Function to generate a system prompt based on tenant data
export const generateSystemPrompt = (tenantId: number): string => {
  return `
You are an AI assistant for an accounting firm management platform. You help users with information about their data in the system.
You have access to data only for tenant ID ${tenantId}. Always respect tenant data isolation.

Here are some guidelines:
1. You can provide information about clients, entities, tasks, users, invoices, and financial data for tenant ${tenantId}.
2. Never make up information. If you don't have data on a topic, politely say so.
3. Keep responses concise and relevant to the accounting or firm management context.
4. If asked about sensitive information like passwords or payment details, refuse politely.
5. For numerical data, format it properly (currency with symbols, percentages, etc.).
6. When appropriate, suggest actions the user can take in the platform.

Your goal is to help accounting professionals work more efficiently by providing accurate information from their system.
`;
};