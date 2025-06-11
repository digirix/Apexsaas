import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, varchar, unique, pgEnum, decimal, foreignKey, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// SaaS-Level Tables (No tenant_id - these manage the SaaS business itself)
// =============================================================================

// SaaS Admin users table - separate from tenant users
export const saasAdmins = pgTable("saas_admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("owner"), // owner, support, finance
  displayName: text("display_name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertSaasAdminSchema = createInsertSchema(saasAdmins).pick({
  email: true,
  passwordHash: true,
  role: true,
  displayName: true,
  isActive: true,
});

// SaaS Packages/Plans table
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
  annualPrice: decimal("annual_price", { precision: 10, scale: 2 }),
  limitsJson: json("limits_json").$type<{
    maxUsers?: number;
    maxEntities?: number;
    modules?: string[];
    aiAccess?: boolean;
    [key: string]: any;
  }>(),
  isActive: boolean("is_active").default(true).notNull(),
  isPubliclyVisible: boolean("is_publicly_visible").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPackageSchema = createInsertSchema(packages).pick({
  name: true,
  description: true,
  monthlyPrice: true,
  annualPrice: true,
  limitsJson: true,
  isActive: true,
  isPubliclyVisible: true,
});

// Blog posts table for marketing website
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull().references(() => saasAdmins.id),
  status: text("status").notNull().default("draft"), // draft, published, archived
  featuredImageUrl: text("featured_image_url"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).pick({
  title: true,
  slug: true,
  content: true,
  authorId: true,
  status: true,
  featuredImageUrl: true,
  seoTitle: true,
  seoDescription: true,
  publishedAt: true,
});

// =============================================================================
// Updated Tenant-Level Tables
// =============================================================================

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

// Enhanced Tenants table - central link between SaaS and tenant data
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  primaryAdminUserId: integer("primary_admin_user_id"), // References users.id
  status: text("status").notNull().default("trial"), // trial, active, suspended, cancelled
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionId: integer("subscription_id"), // References subscriptions.id
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscriptions table linking tenants to packages
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  packageId: integer("package_id").notNull().references(() => packages.id),
  status: text("status").notNull().default("active"), // active, cancelled, past_due, unpaid
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  tenantId: true,
  packageId: true,
  status: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  stripeSubscriptionId: true,
  stripeCustomerId: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type definitions for SaaS tables
export type SelectSaasAdmin = typeof saasAdmins.$inferSelect;
export type InsertSaasAdmin = typeof insertSaasAdminSchema._type;
export type SelectPackage = typeof packages.$inferSelect;
export type InsertPackage = typeof insertPackageSchema._type;
export type SelectBlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof insertBlogPostSchema._type;
export type SelectSubscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof insertSubscriptionSchema._type;

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
  isAdmin: boolean("is_admin").default(false).notNull(),
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
  isAdmin: true,
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

// Task status history table for tracking status changes over time
export const taskStatusHistory = pgTable("task_status_history", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  taskId: integer("task_id").notNull(),
  fromStatusId: integer("from_status_id"),
  toStatusId: integer("to_status_id").notNull(),
  changedByUserId: integer("changed_by_user_id"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskStatusHistorySchema = createInsertSchema(taskStatusHistory).pick({
  tenantId: true,
  taskId: true,
  fromStatusId: true,
  toStatusId: true,
  changedByUserId: true,
  notes: true,
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
  hasPortalAccess: boolean("has_portal_access").default(false).notNull(),
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
  hasPortalAccess: true,
});

// Client Portal Access table
export const clientPortalAccess = pgTable("client_portal_access", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  username: text("username").notNull(),
  password: text("password").notNull(),
  lastLogin: timestamp("last_login"),
  passwordResetRequired: boolean("password_reset_required").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantClientIdUnique: unique().on(table.tenantId, table.clientId),
    tenantUsernameUnique: unique().on(table.tenantId, table.username),
  };
});

