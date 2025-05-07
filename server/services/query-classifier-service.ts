/**
 * This service classifies user queries to determine if they should be answered
 * using database-specific information or general AI knowledge
 */

/**
 * Query classification result
 */
export interface QueryClassification {
  type: 'database' | 'general' | 'hybrid';
  confidence: number;
  databaseTerms: string[];
  isAboutApplicationFeatures: boolean;
}

/**
 * List of terms that indicate a database-specific query
 */
const DATABASE_TERMS = [
  // Accounting terms
  'account', 'ledger', 'journal', 'entry', 'coa', 'chart of accounts',
  'invoice', 'payment', 'bill', 'transaction', 'reconcile', 'reconciliation',
  'asset', 'liability', 'equity', 'revenue', 'expense', 'profit', 'loss',
  'balance sheet', 'income statement', 'cash flow', 'statement',
  'debit', 'credit', 'tax', 'depreciation', 'amortization', 'accrual',
  'fiscal', 'budget', 'forecast', 'variance', 'gl', 'general ledger',
  
  // Client/Entity terms
  'client', 'customer', 'entity', 'vendor', 'supplier', 'partner',
  
  // Task/Project terms
  'task', 'todo', 'assignment', 'deadline', 'due', 'project', 'milestone',
  
  // User/Team terms
  'user', 'staff', 'employee', 'team', 'department', 'role', 'permission',
  
  // Analysis terms
  'report', 'summary', 'analysis', 'analytics', 'insight', 'calculate',
  'performance', 'metric', 'kpi', 'trend', 'growth', 'compare', 'comparison',
  'average', 'total', 'sum', 'count', 'compute',
  
  // Specific data references
  'my', 'our', 'mine', 'tenant', 'firm', 'company', 'business',
  'dashboard', 'report', 'overview', 'setup', 'settings'
];

/**
 * Application feature terms that might indicate questions about the platform itself
 */
const APP_FEATURE_TERMS = [
  'feature', 'module', 'function', 'capability', 'option', 'setting',
  'dashboard', 'report', 'export', 'import', 'upload', 'download',
  'edit', 'update', 'delete', 'create', 'add', 'remove', 'configure',
  'customize', 'permission', 'access', 'screen', 'page', 'view',
  'navigate', 'find', 'search', 'filter', 'sort', 'menu', 'sidebar',
  'logout', 'login', 'password', 'profile', 'account', 'user', 'notification',
  'setup', 'wizard', 'guide', 'tutorial', 'help', 'ai', 'assistant', 'chatbot'
];

/**
 * Determines if a query is about the tenant's database or requires general knowledge
 * @param query The user query to classify
 * @returns Classification result
 */
export function classifyQuery(query: string): QueryClassification {
  const lowerQuery = query.toLowerCase().trim();
  const words = lowerQuery.split(/\s+/);
  
  // Count database-related terms in the query
  const dbTermsFound: string[] = [];
  for (const term of DATABASE_TERMS) {
    if (lowerQuery.includes(term)) {
      dbTermsFound.push(term);
    }
  }
  
  // Check for application feature terms
  const appFeatureTermsCount = APP_FEATURE_TERMS.filter(term => 
    lowerQuery.includes(term)
  ).length;
  
  // Check for question terms (typically general knowledge queries often start with these)
  const hasQuestionTerm = ['what', 'when', 'where', 'who', 'how', 'why', 'can', 'could', 'would', 'should', 'is', 'are', 'explain', 'tell me about', 'define'].some(term => 
    lowerQuery.startsWith(term) || lowerQuery.includes(` ${term} `)
  );
  
  // Check for specific data references
  const hasDatabaseReference = ['my', 'our', 'us', 'we', 'mine', 'tenant', 'show me', 'list'].some(term => 
    lowerQuery.startsWith(term) || lowerQuery.includes(` ${term} `)
  );
  
  // Calculate confidence scores
  const dbTermRatio = dbTermsFound.length / words.length;
  const dbConfidence = Math.min(0.9, dbTermsFound.length > 0 ? 0.3 + (dbTermRatio * 0.7) : 0);
  const generalConfidence = hasQuestionTerm && dbTermsFound.length === 0 ? 0.8 : 0.2;
  
  // Apply rules for classification
  let type: 'database' | 'general' | 'hybrid';
  let confidence: number;
  
  if (hasDatabaseReference || dbTermsFound.length >= 2) {
    type = 'database';
    confidence = Math.max(0.65, dbConfidence);
  } else if (dbTermsFound.length > 0 && hasQuestionTerm) {
    type = 'hybrid';
    confidence = 0.75;
  } else if (dbTermsFound.length === 0 && hasQuestionTerm) {
    type = 'general';
    confidence = generalConfidence;
  } else {
    // Default to database if we can't determine confidently
    type = dbTermsFound.length > 0 ? 'database' : 'general';
    confidence = 0.5;
  }
  
  // Check for application feature questions
  const isAboutApplicationFeatures = appFeatureTermsCount >= 2 || 
    (appFeatureTermsCount >= 1 && hasQuestionTerm);
  
  return {
    type,
    confidence,
    databaseTerms: dbTermsFound,
    isAboutApplicationFeatures
  };
}