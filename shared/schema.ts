import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, varchar, unique, pgEnum, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Module permissions access level enum
export const accessLevelEnum = pgEnum('access_level', ['full', 'partial', 'restricted']);

// User permissions table
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  module: text("module").notNull(), // clients, tasks, setup, users, etc.
  accessLevel: accessLevelEnum("access_level").notNull(),
  canCreate: boolean("can_create").default(false).notNull(),
  canRead: boolean("can_read").default(false).notNull(),
  canUpdate: boolean("can_update").default(false).notNull(),
  canDelete: boolean("can_delete").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userModuleUnique: unique().on(table.userId, table.module),
  };
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).pick({
  tenantId: true,
  userId: true,
  module: true,
  accessLevel: true,
  canCreate: true,
  canRead: true,
  canUpdate: true,
  canDelete: true,
});

// Tenants table
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTenantSchema = createInsertSchema(tenants).pick({
  name: true,
});

// Tenant Settings table
export const tenantSettings = pgTable("tenant_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantSettingKeyUnique: unique().on(table.tenantId, table.key),
  };
});

export const insertTenantSettingSchema = createInsertSchema(tenantSettings).pick({
  tenantId: true,
  key: true,
  value: true,
});

// Designations setup table
export const designations = pgTable("designations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantDesignationUnique: unique().on(table.tenantId, table.name),
  };
});

export const insertDesignationSchema = createInsertSchema(designations).pick({
  tenantId: true,
  name: true,
});

// Departments setup table
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantDepartmentUnique: unique().on(table.tenantId, table.name),
  };
});

export const insertDepartmentSchema = createInsertSchema(departments).pick({
  tenantId: true,
  name: true,
});

// Users table with tenant reference
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  username: text("username").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  designationId: integer("designation_id"),
  departmentId: integer("department_id"),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantUserUnique: unique().on(table.tenantId, table.email),
  };
});

export const insertUserSchema = createInsertSchema(users).pick({
  tenantId: true,
  username: true,
  email: true,
  password: true,
  displayName: true,
  designationId: true,
  departmentId: true,
  isSuperAdmin: true,
  isActive: true,
});

// Countries setup table
export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantCountryUnique: unique().on(table.tenantId, table.name),
  };
});

export const insertCountrySchema = createInsertSchema(countries).pick({
  tenantId: true,
  name: true,
});

// Currencies setup table
export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  countryId: integer("country_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantCurrencyUnique: unique().on(table.tenantId, table.code),
  };
});

export const insertCurrencySchema = createInsertSchema(currencies).pick({
  tenantId: true,
  countryId: true,
  code: true,
  name: true,
});

// States/provinces setup table
export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  countryId: integer("country_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantStateUnique: unique().on(table.tenantId, table.countryId, table.name),
  };
});

export const insertStateSchema = createInsertSchema(states).pick({
  tenantId: true,
  countryId: true,
  name: true,
});

// Entity types setup table
export const entityTypes = pgTable("entity_types", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  countryId: integer("country_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantEntityTypeUnique: unique().on(table.tenantId, table.countryId, table.name),
  };
});

export const insertEntityTypeSchema = createInsertSchema(entityTypes).pick({
  tenantId: true,
  countryId: true,
  name: true,
});

// Task statuses setup table
export const taskStatuses = pgTable("task_statuses", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  rank: doublePrecision("rank").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantStatusNameUnique: unique().on(table.tenantId, table.name),
    tenantStatusRankUnique: unique().on(table.tenantId, table.rank),
  };
});

export const insertTaskStatusSchema = createInsertSchema(taskStatuses).pick({
  tenantId: true,
  name: true,
  description: true,
  rank: true,
});

// Task status workflow rules table
export const taskStatusWorkflowRules = pgTable("task_status_workflow_rules", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  fromStatusId: integer("from_status_id").notNull(),
  toStatusId: integer("to_status_id").notNull(),
  isAllowed: boolean("is_allowed").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    workflowRuleUnique: unique().on(table.tenantId, table.fromStatusId, table.toStatusId),
  };
});

export const insertTaskStatusWorkflowRuleSchema = createInsertSchema(taskStatusWorkflowRules).pick({
  tenantId: true,
  fromStatusId: true,
  toStatusId: true,
  isAllowed: true,
});

