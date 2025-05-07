import { db } from '../db';
import { queryAI } from './ai-service';
import { fetchTenantDataForQuery } from './chatbot-data-service';
import { sql } from 'drizzle-orm';

// Define types for the report data
export interface ReportData {
  text: string;
  charts?: {
    type: "bar" | "line" | "pie";
    title: string;
    data: any[];
    xAxis?: {
      dataKey: string;
      label?: string;
    };
    series?: {
      dataKey: string;
      color?: string;
    }[];
    dataKey?: string; // For pie charts
    category?: string; // For pie charts
    colors?: string[]; // For pie charts
  }[];
  rawData?: any;
  sql?: string;
  processingTimeMs: number;
}

// System prompt for the AI when generating reports
const REPORT_SYSTEM_PROMPT = `
You are an advanced AI reporting assistant for a multi-tenant accounting firm management platform.
Your job is to generate insightful, accurate reports from the tenant's financial data.

IMPORTANT: You have direct database access through SQL. You must run SQL queries to get the data before generating reports.
The tenant ID for the current request is provided in the context. Always filter data by tenant_id to ensure data isolation.

KEY DATABASE TABLES:
- clients: Client information (id, tenant_id, name, email, phone, etc.)
- entities: Business entities associated with clients (id, tenant_id, client_id, name, etc.)
- invoices: Invoice data (id, tenant_id, client_id, entity_id, invoice_number, amount, status, etc.)
- accounts: Chart of accounts (id, tenant_id, account_code, account_name, account_type, current_balance, etc.)
- journal_entries: Journal entries (id, tenant_id, entry_date, reference, description, etc.)
- journal_entry_items: Line items in journal entries (id, tenant_id, journal_entry_id, account_id, debit_amount, credit_amount, etc.)
- tasks: Tasks assigned to staff (id, tenant_id, name, description, due_date, etc.)
- users: User accounts (id, tenant_id, email, display_name, role, etc.)

ANALYSIS GUIDELINES:
1. For financial reports (profit & loss, balance sheet, etc.), use journal_entries and journal_entry_items
2. For client analysis, use clients, invoices, and tasks
3. For revenue analysis, use invoices and payments
4. For tax reporting, use journal_entries filtered by tax-related accounts
5. Always check and report on data completeness before drawing conclusions

OUTPUT FORMAT:
Respond with a JSON object containing:
- text: The report as HTML (use proper heading tags, lists, bold/italic for emphasis, etc.)
- charts: Array of chart objects for visualization:
  - type: "bar", "line", or "pie"
  - title: Chart title
  - data: Array of data points
  - xAxis: (for bar/line) { dataKey: "field", label: "X-Axis Label" }
  - series: (for bar/line) [{ dataKey: "field", label: "Series Label" }]
  - dataKey: (for pie) The value field
  - category: (for pie) The category field
  - colors: (optional) Array of colors
- rawData: The raw data from your SQL query
- sql: The SQL query you executed

EXAMPLE:
{
  "text": "<h2>Revenue Analysis (May 2025)</h2><p>Total revenue for May was <b>$42,500.00</b>, a <b>12%</b> increase from April...</p>",
  "charts": [
    {
      "type": "bar",
      "title": "Monthly Revenue",
      "data": [{"month": "Jan", "value": 38000}, {"month": "Feb", "value": 42000}],
      "xAxis": {"dataKey": "month", "label": "Month"},
      "series": [{"dataKey": "value", "label": "Revenue ($)"}]
    }
  ],
  "rawData": {"rows": [...], "fields": [...]},
  "sql": "SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(total_amount) FROM invoices WHERE tenant_id = 5 GROUP BY month"
}

VERY IMPORTANT SECURITY RULES:
1. ALWAYS filter queries by tenant_id = [tenant_id] to ensure data isolation
2. Only execute SELECT queries - never INSERT, UPDATE, DELETE, DROP, or ALTER
3. If you don't know how to create a report from the available data, explain what specific data is missing

You have the ability to execute SQL queries directly against the database as part of your response. Always try to provide meaningful and accurate data-driven insights.
`;

/**
 * Generates a report based on a natural language query
 * @param tenantId The ID of the tenant making the request
 * @param userId The ID of the user making the request
 * @param query The natural language query
 * @returns The generated report data
 */
