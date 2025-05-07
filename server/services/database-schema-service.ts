import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Service to provide comprehensive database schema information and relationships
 * This gives the AI much deeper insight into the database structure
 */
export interface TableRelationship {
  constraintName: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

export interface TableColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  description: string | null;
}

export interface TableInfo {
  name: string;
  columns: TableColumn[];
  primaryKey: string[];
  foreignKeys: TableRelationship[];
  referencedBy: TableRelationship[];
}

export interface SchemaInfo {
  tables: Record<string, TableInfo>;
  relationships: TableRelationship[];
  tableStats: Record<string, number>;
}

/**
 * Get comprehensive schema information about the database
 */
export async function getFullDatabaseSchema(tenantId: number): Promise<SchemaInfo> {
  try {
    // Initialize the schema info
    const schemaInfo: SchemaInfo = {
      tables: {},
      relationships: [],
      tableStats: {}
    };

    // Get all tables in the public schema
    const tablesResult = await db.execute(sql`
      SELECT 
        table_name 
      FROM 
        information_schema.tables 
      WHERE 
        table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY 
        table_name;
    `);

    const tables = tablesResult.rows.map(row => String(row.table_name));

    // For each table, get its columns
    for (const tableName of tables) {
      const columnsResult = await db.execute(sql`
        SELECT 
          column_name, 
          data_type,
          is_nullable,
          column_default,
          col_description(
            (table_schema || '.' || table_name)::regclass::oid, 
            ordinal_position
          ) as description
        FROM 
          information_schema.columns c
        WHERE 
          table_schema = 'public'
          AND table_name = ${tableName}
        ORDER BY 
          ordinal_position;
      `);

      const columns: TableColumn[] = columnsResult.rows.map(row => ({
        name: String(row.column_name),
        dataType: String(row.data_type),
        isNullable: row.is_nullable === 'YES',
        defaultValue: row.column_default ? String(row.column_default) : null,
        description: row.description ? String(row.description) : null
      }));

      // Get primary key
      const pkResult = await db.execute(sql`
        SELECT 
          a.attname as column_name
        FROM 
          pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE 
          i.indrelid = ${tableName}::regclass
          AND i.indisprimary;
      `);

      const primaryKey = pkResult.rows.map(row => String(row.column_name));

      schemaInfo.tables[tableName] = {
        name: tableName,
        columns,
        primaryKey,
        foreignKeys: [],
        referencedBy: []
      };
    }

    // Get all relationships (foreign keys)
    const relationshipsResult = await db.execute(sql`
      SELECT
        tc.constraint_name,
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name as target_table,
        ccu.column_name as target_column
      FROM
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public';
    `);

    // Process relationships
    for (const row of relationshipsResult.rows) {
      const relationship: TableRelationship = {
        constraintName: String(row.constraint_name),
        sourceTable: String(row.source_table),
        sourceColumn: String(row.source_column),
        targetTable: String(row.target_table),
        targetColumn: String(row.target_column)
      };

      schemaInfo.relationships.push(relationship);

      // Add to the source table's foreign keys
      if (schemaInfo.tables[relationship.sourceTable]) {
        schemaInfo.tables[relationship.sourceTable].foreignKeys.push(relationship);
      }

      // Add to the target table's referenced by list
      if (schemaInfo.tables[relationship.targetTable]) {
        schemaInfo.tables[relationship.targetTable].referencedBy.push(relationship);
      }
    }

    // Get count of records in each table
    for (const tableName of tables) {
      if (tableName === 'tenant_settings' || 
          tableName === 'tenants' || 
          tableName === 'schema_migrations') {
        continue; // Skip these tables
      }
      
      // Check if this table has a tenant_id column
      const hasTenantColumn = schemaInfo.tables[tableName]?.columns.some(
        col => col.name === 'tenant_id'
      );

      if (hasTenantColumn) {
        try {
          const countResult = await db.execute(sql.raw(
            `SELECT COUNT(*) as count FROM "${tableName}" WHERE tenant_id = ${tenantId}`
          ));
          
          if (countResult && countResult.rows && countResult.rows.length > 0) {
            schemaInfo.tableStats[tableName] = parseInt(countResult.rows[0].count, 10) || 0;
          }
        } catch (error) {
          console.warn(`Error getting count for table ${tableName}:`, error);
          schemaInfo.tableStats[tableName] = -1; // Error indicator
        }
      }
    }

    return schemaInfo;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error retrieving database schema:", error);
    throw new Error(`Failed to retrieve database schema: ${errorMessage}`);
  }
}

/**
 * Generate SQL Explorer context for AI based on database schema
 */
