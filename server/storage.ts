import { 
  tenants, tenantSettings, users, designations, departments, countries, currencies, states, 
  entityTypes, taskStatuses, taskStatusWorkflowRules, taxJurisdictions, serviceTypes, 
  clients, entities, tasks, taskCategories, entityTaxJurisdictions, entityServiceSubscriptions, 
  userPermissions, invoices, invoiceLineItems, payments, paymentGatewaySettings, chartOfAccounts,
  journalEntries, journalEntryLines, journalEntryTypes, aiConfigurations
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
  // Journal entry types
  JournalEntry, InsertJournalEntry, JournalEntryLine, InsertJournalEntryLine,
  JournalEntryType, InsertJournalEntryType,
  // AI module types
  AiConfiguration, InsertAiConfiguration
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Define the session store interface
type MemoryStoreType = session.Store;

export interface IStorage {
  // Session store
  sessionStore: MemoryStoreType;
  
  // Tenant operations
  getTenant(id: number): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  
  // Tenant Settings operations
  getTenantSettings(tenantId: number): Promise<TenantSetting[]>;
  getTenantSetting(tenantId: number, key: string): Promise<TenantSetting | undefined>;
  setTenantSetting(tenantId: number, key: string, value: string): Promise<TenantSetting>;
  deleteTenantSetting(tenantId: number, key: string): Promise<boolean>;
  
  // User operations
  getUsers(tenantId: number): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string, tenantId?: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number, tenantId: number): Promise<boolean>;
  
  // Designation operations
  getDesignations(tenantId: number): Promise<Designation[]>;
  getDesignation(id: number, tenantId: number): Promise<Designation | undefined>;
  createDesignation(designation: InsertDesignation): Promise<Designation>;
  updateDesignation(id: number, designation: Partial<InsertDesignation>): Promise<Designation | undefined>;
  deleteDesignation(id: number, tenantId: number): Promise<boolean>;
  
  // Department operations
  getDepartments(tenantId: number): Promise<Department[]>;
  getDepartment(id: number, tenantId: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: number, tenantId: number): Promise<boolean>;
  
  // Country operations
  getCountries(tenantId: number): Promise<Country[]>;
  getCountry(id: number, tenantId: number): Promise<Country | undefined>;
  createCountry(country: InsertCountry): Promise<Country>;
  updateCountry(id: number, country: Partial<InsertCountry>): Promise<Country | undefined>;
  deleteCountry(id: number, tenantId: number): Promise<boolean>;
  
  // Currency operations
  getCurrencies(tenantId: number): Promise<Currency[]>;
  getCurrency(id: number, tenantId: number): Promise<Currency | undefined>;
  createCurrency(currency: InsertCurrency): Promise<Currency>;
  updateCurrency(id: number, currency: Partial<InsertCurrency>): Promise<Currency | undefined>;
  deleteCurrency(id: number, tenantId: number): Promise<boolean>;
  
  // State operations
  getStates(tenantId: number, countryId?: number): Promise<State[]>;
  getState(id: number, tenantId: number): Promise<State | undefined>;
  createState(state: InsertState): Promise<State>;
  updateState(id: number, state: Partial<InsertState>): Promise<State | undefined>;
  deleteState(id: number, tenantId: number): Promise<boolean>;
  
  // Entity type operations
  getEntityTypes(tenantId: number, countryId?: number): Promise<EntityType[]>;
  getEntityType(id: number, tenantId: number): Promise<EntityType | undefined>;
  createEntityType(entityType: InsertEntityType): Promise<EntityType>;
  updateEntityType(id: number, entityType: Partial<InsertEntityType>): Promise<EntityType | undefined>;
  deleteEntityType(id: number, tenantId: number): Promise<boolean>;
  
  // Task status operations
  getTaskStatuses(tenantId: number): Promise<TaskStatus[]>;
  getTaskStatus(id: number, tenantId: number): Promise<TaskStatus | undefined>;
  createTaskStatus(taskStatus: InsertTaskStatus): Promise<TaskStatus>;
  updateTaskStatus(id: number, taskStatus: Partial<InsertTaskStatus>): Promise<TaskStatus | undefined>;
  deleteTaskStatus(id: number, tenantId: number): Promise<boolean>;
  
  // Task status workflow rule operations
  getTaskStatusWorkflowRules(tenantId: number, fromStatusId?: number): Promise<TaskStatusWorkflowRule[]>;
  getTaskStatusWorkflowRule(id: number, tenantId: number): Promise<TaskStatusWorkflowRule | undefined>;
  getTaskStatusWorkflowRuleByStatuses(tenantId: number, fromStatusId: number, toStatusId: number): Promise<TaskStatusWorkflowRule | undefined>;
  createTaskStatusWorkflowRule(rule: InsertTaskStatusWorkflowRule): Promise<TaskStatusWorkflowRule>;
  updateTaskStatusWorkflowRule(id: number, rule: Partial<InsertTaskStatusWorkflowRule>): Promise<TaskStatusWorkflowRule | undefined>;
  deleteTaskStatusWorkflowRule(id: number, tenantId: number): Promise<boolean>;
  
  // Task category operations
  getTaskCategories(tenantId: number, isAdmin?: boolean): Promise<TaskCategory[]>;
  getTaskCategory(id: number, tenantId: number): Promise<TaskCategory | undefined>;
  createTaskCategory(taskCategory: InsertTaskCategory): Promise<TaskCategory>;
  updateTaskCategory(id: number, taskCategory: Partial<InsertTaskCategory>): Promise<TaskCategory | undefined>;
  deleteTaskCategory(id: number, tenantId: number): Promise<boolean>;
  
  // Tax jurisdiction operations
  getTaxJurisdictions(tenantId: number, countryId?: number): Promise<TaxJurisdiction[]>;
  getTaxJurisdiction(id: number, tenantId: number): Promise<TaxJurisdiction | undefined>;
  createTaxJurisdiction(taxJurisdiction: InsertTaxJurisdiction): Promise<TaxJurisdiction>;
  updateTaxJurisdiction(id: number, taxJurisdiction: Partial<InsertTaxJurisdiction>): Promise<TaxJurisdiction | undefined>;
  deleteTaxJurisdiction(id: number, tenantId: number): Promise<boolean>;
  
  // Service type operations
  getServiceTypes(tenantId: number, countryId?: number): Promise<ServiceType[]>;
  getServiceType(id: number, tenantId: number): Promise<ServiceType | undefined>;
  createServiceType(serviceType: InsertServiceType): Promise<ServiceType>;
  updateServiceType(id: number, serviceType: Partial<InsertServiceType>): Promise<ServiceType | undefined>;
  deleteServiceType(id: number, tenantId: number): Promise<boolean>;
  
  // Client operations
  getClients(tenantId: number): Promise<Client[]>;
  getClient(id: number, tenantId: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number, tenantId: number): Promise<boolean>;
  
  // Entity operations
  getEntities(tenantId: number, clientId?: number): Promise<Entity[]>;
  getEntity(id: number, tenantId: number): Promise<Entity | undefined>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: number, entity: Partial<InsertEntity>): Promise<Entity | undefined>;
  deleteEntity(id: number, tenantId: number): Promise<boolean>;
  
  // Entity Tax Jurisdiction operations
  getEntityTaxJurisdictions(tenantId: number, entityId: number): Promise<EntityTaxJurisdiction[]>;
  getTaxJurisdictionsForEntity(tenantId: number, entityId: number): Promise<TaxJurisdiction[]>;
  addTaxJurisdictionToEntity(entityTaxJurisdiction: InsertEntityTaxJurisdiction): Promise<EntityTaxJurisdiction>;
  removeTaxJurisdictionFromEntity(tenantId: number, entityId: number, taxJurisdictionId: number): Promise<boolean>;
  
  // Entity Service Subscription operations
  getEntityServiceSubscriptions(tenantId: number, entityId: number): Promise<EntityServiceSubscription[]>;
  getServiceSubscription(tenantId: number, entityId: number, serviceTypeId: number): Promise<EntityServiceSubscription | undefined>;
  createServiceSubscription(subscription: InsertEntityServiceSubscription): Promise<EntityServiceSubscription>;
  updateServiceSubscription(tenantId: number, entityId: number, serviceTypeId: number, isRequired: boolean, isSubscribed: boolean): Promise<EntityServiceSubscription | undefined>;
  deleteServiceSubscription(tenantId: number, entityId: number, serviceTypeId: number): Promise<boolean>;
  
  // Task operations
  getTasks(tenantId: number, clientId?: number, entityId?: number, isAdmin?: boolean, categoryId?: number, statusId?: number): Promise<Task[]>;
  getTask(id: number, tenantId: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number, tenantId: number): Promise<boolean>;
  
  // User Permission operations
  getUserPermissions(tenantId: number, userId: number): Promise<UserPermission[]>;
  getUserPermission(tenantId: number, userId: number, module: string): Promise<UserPermission | undefined>;
  getUserPermissionById(id: number, tenantId: number): Promise<UserPermission | undefined>;
  createUserPermission(permission: InsertUserPermission): Promise<UserPermission>;
  updateUserPermission(id: number, permission: Partial<InsertUserPermission>): Promise<UserPermission | undefined>;
  deleteUserPermission(id: number, tenantId: number): Promise<boolean>;
  
  // Finance Module Operations
  
  // Invoice operations
  getInvoices(tenantId: number, clientId?: number, entityId?: number, status?: string): Promise<Invoice[]>;
  getInvoice(id: number, tenantId: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string, tenantId: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number, tenantId: number): Promise<boolean>;
  
  // Invoice Line Item operations
  getInvoiceLineItems(tenantId: number, invoiceId: number): Promise<InvoiceLineItem[]>;
  getInvoiceLineItem(id: number, tenantId: number): Promise<InvoiceLineItem | undefined>;
  createInvoiceLineItem(lineItem: InsertInvoiceLineItem): Promise<InvoiceLineItem>;
  updateInvoiceLineItem(id: number, lineItem: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem | undefined>;
  deleteInvoiceLineItem(id: number, tenantId: number): Promise<boolean>;
  
  // Payment operations
  getPayments(tenantId: number, invoiceId?: number): Promise<Payment[]>;
  getPayment(id: number, tenantId: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number, tenantId: number): Promise<boolean>;
  
  // Payment Gateway Settings operations
  getPaymentGatewaySettings(tenantId: number): Promise<PaymentGatewaySetting[]>;
  getPaymentGatewaySetting(tenantId: number, gatewayType: string): Promise<PaymentGatewaySetting | undefined>;
  createPaymentGatewaySetting(setting: InsertPaymentGatewaySetting): Promise<PaymentGatewaySetting>;
  updatePaymentGatewaySetting(id: number, setting: Partial<InsertPaymentGatewaySetting>): Promise<PaymentGatewaySetting | undefined>;
  deletePaymentGatewaySetting(id: number, tenantId: number): Promise<boolean>;
  
  // Chart of Accounts hierarchy operations
  // Main Groups
  getChartOfAccountsMainGroups(tenantId: number): Promise<any[]>;
  getChartOfAccountsMainGroup(id: number, tenantId: number): Promise<any | undefined>;
  createChartOfAccountsMainGroup(mainGroup: any): Promise<any>;
  updateChartOfAccountsMainGroup(id: number, tenantId: number, mainGroup: any): Promise<any | undefined>;
  deleteChartOfAccountsMainGroup(id: number, tenantId: number): Promise<boolean>;
  
  // Element Groups
  getChartOfAccountsElementGroups(tenantId: number, mainGroupId?: number): Promise<any[]>;
  getChartOfAccountsElementGroupByName(tenantId: number, name: string): Promise<any[]>;
  getChartOfAccountsElementGroup(id: number, tenantId: number): Promise<any | undefined>;
  createChartOfAccountsElementGroup(elementGroup: any): Promise<any>;
  updateChartOfAccountsElementGroup(id: number, tenantId: number, elementGroup: any): Promise<any | undefined>;
  deleteChartOfAccountsElementGroup(id: number, tenantId: number): Promise<boolean>;
  
  // Sub-Element Groups
  getChartOfAccountsSubElementGroups(tenantId: number, elementGroupId?: number): Promise<any[]>;
  getChartOfAccountsSubElementGroupByName(tenantId: number, name: string, elementGroupId: number): Promise<any[]>;
  getChartOfAccountsSubElementGroup(id: number, tenantId: number): Promise<any | undefined>;
  createChartOfAccountsSubElementGroup(subElementGroup: any): Promise<any>;
  updateChartOfAccountsSubElementGroup(id: number, tenantId: number, subElementGroup: any): Promise<any | undefined>;
  deleteChartOfAccountsSubElementGroup(id: number, tenantId: number): Promise<boolean>;
  
  // Detailed Groups
  getChartOfAccountsDetailedGroups(tenantId: number, subElementGroupId?: number): Promise<any[]>;
  getChartOfAccountsDetailedGroupByName(tenantId: number, name: string, subElementGroupId: number): Promise<any[]>;
  getChartOfAccountsDetailedGroup(id: number, tenantId: number): Promise<any | undefined>;
  createChartOfAccountsDetailedGroup(detailedGroup: any): Promise<any>;
  updateChartOfAccountsDetailedGroup(id: number, tenantId: number, detailedGroup: any): Promise<any | undefined>;
  deleteChartOfAccountsDetailedGroup(id: number, tenantId: number): Promise<boolean>;
  
  // Chart of Accounts (AC Heads) operations
  getChartOfAccounts(tenantId: number, accountType?: string, detailedGroupId?: number): Promise<ChartOfAccount[]>;
  getChartOfAccount(id: number, tenantId: number): Promise<ChartOfAccount | undefined>;
  getChartOfAccountByCode(accountCode: string, tenantId: number): Promise<ChartOfAccount | undefined>;
  generateAccountCode(tenantId: number, detailedGroupId: number, accountType: string): Promise<string>;
  createChartOfAccount(account: InsertChartOfAccount): Promise<ChartOfAccount>;
  updateChartOfAccount(id: number, account: Partial<InsertChartOfAccount>): Promise<ChartOfAccount | undefined>;
  deleteChartOfAccount(id: number, tenantId: number): Promise<boolean>;
  
  // Journal Entry Type operations
  getJournalEntryTypes(tenantId: number): Promise<JournalEntryType[]>;
  getJournalEntryType(id: number, tenantId: number): Promise<JournalEntryType | undefined>;
  createJournalEntryType(type: InsertJournalEntryType): Promise<JournalEntryType>;
  updateJournalEntryType(id: number, type: Partial<InsertJournalEntryType>): Promise<JournalEntryType | undefined>;
  deleteJournalEntryType(id: number, tenantId: number): Promise<boolean>;
  
  // Journal Entry operations for accounting
  getJournalEntries(tenantId: number, sourceDocument?: string, sourceDocumentId?: number): Promise<JournalEntry[]>;
  getJournalEntry(id: number, tenantId: number): Promise<JournalEntry | undefined>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: number, entry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: number, tenantId: number): Promise<boolean>;
  
  // Journal Entry Line operations
  getJournalEntryLines(tenantId: number, journalEntryId?: number, accountId?: number): Promise<JournalEntryLine[]>;
  getJournalEntryLine(id: number, tenantId: number): Promise<JournalEntryLine | undefined>;
  createJournalEntryLine(line: InsertJournalEntryLine): Promise<JournalEntryLine>;
  updateJournalEntryLine(id: number, line: Partial<InsertJournalEntryLine>): Promise<JournalEntryLine | undefined>;
  deleteJournalEntryLine(id: number, tenantId: number): Promise<boolean>;
  
  // Ledger operations
  getLedgerEntries(tenantId: number, accountId: number, page?: number, pageSize?: number): Promise<{
    entries: any[];
    totalCount: number;
    openingBalance: string;
    closingBalance: string;
  }>;
  
  // Financial Reports
  getProfitAndLoss(tenantId: number, startDate?: Date, endDate?: Date): Promise<{
    revenues: any[];
    expenses: any[];
    netIncome: string;
    totalRevenue: string;
    totalExpense: string;
    startDate: Date;
    endDate: Date;
  }>;
  
  getBalanceSheet(tenantId: number, asOfDate?: Date): Promise<{
    assets: any[];
    liabilities: any[];
    equity: any[];
    totalAssets: string;
    totalLiabilities: string;
    totalEquity: string;
    asOfDate: Date;
  }>;
  
  getCashFlow(tenantId: number, startDate?: Date, endDate?: Date): Promise<{
    operatingActivities: any[];
    investingActivities: any[];
    financingActivities: any[];
    netCashFlow: string;
    startDate: Date;
    endDate: Date;
  }>;
  
  getExpenseReport(tenantId: number, startDate?: Date, endDate?: Date, categoryId?: number): Promise<{
    expenses: any[];
    categories: any[];
    totalExpense: string;
    startDate: Date;
    endDate: Date;
  }>;
  
  getTaxSummary(tenantId: number, startDate?: Date, endDate?: Date, taxJurisdictionId?: number): Promise<{
    taxItems: any[];
    jurisdictions: any[];
    totalTax: string;
    startDate: Date;
    endDate: Date;
  }>;
}

