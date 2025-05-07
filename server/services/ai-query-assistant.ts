import { db } from '../db';
import { sql } from 'drizzle-orm';
import { queryAI } from './ai-service';
import { generateDatabaseContext, getSampleQueriesForTenant } from './database-schema-service';

/**
 * AI Query Assistant - Helps the AI generate, validate, and execute SQL queries
 * This gives the AI the ability to dynamically query the database based on natural language requests
 */

interface QueryResult {
  sql: string;
  data: any;
  error?: string;
}

/**
 * Generate SQL for a natural language query using AI
 */
export async function generateSqlFromQuestion(
  tenantId: number,
  userId: number,
  question: string,
  aiConfig: { provider: string, apiKey: string, model: string }
): Promise<string> {
  try {
    // Get database context
    const dbContext = await generateDatabaseContext(tenantId);
    const sampleQueries = await getSampleQueriesForTenant(tenantId);
    
    // Prepare system prompt
    const systemPrompt = `
You are an expert SQL query generator for a multi-tenant accounting platform.
Your task is to convert natural language questions into precise SQL queries.

IMPORTANT REQUIREMENTS:
1. ALWAYS filter by tenant_id = ${tenantId} to ensure data isolation
2. Use only SELECT statements - never INSERT, UPDATE, DELETE, DROP, ALTER, or any other DML/DDL
3. For complex analytical queries, use appropriate aggregations and joins
4. When creating financial reports, respect accounting principles
5. Format the output as a single SQL query with no other text
6. Use aliases for readability (e.g., "client_name" instead of "name")
7. Include appropriate JOINs to connect related tables
8. Include ORDER BY clauses where appropriate
9. Use LIMIT clauses to avoid excessive results, typically 50-100 rows

The query will be executed against a PostgreSQL database.
Return ONLY the SQL query with no explanations or markdown formatting.
`;

    // Prepare user prompt
    const userPrompt = `
I need an SQL query for the following question: "${question}"

Database context:
${dbContext}

Sample queries for reference:
${sampleQueries.join('\n\n')}

IMPORTANT: Remember to:
- ALWAYS filter by tenant_id = ${tenantId}
- Include all necessary joins with proper tenant_id filtering
- Return only the SQL query with no explanations
`;

    // Call AI to generate SQL
    const response = await queryAI(
      aiConfig.provider,
      aiConfig.apiKey,
      aiConfig.model,
      [{ role: "user", content: userPrompt }],
      systemPrompt
    );

    if (!response.choices || response.choices.length === 0) {
      throw new Error("Failed to generate SQL query");
    }

    let sqlQuery = response.choices[0].message.content.trim();
    
    // Remove SQL code block markers if present
    if (sqlQuery.startsWith('```sql')) {
      sqlQuery = sqlQuery.substring(6);
    } else if (sqlQuery.startsWith('```')) {
      sqlQuery = sqlQuery.substring(3);
    }
    
    if (sqlQuery.endsWith('```')) {
      sqlQuery = sqlQuery.substring(0, sqlQuery.length - 3);
    }
    
    sqlQuery = sqlQuery.trim();
    
    // Safety check: ensure query is read-only
    const lowerQuery = sqlQuery.toLowerCase();
    if (
      lowerQuery.includes('insert ') ||
      lowerQuery.includes('update ') ||
      lowerQuery.includes('delete ') ||
      lowerQuery.includes('drop ') ||
      lowerQuery.includes('alter ') ||
      lowerQuery.includes('create ') ||
      lowerQuery.includes('truncate ')
    ) {
      throw new Error("Generated query contains prohibited operations");
    }
    
    // Safety check: ensure query includes tenant_id filter
    if (!lowerQuery.includes(`tenant_id = ${tenantId}`) && 
        !lowerQuery.includes(`tenant_id=${tenantId}`)) {
      throw new Error("Generated query does not contain required tenant isolation");
    }

    return sqlQuery;
  } catch (error) {
    console.error("Error generating SQL from question:", error);
    throw error;
  }
}

/**
 * Execute a generated SQL query
 */
export async function executeGeneratedQuery(query: string): Promise<QueryResult> {
  try {
    // Execute the query
    const result = await db.execute(sql.raw(query));
    
    return {
      sql: query,
      data: result
    };
  } catch (error) {
    console.error("Error executing generated query:", error);
    return {
      sql: query,
      data: null,
      error: error.message
    };
  }
}

/**
 * Analyze query result using AI to provide insights
 */
export async function analyzeQueryResult(
  tenantId: number,
  question: string,
  queryResult: QueryResult,
  aiConfig: { provider: string, apiKey: string, model: string }
): Promise<string> {
  try {
    // Prepare system prompt
    const systemPrompt = `
You are an expert financial data analyst for an accounting platform.
Your task is to analyze SQL query results and provide insightful observations.

When analyzing the data:
1. Identify significant patterns, trends, or anomalies
2. Explain the financial implications of the findings
3. Provide concise, actionable insights
4. Use accounting terminology correctly
5. Format monetary values appropriately (e.g., $1,234.56)
6. Stick to facts present in the data without speculation

Format your response as a concise analysis with:
- A brief summary of the data
- Key observations (2-5 points)
- Any recommended follow-up questions
`;

    // Limit data size to avoid token limits
    let resultData = queryResult.data;
    if (resultData?.rows?.length > 20) {
      resultData = {
        ...resultData,
        rows: resultData.rows.slice(0, 20),
        _truncated: true,
        _totalRows: resultData.rows.length
      };
    }

    // Prepare user prompt
    const userPrompt = `
User question: "${question}"

SQL Query:
${queryResult.sql}

Query Results:
${JSON.stringify(resultData, null, 2)}

Please provide an insightful analysis of these results.
`;

    // Call AI to analyze results
    const response = await queryAI(
      aiConfig.provider,
      aiConfig.apiKey,
      aiConfig.model,
      [{ role: "user", content: userPrompt }],
      systemPrompt
    );

    if (!response.choices || response.choices.length === 0) {
      throw new Error("Failed to analyze query results");
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error analyzing query results:", error);
    return "Error analyzing results: " + error.message;
  }
}

/**
 * End-to-end process to answer a question with database insights
 */
export async function answerQuestionWithDatabaseInsights(
  tenantId: number,
  userId: number,
  question: string,
  aiConfig: { provider: string, apiKey: string, model: string }
): Promise<{
  question: string;
  sql: string;
  data: any;
  analysis: string;
  error?: string;
}> {
  try {
    // Step 1: Generate SQL from question
    console.log(`Generating SQL for question: "${question}"`);
    const sqlQuery = await generateSqlFromQuestion(tenantId, userId, question, aiConfig);
    
    // Step 2: Execute the query
    console.log(`Executing generated SQL: ${sqlQuery}`);
    const queryResult = await executeGeneratedQuery(sqlQuery);
    
    // If there was an error executing the query
    if (queryResult.error) {
      return {
        question,
        sql: sqlQuery,
        data: null,
        analysis: `Error executing query: ${queryResult.error}`,
        error: queryResult.error
      };
    }
    
    // Step 3: Analyze the results
    console.log(`Analyzing query results (${queryResult.data?.rows?.length || 0} rows)`);
    const analysis = await analyzeQueryResult(tenantId, question, queryResult, aiConfig);
    
    return {
      question,
      sql: sqlQuery,
      data: queryResult.data,
      analysis
    };
  } catch (error) {
    console.error("Error answering question with database insights:", error);
    return {
      question,
      sql: error.message.includes("Generated query") ? error.message : "Error generating SQL",
      data: null,
      analysis: "Failed to answer question: " + error.message,
      error: error.message
    };
  }
}