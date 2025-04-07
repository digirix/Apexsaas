import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, varchar, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenants table
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTenantSchema = createInsertSchema(tenants).pick({
  name: true,
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

export const insertTaskSchema = createInsertSchema(tasks).pick({
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

// Roles table for Role-Based Access Control
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantRoleUnique: unique().on(table.tenantId, table.name),
  };
});

export const insertRoleSchema = createInsertSchema(roles).pick({
  tenantId: true,
  name: true,
  description: true,
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  resource: text("resource").notNull(), // E.g., 'clients', 'users', 'setup', etc.
  action: text("action").notNull(), // E.g., 'create', 'read', 'update', 'delete'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    resourceActionUnique: unique().on(table.resource, table.action),
  };
});

export const insertPermissionSchema = createInsertSchema(permissions).pick({
  resource: true,
  action: true,
  description: true,
});

// Role Permissions linking table
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  roleId: integer("role_id").notNull(),
  permissionId: integer("permission_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    rolePermissionUnique: unique().on(table.roleId, table.permissionId),
  };
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).pick({
  tenantId: true,
  roleId: true,
  permissionId: true,
});

// User Roles linking table
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  roleId: integer("role_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userRoleUnique: unique().on(table.userId, table.roleId),
  };
});

export const insertUserRoleSchema = createInsertSchema(userRoles).pick({
  tenantId: true,
  userId: true,
  roleId: true,
});

// User direct permissions (overrides roles)
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  permissionId: integer("permission_id").notNull(),
  hasPermission: boolean("has_permission").default(true).notNull(), // Can explicitly grant or deny
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userPermissionUnique: unique().on(table.userId, table.permissionId),
  };
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).pick({
  tenantId: true,
  userId: true,
  permissionId: true,
  hasPermission: true,
});

// Type exports for permissions
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

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
