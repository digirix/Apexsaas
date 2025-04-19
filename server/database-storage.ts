import { 
  tenants, tenantSettings, users, designations, departments, countries, currencies, states, 
  entityTypes, taskStatuses, taskStatusWorkflowRules, taxJurisdictions, serviceTypes, 
  clients, entities, tasks, taskCategories, entityTaxJurisdictions, entityServiceSubscriptions, 
  userPermissions, invoices, invoiceLineItems, payments, paymentGatewaySettings, chartOfAccounts
} from "@shared/schema";
import type { 
  Tenant, User, InsertUser, InsertTenant, 
  Designation, InsertDesignation, Department, InsertDepartment,
  Country, InsertCountry, Currency, InsertCurrency, 
  State, InsertState, EntityType, InsertEntityType, TaskStatus, InsertTaskStatus, 
  TaskStatusWorkflowRule, InsertTaskStatusWorkflowRule,
  TaxJurisdiction, InsertTaxJurisdiction, ServiceType, 
  InsertServiceType, Client, InsertClient, Entity, InsertEntity, Task, InsertTask, TaskCategory, InsertTaskCategory,
  EntityTaxJurisdiction, InsertEntityTaxJurisdiction, EntityServiceSubscription, InsertEntityServiceSubscription,
  UserPermission, InsertUserPermission, TenantSetting, InsertTenantSetting,
  // Finance module types
  Invoice, InsertInvoice, InvoiceLineItem, InsertInvoiceLineItem, 
  Payment, InsertPayment, PaymentGatewaySetting, InsertPaymentGatewaySetting,
  ChartOfAccount, InsertChartOfAccount
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, isNull, asc, desc, inArray } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const MemoryStore = createMemoryStore(session);
type MemoryStoreType = session.Store;

