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
Your job is to generate insightful, accurate reports from the user's financial data.

When answering queries:
1. Generate clear, concise text explanations of the data
2. Include charts where appropriate to visualize the data
3. Provide only factual information based on the data provided
4. Format monetary values appropriately (e.g., $1,234.56)
5. Keep explanations professional but easy to understand
6. Always cite specific data points to support your analysis

IMPORTANT RESPONSE FORMAT INSTRUCTIONS:
Respond with a JSON object containing the following fields:
- text: The text explanation of the report in HTML format (you can use simple formatting like <h2>, <p>, <ul>, <li>, <b>, <i>, etc.)
- charts: An array of chart objects, each containing:
  - type: "bar", "line", or "pie"
  - title: The chart title
  - data: The data to display in the chart
  - xAxis: (for bar/line charts) Object with { dataKey: "fieldName" }
  - series: (for bar/line charts) Array of objects with { dataKey: "fieldName", color: "#hexcolor" }
  - dataKey: (for pie charts) The data field representing the value
  - category: (for pie charts) The data field representing the category
  - colors: (for pie charts) Optional array of colors
- rawData: Optional raw data used for the report
- sql: Optional SQL query used to retrieve the data

Example:
{
  "text": "<h2>Revenue Analysis</h2><p>Total revenue for Q2 was <b>$45,678.90</b>, representing a <b>12%</b> increase over Q1...</p>",
  "charts": [
    {
      "type": "bar",
      "title": "Revenue by Month",
      "data": [{"month": "Jan", "value": 12000}, {"month": "Feb", "value": 15000}],
      "xAxis": {"dataKey": "month"},
      "series": [{"dataKey": "value", "color": "#3B82F6"}]
    },
    {
      "type": "pie",
      "title": "Revenue by Category",
      "data": [{"name": "Services", "value": 60}, {"name": "Products", "value": 40}],
      "dataKey": "value",
      "category": "name",
      "colors": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"]
    }
  ]
}
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
    
    // Step 3: Generate SQL query if appropriate
    // For demonstration, we'll generate a simple query for revenue data
    // In a real implementation, this would be more complex and driven by the user's query
    let sqlQuery = "";
    let queryData = null;
    
    if (
      query.toLowerCase().includes("revenue") ||
      query.toLowerCase().includes("income") ||
      query.toLowerCase().includes("sales")
    ) {
      sqlQuery = `
        SELECT 
          TO_CHAR(i.created_at, 'YYYY-MM') as month,
          SUM(i.total_amount) as total_revenue,
          COUNT(*) as invoice_count,
          AVG(i.total_amount) as average_invoice
        FROM invoices i
        WHERE i.tenant_id = ${tenantId}
        GROUP BY TO_CHAR(i.created_at, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12;
      `;
      
      // Execute the SQL query
      try {
        queryData = await db.execute(sql.raw(sqlQuery));
      } catch (err) {
        console.error("Error executing SQL query:", err);
        // Continue without the SQL data
      }
    }
    
    // Step 4: Prepare the prompt for the AI
    const prompt = `
User query: ${query}

Context information about the tenant:
${contextData}

${queryData ? `
SQL Query Result:
${JSON.stringify(queryData, null, 2)}
` : ''}

Please analyze this data and provide a comprehensive report addressing the user's query.
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