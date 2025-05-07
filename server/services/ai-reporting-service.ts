import { db } from '../db';
import { queryAI } from './ai-service';
import { fetchTenantDataForQuery } from './chatbot-data-service';
import { sql } from 'drizzle-orm';
import { generateDatabaseContext, getSampleQueriesForTenant } from './database-schema-service';
import { answerQuestionWithDatabaseInsights } from './ai-query-assistant';

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
    
    // Step 2: Use the enhanced database services to get comprehensive schema information
    console.log("Generating comprehensive database context...");
    const dbContext = await generateDatabaseContext(tenantId);
    
    // Step 3: Fetch relevant tenant data for the query
    console.log("Fetching relevant tenant data for the query...");
    const contextData = await fetchTenantDataForQuery(tenantId, query);
    
    // Step 4: Use the AI Query Assistant to generate, execute, and analyze SQL
    console.log("Using AI Query Assistant to handle the database query...");
    let queryInsights;
    let sqlQuery = "";
    let queryData = null;
    
    try {
      // This is a powerful end-to-end process that:
      // 1. Generates appropriate SQL based on the natural language query
      // 2. Executes the SQL with proper tenant isolation
      // 3. Analyzes the results to extract insights
      queryInsights = await answerQuestionWithDatabaseInsights(
        tenantId,
        userId,
        query,
        aiConfig
      );
      
      // Extract the SQL and data for our report
      sqlQuery = queryInsights.sql;
      queryData = queryInsights.data;
      
      console.log("AI Query Assistant results:", {
        sqlGenerated: !!sqlQuery,
        dataReturned: !!queryData,
        rowCount: queryData?.rows?.length || 0,
        error: queryInsights.error || null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error using AI Query Assistant:", error);
      sqlQuery = `Error executing query: ${errorMessage}`;
      // Continue without the SQL data
    }
    
    // Step 5: Prepare the enhanced prompt for the AI with our comprehensive database context
    const prompt = `
User query: ${query}

Comprehensive Database Context:
${dbContext}

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

${queryInsights?.analysis ? `
Analysis of the data:
${queryInsights.analysis}
` : ''}

tenant_id for this user: ${tenantId}

Instructions:
1. Always filter any SQL queries by tenant_id=${tenantId} to ensure data isolation
2. The SQL query and data above were generated based on the user's question - use this data as the foundation for your report
3. Provide a comprehensive analysis of the available data to address the user's query
4. Format the response with well-structured HTML tags (h2, p, ul, li, etc.)
5. Include charts where data is suitable for visualization
6. If the query returned useful data, focus on extracting insights from that data
7. If the data is insufficient or the query failed, explain what data would be needed to give a better answer
`;

    // Step 6: Call the AI service to generate the final report
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