export class MemStorage implements IStorage {
  private tenants: Map<number, Tenant>;
  private tenantSettings: Map<number, TenantSetting>;
  private users: Map<number, User>;
  private designations: Map<number, Designation>;
  private departments: Map<number, Department>;
  private countries: Map<number, Country>;
  private currencies: Map<number, Currency>;
  private states: Map<number, State>;
  private entityTypes: Map<number, EntityType>;
  private taskStatuses: Map<number, TaskStatus>;
  private taskStatusWorkflowRules: Map<number, TaskStatusWorkflowRule>;
  private taskCategories: Map<number, TaskCategory>;
  private taxJurisdictions: Map<number, TaxJurisdiction>;
  private serviceTypes: Map<number, ServiceType>;
  private clients: Map<number, Client>;
  private entities: Map<number, Entity>;
  private tasks: Map<number, Task>;
  private entityTaxJurisdictions: Map<number, EntityTaxJurisdiction>;
  private entityServiceSubscriptions: Map<number, EntityServiceSubscription>;
  private userPermissions: Map<number, UserPermission>;
  // Finance module storage
  private invoices: Map<number, Invoice>;
  private invoiceLineItems: Map<number, InvoiceLineItem>;
  private payments: Map<number, Payment>;
  private paymentGatewaySettings: Map<number, PaymentGatewaySetting>;
  private chartOfAccounts: Map<number, ChartOfAccount>;
  private journalEntryTypes: Map<number, JournalEntryType>;
  
