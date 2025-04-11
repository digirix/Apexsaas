import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, varchar, unique, pgEnum } from "drizzle-orm/pg-core";
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
  })
  .extend({
    // Make these fields accept either a Date object or a date string
    dueDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
    complianceStartDate: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
    complianceEndDate: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
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
