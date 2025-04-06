import { tenants, users, designations, departments, countries, currencies, states, entityTypes, taskStatuses, taxJurisdictions, serviceTypes, clients, entities, tasks } from "@shared/schema";
import type { Tenant, User, InsertUser, InsertTenant, 
  Designation, InsertDesignation, Department, InsertDepartment,
  Country, InsertCountry, Currency, InsertCurrency, 
  State, InsertState, EntityType, InsertEntityType, TaskStatus, InsertTaskStatus, TaxJurisdiction, InsertTaxJurisdiction, ServiceType, 
  InsertServiceType, Client, InsertClient, Entity, InsertEntity, Task, InsertTask } from "@shared/schema";
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
  
  // Task operations
  getTasks(tenantId: number, clientId?: number, entityId?: number): Promise<Task[]>;
  getTask(id: number, tenantId: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number, tenantId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private tenants: Map<number, Tenant>;
  private users: Map<number, User>;
  private designations: Map<number, Designation>;
  private departments: Map<number, Department>;
  private countries: Map<number, Country>;
  private currencies: Map<number, Currency>;
  private states: Map<number, State>;
  private entityTypes: Map<number, EntityType>;
  private taskStatuses: Map<number, TaskStatus>;
  private taxJurisdictions: Map<number, TaxJurisdiction>;
  private serviceTypes: Map<number, ServiceType>;
  private clients: Map<number, Client>;
  private entities: Map<number, Entity>;
  private tasks: Map<number, Task>;
  
  sessionStore: MemoryStoreType;
  
  private tenantId: number = 1;
  private userId: number = 1;
  private designationId: number = 1;
  private departmentId: number = 1;
  private countryId: number = 1;
  private currencyId: number = 1;
  private stateId: number = 1;
  private entityTypeId: number = 1;
  private taskStatusId: number = 1;
  private taxJurisdictionId: number = 1;
  private serviceTypeId: number = 1;
  private clientId: number = 1;
  private entityId: number = 1;
  private taskId: number = 1;

  constructor() {
    this.tenants = new Map();
    this.users = new Map();
    this.designations = new Map();
    this.departments = new Map();
    this.countries = new Map();
    this.currencies = new Map();
    this.states = new Map();
    this.entityTypes = new Map();
    this.taskStatuses = new Map();
    this.taxJurisdictions = new Map();
    this.serviceTypes = new Map();
    this.clients = new Map();
    this.entities = new Map();
    this.tasks = new Map();
    
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
    return Array.from(this.users.values()).filter(user => user.tenantId === tenantId);
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

  // Task operations
  async getTasks(tenantId: number, clientId?: number, entityId?: number): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values()).filter(task => task.tenantId === tenantId);
    
    if (clientId) {
      tasks = tasks.filter(task => task.clientId === clientId);
    }
    
    if (entityId) {
      tasks = tasks.filter(task => task.entityId === entityId);
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
    
    // Set defaults for nullable fields
    const newTask: Task = { 
      ...task, 
      id, 
      createdAt: new Date(),
      clientId: task.clientId ?? null,
      entityId: task.entityId ?? null,
      serviceTypeId: task.serviceTypeId ?? null,
      taskDetails: task.taskDetails ?? null,
      nextToDo: task.nextToDo ?? null,
      isRecurring: task.isRecurring ?? false
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
    const task = this.tasks.get(id);
    if (task && task.tenantId === tenantId) {
      return this.tasks.delete(id);
    }
    return false;
  }
}

export const storage = new MemStorage();
