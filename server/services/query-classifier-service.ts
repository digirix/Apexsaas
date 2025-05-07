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
 * List of terms that strongly indicate general knowledge questions
 */
const GENERAL_KNOWLEDGE_TERMS = [
  // Common general knowledge questions
  'history', 'science', 'politics', 'technology', 'culture', 'religion',
  'world', 'universe', 'space', 'earth', 'ocean', 'mountain', 'animal', 'plant',
  'country', 'government', 'war', 'peace', 'invention', 'discovery',
  'language', 'art', 'music', 'movie', 'book', 'literature', 'author',
  'disease', 'medicine', 'treatment', 'cure', 'health', 'exercise',
  'programming', 'code', 'algorithm', 'computer', 'internet', 'website',
  'cryptocurrency', 'blockchain', 'bitcoin', 'ethereum', 'invest',
  // Philosophy and concepts
  'philosophy', 'ethics', 'moral', 'meaning', 'define', 'concept', 'theory',
  'idea', 'strategy', 'approach', 'method', 'technique',
  // Current events
  'news', 'current', 'latest', 'trend', 'event', 'recent',
  // Non-specific queries
  'best practice', 'general', 'common', 'typical', 'standard', 'example',
  'difference between', 'compare', 'versus', 'vs', 'unlike', 'similar'
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
  
  // Count general knowledge terms
  let generalKnowledgeTermsCount = 0;
  for (const term of GENERAL_KNOWLEDGE_TERMS) {
    if (lowerQuery.includes(term)) {
      generalKnowledgeTermsCount++;
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
  
  // Check for specific data references that indicate database queries
  const hasDatabaseReference = ['my', 'our', 'us', 'we', 'mine', 'tenant', 'show me', 'list', 'show', 'find'].some(term => 
    lowerQuery.startsWith(term) || lowerQuery.includes(` ${term} `)
  );
  
  // Check for explicit general knowledge indicators
  const hasExplicitGeneralIndicator = lowerQuery.includes('in general') || 
    lowerQuery.includes('generally speaking') || 
    lowerQuery.includes('tell me about') ||
    lowerQuery.includes('what is') ||
    lowerQuery.includes('how does') ||
    lowerQuery.includes('explain') ||
    !lowerQuery.includes('my') && !lowerQuery.includes('our') && (
      lowerQuery.includes('difference between') || 
      lowerQuery.includes('vs') || 
      lowerQuery.includes('versus') ||
      lowerQuery.includes('compared to')
    );
  
  // Calculate confidence scores
  const dbTermRatio = dbTermsFound.length / (words.length || 1);
  const dbConfidence = Math.min(0.9, dbTermsFound.length > 0 ? 0.3 + (dbTermRatio * 0.7) : 0);
  const generalConfidence = hasExplicitGeneralIndicator || 
    (hasQuestionTerm && dbTermsFound.length === 0) || 
    generalKnowledgeTermsCount > 0 ? 0.8 : 0.2;
  
  // Apply rules for classification
  let type: 'database' | 'general' | 'hybrid';
  let confidence: number;
  
  // Strong signals for general knowledge
  if (
    generalKnowledgeTermsCount >= 2 || 
    (hasExplicitGeneralIndicator && dbTermsFound.length === 0) ||
    (hasQuestionTerm && generalKnowledgeTermsCount > 0 && dbTermsFound.length === 0)
  ) {
    type = 'general';
    confidence = 0.85;
  }
  // Strong signals for database queries
  else if (hasDatabaseReference || dbTermsFound.length >= 2) {
    type = 'database';
    confidence = Math.max(0.65, dbConfidence);
  }
  // Hybrid case - some database terms mixed with general question format
  else if (dbTermsFound.length > 0 && (hasQuestionTerm || generalKnowledgeTermsCount > 0)) {
    type = 'hybrid';
    confidence = 0.75;
  }
  // Default to general if it looks like a question without database terms
  else if (dbTermsFound.length === 0 && hasQuestionTerm) {
    type = 'general';
    confidence = generalConfidence;
  }
  // Fallback classification based on term counts
  else {
    // More likely to be general if no clear database terms found
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