export async function generateDatabaseContext(tenantId: number): Promise<string> {
  try {
    const schema = await getFullDatabaseSchema(tenantId);
    
    let context = `DATABASE SCHEMA FOR TENANT ${tenantId}:\n\n`;
    
    // Add table information
    context += "TABLES:\n";
    for (const [tableName, tableInfo] of Object.entries(schema.tables)) {
      // Skip system tables
      if (tableName.startsWith('pg_') || 
          tableName === 'schema_migrations' || 
          tableName === 'drizzle') {
        continue;
      }
      
      context += `\n--- TABLE: ${tableName} ---\n`;
      
      // Add primary key info
      if (tableInfo.primaryKey.length > 0) {
        context += `Primary Key: ${tableInfo.primaryKey.join(', ')}\n`;
      }
      
      // Add columns
      context += "Columns:\n";
      for (const column of tableInfo.columns) {
        let columnInfo = `- ${column.name} (${column.dataType})`;
        if (!column.isNullable) columnInfo += " NOT NULL";
        if (column.defaultValue) columnInfo += ` DEFAULT ${column.defaultValue}`;
        context += `${columnInfo}\n`;
      }
      
      // Add foreign keys
      if (tableInfo.foreignKeys.length > 0) {
        context += "Foreign Keys:\n";
        for (const fk of tableInfo.foreignKeys) {
          context += `- ${fk.sourceColumn} → ${fk.targetTable}.${fk.targetColumn}\n`;
        }
      }
      
      // Add stats
      if (schema.tableStats[tableName] !== undefined) {
        const count = schema.tableStats[tableName];
        context += `Records for this tenant: ${count >= 0 ? count : 'Unknown'}\n`;
      }
    }
    
    // Add relationship information for better context
    context += "\n\nKEY RELATIONSHIPS:\n";
    
    // Identify important relationships
    const coreRelationships = schema.relationships.filter(rel => 
      !rel.sourceTable.includes('_settings') && 
      !rel.targetTable.includes('_settings')
    );
    
    // Group by source table
    const relationshipsBySource: Record<string, TableRelationship[]> = {};
    for (const rel of coreRelationships) {
      if (!relationshipsBySource[rel.sourceTable]) {
        relationshipsBySource[rel.sourceTable] = [];
      }
      relationshipsBySource[rel.sourceTable].push(rel);
    }
    
    // Format relationships nicely
    for (const [sourceTable, relationships] of Object.entries(relationshipsBySource)) {
      context += `\n${sourceTable} relationships:\n`;
      for (const rel of relationships) {
        context += `- ${sourceTable}.${rel.sourceColumn} references ${rel.targetTable}.${rel.targetColumn}\n`;
      }
    }
    
    // Add special notes about tenant data isolation
    context += "\n\nIMPORTANT DATA ISOLATION NOTES:\n";
    context += "- ALWAYS filter queries by tenant_id = " + tenantId + " to ensure data isolation\n";
    context += "- Most tables have a tenant_id column that should be used for filtering\n";
    context += "- When joining tables, ensure tenant_id filtering applies to all tables in the query\n";
    
    return context;
  } catch (error) {
    console.error("Error generating database context:", error);
    return "Error generating database context: " + error.message;
  }
}

/**
 * Get a list of sample queries customized for the tenant's specific data
 */
export async function getSampleQueriesForTenant(tenantId: number): Promise<string[]> {
  const schema = await getFullDatabaseSchema(tenantId);
  const sampleQueries: string[] = [];
  
  // Check which tables have data
  const tablesWithData = Object.entries(schema.tableStats)
    .filter(([_, count]) => count > 0)
    .map(([tableName]) => tableName);
  
  // Sample client query
  if (tablesWithData.includes('clients')) {
    sampleQueries.push(`
      -- Get all clients with their contact information
      SELECT id, name, email, phone 
      FROM clients 
      WHERE tenant_id = ${tenantId}
      ORDER BY name;
    `);
  }
  
  // Sample invoice query
  if (tablesWithData.includes('invoices')) {
    sampleQueries.push(`
      -- Get recent invoices with client name
      SELECT 
        i.id, i.invoice_number, i.total_amount, i.status, i.created_at,
        c.name as client_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.id AND c.tenant_id = ${tenantId}
      WHERE i.tenant_id = ${tenantId}
      ORDER BY i.created_at DESC
      LIMIT 10;
    `);
  }
  
  // Sample journal entries query
  if (tablesWithData.includes('journal_entries') && tablesWithData.includes('journal_entry_items')) {
    sampleQueries.push(`
      -- Get journal entries with line items
      SELECT 
        je.id, je.reference, je.entry_date, je.description,
        jei.account_id, a.account_name, jei.debit_amount, jei.credit_amount
      FROM journal_entries je
      JOIN journal_entry_items jei ON je.id = jei.journal_entry_id AND jei.tenant_id = ${tenantId}
      JOIN accounts a ON jei.account_id = a.id AND a.tenant_id = ${tenantId}
      WHERE je.tenant_id = ${tenantId}
      ORDER BY je.entry_date DESC, je.id, jei.id
      LIMIT 20;
    `);
  }
  
  // Sample tasks query
  if (tablesWithData.includes('tasks')) {
    sampleQueries.push(`
      -- Get tasks by status
      SELECT 
        t.id, t.name, t.due_date, t.status_id, ts.name as status_name,
        u.display_name as assignee
      FROM tasks t
      LEFT JOIN task_statuses ts ON t.status_id = ts.id AND ts.tenant_id = ${tenantId}
      LEFT JOIN users u ON t.assignee_id = u.id AND u.tenant_id = ${tenantId}
      WHERE t.tenant_id = ${tenantId}
      ORDER BY t.due_date ASC NULLS LAST
      LIMIT 15;
    `);
  }
  
  return sampleQueries;
}