export const insertClientPortalAccessSchema = createInsertSchema(clientPortalAccess).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
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
  whatsappGroupLink: text("whatsapp_group_link"),
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
  whatsappGroupLink: true,
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
  complianceDeadline: timestamp("compliance_deadline"),
  // Invoice information
  currency: text("currency"),
  serviceRate: doublePrecision("service_rate"),
  invoiceId: integer("invoice_id"), // Reference to the invoice if the task has been billed
  // Auto-generation tracking
  isAutoGenerated: boolean("is_auto_generated").default(false).notNull(),
  parentTaskId: integer("parent_task_id"), // ID of the recurring template task
  needsApproval: boolean("needs_approval").default(false).notNull(),
  isCanceled: boolean("is_canceled").default(false).notNull(),
  canceledAt: timestamp("canceled_at"),
  activatedAt: timestamp("activated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
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
    complianceDeadline: true,
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
    complianceDeadline: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
    // Make these fields optional
    invoiceId: z.number().optional(),
    isAutoGenerated: z.boolean().default(false).optional(),
    parentTaskId: z.number().optional(),
    needsApproval: z.boolean().default(false).optional(),
    isCanceled: z.boolean().default(false).optional(),
    canceledAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
    activatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
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
  'draft', 'sent', 'approved', 'passed', 'partially_paid', 'paid', 'overdue', 'canceled', 'void'
]);

// Payment method enum
export const paymentMethodEnum = pgEnum('payment_method', [
  'credit_card', 'debit_card', 'bank_transfer', 'direct_debit', 'cash', 'check', 'paypal', 'stripe', 'apple_pay', 'google_pay', 'meezan_bank', 'bank_alfalah', 'other'
]);

// Payment gateway provider enum
export const paymentGatewayEnum = pgEnum('payment_gateway', [
  'stripe', 'paypal', 'apple_pay', 'google_pay', 'meezan_bank', 'bank_alfalah'
]);

// Payment transaction status enum
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', 'processing', 'completed', 'failed', 'canceled', 'refunded', 'partial_refunded'
]);

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  clientId: integer("client_id").notNull(),
  entityId: integer("entity_id").notNull(),
  taskId: integer("task_id"),
  status: invoiceStatusEnum("status").default('draft').notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  currencyCode: text("currency_code").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).default('0').notNull(),
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
    taskId: true,
    status: true,
    issueDate: true,
    dueDate: true,
    currencyCode: true,
    subtotal: true,
    taxPercent: true,
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

// Stripe payment gateway configuration
export const stripeConfigurations = pgTable("stripe_configurations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  isTestMode: boolean("is_test_mode").default(true).notNull(),
  publicKey: text("public_key").notNull(),
  secretKey: text("secret_key").notNull(),
  webhookSecret: text("webhook_secret"),
  currency: text("currency").default('PKR').notNull(),
  displayName: text("display_name").default('Stripe').notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantUnique: unique().on(table.tenantId),
  };
});

export const insertStripeConfigurationSchema = createInsertSchema(stripeConfigurations)
  .pick({
    tenantId: true,
    isEnabled: true,
    isTestMode: true,
    publicKey: true,
    secretKey: true,
    webhookSecret: true,
    currency: true,
    displayName: true,
    description: true,
  })
  .extend({
    webhookSecret: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

// PayPal payment gateway configuration
export const paypalConfigurations = pgTable("paypal_configurations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  isTestMode: boolean("is_test_mode").default(true).notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  mode: text("mode").default('sandbox').notNull(), // sandbox or production
  currency: text("currency").default('USD').notNull(),
  displayName: text("display_name").default('PayPal').notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantUnique: unique().on(table.tenantId),
  };
});

export const insertPaypalConfigurationSchema = createInsertSchema(paypalConfigurations)
  .pick({
    tenantId: true,
    isEnabled: true,
    isTestMode: true,
    clientId: true,
    clientSecret: true,
    mode: true,
    currency: true,
    displayName: true,
    description: true,
  })
  .extend({
    description: z.string().optional().nullable(),
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

// Meezan Bank payment gateway configuration
export const meezanBankConfigurations = pgTable("meezan_bank_configurations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  isTestMode: boolean("is_test_mode").default(true).notNull(),
  merchantId: text("merchant_id").notNull(),
  merchantKey: text("merchant_key").notNull(),
  apiUrl: text("api_url").notNull(),
  currency: text("currency").default('PKR').notNull(),
  displayName: text("display_name").default('Meezan Bank').notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantUnique: unique().on(table.tenantId),
  };
});