// Tax jurisdictions setup table (for VAT/Sales Tax)
export const taxJurisdictions = pgTable("tax_jurisdictions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  countryId: integer("country_id").notNull(),
  stateId: integer("state_id"),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantTaxJurisdictionUnique: unique().on(table.tenantId, table.countryId, table.stateId ?? 0),
  };
});

export const insertTaxJurisdictionSchema = createInsertSchema(taxJurisdictions).pick({
  tenantId: true,
  countryId: true,
  stateId: true,
  name: true,
  description: true,
});

// Service types setup table
export const serviceTypes = pgTable("service_types", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  countryId: integer("country_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  currencyId: integer("currency_id").notNull(),
  rate: doublePrecision("rate").notNull(),
  billingBasis: text("billing_basis").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantServiceTypeUnique: unique().on(table.tenantId, table.countryId, table.name),
  };
});

export const insertServiceTypeSchema = createInsertSchema(serviceTypes).pick({
  tenantId: true,
  countryId: true,
  name: true,
  description: true,
  currencyId: true,
  rate: true,
  billingBasis: true,
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  mobile: text("mobile").notNull(),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantClientNameUnique: unique().on(table.tenantId, table.displayName),
    tenantClientEmailUnique: unique().on(table.tenantId, table.email),
    tenantClientMobileUnique: unique().on(table.tenantId, table.mobile),
  };
});

export const insertClientSchema = createInsertSchema(clients).pick({
  tenantId: true,
  displayName: true,
  email: true,
  mobile: true,
  status: true,
});

// Entities table (linked to clients)
export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(),
  countryId: integer("country_id").notNull(),
  stateId: integer("state_id"),
  address: text("address"),
  entityTypeId: integer("entity_type_id").notNull(),
  businessTaxId: text("business_tax_id"),
  isVatRegistered: boolean("is_vat_registered").default(false).notNull(),
  vatId: text("vat_id"),
  fileAccessLink: text("file_access_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantEntityUnique: unique().on(table.tenantId, table.clientId, table.name),
  };
});

export const insertEntitySchema = createInsertSchema(entities).pick({
  tenantId: true,
  clientId: true,
  name: true,
  countryId: true,
  stateId: true,
  address: true,
  entityTypeId: true,
  businessTaxId: true,
  isVatRegistered: true,
  vatId: true,
  fileAccessLink: true,
});

// Tasks table
// Table for Admin and Revenue Task Categories
export const taskCategories = pgTable("task_categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  isAdmin: boolean("is_admin").notNull(), // true for admin task categories, false for revenue
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantCategoryUnique: unique().on(table.tenantId, table.name, table.isAdmin),
  };
});