export class DatabaseStorage implements IStorage {
  sessionStore: MemoryStoreType;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24h
    });
  }

  // Tenant operations
  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantByName(name: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.name, name));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updatedTenant] = await db.update(tenants)
      .set(tenant)
      .where(eq(tenants.id, id))
      .returning();
    return updatedTenant;
  }

  async deleteTenant(id: number): Promise<boolean> {
    const [deletedTenant] = await db.delete(tenants)
      .where(eq(tenants.id, id))
      .returning({ id: tenants.id });
    return !!deletedTenant;
  }

  // Tenant settings operations
  async getTenantSettings(tenantId: number): Promise<TenantSetting[]> {
    return await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId));
  }

  // Modified to match IStorage interface
  async getTenantSetting(tenantId: number, key: string): Promise<TenantSetting | undefined> {
    const [setting] = await db.select().from(tenantSettings)
      .where(and(
        eq(tenantSettings.key, key),
        eq(tenantSettings.tenantId, tenantId)
      ));
    return setting;
  }

  async createTenantSetting(setting: InsertTenantSetting): Promise<TenantSetting> {
    const [newSetting] = await db.insert(tenantSettings).values(setting).returning();
    return newSetting;
  }

  async updateTenantSetting(id: number, setting: Partial<InsertTenantSetting>): Promise<TenantSetting | undefined> {
    const [updatedSetting] = await db.update(tenantSettings)
      .set(setting)
      .where(eq(tenantSettings.id, id))
      .returning();
    return updatedSetting;
  }

  // Modified to match IStorage interface
  async deleteTenantSetting(tenantId: number, key: string): Promise<boolean> {
    const [deletedSetting] = await db.delete(tenantSettings)
      .where(and(
        eq(tenantSettings.key, key),
        eq(tenantSettings.tenantId, tenantId)
      ))
      .returning({ id: tenantSettings.id });
    return !!deletedSetting;
  }

  // User operations
  async getUsers(tenantId?: number): Promise<User[]> {
    if (tenantId) {
      return await db.select().from(users).where(eq(users.tenantId, tenantId));
    }
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  // Designation operations
  async getDesignations(tenantId: number): Promise<Designation[]> {
    return await db.select().from(designations)
      .where(eq(designations.tenantId, tenantId))
      .orderBy(asc(designations.name));
  }
  
  async getDesignation(id: number, tenantId: number): Promise<Designation | undefined> {
    const [designation] = await db.select().from(designations)
      .where(and(
        eq(designations.id, id),
        eq(designations.tenantId, tenantId)
      ));
    return designation;
  }
  
  async createDesignation(designation: InsertDesignation): Promise<Designation> {
    const [newDesignation] = await db.insert(designations).values(designation).returning();
    return newDesignation;
  }
  
  async updateDesignation(id: number, designation: Partial<InsertDesignation>): Promise<Designation | undefined> {
    const [updatedDesignation] = await db.update(designations)
      .set(designation)
      .where(eq(designations.id, id))
      .returning();
    return updatedDesignation;
  }
  
  async deleteDesignation(id: number, tenantId: number): Promise<boolean> {
    const [deletedDesignation] = await db.delete(designations)
      .where(and(
        eq(designations.id, id),
        eq(designations.tenantId, tenantId)
      ))
      .returning({ id: designations.id });
    return !!deletedDesignation;
  }
  
  // Department operations
  async getDepartments(tenantId: number): Promise<Department[]> {
    return await db.select().from(departments)
      .where(eq(departments.tenantId, tenantId))
      .orderBy(asc(departments.name));
  }
  
  async getDepartment(id: number, tenantId: number): Promise<Department | undefined> {
    const [department] = await db.select().from(departments)
      .where(and(
        eq(departments.id, id),
        eq(departments.tenantId, tenantId)
      ));
    return department;
  }
  
  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDepartment] = await db.insert(departments).values(department).returning();
    return newDepartment;
  }
  
  async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [updatedDepartment] = await db.update(departments)
      .set(department)
      .where(eq(departments.id, id))
      .returning();
    return updatedDepartment;
  }
  
  async deleteDepartment(id: number, tenantId: number): Promise<boolean> {
    const [deletedDepartment] = await db.delete(departments)
      .where(and(
        eq(departments.id, id),
        eq(departments.tenantId, tenantId)
      ))
      .returning({ id: departments.id });
    return !!deletedDepartment;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Use the same password hash format as in the auth.ts file
    const userData = { ...user };
    
    // Don't double-hash if password is already in our format with salt (hash.salt)
    if (userData.password && !userData.password.includes('.')) {
      const scryptAsync = promisify(scrypt);
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(userData.password, salt, 64)) as Buffer;
      userData.password = `${buf.toString("hex")}.${salt}`;
    }
    
    const [newUser] = await db.insert(users).values(userData).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    // Use the same password hash format as in auth.ts
    const userData = { ...user };
    
    // Don't double-hash if password is already in our format with salt (hash.salt)
    if (userData.password && !userData.password.includes('.')) {
      const scryptAsync = promisify(scrypt);
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(userData.password, salt, 64)) as Buffer;
      userData.password = `${buf.toString("hex")}.${salt}`;
    }
    
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number, tenantId?: number): Promise<boolean> {
    let query = db.delete(users).where(eq(users.id, id));
    
    if (tenantId) {
      query = query.where(eq(users.tenantId, tenantId));
    }
    
    const [deletedUser] = await query.returning({ id: users.id });
    return !!deletedUser;
  }

  // Country operations
  async getCountries(): Promise<Country[]> {
    return await db.select().from(countries).orderBy(asc(countries.name));
  }

  async getCountry(id: number): Promise<Country | undefined> {
    const [country] = await db.select().from(countries).where(eq(countries.id, id));
    return country;
  }

  async createCountry(country: InsertCountry): Promise<Country> {
    const [newCountry] = await db.insert(countries).values(country).returning();
    return newCountry;
  }

  async updateCountry(id: number, country: Partial<InsertCountry>): Promise<Country | undefined> {
    const [updatedCountry] = await db.update(countries)
      .set(country)
      .where(eq(countries.id, id))
      .returning();
    return updatedCountry;
  }

  async deleteCountry(id: number): Promise<boolean> {
    const [deletedCountry] = await db.delete(countries)
      .where(eq(countries.id, id))
      .returning({ id: countries.id });
    return !!deletedCountry;
  }

  // Currency operations
  async getCurrencies(): Promise<Currency[]> {
    return await db.select().from(currencies).orderBy(asc(currencies.code));
  }

  async getCurrency(id: number): Promise<Currency | undefined> {
    const [currency] = await db.select().from(currencies).where(eq(currencies.id, id));
    return currency;
  }

  async createCurrency(currency: InsertCurrency): Promise<Currency> {
    const [newCurrency] = await db.insert(currencies).values(currency).returning();
    return newCurrency;
  }

  async updateCurrency(id: number, currency: Partial<InsertCurrency>): Promise<Currency | undefined> {
    const [updatedCurrency] = await db.update(currencies)
      .set(currency)
      .where(eq(currencies.id, id))
      .returning();
    return updatedCurrency;
  }

  async deleteCurrency(id: number): Promise<boolean> {
    const [deletedCurrency] = await db.delete(currencies)
      .where(eq(currencies.id, id))
      .returning({ id: currencies.id });
    return !!deletedCurrency;
  }

  // State operations
  async getStates(countryId?: number): Promise<State[]> {
    if (countryId) {
      return await db.select().from(states)
        .where(eq(states.countryId, countryId))
        .orderBy(asc(states.name));
    }
    return await db.select().from(states).orderBy(asc(states.name));
  }

  async getState(id: number): Promise<State | undefined> {
    const [state] = await db.select().from(states).where(eq(states.id, id));
    return state;
  }

  async createState(state: InsertState): Promise<State> {
    const [newState] = await db.insert(states).values(state).returning();
    return newState;
  }

  async updateState(id: number, state: Partial<InsertState>): Promise<State | undefined> {
    const [updatedState] = await db.update(states)
      .set(state)
      .where(eq(states.id, id))
      .returning();
    return updatedState;
  }

  async deleteState(id: number): Promise<boolean> {
    const [deletedState] = await db.delete(states)
      .where(eq(states.id, id))
      .returning({ id: states.id });
    return !!deletedState;
  }

  // Entity Type operations
  async getEntityTypes(): Promise<EntityType[]> {
    return await db.select().from(entityTypes).orderBy(asc(entityTypes.name));
  }

  async getEntityType(id: number): Promise<EntityType | undefined> {
    const [entityType] = await db.select().from(entityTypes).where(eq(entityTypes.id, id));
    return entityType;
  }

  async createEntityType(entityType: InsertEntityType): Promise<EntityType> {
    const [newEntityType] = await db.insert(entityTypes).values(entityType).returning();
    return newEntityType;
  }

  async updateEntityType(id: number, entityType: Partial<InsertEntityType>): Promise<EntityType | undefined> {
    const [updatedEntityType] = await db.update(entityTypes)
      .set(entityType)
      .where(eq(entityTypes.id, id))
      .returning();
    return updatedEntityType;
  }

  async deleteEntityType(id: number): Promise<boolean> {
    const [deletedEntityType] = await db.delete(entityTypes)
      .where(eq(entityTypes.id, id))
      .returning({ id: entityTypes.id });
    return !!deletedEntityType;
  }

  // Service Type operations
  async getServiceTypes(tenantId: number, countryId?: number): Promise<ServiceType[]> {
    let query = db.select().from(serviceTypes)
      .where(eq(serviceTypes.tenantId, tenantId))
      .orderBy(asc(serviceTypes.name));
      
    if (countryId) {
      query = query.where(eq(serviceTypes.countryId, countryId));
    }
    
    return await query;
  }

  async getServiceType(id: number, tenantId: number): Promise<ServiceType | undefined> {
    const [serviceType] = await db.select().from(serviceTypes)
      .where(and(
        eq(serviceTypes.id, id),
        eq(serviceTypes.tenantId, tenantId)
      ));
    return serviceType;
  }

  async createServiceType(serviceType: InsertServiceType): Promise<ServiceType> {
    const [newServiceType] = await db.insert(serviceTypes).values(serviceType).returning();
    return newServiceType;
  }

  async updateServiceType(id: number, serviceType: Partial<InsertServiceType>): Promise<ServiceType | undefined> {
    const [updatedServiceType] = await db.update(serviceTypes)
      .set(serviceType)
      .where(eq(serviceTypes.id, id))
      .returning();
    return updatedServiceType;
  }

  async deleteServiceType(id: number, tenantId: number): Promise<boolean> {
    const [deletedServiceType] = await db.delete(serviceTypes)
      .where(and(
        eq(serviceTypes.id, id),
        eq(serviceTypes.tenantId, tenantId)
      ))
      .returning({ id: serviceTypes.id });
    return !!deletedServiceType;
  }

  // Task Status operations
  async getTaskStatuses(tenantId?: number): Promise<TaskStatus[]> {
    if (tenantId) {
      return await db.select().from(taskStatuses)
        .where(eq(taskStatuses.tenantId, tenantId))
        .orderBy(asc(taskStatuses.name));
    }
    return await db.select().from(taskStatuses).orderBy(asc(taskStatuses.name));
  }

  async getTaskStatus(id: number, tenantId?: number): Promise<TaskStatus | undefined> {
    if (tenantId) {
      const [taskStatus] = await db.select().from(taskStatuses)
        .where(and(
          eq(taskStatuses.id, id),
          eq(taskStatuses.tenantId, tenantId)
        ));
      return taskStatus;
    }
    const [taskStatus] = await db.select().from(taskStatuses)
      .where(eq(taskStatuses.id, id));
    return taskStatus;
  }

  async createTaskStatus(taskStatus: InsertTaskStatus): Promise<TaskStatus> {
    const [newTaskStatus] = await db.insert(taskStatuses).values(taskStatus).returning();
    return newTaskStatus;
  }

  async updateTaskStatus(id: number, taskStatus: Partial<InsertTaskStatus>): Promise<TaskStatus | undefined> {
    const [updatedTaskStatus] = await db.update(taskStatuses)
      .set(taskStatus)
      .where(eq(taskStatuses.id, id))
      .returning();
    return updatedTaskStatus;
  }

  async deleteTaskStatus(id: number, tenantId?: number): Promise<boolean> {
    if (tenantId) {
      const [deletedTaskStatus] = await db.delete(taskStatuses)
        .where(and(
          eq(taskStatuses.id, id),
          eq(taskStatuses.tenantId, tenantId)
        ))
        .returning({ id: taskStatuses.id });
      return !!deletedTaskStatus;
    }
    const [deletedTaskStatus] = await db.delete(taskStatuses)
      .where(eq(taskStatuses.id, id))
      .returning({ id: taskStatuses.id });
    return !!deletedTaskStatus;
  }

  // Task Category operations
  async getTaskCategories(tenantId: number, isAdmin?: boolean): Promise<TaskCategory[]> {
    let query = db.select().from(taskCategories)
      .where(eq(taskCategories.tenantId, tenantId))
      .orderBy(asc(taskCategories.name));
    
    if (isAdmin !== undefined) {
      query = query.where(eq(taskCategories.isAdmin, isAdmin));
    }
    
    return await query;
  }
  
  async getTaskCategory(id: number, tenantId: number): Promise<TaskCategory | undefined> {
    const [category] = await db.select().from(taskCategories)
      .where(and(
        eq(taskCategories.id, id),
        eq(taskCategories.tenantId, tenantId)
      ));
    return category;
  }
  
  async createTaskCategory(taskCategory: InsertTaskCategory): Promise<TaskCategory> {
    const [newTaskCategory] = await db.insert(taskCategories).values(taskCategory).returning();
    return newTaskCategory;
  }
  
  async updateTaskCategory(id: number, taskCategory: Partial<InsertTaskCategory>): Promise<TaskCategory | undefined> {
    const [updatedTaskCategory] = await db.update(taskCategories)
      .set(taskCategory)
      .where(eq(taskCategories.id, id))
      .returning();
    return updatedTaskCategory;
  }
  
  async deleteTaskCategory(id: number, tenantId: number): Promise<boolean> {
    const [deletedTaskCategory] = await db.delete(taskCategories)
      .where(and(
        eq(taskCategories.id, id),
        eq(taskCategories.tenantId, tenantId)
      ))
      .returning({ id: taskCategories.id });
    return !!deletedTaskCategory;
  }

  // Task Status Workflow Rule operations
  async getTaskStatusWorkflowRules(tenantId?: number): Promise<TaskStatusWorkflowRule[]> {
    if (tenantId) {
      return await db.select().from(taskStatusWorkflowRules)
        .where(eq(taskStatusWorkflowRules.tenantId, tenantId));
    }
    return await db.select().from(taskStatusWorkflowRules);
  }

  async getTaskStatusWorkflowRule(id: number, tenantId?: number): Promise<TaskStatusWorkflowRule | undefined> {
    if (tenantId) {
      const [rule] = await db.select().from(taskStatusWorkflowRules)
        .where(and(
          eq(taskStatusWorkflowRules.id, id),
          eq(taskStatusWorkflowRules.tenantId, tenantId)
        ));
      return rule;
    }
    const [rule] = await db.select().from(taskStatusWorkflowRules)
      .where(eq(taskStatusWorkflowRules.id, id));
    return rule;
  }

  async getTaskStatusWorkflowRuleByStatuses(
    fromStatusId: number,
    toStatusId: number,
    tenantId: number
  ): Promise<TaskStatusWorkflowRule | undefined> {
    const [rule] = await db.select().from(taskStatusWorkflowRules)
      .where(and(
        eq(taskStatusWorkflowRules.fromStatusId, fromStatusId),
        eq(taskStatusWorkflowRules.toStatusId, toStatusId),
        eq(taskStatusWorkflowRules.tenantId, tenantId)
      ));
    return rule;
  }

  async createTaskStatusWorkflowRule(rule: InsertTaskStatusWorkflowRule): Promise<TaskStatusWorkflowRule> {
    const [newRule] = await db.insert(taskStatusWorkflowRules).values(rule).returning();
    return newRule;
  }

  async updateTaskStatusWorkflowRule(
    id: number,
    rule: Partial<InsertTaskStatusWorkflowRule>
  ): Promise<TaskStatusWorkflowRule | undefined> {
    const [updatedRule] = await db.update(taskStatusWorkflowRules)
      .set(rule)
      .where(eq(taskStatusWorkflowRules.id, id))
      .returning();
    return updatedRule;
  }

  async deleteTaskStatusWorkflowRule(id: number, tenantId?: number): Promise<boolean> {
    if (tenantId) {
      const [deletedRule] = await db.delete(taskStatusWorkflowRules)
        .where(and(
          eq(taskStatusWorkflowRules.id, id),
          eq(taskStatusWorkflowRules.tenantId, tenantId)
        ))
        .returning({ id: taskStatusWorkflowRules.id });
      return !!deletedRule;
    }
    const [deletedRule] = await db.delete(taskStatusWorkflowRules)
      .where(eq(taskStatusWorkflowRules.id, id))
      .returning({ id: taskStatusWorkflowRules.id });
    return !!deletedRule;
  }

  // Finance Module Implementation

  // Invoice operations
  async getInvoices(tenantId: number, clientId?: number, entityId?: number, status?: string): Promise<Invoice[]> {
    let query = db.select().from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.isDeleted, false)
      ));
    
    if (clientId) {
      query = query.where(eq(invoices.clientId, clientId));
    }
    
    if (entityId) {
      query = query.where(eq(invoices.entityId, entityId));
    }
    
    if (status) {
      query = query.where(eq(invoices.status, status));
    }
    
    return await query.orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number, tenantId: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices)
      .where(and(
        eq(invoices.id, id),
        eq(invoices.tenantId, tenantId),
        eq(invoices.isDeleted, false)
      ));
    return invoice;
  }

  async getInvoiceByNumber(invoiceNumber: string, tenantId: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices)
      .where(and(
        eq(invoices.invoiceNumber, invoiceNumber),
        eq(invoices.tenantId, tenantId),
        eq(invoices.isDeleted, false)
      ));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    // Add updatedAt timestamp
    const updateData = {
      ...invoice,
      updatedAt: new Date()
    };
    
    const [updatedInvoice] = await db.update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: number, tenantId: number): Promise<boolean> {
    // Soft delete by setting isDeleted flag
    const [deletedInvoice] = await db.update(invoices)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(
        eq(invoices.id, id),
        eq(invoices.tenantId, tenantId)
      ))
      .returning({ id: invoices.id });
    return !!deletedInvoice;
  }

  // Invoice Line Item operations
  async getInvoiceLineItems(tenantId: number, invoiceId: number): Promise<InvoiceLineItem[]> {
    return await db.select().from(invoiceLineItems)
      .where(and(
        eq(invoiceLineItems.tenantId, tenantId),
        eq(invoiceLineItems.invoiceId, invoiceId)
      ))
      .orderBy(asc(invoiceLineItems.sortOrder));
  }

  async getInvoiceLineItem(id: number, tenantId: number): Promise<InvoiceLineItem | undefined> {
    const [lineItem] = await db.select().from(invoiceLineItems)
      .where(and(
        eq(invoiceLineItems.id, id),
        eq(invoiceLineItems.tenantId, tenantId)
      ));
    return lineItem;
  }

  async createInvoiceLineItem(lineItem: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const [newLineItem] = await db.insert(invoiceLineItems).values(lineItem).returning();
    
    // Update invoice totals
    const invoice = await this.getInvoice(lineItem.invoiceId, lineItem.tenantId);
    if (invoice) {
      const lineTotal = parseFloat(newLineItem.lineTotal);
      await this.updateInvoice(invoice.id, {
        subtotal: (parseFloat(invoice.subtotal) + lineTotal).toString(),
        totalAmount: (parseFloat(invoice.totalAmount) + lineTotal).toString(),
        amountDue: (parseFloat(invoice.amountDue) + lineTotal).toString()
      });
    }
    
    return newLineItem;
  }

  async updateInvoiceLineItem(id: number, lineItem: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem | undefined> {
    // Get current line item to calculate difference
    const currentLineItem = await this.getInvoiceLineItem(id, lineItem.tenantId as number);
    if (!currentLineItem) return undefined;
    
    const [updatedLineItem] = await db.update(invoiceLineItems)
      .set(lineItem)
      .where(eq(invoiceLineItems.id, id))
      .returning();
    
    // Update invoice totals if line total changed
    if (updatedLineItem && lineItem.lineTotal && currentLineItem.lineTotal !== lineItem.lineTotal) {
      const invoice = await this.getInvoice(currentLineItem.invoiceId, currentLineItem.tenantId);
      if (invoice) {
        const lineTotalDiff = parseFloat(lineItem.lineTotal) - parseFloat(currentLineItem.lineTotal);
        await this.updateInvoice(invoice.id, {
          subtotal: (parseFloat(invoice.subtotal) + lineTotalDiff).toString(),
          totalAmount: (parseFloat(invoice.totalAmount) + lineTotalDiff).toString(),
          amountDue: (parseFloat(invoice.amountDue) + lineTotalDiff).toString()
        });
      }
    }
    
    return updatedLineItem;
  }

  async deleteInvoiceLineItem(id: number, tenantId: number): Promise<boolean> {
    // Get line item to adjust invoice totals
    const lineItem = await this.getInvoiceLineItem(id, tenantId);
    if (!lineItem) return false;
    
    const [deletedLineItem] = await db.delete(invoiceLineItems)
      .where(and(
        eq(invoiceLineItems.id, id),
        eq(invoiceLineItems.tenantId, tenantId)
      ))
      .returning({ id: invoiceLineItems.id });
    
    // Update invoice totals
    if (deletedLineItem) {
      const invoice = await this.getInvoice(lineItem.invoiceId, tenantId);
      if (invoice) {
        const lineTotal = parseFloat(lineItem.lineTotal);
        await this.updateInvoice(invoice.id, {
          subtotal: (parseFloat(invoice.subtotal) - lineTotal).toString(),
          totalAmount: (parseFloat(invoice.totalAmount) - lineTotal).toString(),
          amountDue: (parseFloat(invoice.amountDue) - lineTotal).toString()
        });
      }
    }
    
    return !!deletedLineItem;
  }

  // Payment operations
  async getPayments(tenantId: number, invoiceId?: number): Promise<Payment[]> {
    let query = db.select().from(payments)
      .where(eq(payments.tenantId, tenantId));
    
    if (invoiceId) {
      query = query.where(eq(payments.invoiceId, invoiceId));
    }
    
    return await query.orderBy(desc(payments.paymentDate));
  }

  async getPayment(id: number, tenantId: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments)
      .where(and(
        eq(payments.id, id),
        eq(payments.tenantId, tenantId)
      ));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    
    // Update invoice payment status
    const invoice = await this.getInvoice(newPayment.invoiceId, newPayment.tenantId);
    if (invoice) {
      const paymentAmount = parseFloat(newPayment.amount);
      const amountPaid = parseFloat(invoice.amountPaid) + paymentAmount;
      const amountDue = Math.max(0, parseFloat(invoice.totalAmount) - amountPaid);
      
      // Determine new status
      let status = invoice.status;
      if (amountPaid >= parseFloat(invoice.totalAmount)) {
        status = 'paid';
      } else if (amountPaid > 0) {
        status = 'partially_paid';
      }
      
      await this.updateInvoice(invoice.id, {
        amountPaid: amountPaid.toString(),
        amountDue: amountDue.toString(),
        status
      });
    }
    
    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    // Get current payment to calculate difference
    const currentPayment = await this.getPayment(id, payment.tenantId as number);
    if (!currentPayment) return undefined;
    
    const [updatedPayment] = await db.update(payments)
      .set(payment)
      .where(eq(payments.id, id))
      .returning();
    
    // Update invoice payment status if amount changed
    if (updatedPayment && payment.amount && currentPayment.amount !== payment.amount) {
      const invoice = await this.getInvoice(currentPayment.invoiceId, currentPayment.tenantId);
      if (invoice) {
        // First, subtract the old payment amount
        let amountPaid = parseFloat(invoice.amountPaid) - parseFloat(currentPayment.amount);
        
        // Then add the new payment amount
        amountPaid += parseFloat(payment.amount);
        
        const amountDue = Math.max(0, parseFloat(invoice.totalAmount) - amountPaid);
        
        // Determine new status
        let status = invoice.status;
        if (amountPaid >= parseFloat(invoice.totalAmount)) {
          status = 'paid';
        } else if (amountPaid > 0) {
          status = 'partial';
        } else {
          status = 'sent';
        }
        
        await this.updateInvoice(invoice.id, {
          amountPaid: amountPaid.toString(),
          amountDue: amountDue.toString(),
          status
        });
      }
    }
    
    return updatedPayment;
  }

  async deletePayment(id: number, tenantId: number): Promise<boolean> {
    // Get payment to adjust invoice totals
    const payment = await this.getPayment(id, tenantId);
    if (!payment) return false;
    
    const [deletedPayment] = await db.delete(payments)
      .where(and(
        eq(payments.id, id),
        eq(payments.tenantId, tenantId)
      ))
      .returning({ id: payments.id });
    
    // Update invoice payment status
    if (deletedPayment) {
      const invoice = await this.getInvoice(payment.invoiceId, tenantId);
      if (invoice) {
        const paymentAmount = parseFloat(payment.amount);
        const amountPaid = Math.max(0, parseFloat(invoice.amountPaid) - paymentAmount);
        const amountDue = parseFloat(invoice.totalAmount) - amountPaid;
        
        // Determine new status
        let status = invoice.status;
        if (amountPaid >= parseFloat(invoice.totalAmount)) {
          status = 'paid';
        } else if (amountPaid > 0) {
          status = 'partial';
        } else {
          status = 'sent';
        }
        
        await this.updateInvoice(invoice.id, {
          amountPaid: amountPaid.toString(),
          amountDue: amountDue.toString(),
          status
        });
      }
    }
    
    return !!deletedPayment;
  }

  // Payment Gateway Settings operations
  async getPaymentGatewaySettings(tenantId: number): Promise<PaymentGatewaySetting[]> {
    return await db.select().from(paymentGatewaySettings)
      .where(eq(paymentGatewaySettings.tenantId, tenantId));
  }

  async getPaymentGatewaySetting(tenantId: number, gatewayType: string): Promise<PaymentGatewaySetting | undefined> {
    const [setting] = await db.select().from(paymentGatewaySettings)
      .where(and(
        eq(paymentGatewaySettings.tenantId, tenantId),
        eq(paymentGatewaySettings.gatewayType, gatewayType)
      ));
    return setting;
  }

  async createPaymentGatewaySetting(setting: InsertPaymentGatewaySetting): Promise<PaymentGatewaySetting> {
    const [newSetting] = await db.insert(paymentGatewaySettings).values(setting).returning();
    return newSetting;
  }

  async updatePaymentGatewaySetting(id: number, setting: Partial<InsertPaymentGatewaySetting>): Promise<PaymentGatewaySetting | undefined> {
    // Add updatedAt timestamp
    const updateData = {
      ...setting,
      updatedAt: new Date()
    };
    
    const [updatedSetting] = await db.update(paymentGatewaySettings)
      .set(updateData)
      .where(eq(paymentGatewaySettings.id, id))
      .returning();
    return updatedSetting;
  }

  async deletePaymentGatewaySetting(id: number, tenantId: number): Promise<boolean> {
    const [deletedSetting] = await db.delete(paymentGatewaySettings)
      .where(and(
        eq(paymentGatewaySettings.id, id),
        eq(paymentGatewaySettings.tenantId, tenantId)
      ))
      .returning({ id: paymentGatewaySettings.id });
    return !!deletedSetting;
  }
  
  // Task operations
  async getTasks(tenantId?: number, clientId?: number, entityId?: number, statusId?: number): Promise<Task[]> {
    let query = db.select().from(tasks);
    
    if (tenantId) {
      query = query.where(eq(tasks.tenantId, tenantId));
    }
    
    if (clientId) {
      query = query.where(eq(tasks.clientId, clientId));
    }
    
    if (entityId) {
      query = query.where(eq(tasks.entityId, entityId));
    }
    
    if (statusId) {
      query = query.where(eq(tasks.statusId, statusId));
    }
    
    return await query.orderBy(desc(tasks.dueDate));
  }
  
  async getTask(id: number, tenantId?: number): Promise<Task | undefined> {
    let query = db.select().from(tasks).where(eq(tasks.id, id));
    
    if (tenantId) {
      query = query.where(eq(tasks.tenantId, tenantId));
    }
    
    const [task] = await query;
    return task;
  }
  
  async createTask(task: InsertTask): Promise<Task> {
    const taskData = {
      ...task,
      isAutoGenerated: task.isAutoGenerated || false,
      parentTaskId: task.parentTaskId || null,
      needsApproval: task.needsApproval || false,
    };
    
    const [newTask] = await db.insert(tasks).values(taskData).returning();
    return newTask;
  }
  
  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updatedTask] = await db.update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }
  
  async deleteTask(id: number, tenantId?: number): Promise<boolean> {
    let query = db.delete(tasks).where(eq(tasks.id, id));
    
    if (tenantId) {
      query = query.where(eq(tasks.tenantId, tenantId));
    }
    
    const [deletedTask] = await query.returning({ id: tasks.id });
    return !!deletedTask;
  }

  // Chart of Accounts operations
  async getChartOfAccounts(tenantId: number, accountType?: string): Promise<ChartOfAccount[]> {
    let query = db.select().from(chartOfAccounts)
      .where(eq(chartOfAccounts.tenantId, tenantId));
    
    if (accountType) {
      query = query.where(eq(chartOfAccounts.accountType, accountType));
    }
    
    return await query.orderBy(asc(chartOfAccounts.accountCode));
  }

  async getChartOfAccount(id: number, tenantId: number): Promise<ChartOfAccount | undefined> {
    const [account] = await db.select().from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.id, id),
        eq(chartOfAccounts.tenantId, tenantId)
      ));
    return account;
  }

  async getChartOfAccountByCode(accountCode: string, tenantId: number): Promise<ChartOfAccount | undefined> {
    const [account] = await db.select().from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.accountCode, accountCode),
        eq(chartOfAccounts.tenantId, tenantId)
      ));
    return account;
  }

  async createChartOfAccount(account: InsertChartOfAccount): Promise<ChartOfAccount> {
    const [newAccount] = await db.insert(chartOfAccounts).values(account).returning();
    return newAccount;
  }

  async updateChartOfAccount(id: number, account: Partial<InsertChartOfAccount>): Promise<ChartOfAccount | undefined> {
    // Add updatedAt timestamp
    const updateData = {
      ...account,
      updatedAt: new Date()
    };
    
    const [updatedAccount] = await db.update(chartOfAccounts)
      .set(updateData)
      .where(eq(chartOfAccounts.id, id))
      .returning();
    return updatedAccount;
  }

  async deleteChartOfAccount(id: number, tenantId: number): Promise<boolean> {
    const [deletedAccount] = await db.delete(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.id, id),
        eq(chartOfAccounts.tenantId, tenantId)
      ))
      .returning({ id: chartOfAccounts.id });
    return !!deletedAccount;
  }
}