export const insertMeezanBankConfigurationSchema = createInsertSchema(meezanBankConfigurations)
  .pick({
    tenantId: true,
    isEnabled: true,
    isTestMode: true,
    merchantId: true,
    merchantKey: true,
    apiUrl: true,
    currency: true,
    displayName: true,
    description: true,
  })
  .extend({
    description: z.string().optional().nullable(),
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

// Bank Alfalah payment gateway configuration
export const bankAlfalahConfigurations = pgTable("bank_alfalah_configurations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  isTestMode: boolean("is_test_mode").default(true).notNull(),
  merchantId: text("merchant_id").notNull(),
  merchantKey: text("merchant_key").notNull(),
  apiUrl: text("api_url").notNull(),
  currency: text("currency").default('PKR').notNull(),
  displayName: text("display_name").default('Bank Alfalah').notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantUnique: unique().on(table.tenantId),
  };
});

export const insertBankAlfalahConfigurationSchema = createInsertSchema(bankAlfalahConfigurations)
  .pick({
    tenantId: true,
    isEnabled: true,
    isTestMode: true,
    merchantId: true,
    merchantKey: true,
    apiUrl: true,
    currency: true,
    displayName: true,
    description: true,
  })
  .extend({
    description: z.string().optional().nullable(),
    updatedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

// Payment transactions table - tracks all payment attempts
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  invoiceId: integer("invoice_id").notNull(),
  paymentId: integer("payment_id"), // Links to payments table after successful payment
  gatewayType: paymentGatewayEnum("gateway_type").notNull(),
  gatewayTransactionId: text("gateway_transaction_id"), // External payment ID from gateway
  gatewayPaymentIntentId: text("gateway_payment_intent_id"), // For Stripe payment intents
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default('PKR').notNull(),
  status: paymentStatusEnum("status").default('pending').notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  gatewayResponse: text("gateway_response"), // JSON stringified response from gateway
  failureReason: text("failure_reason"),
  clientSecret: text("client_secret"), // For client-side payment confirmation
  returnUrl: text("return_url"),
  cancelUrl: text("cancel_url"),
  webhookProcessed: boolean("webhook_processed").default(false).notNull(),
  createdBy: integer("created_by"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions)
  .pick({
    tenantId: true,
    invoiceId: true,
    paymentId: true,
    gatewayType: true,
    gatewayTransactionId: true,
    gatewayPaymentIntentId: true,
    amount: true,
    currency: true,
    status: true,
    paymentMethod: true,
    gatewayResponse: true,
    failureReason: true,
    clientSecret: true,
    returnUrl: true,
    cancelUrl: true,
    webhookProcessed: true,
    createdBy: true,
    processedAt: true,
  })
  .extend({
    processedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
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
  isDeleted: boolean("is_deleted").default(false).notNull(), // For soft delete functionality
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

// Export types (avoiding duplicate with SaaS types above)
export type Tenant = typeof tenants.$inferSelect;

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

// Payment Gateway Configuration Types
export type StripeConfiguration = typeof stripeConfigurations.$inferSelect;
export type InsertStripeConfiguration = z.infer<typeof insertStripeConfigurationSchema>;

export type PaypalConfiguration = typeof paypalConfigurations.$inferSelect;
export type InsertPaypalConfiguration = z.infer<typeof insertPaypalConfigurationSchema>;

export type MeezanBankConfiguration = typeof meezanBankConfigurations.$inferSelect;
export type InsertMeezanBankConfiguration = z.infer<typeof insertMeezanBankConfigurationSchema>;

export type BankAlfalahConfiguration = typeof bankAlfalahConfigurations.$inferSelect;
export type InsertBankAlfalahConfiguration = z.infer<typeof insertBankAlfalahConfigurationSchema>;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;

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

// AI Feature module
export const aiProviderEnum = pgEnum('ai_provider', ['Google', 'OpenAI', 'Anthropic']);
export const aiPersonalityEnum = pgEnum('ai_personality', ['Professional', 'Friendly', 'Technical', 'Concise', 'Detailed']);
export const aiSpecializationEnum = pgEnum('ai_specialization', ['General', 'Accounting', 'Tax', 'Audit', 'Finance', 'Compliance']);
export const aiResponseLengthEnum = pgEnum('ai_response_length', ['Brief', 'Standard', 'Detailed']);
export const aiToneEnum = pgEnum('ai_tone', ['Formal', 'Neutral', 'Casual']);

// AI Configuration table
export const aiConfigurations = pgTable("ai_configurations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  provider: aiProviderEnum("provider").notNull(),
  apiKey: text("api_key").notNull(),
  model: text("model").notNull(), // The selected/detected model to use
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantProviderUnique: unique().on(table.tenantId, table.provider),
  };
});

// AI Interactions table for logging and analytics
export const aiInteractions = pgTable("ai_interactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userQuery: text("user_query").notNull(),
  aiResponse: text("ai_response").notNull(),
  provider: text("provider").notNull(),
  modelId: text("model_id").notNull(),
  processingTimeMs: integer("processing_time_ms"),
  feedbackRating: integer("feedback_rating"),
  feedbackComment: text("feedback_comment"),
}, (table) => {
  return {
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] })
  };
});