export async function generateReport(
  tenantId: number, 
  userId: number,
  query: string
): Promise<ReportData> {
  const startTime = Date.now();
  
  try {
    console.log(`Generating report for query: "${query}" (Tenant ID: ${tenantId}, User ID: ${userId})`);
    
    // Step 1: Get AI configuration for the tenant
    const aiConfig = await db.query.aiConfigurations.findFirst({
      where: (aiConf, { eq, and }) => and(
        eq(aiConf.tenantId, tenantId),
        eq(aiConf.isActive, true)
      ),
      columns: {
        provider: true,
        apiKey: true,
        model: true
      }
    });
    
    if (!aiConfig) {
      throw new Error("No active AI configuration found for this tenant");
    }
    
    // Step 2: Fetch relevant tenant data for the query
    console.log("Fetching relevant tenant data for the query...");
    const contextData = await fetchTenantDataForQuery(tenantId, query);
    
    // Step 3: Generate database schema info to help the AI understand the database structure
    console.log("Generating database schema information...");
    let schemaInfo = "";
    try {
      // Get table structure for key tables
      const tableSchema = await db.execute(sql`
        SELECT 
          table_name, 
          column_name, 
          data_type,
          column_default,
          is_nullable
        FROM 
          information_schema.columns
        WHERE 
          table_schema = 'public'
          AND table_name IN (
            'clients', 'entities', 'invoices', 'accounts',
            'journal_entries', 'journal_entry_items', 'tasks',
            'users', 'chart_of_accounts_main_groups', 'payments'
          )
        ORDER BY 
          table_name, ordinal_position;
      `);
      
      // Format the schema for easier reading
      if (tableSchema && tableSchema.rows && tableSchema.rows.length > 0) {
        let currentTable = '';
        schemaInfo += "DATABASE SCHEMA:\n";
        
        for (const row of tableSchema.rows) {
          const tableName = String(row.table_name || '');
          if (tableName !== currentTable) {
            schemaInfo += `\nTABLE: ${tableName}\n`;
            currentTable = tableName;
          }
          
          const columnName = String(row.column_name || '');
          const dataType = String(row.data_type || '');
          const isNullable = row.is_nullable === 'YES' ? ' NULL' : ' NOT NULL';
          const columnDefault = row.column_default ? ` DEFAULT ${row.column_default}` : '';
          schemaInfo += `- ${columnName} (${dataType})${isNullable}${columnDefault}\n`;
        }
      }
      
      // Add some data volume info
      const tableStats = await db.execute(sql`
        SELECT 
          'clients' as table_name, 
          COUNT(*) as row_count 
        FROM clients 
        WHERE tenant_id = ${tenantId}
        
        UNION ALL
        
        SELECT 
          'invoices' as table_name, 
          COUNT(*) as row_count 
        FROM invoices 
        WHERE tenant_id = ${tenantId}
        
        UNION ALL
        
        SELECT 
          'accounts' as table_name, 
          COUNT(*) as row_count 
        FROM accounts 
        WHERE tenant_id = ${tenantId}
        
        UNION ALL
        
        SELECT 
          'journal_entries' as table_name, 
          COUNT(*) as row_count 
        FROM journal_entries 
        WHERE tenant_id = ${tenantId}
      `);
      
      if (tableStats && tableStats.rows && tableStats.rows.length > 0) {
        schemaInfo += "\nDATA VOLUME:\n";
        for (const row of tableStats.rows) {
          const tableName = String(row.table_name || '');
          const rowCount = String(row.row_count || '0');
          schemaInfo += `- ${tableName}: ${rowCount} rows\n`;
        }
      }
    } catch (error) {
      console.error("Error generating schema information:", error);
      schemaInfo = "Error generating schema information.";
    }
    
    // Step 4: Generate a sample query based on the user's request for context
    let sqlQuery = "";
    let queryData = null;
    
    try {
      // Generate a relevant SQL query based on the user's query
      // This is a simplified version - in a production app, this would be more sophisticated
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes("revenue") || lowerQuery.includes("income") || lowerQuery.includes("sales")) {
        sqlQuery = `
          SELECT 
            TO_CHAR(created_at, 'YYYY-MM') as month,
            SUM(total_amount) as total_revenue,
            COUNT(*) as invoice_count,
            AVG(total_amount) as average_invoice
          FROM invoices
          WHERE tenant_id = ${tenantId}
          GROUP BY TO_CHAR(created_at, 'YYYY-MM')
          ORDER BY month DESC
          LIMIT 12;
        `;
      } else if (lowerQuery.includes("client") || lowerQuery.includes("customer")) {
        sqlQuery = `
          SELECT 
            c.name as client_name,
            COUNT(i.id) as invoice_count,
            SUM(i.total_amount) as total_billed,
            AVG(i.total_amount) as average_invoice,
            MAX(i.created_at) as last_invoice_date
          FROM clients c
          LEFT JOIN invoices i ON c.id = i.client_id AND i.tenant_id = ${tenantId}
          WHERE c.tenant_id = ${tenantId}
          GROUP BY c.id, c.name
          ORDER BY total_billed DESC NULLS LAST;
        `;
      } else if (lowerQuery.includes("profit") || lowerQuery.includes("loss") || lowerQuery.includes("p&l")) {
        sqlQuery = `
          SELECT 
            TO_CHAR(je.entry_date, 'YYYY-MM') as month,
            SUM(CASE WHEN a.account_type = 'revenue' THEN jei.credit_amount - jei.debit_amount ELSE 0 END) as revenue,
            SUM(CASE WHEN a.account_type = 'expense' THEN jei.debit_amount - jei.credit_amount ELSE 0 END) as expenses,
            SUM(CASE WHEN a.account_type = 'revenue' THEN jei.credit_amount - jei.debit_amount 
                    WHEN a.account_type = 'expense' THEN -(jei.debit_amount - jei.credit_amount)
                    ELSE 0 END) as profit
          FROM journal_entries je
          JOIN journal_entry_items jei ON je.id = jei.journal_entry_id AND jei.tenant_id = ${tenantId}
          JOIN accounts a ON jei.account_id = a.id AND a.tenant_id = ${tenantId}
          WHERE je.tenant_id = ${tenantId}
            AND a.account_type IN ('revenue', 'expense')
          GROUP BY TO_CHAR(je.entry_date, 'YYYY-MM')
          ORDER BY month DESC;
        `;
      } else if (lowerQuery.includes("task") || lowerQuery.includes("todo") || lowerQuery.includes("assignment")) {
        sqlQuery = `
          SELECT 
            t.name as task_name,
            u.display_name as assignee,
            ts.name as status,
            t.due_date,
            c.name as client_name
          FROM tasks t
          LEFT JOIN users u ON t.assignee_id = u.id AND u.tenant_id = ${tenantId}
          LEFT JOIN task_statuses ts ON t.status_id = ts.id AND ts.tenant_id = ${tenantId}
          LEFT JOIN clients c ON t.client_id = c.id AND c.tenant_id = ${tenantId}
          WHERE t.tenant_id = ${tenantId}
          ORDER BY t.due_date ASC NULLS LAST
          LIMIT 20;
        `;
      }
      
      // Execute the SQL query if one was generated
      if (sqlQuery) {
        console.log("Executing SQL query:", sqlQuery);
        queryData = await db.execute(sql.raw(sqlQuery));
        console.log("Query returned rows:", queryData?.rows?.length || 0);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error executing SQL query:", error);
      sqlQuery = `Error executing query: ${errorMessage}`;
      // Continue without the SQL data
    }
    
    // Step 5: Prepare the prompt for the AI
    const prompt = `
User query: ${query}

Database schema information:
${schemaInfo}

Context information about the tenant:
${contextData}

${sqlQuery ? `
SQL Query that was executed:
${sqlQuery}
` : ''}

${queryData ? `
SQL Query Result:
${JSON.stringify(queryData, null, 2)}
` : ''}

tenant_id for this user: ${tenantId}

Instructions:
1. Always filter any SQL queries by tenant_id=${tenantId} to ensure data isolation
2. Generate SQL queries as needed to explore different aspects of the data
3. Provide a comprehensive analysis of the available data to address the user's query
4. If the data is insufficient, explain what data would be needed to give a better answer
5. Format the response with well-structured HTML tags (h2, p, ul, li, etc.)
6. Include charts where data is suitable for visualization
`;

    // Step 5: Call the OpenAI API
    console.log("Calling AI service to generate report...");
    const aiResponse = await queryAI(
      aiConfig.provider, 
      aiConfig.apiKey,
      aiConfig.model,
      [{ role: "user", content: prompt }],
      REPORT_SYSTEM_PROMPT
    );
    
    if (!aiResponse.choices || aiResponse.choices.length === 0) {
      throw new Error("AI service returned an empty response");
    }
    
    // Step 6: Parse the AI response
    const content = aiResponse.choices[0].message.content;
    let reportData: ReportData;
    
    try {
      // Check if the content is wrapped in a markdown code block
      let jsonContent = content;
      
      // If it's wrapped in a markdown code block, extract just the JSON
      if (content.trim().startsWith('```') && content.trim().endsWith('```')) {
        const jsonStartIndex = content.indexOf('{');
        const jsonEndIndex = content.lastIndexOf('}') + 1;
        
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
          jsonContent = content.substring(jsonStartIndex, jsonEndIndex);
          console.log("Extracted JSON from markdown:", jsonContent);
        }
      }
      
      // Try to parse as JSON
      reportData = JSON.parse(jsonContent);
      
      // Add the SQL query and raw data if available
      if (sqlQuery) {
        reportData.sql = sqlQuery;
      }
      
      if (queryData) {
        reportData.rawData = queryData;
      }
    } catch (error) {
      console.error("Error parsing AI response as JSON:", error);
      
      // If parsing fails, format as a basic text report
      reportData = {
        text: content,
        processingTimeMs: Date.now() - startTime
      };
    }
    
    // Step 7: Log the AI interaction
    try {
      await db.execute(sql`
        INSERT INTO ai_interactions (
          tenant_id, user_id, timestamp, user_query, ai_response, 
          provider, model, processing_time_ms
        ) VALUES (
          ${tenantId}, ${userId}, ${new Date()}, ${query}, 
          ${JSON.stringify(reportData)}, ${aiConfig.provider}, 
          ${aiConfig.model}, ${Date.now() - startTime}
        )
      `);
    } catch (err) {
      // Just log the error, but continue to return the report
      console.warn("Failed to log AI interaction:", err);
    }
    
    // Set the processing time
    reportData.processingTimeMs = Date.now() - startTime;
    
    return reportData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error generating report: ${errorMessage}`);
    
    // Return a basic error report
    return {
      text: `<div class="text-red-500"><h2>Error Generating Report</h2><p>${errorMessage}</p><p>Please try a different query or contact support if the problem persists.</p></div>`,
      processingTimeMs: Date.now() - startTime
    };
  }
}