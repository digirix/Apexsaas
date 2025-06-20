import { db } from '../db';
import { clients, entities, invoices, tasks, users, payments, journalEntries, chartOfAccounts } from '@shared/schema';
import { and, eq, lt, gt, gte, lte, like, desc, sql } from 'drizzle-orm';
import { analyzeTenantData } from './data-analysis-service';

/**
 * Fetches relevant tenant data based on the user's query
 * This function uses simple keyword matching to determine what data to fetch
 * In a production environment, this would be enhanced with more sophisticated
 * natural language processing and semantic understanding
 */
interface UserInfo {
  id: number;
  tenantId: number;
  username: string;
  email: string;
  displayName: string;
  [key: string]: any; // Allow other properties
}

/**
 * Fetches tenant-specific data for the AI assistant based on the user's query
 * @param tenantId The ID of the tenant
 * @param query The user's query text
 * @param currentUser The current user making the request
 * @returns A formatted string containing relevant tenant data
 */
export const fetchTenantDataForQuery = async (
  tenantId: number, 
  query: string,
  currentUser?: UserInfo
): Promise<string> => {
  try {
    console.log(`Fetching tenant data for query: "${query}" (Tenant ID: ${tenantId})`);
    
    // Convert query to lowercase for easier matching
    const lowerQuery = query.toLowerCase();
    let contextData: string[] = [];
    const queryKeywords: string[] = [];
    
    // Extract keywords from the query
    lowerQuery.split(/\s+/).forEach(word => {
      if (word.length > 3 && !['what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'this', 'that', 'these', 'those', 'have', 'has', 'had', 'does', 'did', 'doing', 'with', 'from', 'about'].includes(word)) {
        queryKeywords.push(word);
      }
    });
    
    console.log(`Extracted keywords from query: ${queryKeywords.join(', ')}`);
    
    // Add current user context
    if (currentUser) {
      contextData.push(`CURRENT USER INFORMATION:`);
      contextData.push(`- User ID: ${currentUser.id}`);
      contextData.push(`- Username: ${currentUser.username}`);
      contextData.push(`- Email: ${currentUser.email}`);
      contextData.push(`- Display Name: ${currentUser.displayName}`);
      
      // Try to get more user info if available
      try {
        const userDetail = await db
          .select({
            id: users.id,
            role: users.role,
            isAdmin: users.isAdmin,
            department: users.departmentId
          })
          .from(users)
          .where(eq(users.id, currentUser.id))
          .limit(1);
          
        if (userDetail.length > 0) {
          const detail = userDetail[0];
          if (detail.role) contextData.push(`- Role: ${detail.role}`);
          if (detail.isAdmin !== undefined) contextData.push(`- Is Admin: ${detail.isAdmin ? 'Yes' : 'No'}`);
          if (detail.department) contextData.push(`- Department ID: ${detail.department}`);
        }
      } catch (err) {
        console.log('Could not fetch detailed user info:', err.message);
      }
    }
    
    // Basic tenant information
    contextData.push(`\nTENANT INFORMATION:`);
    contextData.push(`- Tenant ID: ${tenantId}`);
    
    // Get tenant information
    try {
      const tenantInfo = await db
        .select({
          id: sql<number>`id`,
          name: sql<string>`name`,
          primaryContact: sql<string>`primary_contact`,
          email: sql<string>`email`,
          phone: sql<string>`phone`,
          country: sql<string>`country`,
          createdAt: sql<Date>`created_at`
        })
        .from(sql`tenants`)
        .where(sql`id = ${tenantId}`)
        .limit(1);
        
      if (tenantInfo.length > 0) {
        const tenant = tenantInfo[0];
        contextData.push(`Tenant Name: ${tenant.name || 'Unknown'}`);
        contextData.push(`Tenant Contact: ${tenant.primaryContact || 'Not set'}`);
        contextData.push(`Tenant Email: ${tenant.email || 'Not set'}`);
        
        // Add tenant creation date
        if (tenant.createdAt) {
          const accountAge = Math.floor((new Date().getTime() - tenant.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          contextData.push(`Tenant Account Age: ${accountAge} days`);
        }
      }
    } catch (err) {
      console.log('Could not fetch tenant details (table may not exist):', err.message);
    }
    
    // Client information
    if (
      lowerQuery.includes('client') || 
      lowerQuery.includes('customer') || 
      lowerQuery.includes('company')
    ) {
      const clientData = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          industry: clients.industryId,
        })
        .from(clients)
        .where(eq(clients.tenantId, tenantId))
        .limit(10);

      if (clientData.length > 0) {
        contextData.push('\nClient Information:');
        clientData.forEach(client => {
          contextData.push(`- Client ID: ${client.id}, Name: ${client.name}, Email: ${client.email}`);
        });
      }
    }
    
    // Entity information
    if (
      lowerQuery.includes('entity') || 
      lowerQuery.includes('business') || 
      lowerQuery.includes('companies')
    ) {
      const entityData = await db
        .select({
          id: entities.id,
          name: entities.name,
          clientId: entities.clientId,
        })
        .from(entities)
        .where(eq(entities.tenantId, tenantId))
        .limit(10);

      if (entityData.length > 0) {
        contextData.push('\nEntity Information:');
        entityData.forEach(entity => {
          contextData.push(`- Entity ID: ${entity.id}, Name: ${entity.name}, Client ID: ${entity.clientId}`);
        });
      }
    }
    
    // Task information
    if (
      lowerQuery.includes('task') || 
      lowerQuery.includes('todo') || 
      lowerQuery.includes('assignment') ||
      lowerQuery.includes('work')
    ) {
      const taskData = await db
        .select({
          id: tasks.id,
          name: tasks.name,
          description: tasks.description,
          statusId: tasks.statusId,
          dueDate: tasks.dueDate,
        })
        .from(tasks)
        .where(eq(tasks.tenantId, tenantId))
        .orderBy(desc(tasks.createdAt))
        .limit(10);

      if (taskData.length > 0) {
        contextData.push('\nRecent Task Information:');
        taskData.forEach(task => {
          contextData.push(`- Task ID: ${task.id}, Name: ${task.name}, Status: ${task.statusId}, Due: ${task.dueDate?.toLocaleDateString() || 'Not set'}`);
        });
      }
    }
    
    // Invoice information
    if (
      lowerQuery.includes('invoice') || 
      lowerQuery.includes('bill') || 
      lowerQuery.includes('payment') ||
      lowerQuery.includes('money') ||
      lowerQuery.includes('finance') ||
      lowerQuery.includes('amount')
    ) {
      const invoiceData = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          clientId: invoices.clientId,
          totalAmount: invoices.totalAmount,
          status: invoices.status,
          dueDate: invoices.dueDate,
        })
        .from(invoices)
        .where(eq(invoices.tenantId, tenantId))
        .orderBy(desc(invoices.createdAt))
        .limit(10);

      if (invoiceData.length > 0) {
        contextData.push('\nRecent Invoice Information:');
        invoiceData.forEach(invoice => {
          contextData.push(`- Invoice: ${invoice.invoiceNumber}, Amount: ${invoice.totalAmount}, Status: ${invoice.status}, Due: ${invoice.dueDate.toLocaleDateString()}`);
        });
      }
      
      // Payment information
      const paymentData = await db
        .select({
          id: payments.id,
          invoiceId: payments.invoiceId, 
          amount: payments.amount,
          paymentDate: payments.paymentDate,
        })
        .from(payments)
        .where(eq(payments.tenantId, tenantId))
        .orderBy(desc(payments.createdAt))
        .limit(5);

      if (paymentData.length > 0) {
        contextData.push('\nRecent Payment Information:');
        paymentData.forEach(payment => {
          contextData.push(`- Payment ID: ${payment.id}, Invoice ID: ${payment.invoiceId}, Amount: ${payment.amount}, Date: ${payment.paymentDate.toLocaleDateString()}`);
        });
      }
    }
    
    // Chart of accounts and journal entries
    if (
      lowerQuery.includes('account') || 
      lowerQuery.includes('ledger') || 
      lowerQuery.includes('journal') ||
      lowerQuery.includes('entry') ||
      lowerQuery.includes('coa') ||
      lowerQuery.includes('chart of accounts')
    ) {
      const accountData = await db
        .select({
          id: chartOfAccounts.id,
          name: chartOfAccounts.name,
          accountCode: chartOfAccounts.accountCode,
          accountType: chartOfAccounts.accountType,
        })
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.tenantId, tenantId))
        .limit(15);

      if (accountData.length > 0) {
        contextData.push('\nChart of Accounts:');
        accountData.forEach(account => {
          contextData.push(`- Account: ${account.name}, Code: ${account.accountCode}, Type: ${account.accountType}`);
        });
      }
      
      const journalData = await db
        .select({
          id: journalEntries.id,
          reference: journalEntries.reference,
          amount: journalEntries.amount,
          entryDate: journalEntries.entryDate,
          description: journalEntries.description,
        })
        .from(journalEntries)
        .where(eq(journalEntries.tenantId, tenantId))
        .orderBy(desc(journalEntries.entryDate))
        .limit(5);

      if (journalData.length > 0) {
        contextData.push('\nRecent Journal Entries:');
        journalData.forEach(entry => {
          contextData.push(`- Entry: ${entry.reference}, Amount: ${entry.amount}, Date: ${entry.entryDate.toLocaleDateString()}, Description: ${entry.description.substring(0, 50)}${entry.description.length > 50 ? '...' : ''}`);
        });
      }
    }
    
    // User information
    if (
      lowerQuery.includes('user') || 
      lowerQuery.includes('staff') || 
      lowerQuery.includes('employee') ||
      lowerQuery.includes('team') ||
      lowerQuery.includes('profile')
    ) {
      const userData = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.tenantId, tenantId))
        .limit(10);

      if (userData.length > 0) {
        contextData.push('\nUser Information:');
        userData.forEach(user => {
          contextData.push(`- User: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
        });
      }
    }
    
    // Detect if analysis is needed for financial or analytical queries
    if (
      lowerQuery.includes('analyze') ||
      lowerQuery.includes('analysis') ||
      lowerQuery.includes('calculate') ||
      lowerQuery.includes('comparison') ||
      lowerQuery.includes('profit') ||
      lowerQuery.includes('trend') ||
      lowerQuery.includes('financial') ||
      lowerQuery.includes('performance') ||
      lowerQuery.includes('revenue') ||
      lowerQuery.includes('margin') ||
      lowerQuery.includes('report') ||
      lowerQuery.includes('summary') ||
      lowerQuery.includes('average') ||
      lowerQuery.includes('compute')
    ) {
      try {
        console.log('Performing advanced data analysis for query:', query);
        const analysisResult = await analyzeTenantData(tenantId, query);
        
        contextData.push('\nADVANCED DATA ANALYSIS:');
        contextData.push(analysisResult);
        
        // Also provide a basic financial summary for context
        const financialSummary = await db
          .select({
            totalInvoiced: sql<string>`COALESCE(SUM(${invoices.totalAmount}::numeric), 0)`,
            totalPaid: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.totalAmount}::numeric ELSE 0 END), 0)`,
            totalOutstanding: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} IN ('draft', 'sent', 'overdue') THEN ${invoices.amountDue}::numeric ELSE 0 END), 0)`
          })
          .from(invoices)
          .where(eq(invoices.tenantId, tenantId));
        
        if (financialSummary.length > 0) {
          contextData.push('\nFinancial Overview:');
          contextData.push(`- Total Amount Invoiced: $${parseFloat(financialSummary[0].totalInvoiced).toFixed(2)}`);
          contextData.push(`- Total Amount Paid: $${parseFloat(financialSummary[0].totalPaid).toFixed(2)}`);
          contextData.push(`- Total Outstanding: $${parseFloat(financialSummary[0].totalOutstanding).toFixed(2)}`);
        }
      } catch (error) {
        console.error('Error performing data analysis:', error);
        contextData.push('\nData Analysis Error:');
        contextData.push('Could not complete the requested analysis. Please try a different question.');
      }
    }

    // If no specific data matched, provide a basic tenant summary
    if (contextData.length <= 1) {
      const clientCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(clients)
        .where(eq(clients.tenantId, tenantId));
        
      const entityCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(entities)
        .where(eq(entities.tenantId, tenantId));
        
      const taskCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(eq(tasks.tenantId, tenantId));
        
      const invoiceCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.tenantId, tenantId));
      
      contextData.push('\nTenant Summary:');
      contextData.push(`- Total Clients: ${clientCount[0]?.count || 0}`);
      contextData.push(`- Total Entities: ${entityCount[0]?.count || 0}`);
      contextData.push(`- Total Tasks: ${taskCount[0]?.count || 0}`);
      contextData.push(`- Total Invoices: ${invoiceCount[0]?.count || 0}`);
    }
    
    return contextData.join('\n');
  } catch (error) {
    console.error('Error fetching tenant data for AI query:', error);
    return 'Unable to fetch tenant data. Please provide a general response.';
  }
};