export const insertAiConfigurationSchema = createInsertSchema(aiConfigurations).pick({
  tenantId: true,
  provider: true,
  apiKey: true,
  model: true,
  isActive: true,
});

export const insertAiInteractionSchema = createInsertSchema(aiInteractions).pick({
  tenantId: true,
  userId: true,
  timestamp: true,
  userQuery: true,
  aiResponse: true,
  provider: true,
  modelId: true,
  processingTimeMs: true,
  feedbackRating: true,
  feedbackComment: true,
});

// AI Assistant Customization table for personalized AI settings per user
export const aiAssistantCustomizations = pgTable("ai_assistant_customizations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  name: text("name").default("My Assistant").notNull(),
  personality: aiPersonalityEnum("personality").default("Professional").notNull(),
  specialization: aiSpecializationEnum("specialization").default("General").notNull(),
  responseLength: aiResponseLengthEnum("response_length").default("Standard").notNull(),
  tone: aiToneEnum("tone").default("Neutral").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userTenantUnique: unique().on(table.tenantId, table.userId),
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] })
  };
});

export const insertAiAssistantCustomizationSchema = createInsertSchema(aiAssistantCustomizations).pick({
  tenantId: true,
  userId: true,
  name: true,
  personality: true,
  specialization: true, 
  responseLength: true,
  tone: true,
  isActive: true,
});

export type AiConfiguration = typeof aiConfigurations.$inferSelect;
export type InsertAiConfiguration = z.infer<typeof insertAiConfigurationSchema>;

export type AiInteraction = typeof aiInteractions.$inferSelect;
export type InsertAiInteraction = z.infer<typeof insertAiInteractionSchema>;

export type AiAssistantCustomization = typeof aiAssistantCustomizations.$inferSelect;
export type InsertAiAssistantCustomization = z.infer<typeof insertAiAssistantCustomizationSchema>;

// Client Portal types
export type ClientPortalAccess = typeof clientPortalAccess.$inferSelect;
export type InsertClientPortalAccess = z.infer<typeof insertClientPortalAccessSchema>;

// Client portal auth schemas
export const clientPortalLoginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  tenantId: z.number(),
});

export type ClientPortalLoginData = z.infer<typeof clientPortalLoginSchema>;

// Workflow Automation Module Schema

// Workflow status enum
export const workflowStatusEnum = pgEnum('workflow_status', ['active', 'inactive', 'draft']);

// Workflow execution status enum
export const executionStatusEnum = pgEnum('execution_status', ['success', 'failed', 'in_progress', 'skipped']);

// Action types enum
export const actionTypeEnum = pgEnum('action_type', [
  'create_task',
  'update_task',
  'send_notification',
  'update_client_field',
  'create_invoice',
  'send_email',
  'call_webhook',
  'update_entity_field',
  'assign_user'
]);