export const insertTaskCategorySchema = createInsertSchema(taskCategories).pick({
  tenantId: true,
  name: true,
  isAdmin: true,
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  isAdmin: boolean("is_admin").notNull(),
  taskType: text("task_type").notNull(), // Regular, Medium, Urgent
  clientId: integer("client_id"),
  entityId: integer("entity_id"),
  serviceTypeId: integer("service_type_id"),
  taskCategoryId: integer("task_category_id"),
  assigneeId: integer("assignee_id").notNull(),
  dueDate: timestamp("due_date").notNull(),
  statusId: integer("status_id").notNull(),
  taskDetails: text("task_details"),
  nextToDo: text("next_to_do"),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  // Compliance fields
  complianceFrequency: text("compliance_frequency"), // Yearly, Quarterly, Monthly, etc.
  complianceYear: text("compliance_year"), // Year(s) for the compliance
  complianceDuration: text("compliance_duration"), // Quarter, Month, etc.
  complianceStartDate: timestamp("compliance_start_date"),
  complianceEndDate: timestamp("compliance_end_date"),
  // Invoice information
  currency: text("currency"),
  serviceRate: doublePrecision("service_rate"),
  invoiceId: integer("invoice_id"), // Reference to the invoice if the task has been billed
  // Auto-generation tracking
  isAutoGenerated: boolean("is_auto_generated").default(false).notNull(),
  parentTaskId: integer("parent_task_id"), // ID of the recurring template task
  needsApproval: boolean("needs_approval").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create a custom task schema that properly handles dates as strings or Date objects
export const insertTaskSchema = createInsertSchema(tasks)
  .pick({
    tenantId: true,
    isAdmin: true,
    taskType: true,
    clientId: true,
    entityId: true,
    serviceTypeId: true,
    taskCategoryId: true,
    assigneeId: true,
    dueDate: true,
    statusId: true,
    taskDetails: true,
    nextToDo: true,
    isRecurring: true,
    complianceFrequency: true,
    complianceYear: true,
    complianceDuration: true,
    complianceStartDate: true,
    complianceEndDate: true,
    currency: true,
    serviceRate: true,
    invoiceId: true,
    isAutoGenerated: true,
    parentTaskId: true,
    needsApproval: true,
  })
  .extend({
    // Make these fields accept either a Date object or a date string
    dueDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
    complianceStartDate: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
    complianceEndDate: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
    // Make these fields optional
    invoiceId: z.number().optional(),
    isAutoGenerated: z.boolean().default(false).optional(),
    parentTaskId: z.number().optional(),
    needsApproval: z.boolean().default(false).optional(),
  });

// Entity Tax Jurisdictions table (links entities to tax jurisdictions)
export const entityTaxJurisdictions = pgTable("entity_tax_jurisdictions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  entityId: integer("entity_id").notNull(),
  taxJurisdictionId: integer("tax_jurisdiction_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    entityTaxJurisdictionUnique: unique().on(table.entityId, table.taxJurisdictionId),
  };
});

export const insertEntityTaxJurisdictionSchema = createInsertSchema(entityTaxJurisdictions).pick({
  tenantId: true,
  entityId: true,
  taxJurisdictionId: true,
});

// Entity Service Subscriptions table (links entities to services with subscription status)
export const entityServiceSubscriptions = pgTable("entity_service_subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  entityId: integer("entity_id").notNull(),
  serviceTypeId: integer("service_type_id").notNull(),
  isRequired: boolean("is_required").default(false).notNull(),
  isSubscribed: boolean("is_subscribed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    entityServiceUnique: unique().on(table.entityId, table.serviceTypeId),
  };
});

export const insertEntityServiceSubscriptionSchema = createInsertSchema(entityServiceSubscriptions).pick({
  tenantId: true,
  entityId: true,
  serviceTypeId: true,
  isRequired: true,
  isSubscribed: true,
});

// Finance Module - Invoices, Payments, and Financial Tracking

// Invoice status enum
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft', 'sent', 'passed', 'partially_paid', 'paid', 'overdue', 'canceled', 'void'
]);

// Payment method enum
export const paymentMethodEnum = pgEnum('payment_method', [
  'credit_card', 'bank_transfer', 'direct_debit', 'cash', 'check', 'paypal', 'stripe', 'other'
]);

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  clientId: integer("client_id").notNull(),
  entityId: integer("entity_id").notNull(),
  status: invoiceStatusEnum("status").default('draft').notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  currencyCode: text("currency_code").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default('0').notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0').notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default('0').notNull(),
  amountDue: decimal("amount_due", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: integer("created_by").notNull(),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantInvoiceNumberUnique: unique().on(table.tenantId, table.invoiceNumber),
  };
});

export const insertInvoiceSchema = createInsertSchema(invoices)
  .pick({
    tenantId: true,
    invoiceNumber: true,
    clientId: true,
    entityId: true,
    status: true,
    issueDate: true,
    dueDate: true,
    currencyCode: true,
    subtotal: true,
    taxAmount: true,
    discountAmount: true,
    totalAmount: true,
    amountPaid: true,
    amountDue: true,
    notes: true,
    termsAndConditions: true,
    isDeleted: true,
    createdBy: true,
    updatedBy: true,
  })
  .extend({
    // Make these fields accept either a Date object or a date string
    issueDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
    dueDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
    updatedBy: z.number().optional(),
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

// Invoice line items table
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  invoiceId: integer("invoice_id").notNull(),
  taskId: integer("task_id"),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default('1').notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default('0').notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default('0').notNull(),
  discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).default('0').notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0').notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems)
  .pick({
    tenantId: true,
    invoiceId: true,
    taskId: true,
    description: true,
    quantity: true,
    unitPrice: true,
    taxRate: true,
    taxAmount: true,
    discountRate: true,
    discountAmount: true,
    lineTotal: true,
    sortOrder: true,
  });

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  invoiceId: integer("invoice_id").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments)
  .pick({
    tenantId: true,
    invoiceId: true,
    paymentDate: true,
    amount: true,
    paymentMethod: true,
    referenceNumber: true,
    notes: true,
    createdBy: true,
  })
  .extend({
    // Make date fields accept either a Date object or a date string
    paymentDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
  });

