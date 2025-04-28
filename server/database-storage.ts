import { 
  tenants, tenantSettings, users, designations, departments, countries, currencies, states, 
  entityTypes, taskStatuses, taskStatusWorkflowRules, taxJurisdictions, serviceTypes, 
  clients, entities, tasks, taskCategories, entityTaxJurisdictions, entityServiceSubscriptions, 
  userPermissions, invoices, invoiceLineItems, payments, paymentGatewaySettings, chartOfAccounts,
  journalEntries, journalEntryLines, journalEntryTypes,
  // Chart of Accounts hierarchical structure
  chartOfAccountsMainGroups, chartOfAccountsElementGroups, chartOfAccountsSubElementGroups, chartOfAccountsDetailedGroups
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
  ChartOfAccount, InsertChartOfAccount,
  // Chart of Accounts hierarchy types
  ChartOfAccountsMainGroup, InsertChartOfAccountsMainGroup, 
  ChartOfAccountsElementGroup, InsertChartOfAccountsElementGroup,
  ChartOfAccountsSubElementGroup, InsertChartOfAccountsSubElementGroup,
  ChartOfAccountsDetailedGroup, InsertChartOfAccountsDetailedGroup, 
  // Journal entry types
  JournalEntry, InsertJournalEntry, JournalEntryLine, InsertJournalEntryLine,
  JournalEntryType, InsertJournalEntryType
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, ne, and, isNull, asc, desc, inArray } from "drizzle-orm";
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
  async getStates(tenantId: number, countryId?: number): Promise<State[]> {
    try {
      let query = db.select().from(states).where(eq(states.tenantId, tenantId));
      
      if (countryId) {
        query = query.where(eq(states.countryId, countryId));
      }
      
      return await query.orderBy(asc(states.name));
    } catch (error) {
      console.error("DB Error fetching states:", error);
      throw error;
    }
  }

  async getState(id: number, tenantId: number): Promise<State | undefined> {
    try {
      const [state] = await db.select().from(states)
        .where(and(
          eq(states.id, id),
          eq(states.tenantId, tenantId)
        ));
      return state;
    } catch (error) {
      console.error("DB Error fetching state:", error);
      throw error;
    }
  }

  async createState(state: InsertState): Promise<State> {
    try {
      console.log("DB: Creating state with data:", state);
      const [newState] = await db.insert(states).values(state).returning();
      console.log("DB: State created successfully:", newState);
      return newState;
    } catch (error) {
      console.error("DB Error creating state:", error);
      throw error;
    }
  }

  async updateState(id: number, state: Partial<InsertState>): Promise<State | undefined> {
    const [updatedState] = await db.update(states)
      .set(state)
      .where(eq(states.id, id))
      .returning();
    return updatedState;
  }

  async deleteState(id: number, tenantId: number): Promise<boolean> {
    try {
      const [deletedState] = await db.delete(states)
        .where(and(
          eq(states.id, id),
          eq(states.tenantId, tenantId)
        ))
        .returning({ id: states.id });
      return !!deletedState;
    } catch (error) {
      console.error("DB Error deleting state:", error);
      throw error;
    }
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

  // Tax Jurisdiction operations
  async getTaxJurisdictions(tenantId: number, countryId?: number): Promise<TaxJurisdiction[]> {
    try {
      let query = db.select().from(taxJurisdictions)
        .where(eq(taxJurisdictions.tenantId, tenantId));
        
      if (countryId) {
        query = query.where(eq(taxJurisdictions.countryId, countryId));
      }
      
      return await query.orderBy(asc(taxJurisdictions.name));
    } catch (error) {
      console.error("DB Error fetching tax jurisdictions:", error);
      throw error;
    }
  }

  async getTaxJurisdiction(id: number, tenantId: number): Promise<TaxJurisdiction | undefined> {
    try {
      const [taxJurisdiction] = await db.select().from(taxJurisdictions)
        .where(and(
          eq(taxJurisdictions.id, id),
          eq(taxJurisdictions.tenantId, tenantId)
        ));
      return taxJurisdiction;
    } catch (error) {
      console.error("DB Error fetching tax jurisdiction:", error);
      throw error;
    }
  }

  async createTaxJurisdiction(taxJurisdiction: InsertTaxJurisdiction): Promise<TaxJurisdiction> {
    try {
      console.log("DB: Creating tax jurisdiction with data:", taxJurisdiction);
      const [newTaxJurisdiction] = await db.insert(taxJurisdictions).values(taxJurisdiction).returning();
      console.log("DB: Tax jurisdiction created successfully:", newTaxJurisdiction);
      return newTaxJurisdiction;
    } catch (error) {
      console.error("DB Error creating tax jurisdiction:", error);
      throw error;
    }
  }

  async updateTaxJurisdiction(id: number, taxJurisdiction: Partial<InsertTaxJurisdiction>): Promise<TaxJurisdiction | undefined> {
    try {
      const [updatedTaxJurisdiction] = await db.update(taxJurisdictions)
        .set(taxJurisdiction)
        .where(eq(taxJurisdictions.id, id))
        .returning();
      return updatedTaxJurisdiction;
    } catch (error) {
      console.error("DB Error updating tax jurisdiction:", error);
      throw error;
    }
  }

  async deleteTaxJurisdiction(id: number, tenantId: number): Promise<boolean> {
    try {
      const [deletedTaxJurisdiction] = await db.delete(taxJurisdictions)
        .where(and(
          eq(taxJurisdictions.id, id),
          eq(taxJurisdictions.tenantId, tenantId)
        ))
        .returning({ id: taxJurisdictions.id });
      return !!deletedTaxJurisdiction;
    } catch (error) {
      console.error("DB Error deleting tax jurisdiction:", error);
      throw error;
    }
  }

  // Entity Tax Jurisdiction operations
  async getEntityTaxJurisdictions(tenantId: number, entityId: number): Promise<EntityTaxJurisdiction[]> {
    try {
      return await db.select().from(entityTaxJurisdictions)
        .where(and(
          eq(entityTaxJurisdictions.tenantId, tenantId),
          eq(entityTaxJurisdictions.entityId, entityId)
        ));
    } catch (error) {
      console.error("DB Error fetching entity tax jurisdictions:", error);
      throw error;
    }
  }

  async getTaxJurisdictionsForEntity(tenantId: number, entityId: number): Promise<TaxJurisdiction[]> {
    try {
      const entityTaxJurisdictionItems = await this.getEntityTaxJurisdictions(tenantId, entityId);
      if (entityTaxJurisdictionItems.length === 0) return [];
      
      const taxJurisdictionIds = entityTaxJurisdictionItems.map(item => item.taxJurisdictionId);
      
      return await db.select().from(taxJurisdictions)
        .where(and(
          eq(taxJurisdictions.tenantId, tenantId),
          inArray(taxJurisdictions.id, taxJurisdictionIds)
        ))
        .orderBy(asc(taxJurisdictions.name));
    } catch (error) {
      console.error("DB Error fetching tax jurisdictions for entity:", error);
      throw error;
    }
  }

  async addTaxJurisdictionToEntity(entityTaxJurisdiction: InsertEntityTaxJurisdiction): Promise<EntityTaxJurisdiction> {
    try {
      // Check if already associated
      const existing = await db.select().from(entityTaxJurisdictions)
        .where(and(
          eq(entityTaxJurisdictions.entityId, entityTaxJurisdiction.entityId),
          eq(entityTaxJurisdictions.taxJurisdictionId, entityTaxJurisdiction.taxJurisdictionId)
        ));
      
      if (existing.length > 0) {
        throw new Error("Tax jurisdiction is already associated with this entity");
      }
      
      const [newEntityTaxJurisdiction] = await db.insert(entityTaxJurisdictions)
        .values(entityTaxJurisdiction)
        .returning();
      return newEntityTaxJurisdiction;
    } catch (error) {
      console.error("DB Error adding tax jurisdiction to entity:", error);
      throw error;
    }
  }

  async removeTaxJurisdictionFromEntity(tenantId: number, entityId: number, taxJurisdictionId: number): Promise<boolean> {
    try {
      const [deleted] = await db.delete(entityTaxJurisdictions)
        .where(and(
          eq(entityTaxJurisdictions.tenantId, tenantId),
          eq(entityTaxJurisdictions.entityId, entityId),
          eq(entityTaxJurisdictions.taxJurisdictionId, taxJurisdictionId)
        ))
        .returning({ id: entityTaxJurisdictions.id });
      return !!deleted;
    } catch (error) {
      console.error("DB Error removing tax jurisdiction from entity:", error);
      throw error;
    }
  }
  
  // Entity Service Subscription operations
  async getEntityServiceSubscriptions(tenantId: number, entityId: number): Promise<EntityServiceSubscription[]> {
    try {
      console.log("DB: Fetching service subscriptions for entity:", entityId);
      const result = await db.select().from(entityServiceSubscriptions)
        .where(and(
          eq(entityServiceSubscriptions.tenantId, tenantId),
          eq(entityServiceSubscriptions.entityId, entityId)
        ));
      console.log(`DB: Found ${result.length} service subscriptions for entity ${entityId}`);
      return result;
    } catch (error) {
      console.error("DB Error fetching entity service subscriptions:", error);
      throw error;
    }
  }
  
  async getServiceSubscription(id: number, tenantId: number): Promise<EntityServiceSubscription | undefined> {
    try {
      const [subscription] = await db.select().from(entityServiceSubscriptions)
        .where(and(
          eq(entityServiceSubscriptions.id, id),
          eq(entityServiceSubscriptions.tenantId, tenantId)
        ));
      return subscription;
    } catch (error) {
      console.error("DB Error fetching service subscription:", error);
      throw error;
    }
  }
  
  async createServiceSubscription(subscription: InsertEntityServiceSubscription): Promise<EntityServiceSubscription> {
    try {
      console.log("DB: Creating service subscription with data:", subscription);
      
      // Check if subscription already exists
      const existing = await db.select().from(entityServiceSubscriptions)
        .where(and(
          eq(entityServiceSubscriptions.tenantId, subscription.tenantId),
          eq(entityServiceSubscriptions.entityId, subscription.entityId),
          eq(entityServiceSubscriptions.serviceTypeId, subscription.serviceTypeId)
        ));
      
      if (existing.length > 0) {
        // Update existing subscription instead
        const [updated] = await db.update(entityServiceSubscriptions)
          .set({
            isRequired: subscription.isRequired,
            isSubscribed: subscription.isSubscribed
          })
          .where(eq(entityServiceSubscriptions.id, existing[0].id))
          .returning();
        console.log("DB: Service subscription updated instead of creating new:", updated);
        return updated;
      }
      
      // Create new subscription
      const [newSubscription] = await db.insert(entityServiceSubscriptions)
        .values(subscription)
        .returning();
      console.log("DB: Service subscription created successfully:", newSubscription);
      return newSubscription;
    } catch (error) {
      console.error("DB Error creating service subscription:", error);
      throw error;
    }
  }
  
  async updateServiceSubscription(id: number, subscription: Partial<InsertEntityServiceSubscription>): Promise<EntityServiceSubscription | undefined> {
    try {
      console.log("DB: Updating service subscription with ID:", id, "with data:", subscription);
      const [updatedSubscription] = await db.update(entityServiceSubscriptions)
        .set(subscription)
        .where(eq(entityServiceSubscriptions.id, id))
        .returning();
      console.log("DB: Service subscription updated successfully:", updatedSubscription);
      return updatedSubscription;
    } catch (error) {
      console.error("DB Error updating service subscription:", error);
      throw error;
    }
  }
  
  async deleteServiceSubscription(id: number, tenantId: number): Promise<boolean> {
    try {
      const [deleted] = await db.delete(entityServiceSubscriptions)
        .where(and(
          eq(entityServiceSubscriptions.id, id),
          eq(entityServiceSubscriptions.tenantId, tenantId)
        ))
        .returning({ id: entityServiceSubscriptions.id });
      return !!deleted;
    } catch (error) {
      console.error("DB Error deleting service subscription:", error);
      throw error;
    }
  }

  // Client operations
  async getClients(tenantId: number): Promise<Client[]> {
    try {
      console.log("DB: Fetching clients for tenant:", tenantId);
      const result = await db.select().from(clients)
        .where(eq(clients.tenantId, tenantId))
        .orderBy(asc(clients.displayName));
      console.log(`DB: Found ${result.length} clients`);
      return result;
    } catch (error) {
      console.error("DB Error fetching clients:", error);
      throw error;
    }
  }

  async getClient(id: number, tenantId: number): Promise<Client | undefined> {
    try {
      const [client] = await db.select().from(clients)
        .where(and(
          eq(clients.id, id),
          eq(clients.tenantId, tenantId)
        ));
      return client;
    } catch (error) {
      console.error("DB Error fetching client:", error);
      throw error;
    }
  }

  async createClient(client: InsertClient): Promise<Client> {
    try {
      console.log("DB: Creating client with data:", client);
      const [newClient] = await db.insert(clients).values(client).returning();
      console.log("DB: Client created successfully:", newClient);
      return newClient;
    } catch (error) {
      console.error("DB Error creating client:", error);
      throw error;
    }
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    try {
      const [updatedClient] = await db.update(clients)
        .set(client)
        .where(eq(clients.id, id))
        .returning();
      return updatedClient;
    } catch (error) {
      console.error("DB Error updating client:", error);
      throw error;
    }
  }

  async deleteClient(id: number, tenantId: number): Promise<boolean> {
    try {
      const [deletedClient] = await db.delete(clients)
        .where(and(
          eq(clients.id, id),
          eq(clients.tenantId, tenantId)
        ))
        .returning({ id: clients.id });
      return !!deletedClient;
    } catch (error) {
      console.error("DB Error deleting client:", error);
      throw error;
    }
  }

  // Entity operations
  async getEntities(tenantId: number, clientId?: number): Promise<Entity[]> {
    try {
      let query = db.select().from(entities)
        .where(eq(entities.tenantId, tenantId));
        
      if (clientId) {
        query = query.where(eq(entities.clientId, clientId));
      }
      
      return await query.orderBy(asc(entities.name));
    } catch (error) {
      console.error("DB Error fetching entities:", error);
      throw error;
    }
  }

  async getEntity(id: number, tenantId: number): Promise<Entity | undefined> {
    try {
      const [entity] = await db.select().from(entities)
        .where(and(
          eq(entities.id, id),
          eq(entities.tenantId, tenantId)
        ));
      return entity;
    } catch (error) {
      console.error("DB Error fetching entity:", error);
      throw error;
    }
  }

  async createEntity(entity: InsertEntity): Promise<Entity> {
    try {
      console.log("DB: Creating entity with data:", entity);
      const [newEntity] = await db.insert(entities).values(entity).returning();
      console.log("DB: Entity created successfully:", newEntity);
      return newEntity;
    } catch (error) {
      console.error("DB Error creating entity:", error);
      throw error;
    }
  }

  async updateEntity(id: number, entity: Partial<InsertEntity>): Promise<Entity | undefined> {
    try {
      const [updatedEntity] = await db.update(entities)
        .set(entity)
        .where(eq(entities.id, id))
        .returning();
      return updatedEntity;
    } catch (error) {
      console.error("DB Error updating entity:", error);
      throw error;
    }
  }

  async deleteEntity(id: number, tenantId: number): Promise<boolean> {
    try {
      const [deletedEntity] = await db.delete(entities)
        .where(and(
          eq(entities.id, id),
          eq(entities.tenantId, tenantId)
        ))
        .returning({ id: entities.id });
      return !!deletedEntity;
    } catch (error) {
      console.error("DB Error deleting entity:", error);
      throw error;
    }
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
    // Always use the and() operator to combine multiple conditions
    // to ensure proper query construction
    let deleteConditions = [];
    
    // Always filter by ID
    deleteConditions.push(eq(tasks.id, id));
    
    // Only filter by tenant if provided
    if (tenantId) {
      deleteConditions.push(eq(tasks.tenantId, tenantId));
    }
    
    // Execute the delete with the combined conditions
    const [deletedTask] = await db.delete(tasks)
      .where(and(...deleteConditions))
      .returning({ id: tasks.id });
    
    // Log the deletion for debugging
    console.log(`Deleted task with ID: ${id}, tenant ID: ${tenantId}, result: ${!!deletedTask}`);
    
    return !!deletedTask;
  }

  // Chart of Accounts operations
  // Chart of Accounts Hierarchy Operations

  // 1. Main Groups
  async getChartOfAccountsMainGroups(tenantId: number): Promise<any[]> {
    return await db.select()
      .from(chartOfAccountsMainGroups)
      .where(eq(chartOfAccountsMainGroups.tenantId, tenantId))
      .orderBy(asc(chartOfAccountsMainGroups.code));
  }

  async getChartOfAccountsMainGroup(id: number, tenantId: number): Promise<any | undefined> {
    const [mainGroup] = await db.select()
      .from(chartOfAccountsMainGroups)
      .where(and(
        eq(chartOfAccountsMainGroups.id, id),
        eq(chartOfAccountsMainGroups.tenantId, tenantId)
      ));
    return mainGroup;
  }

  async createChartOfAccountsMainGroup(mainGroup: any): Promise<any> {
    const [newMainGroup] = await db.insert(chartOfAccountsMainGroups)
      .values(mainGroup)
      .returning();
    return newMainGroup;
  }

  async updateChartOfAccountsMainGroup(id: number, tenantId: number, mainGroup: any): Promise<any | undefined> {
    // Add updatedAt timestamp
    const updateData = {
      ...mainGroup,
      updatedAt: new Date()
    };
    
    const [updatedMainGroup] = await db.update(chartOfAccountsMainGroups)
      .set(updateData)
      .where(and(
        eq(chartOfAccountsMainGroups.id, id),
        eq(chartOfAccountsMainGroups.tenantId, tenantId)
      ))
      .returning();
    return updatedMainGroup;
  }

  async deleteChartOfAccountsMainGroup(id: number, tenantId: number): Promise<boolean> {
    const [deletedMainGroup] = await db.delete(chartOfAccountsMainGroups)
      .where(and(
        eq(chartOfAccountsMainGroups.id, id),
        eq(chartOfAccountsMainGroups.tenantId, tenantId)
      ))
      .returning({ id: chartOfAccountsMainGroups.id });
    return !!deletedMainGroup;
  }

  // 2. Element Groups
  async getChartOfAccountsElementGroups(tenantId: number, mainGroupId?: number): Promise<any[]> {
    let query = db.select()
      .from(chartOfAccountsElementGroups)
      .where(eq(chartOfAccountsElementGroups.tenantId, tenantId));
    
    if (mainGroupId) {
      query = query.where(eq(chartOfAccountsElementGroups.mainGroupId, mainGroupId));
    }
    
    return await query.orderBy(asc(chartOfAccountsElementGroups.code));
  }

  async getChartOfAccountsElementGroup(id: number, tenantId: number): Promise<any | undefined> {
    const [elementGroup] = await db.select()
      .from(chartOfAccountsElementGroups)
      .where(and(
        eq(chartOfAccountsElementGroups.id, id),
        eq(chartOfAccountsElementGroups.tenantId, tenantId)
      ));
    return elementGroup;
  }

  async createChartOfAccountsElementGroup(elementGroup: any): Promise<any> {
    const [newElementGroup] = await db.insert(chartOfAccountsElementGroups)
      .values(elementGroup)
      .returning();
    return newElementGroup;
  }

  async updateChartOfAccountsElementGroup(id: number, tenantId: number, elementGroup: any): Promise<any | undefined> {
    // Add updatedAt timestamp
    const updateData = {
      ...elementGroup,
      updatedAt: new Date()
    };
    
    const [updatedElementGroup] = await db.update(chartOfAccountsElementGroups)
      .set(updateData)
      .where(and(
        eq(chartOfAccountsElementGroups.id, id),
        eq(chartOfAccountsElementGroups.tenantId, tenantId)
      ))
      .returning();
    return updatedElementGroup;
  }

  async deleteChartOfAccountsElementGroup(id: number, tenantId: number): Promise<boolean> {
    const [deletedElementGroup] = await db.delete(chartOfAccountsElementGroups)
      .where(and(
        eq(chartOfAccountsElementGroups.id, id),
        eq(chartOfAccountsElementGroups.tenantId, tenantId)
      ))
      .returning({ id: chartOfAccountsElementGroups.id });
    return !!deletedElementGroup;
  }

  // 3. Sub-Element Groups
  async getChartOfAccountsSubElementGroups(tenantId: number, elementGroupId?: number): Promise<any[]> {
    let query = db.select()
      .from(chartOfAccountsSubElementGroups)
      .where(eq(chartOfAccountsSubElementGroups.tenantId, tenantId));
    
    if (elementGroupId) {
      query = query.where(eq(chartOfAccountsSubElementGroups.elementGroupId, elementGroupId));
    }
    
    return await query.orderBy(asc(chartOfAccountsSubElementGroups.code));
  }

  async getChartOfAccountsSubElementGroup(id: number, tenantId: number): Promise<any | undefined> {
    const [subElementGroup] = await db.select()
      .from(chartOfAccountsSubElementGroups)
      .where(and(
        eq(chartOfAccountsSubElementGroups.id, id),
        eq(chartOfAccountsSubElementGroups.tenantId, tenantId)
      ));
    return subElementGroup;
  }

  async createChartOfAccountsSubElementGroup(subElementGroup: any): Promise<any> {
    const [newSubElementGroup] = await db.insert(chartOfAccountsSubElementGroups)
      .values(subElementGroup)
      .returning();
    return newSubElementGroup;
  }

  async updateChartOfAccountsSubElementGroup(id: number, tenantId: number, subElementGroup: any): Promise<any | undefined> {
    // Add updatedAt timestamp
    const updateData = {
      ...subElementGroup,
      updatedAt: new Date()
    };
    
    const [updatedSubElementGroup] = await db.update(chartOfAccountsSubElementGroups)
      .set(updateData)
      .where(and(
        eq(chartOfAccountsSubElementGroups.id, id),
        eq(chartOfAccountsSubElementGroups.tenantId, tenantId)
      ))
      .returning();
    return updatedSubElementGroup;
  }

  async deleteChartOfAccountsSubElementGroup(id: number, tenantId: number): Promise<boolean> {
    const [deletedSubElementGroup] = await db.delete(chartOfAccountsSubElementGroups)
      .where(and(
        eq(chartOfAccountsSubElementGroups.id, id),
        eq(chartOfAccountsSubElementGroups.tenantId, tenantId)
      ))
      .returning({ id: chartOfAccountsSubElementGroups.id });
    return !!deletedSubElementGroup;
  }

  // 4. Detailed Groups
  async getChartOfAccountsDetailedGroups(tenantId: number, subElementGroupId?: number): Promise<any[]> {
    let query = db.select()
      .from(chartOfAccountsDetailedGroups)
      .where(eq(chartOfAccountsDetailedGroups.tenantId, tenantId));
    
    if (subElementGroupId) {
      query = query.where(eq(chartOfAccountsDetailedGroups.subElementGroupId, subElementGroupId));
    }
    
    return await query.orderBy(asc(chartOfAccountsDetailedGroups.code));
  }

  async getChartOfAccountsDetailedGroup(id: number, tenantId: number): Promise<any | undefined> {
    const [detailedGroup] = await db.select()
      .from(chartOfAccountsDetailedGroups)
      .where(and(
        eq(chartOfAccountsDetailedGroups.id, id),
        eq(chartOfAccountsDetailedGroups.tenantId, tenantId)
      ));
    return detailedGroup;
  }

  async createChartOfAccountsDetailedGroup(detailedGroup: any): Promise<any> {
    const [newDetailedGroup] = await db.insert(chartOfAccountsDetailedGroups)
      .values(detailedGroup)
      .returning();
    return newDetailedGroup;
  }

  async updateChartOfAccountsDetailedGroup(id: number, tenantId: number, detailedGroup: any): Promise<any | undefined> {
    // Add updatedAt timestamp
    const updateData = {
      ...detailedGroup,
      updatedAt: new Date()
    };
    
    const [updatedDetailedGroup] = await db.update(chartOfAccountsDetailedGroups)
      .set(updateData)
      .where(and(
        eq(chartOfAccountsDetailedGroups.id, id),
        eq(chartOfAccountsDetailedGroups.tenantId, tenantId)
      ))
      .returning();
    return updatedDetailedGroup;
  }

  async deleteChartOfAccountsDetailedGroup(id: number, tenantId: number): Promise<boolean> {
    const [deletedDetailedGroup] = await db.delete(chartOfAccountsDetailedGroups)
      .where(and(
        eq(chartOfAccountsDetailedGroups.id, id),
        eq(chartOfAccountsDetailedGroups.tenantId, tenantId)
      ))
      .returning({ id: chartOfAccountsDetailedGroups.id });
    return !!deletedDetailedGroup;
  }

  // 5. Accounts (AC Heads)
  async getChartOfAccounts(tenantId: number, accountType?: string, detailedGroupId?: number, includeSystemAccounts: boolean = false, includeInactive: boolean = false): Promise<ChartOfAccount[]> {
    console.log(`CRITICAL: getChartOfAccounts called with tenantId=${tenantId}, accountType=${accountType}, detailedGroupId=${detailedGroupId}, includeSystemAccounts=${includeSystemAccounts}, includeInactive=${includeInactive}`);
    
    try {
      // First build the query directly with tenant isolation
      const query = db
        .select()
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.tenantId, tenantId),
            includeInactive ? undefined : eq(chartOfAccounts.isActive, true),
            accountType ? eq(chartOfAccounts.accountType, accountType) : undefined,
            detailedGroupId ? eq(chartOfAccounts.detailedGroupId, detailedGroupId) : undefined,
            includeSystemAccounts ? undefined : eq(chartOfAccounts.isSystemAccount, false)
          )
        )
        .orderBy(asc(chartOfAccounts.accountCode));
        
      // First attempt with the query
      const accounts = await query;
      
      console.log(`CRITICAL: SQL Query returned ${accounts.length} accounts for tenant ${tenantId}`);
      
      // Extra safety checks
      const onlyCurrentTenantAccounts = accounts.filter(acc => Number(acc.tenantId) === Number(tenantId));
      
      console.log(`CRITICAL: After filtering, we have ${onlyCurrentTenantAccounts.length} accounts for tenant ${tenantId}`);
      console.log(`CRITICAL: Removed ${accounts.length - onlyCurrentTenantAccounts.length} accounts from wrong tenants`);
      
      // Log tenant IDs that were incorrectly included
      if (accounts.length !== onlyCurrentTenantAccounts.length) {
        const wrongTenantIds = [...new Set(accounts.filter(acc => Number(acc.tenantId) !== Number(tenantId)).map(acc => acc.tenantId))];
        console.error(`CRITICAL ERROR: Query returned accounts from tenants: ${wrongTenantIds.join(', ')} instead of just tenant ${tenantId}`);
      }
      
      // For safety, only return accounts that match this tenant
      return onlyCurrentTenantAccounts;
    } catch (error) {
      console.error("ERROR in getChartOfAccounts:", error);
      // If there's an error, return an empty array rather than crashing
      return [];
    }
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
  
  async generateAccountCode(tenantId: number, detailedGroupId: number, accountType: string): Promise<string> {
    try {
      // Get the detailed group
      const [detailedGroup] = await db.select().from(chartOfAccountsDetailedGroups)
        .where(and(
          eq(chartOfAccountsDetailedGroups.id, detailedGroupId),
          eq(chartOfAccountsDetailedGroups.tenantId, tenantId)
        ));
      
      if (!detailedGroup) {
        console.warn(`Detailed group with ID ${detailedGroupId} not found for tenant ${tenantId}`);
        return `AC-${Date.now().toString().slice(-6)}`;
      }
      
      // Get the sub-element group
      const [subElementGroup] = await db.select().from(chartOfAccountsSubElementGroups)
        .where(and(
          eq(chartOfAccountsSubElementGroups.id, detailedGroup.subElementGroupId),
          eq(chartOfAccountsSubElementGroups.tenantId, tenantId)
        ));
      
      if (!subElementGroup) {
        console.warn(`Sub-element group not found for detailed group ${detailedGroupId}`);
        return `${detailedGroup.code}-${Date.now().toString().slice(-6)}`;
      }
      
      // Get the element group
      const [elementGroup] = await db.select().from(chartOfAccountsElementGroups)
        .where(and(
          eq(chartOfAccountsElementGroups.id, subElementGroup.elementGroupId),
          eq(chartOfAccountsElementGroups.tenantId, tenantId)
        ));
      
      if (!elementGroup) {
        console.warn(`Element group not found for sub-element group ${subElementGroup.id}`);
        return `${subElementGroup.code}-${Date.now().toString().slice(-6)}`;
      }
      
      // Generate base code from the hierarchy
      const baseCode = `${elementGroup.code}.${subElementGroup.code}.${detailedGroup.code}`;
      
      // Get existing accounts for this detailed group
      const existingAccounts = await this.getChartOfAccounts(tenantId, accountType, detailedGroupId);
      
      // Generate next number in sequence with a buffer (+10) to avoid conflicts with reactivated accounts
      const nextNumber = (existingAccounts.length + 1 + 10).toString().padStart(3, '0');
      
      // Return full account code
      return `${baseCode}.${nextNumber}`;
    } catch (error) {
      console.error("Error generating account code:", error);
      return `AC-${Date.now().toString().slice(-6)}`;
    }
  }

  async createChartOfAccount(account: InsertChartOfAccount): Promise<ChartOfAccount> {
    try {
      // Check if an inactive account with the same name already exists
      const [existingInactiveAccount] = await db.select().from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.accountName, account.accountName),
          eq(chartOfAccounts.tenantId, account.tenantId),
          eq(chartOfAccounts.isActive, false)
        ));
      
      if (existingInactiveAccount) {
        // Reactivate the existing account with new details
        console.log(`Reactivating existing inactive account: ${existingInactiveAccount.id} (${existingInactiveAccount.accountName})`);
        
        // Check for existing account code to avoid uniqueness violation
        // Important: We need to check ALL accounts (active and inactive) that might have this code
        // But exclude the current account we're reactivating to avoid self-reference
        const existingAccountWithCode = await db.select().from(chartOfAccounts)
          .where(and(
            eq(chartOfAccounts.accountCode, account.accountCode),
            eq(chartOfAccounts.tenantId, account.tenantId)
          ));
          
        // Filter out the current account being reactivated to avoid self-reference
        const filteredExistingAccounts = existingAccountWithCode.filter(
          existingAccount => existingAccount.id !== existingInactiveAccount.id
        );
        
        // Always generate a new account code for reactivated accounts to avoid collisions
        let finalAccountCode = account.accountCode;
        
        // Generate a new account code with a suffix regardless of filtered results
        // This ensures we always have a fresh account code for reactivated accounts
        const baseCode = account.accountCode.split('.').slice(0, -1).join('.');
        const existingAccounts = await this.getChartOfAccounts(
          account.tenantId, 
          account.accountType, 
          account.detailedGroupId,
          false,  // Don't include system accounts
          true    // Include inactive accounts
        );
        
        // Add 10 to ensure we don't conflict with existing codes
        const nextNumber = (existingAccounts.length + 10).toString().padStart(3, '0');
        finalAccountCode = `${baseCode}.${nextNumber}`;
        console.log(`Generated new account code ${finalAccountCode} for reactivated account to ensure uniqueness`);
        
          
        const [reactivatedAccount] = await db.update(chartOfAccounts)
          .set({
            detailedGroupId: account.detailedGroupId,
            accountCode: finalAccountCode,
            accountType: account.accountType,
            description: account.description,
            isActive: true,
            updatedAt: new Date()
          })
          .where(eq(chartOfAccounts.id, existingInactiveAccount.id))
          .returning();
          
        return reactivatedAccount;
      }
      
      // If no inactive account exists, create a new one
      // But first check for account code uniqueness
      // Important: We need to check ALL accounts (active and inactive) that might have this code
      const existingActiveAccountWithCode = await db.select().from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.accountCode, account.accountCode),
          eq(chartOfAccounts.tenantId, account.tenantId)
        ));
        
      // Generate a unique account code if needed
      let finalAccount = {...account};
      if (existingActiveAccountWithCode.length > 0) {
        // Generate a new account code with a suffix
        const baseCode = account.accountCode.split('.').slice(0, -1).join('.');
        const existingAccounts = await this.getChartOfAccounts(
          account.tenantId, 
          account.accountType, 
          account.detailedGroupId,
          false,  // Don't include system accounts
          true    // Include inactive accounts
        );
        // Add 10 to ensure we don't conflict with existing codes
        const nextNumber = (existingAccounts.length + 10).toString().padStart(3, '0');
        finalAccount.accountCode = `${baseCode}.${nextNumber}`;
        console.log(`Generated new account code ${finalAccount.accountCode} to avoid duplicate for new account`);
      }
      
      const [newAccount] = await db.insert(chartOfAccounts).values(finalAccount).returning();
      return newAccount;
    } catch (error) {
      console.error("Error in createChartOfAccount:", error);
      throw error;
    }
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
    // Soft delete by setting isActive to false instead of hard delete
    const [updatedAccount] = await db.update(chartOfAccounts)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(chartOfAccounts.id, id),
        eq(chartOfAccounts.tenantId, tenantId)
      ))
      .returning({ id: chartOfAccounts.id });
    return !!updatedAccount;
  }

  // Journal Entry operations for accounting
  async getJournalEntries(tenantId: number, sourceDocument?: string, sourceDocumentId?: number): Promise<JournalEntry[]> {
    let query = db.select().from(journalEntries)
      .where(eq(journalEntries.tenantId, tenantId))
      .orderBy(desc(journalEntries.entryDate));
    
    if (sourceDocument) {
      query = query.where(eq(journalEntries.sourceDocument, sourceDocument));
    }
    
    if (sourceDocumentId) {
      query = query.where(eq(journalEntries.sourceDocumentId, sourceDocumentId));
    }
    
    return await query;
  }

  async getJournalEntry(id: number, tenantId: number): Promise<JournalEntry | undefined> {
    const [entry] = await db.select().from(journalEntries)
      .where(and(
        eq(journalEntries.id, id),
        eq(journalEntries.tenantId, tenantId)
      ));
    return entry;
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [newEntry] = await db.insert(journalEntries).values(entry).returning();
    return newEntry;
  }

  async updateJournalEntry(id: number, entry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const [updatedEntry] = await db.update(journalEntries)
      .set(entry)
      .where(eq(journalEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteJournalEntry(id: number, tenantId: number): Promise<boolean> {
    // First delete all related journal entry lines
    await db.delete(journalEntryLines)
      .where(and(
        eq(journalEntryLines.journalEntryId, id),
        eq(journalEntryLines.tenantId, tenantId)
      ));
      
    // Then delete the journal entry
    const [deletedEntry] = await db.delete(journalEntries)
      .where(and(
        eq(journalEntries.id, id),
        eq(journalEntries.tenantId, tenantId)
      ))
      .returning({ id: journalEntries.id });
    return !!deletedEntry;
  }

  // Journal Entry Line operations
  async getJournalEntryLines(tenantId: number, journalEntryId?: number, accountId?: number): Promise<JournalEntryLine[]> {
    // Create base query
    let query = db.select({
      id: journalEntryLines.id,
      tenantId: journalEntryLines.tenantId,
      journalEntryId: journalEntryLines.journalEntryId,
      accountId: journalEntryLines.accountId,
      accountName: chartOfAccounts.accountName,
      description: journalEntryLines.description,
      debitAmount: journalEntryLines.debitAmount,
      creditAmount: journalEntryLines.creditAmount,
      lineOrder: journalEntryLines.lineOrder,
      createdAt: journalEntryLines.createdAt,
    })
    .from(journalEntryLines)
    .leftJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(eq(journalEntryLines.tenantId, tenantId));
    
    // Add filter by journalEntryId if provided
    if (journalEntryId !== undefined) {
      query = query.where(eq(journalEntryLines.journalEntryId, journalEntryId));
    }
    
    // Add filter by accountId if provided
    if (accountId !== undefined) {
      query = query.where(eq(journalEntryLines.accountId, accountId));
    }
    
    // Order the results
    query = query.orderBy(asc(journalEntryLines.lineOrder));
    
    // Execute and return the query
    return await query;
  }

  async getJournalEntryLine(id: number, tenantId: number): Promise<JournalEntryLine | undefined> {
    const [line] = await db.select().from(journalEntryLines)
      .where(and(
        eq(journalEntryLines.id, id),
        eq(journalEntryLines.tenantId, tenantId)
      ));
    return line;
  }

  async createJournalEntryLine(line: InsertJournalEntryLine): Promise<JournalEntryLine> {
    const [newLine] = await db.insert(journalEntryLines).values(line).returning();
    return newLine;
  }

  async updateJournalEntryLine(id: number, line: Partial<InsertJournalEntryLine>): Promise<JournalEntryLine | undefined> {
    const [updatedLine] = await db.update(journalEntryLines)
      .set(line)
      .where(eq(journalEntryLines.id, id))
      .returning();
    return updatedLine;
  }

  async deleteJournalEntryLine(id: number, tenantId: number): Promise<boolean> {
    const [deletedLine] = await db.delete(journalEntryLines)
      .where(and(
        eq(journalEntryLines.id, id),
        eq(journalEntryLines.tenantId, tenantId)
      ))
      .returning({ id: journalEntryLines.id });
    return !!deletedLine;
  }
  
  // Journal Entry Type operations
  async getJournalEntryTypes(tenantId: number): Promise<JournalEntryType[]> {
    return await db.select().from(journalEntryTypes)
      .where(eq(journalEntryTypes.tenantId, tenantId))
      .orderBy(asc(journalEntryTypes.name));
  }
  
  async getJournalEntryType(id: number, tenantId: number): Promise<JournalEntryType | undefined> {
    const [type] = await db.select().from(journalEntryTypes)
      .where(and(
        eq(journalEntryTypes.id, id),
        eq(journalEntryTypes.tenantId, tenantId)
      ));
    return type;
  }
  
  async createJournalEntryType(type: InsertJournalEntryType): Promise<JournalEntryType> {
    const [newType] = await db.insert(journalEntryTypes).values(type).returning();
    return newType;
  }
  
  async updateJournalEntryType(id: number, type: Partial<InsertJournalEntryType>): Promise<JournalEntryType | undefined> {
    const [updatedType] = await db.update(journalEntryTypes)
      .set(type)
      .where(eq(journalEntryTypes.id, id))
      .returning();
    return updatedType;
  }
  
  async deleteJournalEntryType(id: number, tenantId: number): Promise<boolean> {
    const [deletedType] = await db.delete(journalEntryTypes)
      .where(and(
        eq(journalEntryTypes.id, id),
        eq(journalEntryTypes.tenantId, tenantId)
      ))
      .returning({ id: journalEntryTypes.id });
    return !!deletedType;
  }
}