// Trigger events enum
export const triggerEventEnum = pgEnum('trigger_event', [
  'client_created',
  'client_updated',
  'client_status_changed',
  'task_created',
  'task_updated',
  'task_status_changed',
  'task_completed',
  'invoice_created',
  'invoice_paid',
  'invoice_overdue',
  'entity_created',
  'entity_updated',
  'user_created',
  'payment_received'
]);

// Workflows table
export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: workflowStatusEnum("status").default("draft").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdBy: integer("created_by").notNull(),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    createdByFk: foreignKey({ columns: [table.createdBy], foreignColumns: [users.id] }),
    updatedByFk: foreignKey({ columns: [table.updatedBy], foreignColumns: [users.id] })
  };
});

// Workflow triggers table
export const workflowTriggers = pgTable("workflow_triggers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  workflowId: integer("workflow_id").notNull(),
  triggerModule: text("trigger_module").notNull(), // e.g., "clients", "tasks", "invoices"
  triggerEvent: triggerEventEnum("trigger_event").notNull(),
  triggerConditions: text("trigger_conditions"), // JSON string for complex conditions
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    workflowFk: foreignKey({ columns: [table.workflowId], foreignColumns: [workflows.id] })
  };
});

// Workflow actions table
export const workflowActions = pgTable("workflow_actions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  workflowId: integer("workflow_id").notNull(),
  sequenceOrder: integer("sequence_order").notNull(),
  actionType: actionTypeEnum("action_type").notNull(),
  actionConfiguration: text("action_configuration").notNull(), // JSON string for action parameters
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    workflowFk: foreignKey({ columns: [table.workflowId], foreignColumns: [workflows.id] })
  };
});

// Workflow execution logs table
export const workflowExecutionLogs = pgTable("workflow_execution_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  workflowId: integer("workflow_id").notNull(),
  triggerId: integer("trigger_id").notNull(),
  triggerEventData: text("trigger_event_data").notNull(), // JSON string of event data
  executionStatus: executionStatusEnum("execution_status").notNull(),
  actionLogs: text("action_logs"), // JSON array of action execution results
  errorMessage: text("error_message"),
  executionTimeMs: integer("execution_time_ms"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    workflowFk: foreignKey({ columns: [table.workflowId], foreignColumns: [workflows.id] }),
    triggerFk: foreignKey({ columns: [table.triggerId], foreignColumns: [workflowTriggers.id] })
  };
});

// Workflow action execution details table (for detailed action-level logging)
export const workflowActionExecutions = pgTable("workflow_action_executions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  executionLogId: integer("execution_log_id").notNull(),
  actionId: integer("action_id").notNull(),
  executionStatus: executionStatusEnum("execution_status").notNull(),
  inputData: text("input_data"), // JSON string of action input
  outputData: text("output_data"), // JSON string of action output
  errorMessage: text("error_message"),
  executionTimeMs: integer("execution_time_ms"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    executionLogFk: foreignKey({ columns: [table.executionLogId], foreignColumns: [workflowExecutionLogs.id] }),
    actionFk: foreignKey({ columns: [table.actionId], foreignColumns: [workflowActions.id] })
  };
});

// Workflow templates table (for predefined workflow templates)
export const workflowTemplates = pgTable("workflow_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // e.g., "client_onboarding", "task_automation", "financial"
  templateData: text("template_data").notNull(), // JSON string containing complete workflow definition
  isSystemTemplate: boolean("is_system_template").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for inserts
export const insertWorkflowSchema = createInsertSchema(workflows).pick({
  tenantId: true,
  name: true,
  description: true,
  status: true,
  isActive: true,
  createdBy: true,
  updatedBy: true,
});

export const insertWorkflowTriggerSchema = createInsertSchema(workflowTriggers).pick({
  tenantId: true,
  workflowId: true,
  triggerModule: true,
  triggerEvent: true,
  triggerConditions: true,
  isActive: true,
});

export const insertWorkflowActionSchema = createInsertSchema(workflowActions).pick({
  tenantId: true,
  workflowId: true,
  sequenceOrder: true,
  actionType: true,
  actionConfiguration: true,
  isActive: true,
});

export const insertWorkflowExecutionLogSchema = createInsertSchema(workflowExecutionLogs).pick({
  tenantId: true,
  workflowId: true,
  triggerId: true,
  triggerEventData: true,
  executionStatus: true,
  actionLogs: true,
  errorMessage: true,
  executionTimeMs: true,
});

export const insertWorkflowActionExecutionSchema = createInsertSchema(workflowActionExecutions).pick({
  tenantId: true,
  executionLogId: true,
  actionId: true,
  executionStatus: true,
  inputData: true,
  outputData: true,
  errorMessage: true,
  executionTimeMs: true,
});

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates).pick({
  name: true,
  description: true,
  category: true,
  templateData: true,
  isSystemTemplate: true,
  isActive: true,
});