  sessionStore: MemoryStoreType;
  
  private tenantId: number = 1;
  private tenantSettingId: number = 1;
  private userId: number = 1;
  private designationId: number = 1;
  private departmentId: number = 1;
  private countryId: number = 1;
  private currencyId: number = 1;
  private stateId: number = 1;
  private entityTypeId: number = 1;
  private taskStatusId: number = 1;
  private taskStatusWorkflowRuleId: number = 1;
  private taskCategoryId: number = 1;
  private taxJurisdictionId: number = 1;
  private serviceTypeId: number = 1;
  private clientId: number = 1;
  private entityId: number = 1;
  private taskId: number = 1;
  private entityTaxJurisdictionId: number = 1;
  private entityServiceSubscriptionId: number = 1;
  private userPermissionId: number = 1;
  // Finance module IDs
  private invoiceId: number = 1;
  private invoiceLineItemId: number = 1;
  private paymentId: number = 1;
  private paymentGatewaySettingId: number = 1;
  private chartOfAccountId: number = 1;
  private journalEntryTypeId: number = 1;

  constructor() {
    this.tenants = new Map();
    this.tenantSettings = new Map();
    this.users = new Map();
    this.designations = new Map();
    this.departments = new Map();
    this.countries = new Map();
    this.currencies = new Map();
    this.states = new Map();
    this.entityTypes = new Map();
    this.taskStatuses = new Map();
    this.taskStatusWorkflowRules = new Map();
    this.taskCategories = new Map();
    this.taxJurisdictions = new Map();
    this.serviceTypes = new Map();
    this.clients = new Map();
    this.entities = new Map();
    this.tasks = new Map();
    this.entityTaxJurisdictions = new Map();
    this.entityServiceSubscriptions = new Map();
    this.userPermissions = new Map();
    // Initialize finance module maps
    this.invoices = new Map();
    this.invoiceLineItems = new Map();
    this.payments = new Map();
    this.paymentGatewaySettings = new Map();
    this.chartOfAccounts = new Map();
    this.journalEntryTypes = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24h
    });
  }

  // Tenant operations
  async getTenant(id: number): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const id = this.tenantId++;
    const newTenant: Tenant = { 
      ...tenant, 
      id, 
      createdAt: new Date() 
    };
    this.tenants.set(id, newTenant);
    return newTenant;
  }
  
  // Tenant Settings operations
  async getTenantSettings(tenantId: number): Promise<TenantSetting[]> {
    return Array.from(this.tenantSettings.values()).filter(setting => setting.tenantId === tenantId);
  }
  
  async getTenantSetting(tenantId: number, key: string): Promise<TenantSetting | undefined> {
    const settings = Array.from(this.tenantSettings.values());
    return settings.find(setting => setting.tenantId === tenantId && setting.key === key);
  }
  
  async setTenantSetting(tenantId: number, key: string, value: string): Promise<TenantSetting> {
    // Check if setting already exists
    const existingSetting = await this.getTenantSetting(tenantId, key);
    
    if (existingSetting) {
      // Update existing setting
      const updatedSetting: TenantSetting = {
        ...existingSetting,
        value,
        updatedAt: new Date()
      };
      this.tenantSettings.set(existingSetting.id, updatedSetting);
      return updatedSetting;
    } else {
      // Create new setting
      const id = this.tenantSettingId++;
      const newSetting: TenantSetting = {
        id,
        tenantId,
        key,
        value,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.tenantSettings.set(id, newSetting);
      return newSetting;
    }
  }
  
  async deleteTenantSetting(tenantId: number, key: string): Promise<boolean> {
    const setting = await this.getTenantSetting(tenantId, key);
    if (!setting) return false;
    
    return this.tenantSettings.delete(setting.id);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string, tenantId?: number): Promise<User | undefined> {
    const users = Array.from(this.users.values());
    console.log(`Looking for user with email: ${email}`);
    console.log(`Total users in storage: ${users.length}`);
    
    if (users.length > 0) {
      console.log('Available users:', users.map(u => ({ id: u.id, email: u.email, tenantId: u.tenantId })));
    }
    
    if (tenantId) {
      console.log(`Filtering by tenantId: ${tenantId}`);
      return users.find(user => user.email === email && user.tenantId === tenantId);
    }
    
    const foundUser = users.find(user => user.email === email);
    console.log(`Found user: ${foundUser ? 'Yes' : 'No'}`);
    return foundUser;
  }

  // User operations
  async getUsers(tenantId: number): Promise<User[]> {
    console.log("Getting users for tenant", tenantId);
    console.log("Total users:", this.users.size);
    const users = Array.from(this.users.values());
    console.log("All users:", users.map(u => ({ id: u.id, email: u.email, tenantId: u.tenantId, isSuperAdmin: u.isSuperAdmin })));
    return users.filter(user => user.tenantId === tenantId);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    
    // Create the user with explicit type casting to avoid TypeScript errors
    const newUser: User = {
      id,
      tenantId: user.tenantId,
      username: user.username,
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      designationId: user.designationId !== undefined ? user.designationId : null,
      departmentId: user.departmentId !== undefined ? user.departmentId : null,
      isSuperAdmin: user.isSuperAdmin !== undefined ? user.isSuperAdmin : false,
      isActive: user.isActive !== undefined ? user.isActive : true,
      createdAt: new Date()
    };
    
    console.log("Creating user in storage:", { 
      id: newUser.id, 
      email: newUser.email, 
      username: newUser.username,
      isSuperAdmin: newUser.isSuperAdmin
    });
    
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number, tenantId: number): Promise<boolean> {
    const user = this.users.get(id);
    if (user && user.tenantId === tenantId) {
      return this.users.delete(id);
    }
    return false;
  }
  
  // Designation operations
  async getDesignations(tenantId: number): Promise<Designation[]> {
    return Array.from(this.designations.values()).filter(designation => designation.tenantId === tenantId);
  }
  
  async getDesignation(id: number, tenantId: number): Promise<Designation | undefined> {
    const designation = this.designations.get(id);
    if (designation && designation.tenantId === tenantId) {
      return designation;
    }
    return undefined;
  }
  
  async createDesignation(designation: InsertDesignation): Promise<Designation> {
    const id = this.designationId++;
    const newDesignation: Designation = { 
      ...designation, 
      id, 
      createdAt: new Date() 
    };
    this.designations.set(id, newDesignation);
    return newDesignation;
  }
  
  async updateDesignation(id: number, designation: Partial<InsertDesignation>): Promise<Designation | undefined> {
    const existingDesignation = this.designations.get(id);
    if (!existingDesignation) return undefined;
    
    const updatedDesignation = { ...existingDesignation, ...designation };
    this.designations.set(id, updatedDesignation);
    return updatedDesignation;
  }
  
  async deleteDesignation(id: number, tenantId: number): Promise<boolean> {
    const designation = this.designations.get(id);
    if (designation && designation.tenantId === tenantId) {
      return this.designations.delete(id);
    }
    return false;
  }
  
  // Department operations
  async getDepartments(tenantId: number): Promise<Department[]> {
    return Array.from(this.departments.values()).filter(department => department.tenantId === tenantId);
  }
  
  async getDepartment(id: number, tenantId: number): Promise<Department | undefined> {
    const department = this.departments.get(id);
    if (department && department.tenantId === tenantId) {
      return department;
    }
    return undefined;
  }
  
  async createDepartment(department: InsertDepartment): Promise<Department> {
    const id = this.departmentId++;
    const newDepartment: Department = { 
      ...department, 
      id, 
      createdAt: new Date() 
    };
    this.departments.set(id, newDepartment);
    return newDepartment;
  }
  
  async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined> {
    const existingDepartment = this.departments.get(id);
    if (!existingDepartment) return undefined;
    
    const updatedDepartment = { ...existingDepartment, ...department };
    this.departments.set(id, updatedDepartment);
    return updatedDepartment;
  }
  
  async deleteDepartment(id: number, tenantId: number): Promise<boolean> {
    const department = this.departments.get(id);
    if (department && department.tenantId === tenantId) {
      return this.departments.delete(id);
    }
    return false;
  }

  // Country operations
  async getCountries(tenantId: number): Promise<Country[]> {
    return Array.from(this.countries.values()).filter(country => country.tenantId === tenantId);
  }

  async getCountry(id: number, tenantId: number): Promise<Country | undefined> {
    const country = this.countries.get(id);
    if (country && country.tenantId === tenantId) {
      return country;
    }
    return undefined;
  }

  async createCountry(country: InsertCountry): Promise<Country> {
    const id = this.countryId++;
    const newCountry: Country = { 
      ...country, 
      id, 
      createdAt: new Date() 
    };
    this.countries.set(id, newCountry);
    return newCountry;
  }

  async updateCountry(id: number, country: Partial<InsertCountry>): Promise<Country | undefined> {
    const existingCountry = this.countries.get(id);
    if (!existingCountry) return undefined;
    
    const updatedCountry = { ...existingCountry, ...country };
    this.countries.set(id, updatedCountry);
    return updatedCountry;
  }

  async deleteCountry(id: number, tenantId: number): Promise<boolean> {
    const country = this.countries.get(id);
    if (country && country.tenantId === tenantId) {
      return this.countries.delete(id);
    }
    return false;
  }

  // Currency operations
  async getCurrencies(tenantId: number): Promise<Currency[]> {
    return Array.from(this.currencies.values()).filter(currency => currency.tenantId === tenantId);
  }

  async getCurrency(id: number, tenantId: number): Promise<Currency | undefined> {
    const currency = this.currencies.get(id);
    if (currency && currency.tenantId === tenantId) {
      return currency;
    }
    return undefined;
  }

  async createCurrency(currency: InsertCurrency): Promise<Currency> {
    const id = this.currencyId++;
    const newCurrency: Currency = { 
      ...currency, 
      id, 
      createdAt: new Date() 
    };
    this.currencies.set(id, newCurrency);
    return newCurrency;
  }

  async updateCurrency(id: number, currency: Partial<InsertCurrency>): Promise<Currency | undefined> {
    const existingCurrency = this.currencies.get(id);
    if (!existingCurrency) return undefined;
    
    const updatedCurrency = { ...existingCurrency, ...currency };
    this.currencies.set(id, updatedCurrency);
    return updatedCurrency;
  }

  async deleteCurrency(id: number, tenantId: number): Promise<boolean> {
    const currency = this.currencies.get(id);
    if (currency && currency.tenantId === tenantId) {
      return this.currencies.delete(id);
    }
    return false;
  }

  // State operations
  async getStates(tenantId: number, countryId?: number): Promise<State[]> {
    let states = Array.from(this.states.values()).filter(state => state.tenantId === tenantId);
    
    if (countryId) {
      states = states.filter(state => state.countryId === countryId);
    }
    
    return states;
  }

  async getState(id: number, tenantId: number): Promise<State | undefined> {
    const state = this.states.get(id);
    if (state && state.tenantId === tenantId) {
      return state;
    }
    return undefined;
  }

  async createState(state: InsertState): Promise<State> {
    const id = this.stateId++;
    const newState: State = { 
      ...state, 
      id, 
      createdAt: new Date() 
    };
    this.states.set(id, newState);
    return newState;
  }

  async updateState(id: number, state: Partial<InsertState>): Promise<State | undefined> {
    const existingState = this.states.get(id);
    if (!existingState) return undefined;
    
    const updatedState = { ...existingState, ...state };
    this.states.set(id, updatedState);
    return updatedState;
  }

  async deleteState(id: number, tenantId: number): Promise<boolean> {
    const state = this.states.get(id);
    if (state && state.tenantId === tenantId) {
      return this.states.delete(id);
    }
    return false;
  }

  // Entity type operations
  async getEntityTypes(tenantId: number, countryId?: number): Promise<EntityType[]> {
    let entityTypes = Array.from(this.entityTypes.values()).filter(et => et.tenantId === tenantId);
    
    if (countryId) {
      entityTypes = entityTypes.filter(et => et.countryId === countryId);
    }
    
    return entityTypes;
  }

  async getEntityType(id: number, tenantId: number): Promise<EntityType | undefined> {
    const entityType = this.entityTypes.get(id);
    if (entityType && entityType.tenantId === tenantId) {
      return entityType;
    }
    return undefined;
  }

  async createEntityType(entityType: InsertEntityType): Promise<EntityType> {
    const id = this.entityTypeId++;
    const newEntityType: EntityType = { 
      ...entityType, 
      id, 
      createdAt: new Date() 
    };
    this.entityTypes.set(id, newEntityType);
    return newEntityType;
  }

  async updateEntityType(id: number, entityType: Partial<InsertEntityType>): Promise<EntityType | undefined> {
    const existingEntityType = this.entityTypes.get(id);
    if (!existingEntityType) return undefined;
    
    const updatedEntityType = { ...existingEntityType, ...entityType };
    this.entityTypes.set(id, updatedEntityType);
    return updatedEntityType;
  }

  async deleteEntityType(id: number, tenantId: number): Promise<boolean> {
    const entityType = this.entityTypes.get(id);
    if (entityType && entityType.tenantId === tenantId) {
      return this.entityTypes.delete(id);
    }
    return false;
  }

  // Task status operations
  async getTaskStatuses(tenantId: number): Promise<TaskStatus[]> {
    return Array.from(this.taskStatuses.values())
      .filter(status => status.tenantId === tenantId)
      .sort((a, b) => a.rank - b.rank);
  }

  async getTaskStatus(id: number, tenantId: number): Promise<TaskStatus | undefined> {
    const taskStatus = this.taskStatuses.get(id);
    if (taskStatus && taskStatus.tenantId === tenantId) {
      return taskStatus;
    }
    return undefined;
  }

  async createTaskStatus(taskStatus: InsertTaskStatus): Promise<TaskStatus> {
    const id = this.taskStatusId++;
    const newTaskStatus: TaskStatus = { 
      ...taskStatus, 
      id, 
      createdAt: new Date(),
      description: taskStatus.description ?? null
    };
    this.taskStatuses.set(id, newTaskStatus);
    return newTaskStatus;
  }

  async updateTaskStatus(id: number, taskStatus: Partial<InsertTaskStatus>): Promise<TaskStatus | undefined> {
    const existingTaskStatus = this.taskStatuses.get(id);
    if (!existingTaskStatus) return undefined;
    
    const updatedTaskStatus = { ...existingTaskStatus, ...taskStatus };
    this.taskStatuses.set(id, updatedTaskStatus);
    return updatedTaskStatus;
  }

  async deleteTaskStatus(id: number, tenantId: number): Promise<boolean> {
    const taskStatus = this.taskStatuses.get(id);
    if (taskStatus && taskStatus.tenantId === tenantId) {
      return this.taskStatuses.delete(id);
    }
    return false;
  }
  
  // Task status workflow rule operations
  async getTaskStatusWorkflowRules(tenantId: number, fromStatusId?: number): Promise<TaskStatusWorkflowRule[]> {
    let rules = Array.from(this.taskStatusWorkflowRules.values())
      .filter(rule => rule.tenantId === tenantId);
    
    if (fromStatusId !== undefined) {
      rules = rules.filter(rule => rule.fromStatusId === fromStatusId);
    }
    
    return rules;
  }
  
  async getTaskStatusWorkflowRule(id: number, tenantId: number): Promise<TaskStatusWorkflowRule | undefined> {
    const rule = this.taskStatusWorkflowRules.get(id);
    if (rule && rule.tenantId === tenantId) {
      return rule;
    }
    return undefined;
  }
  
  async getTaskStatusWorkflowRuleByStatuses(tenantId: number, fromStatusId: number, toStatusId: number): Promise<TaskStatusWorkflowRule | undefined> {
    return Array.from(this.taskStatusWorkflowRules.values())
      .find(rule => 
        rule.tenantId === tenantId && 
        rule.fromStatusId === fromStatusId && 
        rule.toStatusId === toStatusId
      );
  }
  
  async createTaskStatusWorkflowRule(rule: InsertTaskStatusWorkflowRule): Promise<TaskStatusWorkflowRule> {
    const id = this.taskStatusWorkflowRuleId++;
    const newRule: TaskStatusWorkflowRule = { 
      ...rule, 
      id, 
      createdAt: new Date(),
      isAllowed: rule.isAllowed === undefined ? true : rule.isAllowed
    };
    this.taskStatusWorkflowRules.set(id, newRule);
    return newRule;
  }
  
  async updateTaskStatusWorkflowRule(id: number, rule: Partial<InsertTaskStatusWorkflowRule>): Promise<TaskStatusWorkflowRule | undefined> {
    const existingRule = this.taskStatusWorkflowRules.get(id);
    if (!existingRule) return undefined;
    
    const updatedRule = { ...existingRule, ...rule };
    this.taskStatusWorkflowRules.set(id, updatedRule);
    return updatedRule;
  }
  
  async deleteTaskStatusWorkflowRule(id: number, tenantId: number): Promise<boolean> {
    const rule = this.taskStatusWorkflowRules.get(id);
    if (rule && rule.tenantId === tenantId) {
      return this.taskStatusWorkflowRules.delete(id);
    }
    return false;
  }
  
  // Task category operations
  async getTaskCategories(tenantId: number, isAdmin?: boolean): Promise<TaskCategory[]> {
    let categories = Array.from(this.taskCategories.values()).filter(cat => cat.tenantId === tenantId);
    
    if (isAdmin !== undefined) {
      categories = categories.filter(cat => cat.isAdmin === isAdmin);
    }
    
    return categories;
  }
  
  async getTaskCategory(id: number, tenantId: number): Promise<TaskCategory | undefined> {
    const category = this.taskCategories.get(id);
    if (category && category.tenantId === tenantId) {
      return category;
    }
    return undefined;
  }
  
  async createTaskCategory(taskCategory: InsertTaskCategory): Promise<TaskCategory> {
    const id = this.taskCategoryId++;
    const newTaskCategory: TaskCategory = { 
      ...taskCategory, 
      id, 
      createdAt: new Date() 
    };
    this.taskCategories.set(id, newTaskCategory);
    return newTaskCategory;
  }
  
  async updateTaskCategory(id: number, taskCategory: Partial<InsertTaskCategory>): Promise<TaskCategory | undefined> {
    const existingTaskCategory = this.taskCategories.get(id);
    if (!existingTaskCategory) return undefined;
    
    const updatedTaskCategory = { ...existingTaskCategory, ...taskCategory };
    this.taskCategories.set(id, updatedTaskCategory);
    return updatedTaskCategory;
  }
  
  async deleteTaskCategory(id: number, tenantId: number): Promise<boolean> {
    const taskCategory = this.taskCategories.get(id);
    if (taskCategory && taskCategory.tenantId === tenantId) {
      return this.taskCategories.delete(id);
    }
    return false;
  }

  // Tax jurisdiction operations
  async getTaxJurisdictions(tenantId: number, countryId?: number): Promise<TaxJurisdiction[]> {
    let taxJurisdictions = Array.from(this.taxJurisdictions.values()).filter(tj => tj.tenantId === tenantId);
    
    if (countryId) {
      taxJurisdictions = taxJurisdictions.filter(tj => tj.countryId === countryId);
    }
    
    return taxJurisdictions;
  }

  async getTaxJurisdiction(id: number, tenantId: number): Promise<TaxJurisdiction | undefined> {
    const taxJurisdiction = this.taxJurisdictions.get(id);
    if (taxJurisdiction && taxJurisdiction.tenantId === tenantId) {
      return taxJurisdiction;
    }
    return undefined;
  }

  async createTaxJurisdiction(taxJurisdiction: InsertTaxJurisdiction): Promise<TaxJurisdiction> {
    const id = this.taxJurisdictionId++;
    const newTaxJurisdiction: TaxJurisdiction = { 
      id, 
      tenantId: taxJurisdiction.tenantId,
      countryId: taxJurisdiction.countryId,
      stateId: taxJurisdiction.stateId ?? null,
      name: taxJurisdiction.name,
      description: taxJurisdiction.description ?? null,
      createdAt: new Date()
    };
    this.taxJurisdictions.set(id, newTaxJurisdiction);
    return newTaxJurisdiction;
  }

  async updateTaxJurisdiction(id: number, taxJurisdiction: Partial<InsertTaxJurisdiction>): Promise<TaxJurisdiction | undefined> {
    const existingTaxJurisdiction = this.taxJurisdictions.get(id);
    if (!existingTaxJurisdiction) return undefined;
    
    const updatedTaxJurisdiction = { ...existingTaxJurisdiction, ...taxJurisdiction };
    this.taxJurisdictions.set(id, updatedTaxJurisdiction);
    return updatedTaxJurisdiction;
  }

  async deleteTaxJurisdiction(id: number, tenantId: number): Promise<boolean> {
    const taxJurisdiction = this.taxJurisdictions.get(id);
    if (taxJurisdiction && taxJurisdiction.tenantId === tenantId) {
      return this.taxJurisdictions.delete(id);
    }
    return false;
  }

  // Service type operations
  async getServiceTypes(tenantId: number, countryId?: number): Promise<ServiceType[]> {
    let serviceTypes = Array.from(this.serviceTypes.values()).filter(st => st.tenantId === tenantId);
    
    if (countryId) {
      serviceTypes = serviceTypes.filter(st => st.countryId === countryId);
    }
    
    return serviceTypes;
  }

  async getServiceType(id: number, tenantId: number): Promise<ServiceType | undefined> {
    const serviceType = this.serviceTypes.get(id);
    if (serviceType && serviceType.tenantId === tenantId) {
      return serviceType;
    }
    return undefined;
  }

  async createServiceType(serviceType: InsertServiceType): Promise<ServiceType> {
    const id = this.serviceTypeId++;
    const newServiceType: ServiceType = { 
      ...serviceType, 
      id, 
      createdAt: new Date(),
      description: serviceType.description ?? null
    };
    this.serviceTypes.set(id, newServiceType);
    return newServiceType;
  }

  async updateServiceType(id: number, serviceType: Partial<InsertServiceType>): Promise<ServiceType | undefined> {
    const existingServiceType = this.serviceTypes.get(id);
    if (!existingServiceType) return undefined;
    
    const updatedServiceType = { ...existingServiceType, ...serviceType };
    this.serviceTypes.set(id, updatedServiceType);
    return updatedServiceType;
  }

  async deleteServiceType(id: number, tenantId: number): Promise<boolean> {
    const serviceType = this.serviceTypes.get(id);
    if (serviceType && serviceType.tenantId === tenantId) {
      return this.serviceTypes.delete(id);
    }
    return false;
  }

  // Client operations
  async getClients(tenantId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(client => client.tenantId === tenantId);
  }

  async getClient(id: number, tenantId: number): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (client && client.tenantId === tenantId) {
      return client;
    }
    return undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = this.clientId++;
    
    // Apply defaults for required fields
    const newClient: Client = { 
      ...client, 
      id, 
      createdAt: new Date(),
      status: client.status || "Active" // Set default status if not provided
    };
    
    this.clients.set(id, newClient);
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const existingClient = this.clients.get(id);
    if (!existingClient) return undefined;
    
    const updatedClient = { ...existingClient, ...client };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number, tenantId: number): Promise<boolean> {
    const client = this.clients.get(id);
    if (client && client.tenantId === tenantId) {
      return this.clients.delete(id);
    }
    return false;
  }

  // Entity operations
  async getEntities(tenantId: number, clientId?: number): Promise<Entity[]> {
    let entities = Array.from(this.entities.values()).filter(entity => entity.tenantId === tenantId);
    
    if (clientId) {
      entities = entities.filter(entity => entity.clientId === clientId);
    }
    
    return entities;
  }

  async getEntity(id: number, tenantId: number): Promise<Entity | undefined> {
    const entity = this.entities.get(id);
    if (entity && entity.tenantId === tenantId) {
      return entity;
    }
    return undefined;
  }

  async createEntity(entity: InsertEntity): Promise<Entity> {
    const id = this.entityId++;
    
    // Set defaults for nullable fields
    const newEntity: Entity = { 
      ...entity, 
      id, 
      createdAt: new Date(),
      stateId: entity.stateId ?? null,
      address: entity.address ?? null,
      businessTaxId: entity.businessTaxId ?? null,
      isVatRegistered: entity.isVatRegistered ?? false,
      vatId: entity.vatId ?? null,
      fileAccessLink: entity.fileAccessLink ?? null 
    };
    
    this.entities.set(id, newEntity);
    return newEntity;
  }

  async updateEntity(id: number, entity: Partial<InsertEntity>): Promise<Entity | undefined> {
    const existingEntity = this.entities.get(id);
    if (!existingEntity) return undefined;
    
    const updatedEntity = { ...existingEntity, ...entity };
    this.entities.set(id, updatedEntity);
    return updatedEntity;
  }

  async deleteEntity(id: number, tenantId: number): Promise<boolean> {
    const entity = this.entities.get(id);
    if (entity && entity.tenantId === tenantId) {
      return this.entities.delete(id);
    }
    return false;
  }
  
  // Entity Tax Jurisdiction operations
  async getEntityTaxJurisdictions(tenantId: number, entityId: number): Promise<EntityTaxJurisdiction[]> {
    return Array.from(this.entityTaxJurisdictions.values())
      .filter(etj => etj.tenantId === tenantId && etj.entityId === entityId);
  }

  async getTaxJurisdictionsForEntity(tenantId: number, entityId: number): Promise<TaxJurisdiction[]> {
    const entityTaxJurisdictions = await this.getEntityTaxJurisdictions(tenantId, entityId);
    const taxJurisdictionIds = entityTaxJurisdictions.map(etj => etj.taxJurisdictionId);
    return Array.from(this.taxJurisdictions.values())
      .filter(tj => tj.tenantId === tenantId && taxJurisdictionIds.includes(tj.id));
  }

  async addTaxJurisdictionToEntity(entityTaxJurisdiction: InsertEntityTaxJurisdiction): Promise<EntityTaxJurisdiction> {
    // Check if already exists
    const exists = Array.from(this.entityTaxJurisdictions.values())
      .some(etj => 
        etj.entityId === entityTaxJurisdiction.entityId && 
        etj.taxJurisdictionId === entityTaxJurisdiction.taxJurisdictionId
      );
    
    if (exists) {
      throw new Error("This tax jurisdiction is already associated with this entity");
    }
    
    const id = this.entityTaxJurisdictionId++;
    const newEntityTaxJurisdiction: EntityTaxJurisdiction = {
      id,
      tenantId: entityTaxJurisdiction.tenantId,
      entityId: entityTaxJurisdiction.entityId,
      taxJurisdictionId: entityTaxJurisdiction.taxJurisdictionId,
      createdAt: new Date()
    };
    
    this.entityTaxJurisdictions.set(id, newEntityTaxJurisdiction);
    return newEntityTaxJurisdiction;
  }

  async removeTaxJurisdictionFromEntity(tenantId: number, entityId: number, taxJurisdictionId: number): Promise<boolean> {
    const entityTaxJurisdiction = Array.from(this.entityTaxJurisdictions.values())
      .find(etj => 
        etj.tenantId === tenantId && 
        etj.entityId === entityId && 
        etj.taxJurisdictionId === taxJurisdictionId
      );
    
    if (!entityTaxJurisdiction) {
      return false;
    }
    
    return this.entityTaxJurisdictions.delete(entityTaxJurisdiction.id);
  }

  // Entity Service Subscription operations
  async getEntityServiceSubscriptions(tenantId: number, entityId: number): Promise<EntityServiceSubscription[]> {
    return Array.from(this.entityServiceSubscriptions.values())
      .filter(ess => ess.tenantId === tenantId && ess.entityId === entityId);
  }

  async getServiceSubscription(tenantId: number, entityId: number, serviceTypeId: number): Promise<EntityServiceSubscription | undefined> {
    return Array.from(this.entityServiceSubscriptions.values())
      .find(ess => 
        ess.tenantId === tenantId && 
        ess.entityId === entityId && 
        ess.serviceTypeId === serviceTypeId
      );
  }

  async createServiceSubscription(subscription: InsertEntityServiceSubscription): Promise<EntityServiceSubscription> {
    // Check if already exists
    const existing = await this.getServiceSubscription(
      subscription.tenantId, 
      subscription.entityId, 
      subscription.serviceTypeId
    );
    
    if (existing) {
      // Update instead
      return this.updateServiceSubscription(
        subscription.tenantId,
        subscription.entityId,
        subscription.serviceTypeId,
        subscription.isRequired || false,
        subscription.isSubscribed || false
      ) as Promise<EntityServiceSubscription>;
    }
    
    const id = this.entityServiceSubscriptionId++;
    const newSubscription: EntityServiceSubscription = {
      id,
      tenantId: subscription.tenantId,
      entityId: subscription.entityId,
      serviceTypeId: subscription.serviceTypeId,
      isRequired: subscription.isRequired !== undefined ? subscription.isRequired : false,
      isSubscribed: subscription.isSubscribed !== undefined ? subscription.isSubscribed : false,
      createdAt: new Date()
    };
    
    this.entityServiceSubscriptions.set(id, newSubscription);
    return newSubscription;
  }

  async updateServiceSubscription(
    tenantId: number, 
    entityId: number, 
    serviceTypeId: number, 
    isRequired: boolean, 
    isSubscribed: boolean
  ): Promise<EntityServiceSubscription | undefined> {
    const subscription = await this.getServiceSubscription(tenantId, entityId, serviceTypeId);
    
    if (!subscription) {
      return undefined;
    }
    
    // Business rule: To set isSubscribed to true, isRequired must also be true
    if (isSubscribed && !isRequired) {
      isRequired = true;
    }
    
    const updatedSubscription: EntityServiceSubscription = {
      ...subscription,
      isRequired,
      isSubscribed
    };
    
    this.entityServiceSubscriptions.set(subscription.id, updatedSubscription);
    return updatedSubscription;
  }

  async deleteServiceSubscription(tenantId: number, entityId: number, serviceTypeId: number): Promise<boolean> {
    const subscription = await this.getServiceSubscription(tenantId, entityId, serviceTypeId);
    
    if (!subscription) {
      return false;
    }
    
    return this.entityServiceSubscriptions.delete(subscription.id);
  }

  // Task operations
  async getTasks(tenantId: number, clientId?: number, entityId?: number, isAdmin?: boolean, categoryId?: number, statusId?: number): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values()).filter(task => task.tenantId === tenantId);
    
    // Filter by client if specified
    if (clientId !== undefined) {
      tasks = tasks.filter(task => task.clientId === clientId);
    }
    
    // Filter by entity if specified
    if (entityId !== undefined) {
      tasks = tasks.filter(task => task.entityId === entityId);
    }
    
    // Filter by admin status if specified
    if (isAdmin !== undefined) {
      tasks = tasks.filter(task => task.isAdmin === isAdmin);
    }
    
    // Filter by category if specified
    if (categoryId !== undefined) {
      tasks = tasks.filter(task => task.taskCategoryId === categoryId);
    }
    
    // Filter by status if specified
    if (statusId !== undefined) {
      tasks = tasks.filter(task => task.statusId === statusId);
    }
    
    return tasks;
  }

  async getTask(id: number, tenantId: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (task && task.tenantId === tenantId) {
      return task;
    }
    return undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskId++;
    
    // Ensure all dates are proper Date objects
    let dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
    let complianceStartDate = task.complianceStartDate instanceof Date 
      ? task.complianceStartDate 
      : task.complianceStartDate ? new Date(task.complianceStartDate) : null;
    let complianceEndDate = task.complianceEndDate instanceof Date 
      ? task.complianceEndDate 
      : task.complianceEndDate ? new Date(task.complianceEndDate) : null;
    
    // Set defaults for nullable fields
    const newTask: Task = { 
      id, 
      tenantId: task.tenantId,
      isAdmin: task.isAdmin,
      taskType: task.taskType,
      assigneeId: task.assigneeId,
      dueDate: dueDate,
      statusId: task.statusId,
      createdAt: new Date(),
      // Nullable fields with defaults
      clientId: task.clientId ?? null,
      entityId: task.entityId ?? null,
      serviceTypeId: task.serviceTypeId ?? null,
      taskCategoryId: task.taskCategoryId ?? null,
      taskDetails: task.taskDetails ?? null,
      nextToDo: task.nextToDo ?? null,
      isRecurring: task.isRecurring ?? false,
      // Compliance fields with defaults
      complianceFrequency: task.complianceFrequency ?? null,
      complianceYear: task.complianceYear ?? null,
      complianceDuration: task.complianceDuration ?? null,
      complianceStartDate: complianceStartDate,
      complianceEndDate: complianceEndDate,
      // Invoice information with defaults
      currency: task.currency ?? null,
      serviceRate: task.serviceRate ?? null
    };
    
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;
    
    const updatedTask = { ...existingTask, ...task };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number, tenantId: number): Promise<boolean> {
    // First check if task exists and belongs to the tenant
    const task = this.tasks.get(id);
    if (!task || task.tenantId !== tenantId) {
      return false;
    }
    
    // Delete only the specific task with matching ID
    const result = this.tasks.delete(id);
    console.log(`Deleted task with ID: ${id}, result: ${result}`);
    return result;
  }
  
  // User Permission operations
  async getUserPermissions(tenantId: number, userId: number): Promise<UserPermission[]> {
    return Array.from(this.userPermissions.values())
      .filter(permission => permission.tenantId === tenantId && permission.userId === userId);
  }
  
  async getUserPermission(tenantId: number, userId: number, module: string): Promise<UserPermission | undefined> {
    return Array.from(this.userPermissions.values())
      .find(permission => permission.tenantId === tenantId && 
            permission.userId === userId && 
            permission.module === module);
  }
  
  async getUserPermissionById(id: number, tenantId: number): Promise<UserPermission | undefined> {
    const permission = this.userPermissions.get(id);
    if (permission && permission.tenantId === tenantId) {
      return permission;
    }
    return undefined;
  }
  
  async createUserPermission(permission: InsertUserPermission): Promise<UserPermission> {
    const id = this.userPermissionId++;
    
    // Create a new permission with default values for any missing fields
    const newPermission: UserPermission = {
      id,
      tenantId: permission.tenantId,
      userId: permission.userId,
      module: permission.module,
      accessLevel: permission.accessLevel,
      canCreate: permission.canCreate ?? false,
      canRead: permission.canRead ?? false,
      canUpdate: permission.canUpdate ?? false,
      canDelete: permission.canDelete ?? false,
      createdAt: new Date()
    };
    
    this.userPermissions.set(id, newPermission);
    return newPermission;
  }
  
  async updateUserPermission(id: number, permission: Partial<InsertUserPermission>): Promise<UserPermission | undefined> {
    const existingPermission = this.userPermissions.get(id);
    if (!existingPermission) return undefined;
    
    const updatedPermission = { ...existingPermission, ...permission };
    this.userPermissions.set(id, updatedPermission);
    return updatedPermission;
  }
  
  async deleteUserPermission(id: number, tenantId: number): Promise<boolean> {
    const permission = this.userPermissions.get(id);
    if (permission && permission.tenantId === tenantId) {
      return this.userPermissions.delete(id);
    }
    return false;
  }

  // Finance Module Operations - Invoice methods
  
  async getInvoices(tenantId: number, clientId?: number, entityId?: number, status?: string): Promise<Invoice[]> {
    let invoices = Array.from(this.invoices.values()).filter(invoice => invoice.tenantId === tenantId && !invoice.isDeleted);
    
    if (clientId) {
      invoices = invoices.filter(invoice => invoice.clientId === clientId);
    }
    
    if (entityId) {
      invoices = invoices.filter(invoice => invoice.entityId === entityId);
    }
    
    if (status) {
      invoices = invoices.filter(invoice => invoice.status === status);
    }
    
    return invoices;
  }
  
  async getInvoice(id: number, tenantId: number): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (invoice && invoice.tenantId === tenantId && !invoice.isDeleted) {
      return invoice;
    }
    return undefined;
  }
  
  async getInvoiceByNumber(invoiceNumber: string, tenantId: number): Promise<Invoice | undefined> {
    const invoices = Array.from(this.invoices.values());
    return invoices.find(
      invoice => invoice.invoiceNumber === invoiceNumber && 
      invoice.tenantId === tenantId && 
      !invoice.isDeleted
    );
  }
  
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceId++;
    const now = new Date();
    
    const newInvoice: Invoice = {
      id,
      tenantId: invoice.tenantId,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      entityId: invoice.entityId,
      status: invoice.status || 'draft',
      issueDate: invoice.issueDate instanceof Date ? invoice.issueDate : new Date(invoice.issueDate),
      dueDate: invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate),
      currencyCode: invoice.currencyCode,
      subtotal: Number(invoice.subtotal),
      taxAmount: invoice.taxAmount !== undefined ? Number(invoice.taxAmount) : 0,
      discountAmount: invoice.discountAmount !== undefined ? Number(invoice.discountAmount) : 0,
      totalAmount: Number(invoice.totalAmount),
      amountPaid: invoice.amountPaid !== undefined ? Number(invoice.amountPaid) : 0,
      amountDue: Number(invoice.amountDue),
      notes: invoice.notes || null,
      termsAndConditions: invoice.termsAndConditions || null,
      isDeleted: invoice.isDeleted !== undefined ? invoice.isDeleted : false,
      createdBy: invoice.createdBy,
      updatedBy: invoice.updatedBy || null,
      createdAt: now,
      updatedAt: null
    };
    
    this.invoices.set(id, newInvoice);
    return newInvoice;
  }
  
  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existingInvoice = this.invoices.get(id);
    if (!existingInvoice || existingInvoice.isDeleted) {
      return undefined;
    }
    
    const updatedInvoice: Invoice = {
      ...existingInvoice,
      ...invoice,
      // Handle date fields
      issueDate: invoice.issueDate ? 
        (invoice.issueDate instanceof Date ? invoice.issueDate : new Date(invoice.issueDate)) : 
        existingInvoice.issueDate,
      dueDate: invoice.dueDate ? 
        (invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate)) : 
        existingInvoice.dueDate,
      // Handle number fields
      subtotal: invoice.subtotal !== undefined ? Number(invoice.subtotal) : existingInvoice.subtotal,
      taxAmount: invoice.taxAmount !== undefined ? Number(invoice.taxAmount) : existingInvoice.taxAmount,
      discountAmount: invoice.discountAmount !== undefined ? Number(invoice.discountAmount) : existingInvoice.discountAmount,
      totalAmount: invoice.totalAmount !== undefined ? Number(invoice.totalAmount) : existingInvoice.totalAmount,
      amountPaid: invoice.amountPaid !== undefined ? Number(invoice.amountPaid) : existingInvoice.amountPaid,
      amountDue: invoice.amountDue !== undefined ? Number(invoice.amountDue) : existingInvoice.amountDue,
      // Update timestamp
      updatedAt: new Date()
    };
    
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }
  
  async deleteInvoice(id: number, tenantId: number): Promise<boolean> {
    const invoice = this.invoices.get(id);
    if (invoice && invoice.tenantId === tenantId) {
      // Soft delete
      const updatedInvoice: Invoice = {
        ...invoice,
        isDeleted: true,
        updatedAt: new Date()
      };
      this.invoices.set(id, updatedInvoice);
      return true;
    }
    return false;
  }
  
  // Invoice Line Item methods
  
  async getInvoiceLineItems(tenantId: number, invoiceId: number): Promise<InvoiceLineItem[]> {
    return Array.from(this.invoiceLineItems.values())
      .filter(item => item.tenantId === tenantId && item.invoiceId === invoiceId);
  }
  
  async getInvoiceLineItem(id: number, tenantId: number): Promise<InvoiceLineItem | undefined> {
    const lineItem = this.invoiceLineItems.get(id);
    if (lineItem && lineItem.tenantId === tenantId) {
      return lineItem;
    }
    return undefined;
  }
  
  async createInvoiceLineItem(lineItem: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const id = this.invoiceLineItemId++;
    
    const newLineItem: InvoiceLineItem = {
      id,
      tenantId: lineItem.tenantId,
      invoiceId: lineItem.invoiceId,
      taskId: lineItem.taskId || null,
      description: lineItem.description,
      quantity: Number(lineItem.quantity),
      unitPrice: Number(lineItem.unitPrice),
      taxRate: lineItem.taxRate !== undefined ? Number(lineItem.taxRate) : 0,
      taxAmount: lineItem.taxAmount !== undefined ? Number(lineItem.taxAmount) : 0,
      discountRate: lineItem.discountRate !== undefined ? Number(lineItem.discountRate) : 0,
      discountAmount: lineItem.discountAmount !== undefined ? Number(lineItem.discountAmount) : 0,
      lineTotal: Number(lineItem.lineTotal),
      sortOrder: lineItem.sortOrder !== undefined ? lineItem.sortOrder : 0,
      createdAt: new Date()
    };
    
    this.invoiceLineItems.set(id, newLineItem);
    return newLineItem;
  }
  
  async updateInvoiceLineItem(id: number, lineItem: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem | undefined> {
    const existingLineItem = this.invoiceLineItems.get(id);
    if (!existingLineItem) {
      return undefined;
    }
    
    const updatedLineItem: InvoiceLineItem = {
      ...existingLineItem,
      ...lineItem,
      // Handle number fields
      quantity: lineItem.quantity !== undefined ? Number(lineItem.quantity) : existingLineItem.quantity,
      unitPrice: lineItem.unitPrice !== undefined ? Number(lineItem.unitPrice) : existingLineItem.unitPrice,
      taxRate: lineItem.taxRate !== undefined ? Number(lineItem.taxRate) : existingLineItem.taxRate,
      taxAmount: lineItem.taxAmount !== undefined ? Number(lineItem.taxAmount) : existingLineItem.taxAmount,
      discountRate: lineItem.discountRate !== undefined ? Number(lineItem.discountRate) : existingLineItem.discountRate,
      discountAmount: lineItem.discountAmount !== undefined ? Number(lineItem.discountAmount) : existingLineItem.discountAmount,
      lineTotal: lineItem.lineTotal !== undefined ? Number(lineItem.lineTotal) : existingLineItem.lineTotal,
    };
    
    this.invoiceLineItems.set(id, updatedLineItem);
    return updatedLineItem;
  }
  
  async deleteInvoiceLineItem(id: number, tenantId: number): Promise<boolean> {
    const lineItem = this.invoiceLineItems.get(id);
    if (lineItem && lineItem.tenantId === tenantId) {
      return this.invoiceLineItems.delete(id);
    }
    return false;
  }
  
  // Payment methods
  
  async getPayments(tenantId: number, invoiceId?: number): Promise<Payment[]> {
    let payments = Array.from(this.payments.values()).filter(payment => payment.tenantId === tenantId);
    
    if (invoiceId) {
      payments = payments.filter(payment => payment.invoiceId === invoiceId);
    }
    
    return payments;
  }
  
  async getPayment(id: number, tenantId: number): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (payment && payment.tenantId === tenantId) {
      return payment;
    }
    return undefined;
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentId++;
    
    const newPayment: Payment = {
      id,
      tenantId: payment.tenantId,
      invoiceId: payment.invoiceId,
      paymentDate: payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate),
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber || null,
      notes: payment.notes || null,
      createdBy: payment.createdBy,
      createdAt: new Date()
    };
    
    this.payments.set(id, newPayment);
    
    // Update the invoice's amountPaid and amountDue
    const invoice = this.invoices.get(payment.invoiceId);
    if (invoice) {
      const newAmountPaid = invoice.amountPaid + Number(payment.amount);
      const newAmountDue = invoice.totalAmount - newAmountPaid;
      let newStatus = invoice.status;
      
      // Update status based on payment
      if (newAmountPaid >= invoice.totalAmount) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partially_paid';
      }
      
      const updatedInvoice: Invoice = {
        ...invoice,
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        updatedAt: new Date()
      };
      
      this.invoices.set(invoice.id, updatedInvoice);
    }
    
    return newPayment;
  }
  
  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const existingPayment = this.payments.get(id);
    if (!existingPayment) {
      return undefined;
    }
    
    // If amount is changing, we need to adjust the invoice too
    let amountDifference = 0;
    if (payment.amount !== undefined && Number(payment.amount) !== existingPayment.amount) {
      amountDifference = Number(payment.amount) - existingPayment.amount;
    }
    
    const updatedPayment: Payment = {
      ...existingPayment,
      ...payment,
      // Handle date fields
      paymentDate: payment.paymentDate ? 
        (payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate)) : 
        existingPayment.paymentDate,
      // Handle number fields
      amount: payment.amount !== undefined ? Number(payment.amount) : existingPayment.amount,
    };
    
    this.payments.set(id, updatedPayment);
    
    // If amount changed, update the invoice
    if (amountDifference !== 0) {
      const invoice = this.invoices.get(existingPayment.invoiceId);
      if (invoice) {
        const newAmountPaid = invoice.amountPaid + amountDifference;
        const newAmountDue = invoice.totalAmount - newAmountPaid;
        let newStatus = invoice.status;
        
        // Update status based on new payment amount
        if (newAmountPaid >= invoice.totalAmount) {
          newStatus = 'paid';
        } else if (newAmountPaid > 0) {
          newStatus = 'partially_paid';
        } else {
          // Check if it should revert to 'sent' from 'partially_paid'
          if (invoice.status === 'partially_paid' && newAmountPaid <= 0) {
            newStatus = 'sent';
          }
        }
        
        const updatedInvoice: Invoice = {
          ...invoice,
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          updatedAt: new Date()
        };
        
        this.invoices.set(invoice.id, updatedInvoice);
      }
    }
    
    return updatedPayment;
  }
  
  async deletePayment(id: number, tenantId: number): Promise<boolean> {
    const payment = this.payments.get(id);
    if (!payment || payment.tenantId !== tenantId) {
      return false;
    }
    
    // Need to update the invoice's amountPaid and amountDue
    const invoice = this.invoices.get(payment.invoiceId);
    if (invoice) {
      const newAmountPaid = Math.max(0, invoice.amountPaid - payment.amount);
      const newAmountDue = invoice.totalAmount - newAmountPaid;
      let newStatus = invoice.status;
      
      // Update status based on remaining payment
      if (newAmountPaid <= 0) {
        // If there are no more payments, set status to 'sent' 
        newStatus = invoice.status === 'paid' || invoice.status === 'partially_paid' ? 'sent' : invoice.status;
      } else if (newAmountPaid < invoice.totalAmount) {
        newStatus = 'partially_paid';
      }
      
      const updatedInvoice: Invoice = {
        ...invoice,
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        updatedAt: new Date()
      };
      
      this.invoices.set(invoice.id, updatedInvoice);
    }
    
    return this.payments.delete(id);
  }
  
  // Payment Gateway Settings methods
  
  async getPaymentGatewaySettings(tenantId: number): Promise<PaymentGatewaySetting[]> {
    return Array.from(this.paymentGatewaySettings.values())
      .filter(setting => setting.tenantId === tenantId);
  }
  
  async getPaymentGatewaySetting(tenantId: number, gatewayType: string): Promise<PaymentGatewaySetting | undefined> {
    const settings = Array.from(this.paymentGatewaySettings.values());
    return settings.find(
      setting => setting.tenantId === tenantId && setting.gatewayType === gatewayType
    );
  }
  
  async createPaymentGatewaySetting(setting: InsertPaymentGatewaySetting): Promise<PaymentGatewaySetting> {
    const id = this.paymentGatewaySettingId++;
    
    const newSetting: PaymentGatewaySetting = {
      id,
      tenantId: setting.tenantId,
      gatewayType: setting.gatewayType,
      isEnabled: setting.isEnabled !== undefined ? setting.isEnabled : false,
      configData: setting.configData,
      createdAt: new Date(),
      updatedAt: null
    };
    
    this.paymentGatewaySettings.set(id, newSetting);
    return newSetting;
  }
  
  async updatePaymentGatewaySetting(id: number, setting: Partial<InsertPaymentGatewaySetting>): Promise<PaymentGatewaySetting | undefined> {
    const existingSetting = this.paymentGatewaySettings.get(id);
    if (!existingSetting) {
      return undefined;
    }
    
    const updatedSetting: PaymentGatewaySetting = {
      ...existingSetting,
      ...setting,
      updatedAt: new Date()
    };
    
    this.paymentGatewaySettings.set(id, updatedSetting);
    return updatedSetting;
  }
  
  async deletePaymentGatewaySetting(id: number, tenantId: number): Promise<boolean> {
    const setting = this.paymentGatewaySettings.get(id);
    if (setting && setting.tenantId === tenantId) {
      return this.paymentGatewaySettings.delete(id);
    }
    return false;
  }
  
  // Chart of Accounts methods
  
  async getChartOfAccounts(tenantId: number, accountType?: string): Promise<ChartOfAccount[]> {
    let accounts = Array.from(this.chartOfAccounts.values())
      .filter(account => account.tenantId === tenantId && account.isActive);
    
    if (accountType) {
      accounts = accounts.filter(account => account.accountType === accountType);
    }
    
    // Sort by account code for consistency
    return accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }
  
  async getChartOfAccount(id: number, tenantId: number): Promise<ChartOfAccount | undefined> {
    const account = this.chartOfAccounts.get(id);
    if (account && account.tenantId === tenantId) {
      return account;
    }
    return undefined;
  }
  
  async getChartOfAccountByCode(accountCode: string, tenantId: number): Promise<ChartOfAccount | undefined> {
    const accounts = Array.from(this.chartOfAccounts.values());
    return accounts.find(
      account => account.accountCode === accountCode && account.tenantId === tenantId
    );
  }
  
  async generateAccountCode(tenantId: number, detailedGroupId: number, accountType: string): Promise<string> {
    // Get the detailed group
    const detailedGroups = await this.getChartOfAccountsDetailedGroups(tenantId);
    const detailedGroup = detailedGroups.find(dg => dg.id === detailedGroupId);
    
    if (!detailedGroup) {
      return `AC-${Date.now().toString().slice(-6)}`;
    }
    
    // Get the sub-element group
    const subElementGroups = await this.getChartOfAccountsSubElementGroups(tenantId);
    const subElementGroup = subElementGroups.find(seg => seg.id === detailedGroup.subElementGroupId);
    
    if (!subElementGroup) {
      return `${detailedGroup.code}-${Date.now().toString().slice(-6)}`;
    }
    
    // Get the element group
    const elementGroups = await this.getChartOfAccountsElementGroups(tenantId);
    const elementGroup = elementGroups.find(eg => eg.id === subElementGroup.elementGroupId);
    
    if (!elementGroup) {
      return `${subElementGroup.code}-${Date.now().toString().slice(-6)}`;
    }
    
    // Generate base code
    const baseCode = `${elementGroup.code}.${subElementGroup.code}.${detailedGroup.code}`;
    
    // Get existing accounts for this detailed group
    const existingAccounts = await this.getChartOfAccounts(tenantId, accountType);
    const accountsInGroup = existingAccounts.filter(acc => acc.detailedGroupId === detailedGroupId);
    
    // Generate next number in sequence with a buffer (+10) to avoid conflicts with reactivated accounts
    const nextNumber = (accountsInGroup.length + 1 + 10).toString().padStart(3, '0');
    
    return `${baseCode}.${nextNumber}`;
  }
  
  async createChartOfAccount(account: InsertChartOfAccount): Promise<ChartOfAccount> {
    const id = this.chartOfAccountId++;
    
    const newAccount: ChartOfAccount = {
      id,
      tenantId: account.tenantId,
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      description: account.description || null,
      isActive: account.isActive !== undefined ? account.isActive : true,
      createdAt: new Date(),
      updatedAt: null
    };
    
    this.chartOfAccounts.set(id, newAccount);
    return newAccount;
  }
  
  async updateChartOfAccount(id: number, account: Partial<InsertChartOfAccount>): Promise<ChartOfAccount | undefined> {
    const existingAccount = this.chartOfAccounts.get(id);
    if (!existingAccount) {
      return undefined;
    }
    
    const updatedAccount: ChartOfAccount = {
      ...existingAccount,
      ...account,
      updatedAt: new Date()
    };
    
    this.chartOfAccounts.set(id, updatedAccount);
    return updatedAccount;
  }
  
  async deleteChartOfAccount(id: number, tenantId: number): Promise<boolean> {
    const account = this.chartOfAccounts.get(id);
    if (!account || account.tenantId !== tenantId) {
      return false;
    }
    
    // Soft delete by setting isActive to false
    const updatedAccount: ChartOfAccount = {
      ...account,
      isActive: false,
      updatedAt: new Date()
    };
    
    this.chartOfAccounts.set(id, updatedAccount);
    return true;
  }
  
  // Journal Entry Type operations
  async getJournalEntryTypes(tenantId: number): Promise<JournalEntryType[]> {
    return Array.from(this.journalEntryTypes.values())
      .filter(type => type.tenantId === tenantId);
  }
  
  async getJournalEntryType(id: number, tenantId: number): Promise<JournalEntryType | undefined> {
    const type = this.journalEntryTypes.get(id);
    if (type && type.tenantId === tenantId) {
      return type;
    }
    return undefined;
  }
  
  async createJournalEntryType(type: InsertJournalEntryType): Promise<JournalEntryType> {
    const id = this.journalEntryTypeId++;
    const newType: JournalEntryType = {
      ...type,
      id,
      createdAt: new Date()
    };
    this.journalEntryTypes.set(id, newType);
    return newType;
  }
  
  async updateJournalEntryType(id: number, type: Partial<InsertJournalEntryType>): Promise<JournalEntryType | undefined> {
    const existingType = this.journalEntryTypes.get(id);
    if (!existingType) return undefined;
    
    const updatedType = { ...existingType, ...type };
    this.journalEntryTypes.set(id, updatedType);
    return updatedType;
  }
  
  async deleteJournalEntryType(id: number, tenantId: number): Promise<boolean> {
    const type = this.journalEntryTypes.get(id);
    if (type && type.tenantId === tenantId) {
      return this.journalEntryTypes.delete(id);
    }
    return false;
  }
}

import { DatabaseStorage } from "./database-storage";

// Use DatabaseStorage for persistence with PostgreSQL
export const storage = new DatabaseStorage();