// Payment gateway settings table
export const paymentGatewaySettings = pgTable("payment_gateway_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  gatewayType: text("gateway_type").notNull(), // stripe, paypal, etc.
  isEnabled: boolean("is_enabled").default(false).notNull(),
  configData: text("config_data").notNull(), // JSON stringified config data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantGatewayUnique: unique().on(table.tenantId, table.gatewayType),
  };
});

export const insertPaymentGatewaySettingSchema = createInsertSchema(paymentGatewaySettings)
  .pick({
    tenantId: true,
    gatewayType: true,
    isEnabled: true,
    configData: true,
  })
  .extend({
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

// Journal Entry Types
export const journalEntryTypes = pgTable("journal_entry_types", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantCodeUnique: unique().on(table.tenantId, table.code),
  };
});

export const insertJournalEntryTypeSchema = createInsertSchema(journalEntryTypes)
  .pick({
    tenantId: true,
    name: true,
    code: true,
    description: true,
    isActive: true,
  })
  .extend({
    description: z.string().optional().nullable(),
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

// Journal Entries for accounting transactions
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  entryDate: timestamp("entry_date").notNull(),
  reference: text("reference").notNull(), // E.g., INV-2023-001, PMT-2023-001
  entryType: text("entry_type").notNull(), // References journal_entry_types.code
  description: text("description").notNull(),
  isPosted: boolean("is_posted").default(false).notNull(),
  postedAt: timestamp("posted_at"),
  createdBy: integer("created_by").notNull(),
  updatedBy: integer("updated_by"),
  sourceDocument: text("source_document").default("manual").notNull(), // invoice, payment, manual (with default)
  sourceDocumentId: integer("source_document_id"), // ID of the related document
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries)
  .pick({
    tenantId: true,
    entryDate: true,
    reference: true,
    entryType: true,
    description: true,
    isPosted: true,
    createdBy: true,
  })
  .extend({
    entryDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
    sourceDocument: z.string().optional().nullable(),
    sourceDocumentId: z.number().optional().nullable(),
    updatedBy: z.number().optional(),
    postedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

// Journal Entry Lines for individual line items in a journal entry
export const journalEntryLines = pgTable("journal_entry_lines", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  journalEntryId: integer("journal_entry_id").notNull(),
  accountId: integer("account_id").notNull(), // Reference to chart_of_accounts
  description: text("description").notNull(),
  debitAmount: decimal("debit_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  creditAmount: decimal("credit_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  lineOrder: integer("line_order").notNull(), // For ordering lines within an entry
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJournalEntryLineSchema = createInsertSchema(journalEntryLines)
  .pick({
    tenantId: true,
    journalEntryId: true,
    accountId: true,
    description: true,
    debitAmount: true,
    creditAmount: true,
    lineOrder: true,
  });

// Financial account types enum
// Chart of Accounts enums - following accounting structure
export const mainGroupEnum = pgEnum('main_group', [
  'balance_sheet', 'profit_and_loss'
]);

export const elementGroupEnum = pgEnum('element_group', [
  'equity', 'liabilities', 'assets', 'incomes', 'expenses'
]);

export const subElementGroupEnum = pgEnum('sub_element_group', [
  // Equity
  'capital', 'share_capital', 'reserves', 
  // Liabilities
  'non_current_liabilities', 'current_liabilities',
  // Assets
  'non_current_assets', 'current_assets',
  // Incomes
  'sales', 'service_revenue',
  // Expenses
  'cost_of_sales', 'cost_of_service_revenue', 'purchase_returns',
  // For custom additions
  'custom'
]);

export const detailedGroupEnum = pgEnum('detailed_group', [
  // Capital
  'owners_capital',
  // Non Current Liabilities
  'long_term_loans',
  // Current Liabilities
  'short_term_loans', 'trade_creditors', 'accrued_charges', 'other_payables',
  // Non Current Assets
  'property_plant_equipment', 'intangible_assets',
  // Current Assets
  'stock_in_trade', 'trade_debtors', 'advances_prepayments', 'other_receivables', 'cash_bank_balances',
  // For custom additions
  'custom'
]);

// Account type enum (for backward compatibility)
export const accountTypeEnum = pgEnum('account_type', [
  'asset', 'liability', 'equity', 'revenue', 'expense'
]);

// Chart of Accounts Main Groups
export const chartOfAccountsMainGroups = pgTable("chart_of_accounts_main_groups", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: mainGroupEnum("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantMainGroupUnique: unique().on(table.tenantId, table.name),
    tenantCodeUnique: unique().on(table.tenantId, table.code),
  };
});

// Chart of Accounts Element Groups
export const chartOfAccountsElementGroups = pgTable("chart_of_accounts_element_groups", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  mainGroupId: integer("main_group_id").notNull().references(() => chartOfAccountsMainGroups.id, { onDelete: 'cascade' }),
  name: elementGroupEnum("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantElementGroupUnique: unique().on(table.tenantId, table.mainGroupId, table.name),
    tenantCodeUnique: unique().on(table.tenantId, table.code),
  };
});

// Chart of Accounts Sub Element Groups
export const chartOfAccountsSubElementGroups = pgTable("chart_of_accounts_sub_element_groups", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  elementGroupId: integer("element_group_id").notNull().references(() => chartOfAccountsElementGroups.id, { onDelete: 'cascade' }),
  name: subElementGroupEnum("name").notNull(),
  customName: text("custom_name"), // For custom sub element groups
  code: text("code").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantCodeUnique: unique().on(table.tenantId, table.code),
  };
});

// Chart of Accounts Detailed Groups
export const chartOfAccountsDetailedGroups = pgTable("chart_of_accounts_detailed_groups", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  subElementGroupId: integer("sub_element_group_id").notNull().references(() => chartOfAccountsSubElementGroups.id, { onDelete: 'cascade' }),
  name: detailedGroupEnum("name").notNull(),
  customName: text("custom_name"), // For custom detailed groups
  code: text("code").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantCodeUnique: unique().on(table.tenantId, table.code),
  };
});