// TypeScript types
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type WorkflowTrigger = typeof workflowTriggers.$inferSelect;
export type InsertWorkflowTrigger = z.infer<typeof insertWorkflowTriggerSchema>;

export type WorkflowAction = typeof workflowActions.$inferSelect;
export type InsertWorkflowAction = z.infer<typeof insertWorkflowActionSchema>;

export type WorkflowExecutionLog = typeof workflowExecutionLogs.$inferSelect;
export type InsertWorkflowExecutionLog = z.infer<typeof insertWorkflowExecutionLogSchema>;

export type WorkflowActionExecution = typeof workflowActionExecutions.$inferSelect;
export type InsertWorkflowActionExecution = z.infer<typeof insertWorkflowActionExecutionSchema>;

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;

// Extended workflow schema for complete workflow with triggers and actions
export const completeWorkflowSchema = z.object({
  workflow: insertWorkflowSchema,
  triggers: z.array(insertWorkflowTriggerSchema.omit({ workflowId: true })),
  actions: z.array(insertWorkflowActionSchema.omit({ workflowId: true })),
});

export type CompleteWorkflow = z.infer<typeof completeWorkflowSchema>;

// Internal Notification System Schema



// Email service provider enum
export const emailProviderEnum = pgEnum('email_provider', [
  'SENDGRID',
  'MAILGUN',
  'SES',
  'SMTP',
  'POSTMARK',
  'RESEND'
]);

// Email service provider settings table - tenant-specific email configuration
export const emailProviderSettings = pgTable("email_provider_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  provider: emailProviderEnum("provider").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  replyToEmail: text("reply_to_email"),
  apiKey: text("api_key").notNull(), // Encrypted
  apiSecret: text("api_secret"), // For providers that need it
  smtpHost: text("smtp_host"), // For SMTP provider
  smtpPort: integer("smtp_port"), // For SMTP provider
  smtpSecure: boolean("smtp_secure").default(true), // For SMTP provider
  webhookSecret: text("webhook_secret"), // For delivery tracking
  configData: text("config_data"), // JSON for additional provider-specific settings
  dailyLimit: integer("daily_limit").default(1000).notNull(),
  monthlyLimit: integer("monthly_limit").default(10000).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantProviderUnique: unique().on(table.tenantId, table.provider),
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] })
  };
});

// Email delivery log table for tracking
export const emailDeliveryLogs = pgTable("email_delivery_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),

  providerId: integer("provider_id").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(), // sent, delivered, bounced, failed, opened, clicked
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
}, (table) => {
  return {
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),

    providerFk: foreignKey({ columns: [table.providerId], foreignColumns: [emailProviderSettings.id] })
  };
});





// Client Documents table for Client Portal document management
export const clientDocuments = pgTable("client_documents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  entityId: integer("entity_id").references(() => entities.id), // Optional: document can be entity-specific
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  filePath: text("file_path").notNull(), // Storage path or reference
  fileSize: integer("file_size"), // File size in bytes
  mimeType: text("mime_type"),
  description: text("description"),
  uploadedBy: integer("uploaded_by"), // admin user ID who uploaded, null if uploaded by client
  isClientVisible: boolean("is_client_visible").default(true).notNull(),
  documentType: text("document_type"), // e.g., 'Tax Return', 'Financial Statement', 'Supporting Document'
  documentYear: integer("document_year"), // For tax returns, financial statements
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    clientFk: foreignKey({ columns: [table.clientId], foreignColumns: [clients.id] }),
    entityFk: foreignKey({ columns: [table.entityId], foreignColumns: [entities.id] }),
  };
});

export const insertClientDocumentSchema = createInsertSchema(clientDocuments).pick({
  tenantId: true,
  clientId: true,
  entityId: true,
  fileName: true,
  originalFileName: true,
  filePath: true,
  fileSize: true,
  mimeType: true,
  description: true,
  uploadedBy: true,
  isClientVisible: true,
  documentType: true,
  documentYear: true,
});

export type ClientDocument = typeof clientDocuments.$inferSelect;
export type InsertClientDocument = z.infer<typeof insertClientDocumentSchema>;

// Client Messages to Firm table for direct communication
export const clientMessagesToFirm = pgTable("client_messages_to_firm", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  entityId: integer("entity_id").references(() => entities.id), // Optional: message can be entity-specific
  messageContent: text("message_content").notNull(),
  isReadByAdmin: boolean("is_read_by_admin").default(false).notNull(),
  adminResponse: text("admin_response"),
  respondedBy: integer("responded_by"), // admin user ID who responded
  respondedAt: timestamp("responded_at"),
  priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  subject: text("subject"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    clientFk: foreignKey({ columns: [table.clientId], foreignColumns: [clients.id] }),
    entityFk: foreignKey({ columns: [table.entityId], foreignColumns: [entities.id] }),
    respondedByFk: foreignKey({ columns: [table.respondedBy], foreignColumns: [users.id] }),
  };
});

export const insertClientMessageToFirmSchema = createInsertSchema(clientMessagesToFirm).pick({
  tenantId: true,
  clientId: true,
  entityId: true,
  messageContent: true,
  priority: true,
  subject: true,
});

export type ClientMessageToFirm = typeof clientMessagesToFirm.$inferSelect;
export type InsertClientMessageToFirm = z.infer<typeof insertClientMessageToFirmSchema>;

// Task acknowledgments table for client task interactions
export const taskAcknowledgments = pgTable("task_acknowledgments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow().notNull(),
  comments: text("comments"),
}, (table) => {
  return {
    taskClientUnique: unique().on(table.taskId, table.clientId),
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    taskFk: foreignKey({ columns: [table.taskId], foreignColumns: [tasks.id] }),
    clientFk: foreignKey({ columns: [table.clientId], foreignColumns: [clients.id] }),
  };
});

export const insertTaskAcknowledgmentSchema = createInsertSchema(taskAcknowledgments).pick({
  tenantId: true,
  taskId: true,
  clientId: true,
  comments: true,
});

export type TaskAcknowledgment = typeof taskAcknowledgments.$inferSelect;
export type InsertTaskAcknowledgment = z.infer<typeof insertTaskAcknowledgmentSchema>;

// Notification System Schema - Comprehensive notification types for all modules
export const notificationTypeEnum = pgEnum('notification_type', [
  // Task Management Module
  'TASK_ASSIGNMENT',
  'TASK_UPDATE', 
  'TASK_COMPLETED',
  'TASK_DUE_SOON',
  'TASK_OVERDUE',
  'TASK_STATUS_CHANGED',
  'TASK_APPROVED',
  'TASK_REJECTED',
  'TASK_COMMENT_ADDED',
  'RECURRING_TASK_GENERATED',
  
  // Client Management Module
  'CLIENT_CREATED',
  'CLIENT_UPDATED',
  'CLIENT_ASSIGNMENT',
  'CLIENT_MESSAGE',
  'CLIENT_DOCUMENT',
  'CLIENT_PORTAL_LOGIN',
  'CLIENT_STATUS_CHANGED',
  
  // Entity Management Module
  'ENTITY_CREATED',
  'ENTITY_UPDATED',
  'ENTITY_COMPLIANCE_DUE',
  'ENTITY_STATUS_CHANGED',
  
  // Invoice & Payment Module
  'INVOICE_CREATED',
  'INVOICE_SENT',
  'INVOICE_PAID',
  'INVOICE_OVERDUE',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'PAYMENT_REFUNDED',
  'PAYMENT_REVIEW',
  
  // User & Permission Module
  'USER_CREATED',
  'USER_UPDATED',
  'USER_LOGIN',
  'PERMISSION_CHANGED',
  'ROLE_ASSIGNED',
  
  // Workflow Module
  'WORKFLOW_TRIGGERED',
  'WORKFLOW_APPROVAL',
  'WORKFLOW_ALERT',
  'WORKFLOW_COMPLETION',
  'WORKFLOW_FAILED',
  
  // Financial Analytics Module
  'REPORT_GENERATED',
  'REPORT_READY',
  'ANALYTICS_ALERT',
  'BUDGET_EXCEEDED',
  'FINANCIAL_ANOMALY',
  
  // AI Module
  'AI_SUGGESTION',
  'AI_RISK_ALERT',
  'AI_REPORT_GENERATED',
  'AI_ANALYSIS_COMPLETED',
  
  // Compliance Module
  'COMPLIANCE_DEADLINE_APPROACHING',
  'COMPLIANCE_DEADLINE_MISSED',
  'TAX_FILING_DUE',
  'COMPLIANCE_ALERT',
  
  // System Module
  'SYSTEM_ALERT',
  'SYSTEM_MESSAGE',
  'SYSTEM_MAINTENANCE',
  'BACKUP_COMPLETED',
  'BACKUP_FAILED',
  
  // General
  'MENTION',
  'BROADCAST',
  'CUSTOM'
]);