// Chart of accounts table (AC Heads / Cost Centers)
export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  detailedGroupId: integer("detailed_group_id").notNull().references(() => chartOfAccountsDetailedGroups.id, { onDelete: 'cascade' }),
  accountCode: text("account_code").notNull(),
  accountName: text("account_name").notNull(),
  // Keep old accountType for backward compatibility
  accountType: accountTypeEnum("account_type").notNull(),
  description: text("description"),
  // References to other modules (for cost centers)
  clientId: integer("client_id").references(() => clients.id),
  entityId: integer("entity_id").references(() => entities.id),
  userId: integer("user_id").references(() => users.id),
  // Account settings
  isSystemAccount: boolean("is_system_account").default(false).notNull(),
  openingBalance: decimal("opening_balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantAccountCodeUnique: unique().on(table.tenantId, table.accountCode),
    tenantAccountNameUnique: unique().on(table.tenantId, table.accountName),
  };
});

// Insert schemas for Chart of Accounts hierarchy
export const insertChartOfAccountsMainGroupSchema = createInsertSchema(chartOfAccountsMainGroups)
  .pick({
    tenantId: true,
    name: true,
    code: true,
    description: true,
    isActive: true,
  })
  .extend({
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

export const insertChartOfAccountsElementGroupSchema = createInsertSchema(chartOfAccountsElementGroups)
  .pick({
    tenantId: true,
    mainGroupId: true,
    name: true,
    code: true,
    description: true,
    isActive: true,
  })
  .extend({
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

export const insertChartOfAccountsSubElementGroupSchema = createInsertSchema(chartOfAccountsSubElementGroups)
  .pick({
    tenantId: true,
    elementGroupId: true,
    name: true,
    customName: true,
    code: true,
    description: true,
    isActive: true,
  })
  .extend({
    customName: z.string().optional().nullable(),
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

export const insertChartOfAccountsDetailedGroupSchema = createInsertSchema(chartOfAccountsDetailedGroups)
  .pick({
    tenantId: true,
    subElementGroupId: true,
    name: true,
    customName: true,
    code: true,
    description: true,
    isActive: true,
  })
  .extend({
    customName: z.string().optional().nullable(),
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

export const insertChartOfAccountSchema = createInsertSchema(chartOfAccounts)
  .pick({
    tenantId: true,
    detailedGroupId: true,
    accountCode: true,
    accountName: true,
    accountType: true,
    description: true,
    clientId: true,
    entityId: true,
    userId: true,
    isSystemAccount: true,
    openingBalance: true,
    currentBalance: true,
    isActive: true,
  })
  .extend({
    description: z.string().optional().nullable(),
    clientId: z.number().optional().nullable(),
    entityId: z.number().optional().nullable(),
    userId: z.number().optional().nullable(),
    isSystemAccount: z.boolean().default(false),
    openingBalance: z.union([z.string(), z.number().transform(n => n.toString())]).default("0.00"),
    currentBalance: z.union([z.string(), z.number().transform(n => n.toString())]).default("0.00"),
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

// Export types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type TenantSetting = typeof tenantSettings.$inferSelect;
export type InsertTenantSetting = z.infer<typeof insertTenantSettingSchema>;

export type Designation = typeof designations.$inferSelect;
export type InsertDesignation = z.infer<typeof insertDesignationSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Country = typeof countries.$inferSelect;
export type InsertCountry = z.infer<typeof insertCountrySchema>;

export type Currency = typeof currencies.$inferSelect;
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;

export type State = typeof states.$inferSelect;
export type InsertState = z.infer<typeof insertStateSchema>;

export type EntityType = typeof entityTypes.$inferSelect;
export type InsertEntityType = z.infer<typeof insertEntityTypeSchema>;

export type TaskStatus = typeof taskStatuses.$inferSelect;
export type InsertTaskStatus = z.infer<typeof insertTaskStatusSchema>;

export type TaskStatusWorkflowRule = typeof taskStatusWorkflowRules.$inferSelect;
export type InsertTaskStatusWorkflowRule = z.infer<typeof insertTaskStatusWorkflowRuleSchema>;

export type TaskCategory = typeof taskCategories.$inferSelect;
export type InsertTaskCategory = z.infer<typeof insertTaskCategorySchema>;

export type TaxJurisdiction = typeof taxJurisdictions.$inferSelect;
export type InsertTaxJurisdiction = z.infer<typeof insertTaxJurisdictionSchema>;

export type ServiceType = typeof serviceTypes.$inferSelect;
export type InsertServiceType = z.infer<typeof insertServiceTypeSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Entity = typeof entities.$inferSelect;
export type InsertEntity = z.infer<typeof insertEntitySchema>;

export type EntityTaxJurisdiction = typeof entityTaxJurisdictions.$inferSelect;
export type InsertEntityTaxJurisdiction = z.infer<typeof insertEntityTaxJurisdictionSchema>;

export type EntityServiceSubscription = typeof entityServiceSubscriptions.$inferSelect;
export type InsertEntityServiceSubscription = z.infer<typeof insertEntityServiceSubscriptionSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

// Finance module types
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type PaymentGatewaySetting = typeof paymentGatewaySettings.$inferSelect;
export type InsertPaymentGatewaySetting = z.infer<typeof insertPaymentGatewaySettingSchema>;

export type JournalEntryType = typeof journalEntryTypes.$inferSelect;
export type InsertJournalEntryType = z.infer<typeof insertJournalEntryTypeSchema>;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type InsertJournalEntryLine = z.infer<typeof insertJournalEntryLineSchema>;

// Chart of Accounts hierarchy types
export type ChartOfAccountsMainGroup = typeof chartOfAccountsMainGroups.$inferSelect;
export type InsertChartOfAccountsMainGroup = z.infer<typeof insertChartOfAccountsMainGroupSchema>;

export type ChartOfAccountsElementGroup = typeof chartOfAccountsElementGroups.$inferSelect;
export type InsertChartOfAccountsElementGroup = z.infer<typeof insertChartOfAccountsElementGroupSchema>;

export type ChartOfAccountsSubElementGroup = typeof chartOfAccountsSubElementGroups.$inferSelect;
export type InsertChartOfAccountsSubElementGroup = z.infer<typeof insertChartOfAccountsSubElementGroupSchema>;

export type ChartOfAccountsDetailedGroup = typeof chartOfAccountsDetailedGroups.$inferSelect;
export type InsertChartOfAccountsDetailedGroup = z.infer<typeof insertChartOfAccountsDetailedGroupSchema>;

// AC Head / Cost Center
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type InsertChartOfAccount = z.infer<typeof insertChartOfAccountSchema>;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  tenantName: z.string().min(2, "Firm name must be at least 2 characters"),
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

// These types are already defined above