export const notificationSeverityEnum = pgEnum('notification_severity', [
  'INFO',
  'WARNING', 
  'ERROR',
  'SUCCESS'
]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  messageBody: text("message_body").notNull(),
  linkUrl: text("link_url"),
  type: notificationTypeEnum("type").notNull(),
  severity: notificationSeverityEnum("severity").default("INFO").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  deliveryChannels: text("delivery_channels").default('["in_app"]').notNull(),
  deliveryDelay: integer("delivery_delay").default(0).notNull(),
  batchDelivery: boolean("batch_delivery").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  relatedModule: text("related_module"),
  relatedEntityId: text("related_entity_id"),
  templateVariables: text("template_variables"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  tenantId: true,
  userId: true,
  title: true,
  messageBody: true,
  linkUrl: true,
  type: true,
  severity: true,
  createdBy: true,
  relatedModule: true,
  relatedEntityId: true,
  templateVariables: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Notification Preferences table - User-specific notification settings
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationType: notificationTypeEnum("notification_type").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  deliveryChannels: text("delivery_channels").default('["in_app"]').notNull(), // JSON array: ["in_app", "email", "sms"]
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantUserTypeUnique: unique().on(table.tenantId, table.userId, table.notificationType),
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
  };
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).pick({
  tenantId: true,
  userId: true,
  notificationType: true,
  isEnabled: true,
  deliveryChannels: true,
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;

// Task Notes for comprehensive notes history tracking
export const taskNotes = pgTable("task_notes", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  note: text("note").notNull(),
  isSystemNote: boolean("is_system_note").default(false).notNull(), // For system-generated notes (assignments, status changes)
  action: text("action"), // Type of action: 'assigned', 'status_changed', 'updated', 'comment'
  oldValue: text("old_value"), // Previous value for tracking changes
  newValue: text("new_value"), // New value for tracking changes
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    taskFk: foreignKey({ columns: [table.taskId], foreignColumns: [tasks.id] }),
    tenantFk: foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.id] }),
    userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
  };
});

export const insertTaskNoteSchema = createInsertSchema(taskNotes).pick({
  taskId: true,
  tenantId: true,
  userId: true,
  note: true,
  isSystemNote: true,
  action: true,
  oldValue: true,
  newValue: true,
});

export type TaskNote = typeof taskNotes.$inferSelect;
export type InsertTaskNote = z.infer<typeof insertTaskNoteSchema>;

// =============================================================================
// Audit Logs Table
// =============================================================================

// Audit logs for tracking SaaS admin actions and security events
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  saasAdminId: integer("saas_admin_id").notNull().references(() => saasAdmins.id),
  tenantId: integer("tenant_id").references(() => tenants.id),
  action: text("action").notNull(), // LOGIN_SUCCESS, IMPERSONATION_START, etc.
  resourceType: text("resource_type").notNull(), // tenant, package, blog_post, etc.
  resourceId: text("resource_id"), // ID of the resource being acted upon
  details: json("details"), // Additional context and metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
