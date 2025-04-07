import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertCountrySchema, insertCurrencySchema, insertStateSchema, 
  insertEntityTypeSchema, insertTaskStatusSchema, insertTaskCategorySchema, insertServiceTypeSchema,
  insertClientSchema, insertEntitySchema, insertTaskSchema,
  insertDesignationSchema, insertDepartmentSchema, insertUserSchema,
  insertTaxJurisdictionSchema, insertEntityTaxJurisdictionSchema,
  insertEntityServiceSubscriptionSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("Starting to register routes...");
  
  // Setup authentication
  console.log("Setting up authentication...");
  let isAuthenticated: any, hasTenantAccess: any;
  try {
    const authMiddleware = setupAuth(app);
    isAuthenticated = authMiddleware.isAuthenticated;
    hasTenantAccess = authMiddleware.hasTenantAccess;
    console.log("Authentication setup successful");
  } catch (error) {
    console.error("Error setting up authentication:", error);
    throw error;
  }

  // Health check
  app.get("/api/v1/ping", (req, res) => {
    res.json({ status: "ok" });
  });

  // Setup Module Routes
  
  // 1. Countries
  app.get("/api/v1/setup/countries", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const countries = await storage.getCountries(tenantId);
      res.json(countries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  app.post("/api/v1/setup/countries", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      const validatedData = insertCountrySchema.parse(data);
      const country = await storage.createCountry(validatedData);
      
      res.status(201).json(country);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create country" });
    }
  });

  app.put("/api/v1/setup/countries/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if country belongs to tenant
      const existingCountry = await storage.getCountry(id, tenantId);
      if (!existingCountry) {
        return res.status(404).json({ message: "Country not found" });
      }
      
      const updatedCountry = await storage.updateCountry(id, req.body);
      res.json(updatedCountry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update country" });
    }
  });

  app.delete("/api/v1/setup/countries/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteCountry(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Country not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete country" });
    }
  });

  // 2. Currencies
  app.get("/api/v1/setup/currencies", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const currencies = await storage.getCurrencies(tenantId);
      res.json(currencies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch currencies" });
    }
  });

  app.post("/api/v1/setup/currencies", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      const validatedData = insertCurrencySchema.parse(data);
      const currency = await storage.createCurrency(validatedData);
      
      res.status(201).json(currency);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create currency" });
    }
  });

  app.put("/api/v1/setup/currencies/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if currency belongs to tenant
      const existingCurrency = await storage.getCurrency(id, tenantId);
      if (!existingCurrency) {
        return res.status(404).json({ message: "Currency not found" });
      }
      
      const updatedCurrency = await storage.updateCurrency(id, req.body);
      res.json(updatedCurrency);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update currency" });
    }
  });

  app.delete("/api/v1/setup/currencies/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteCurrency(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Currency not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete currency" });
    }
  });

  // 3. States
  app.get("/api/v1/setup/states", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const countryId = req.query.countryId ? parseInt(req.query.countryId as string) : undefined;
      
      const states = await storage.getStates(tenantId, countryId);
      res.json(states);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch states" });
    }
  });

  app.post("/api/v1/setup/states", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      const validatedData = insertStateSchema.parse(data);
      const state = await storage.createState(validatedData);
      
      res.status(201).json(state);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create state" });
    }
  });

  app.put("/api/v1/setup/states/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if state belongs to tenant
      const existingState = await storage.getState(id, tenantId);
      if (!existingState) {
        return res.status(404).json({ message: "State not found" });
      }
      
      const updatedState = await storage.updateState(id, req.body);
      res.json(updatedState);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update state" });
    }
  });

  app.delete("/api/v1/setup/states/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteState(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "State not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete state" });
    }
  });

  // 4. Entity Types
  app.get("/api/v1/setup/entity-types", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const countryId = req.query.countryId ? parseInt(req.query.countryId as string) : undefined;
      
      const entityTypes = await storage.getEntityTypes(tenantId, countryId);
      res.json(entityTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch entity types" });
    }
  });

  app.post("/api/v1/setup/entity-types", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      const validatedData = insertEntityTypeSchema.parse(data);
      const entityType = await storage.createEntityType(validatedData);
      
      res.status(201).json(entityType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create entity type" });
    }
  });

  app.put("/api/v1/setup/entity-types/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if entity type belongs to tenant
      const existingEntityType = await storage.getEntityType(id, tenantId);
      if (!existingEntityType) {
        return res.status(404).json({ message: "Entity type not found" });
      }
      
      const updatedEntityType = await storage.updateEntityType(id, req.body);
      res.json(updatedEntityType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update entity type" });
    }
  });

  app.delete("/api/v1/setup/entity-types/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteEntityType(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Entity type not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete entity type" });
    }
  });

  // 5. Task Statuses
  app.get("/api/v1/setup/task-statuses", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const taskStatuses = await storage.getTaskStatuses(tenantId);
      res.json(taskStatuses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task statuses" });
    }
  });

  app.post("/api/v1/setup/task-statuses", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      // Verify rank constraints - New is rank 1, Completed is rank 3
      if (data.rank === 1 && data.name !== "New") {
        return res.status(400).json({ message: "Rank 1 is reserved for the 'New' status" });
      }
      
      if (data.rank === 3 && data.name !== "Completed") {
        return res.status(400).json({ message: "Rank 3 is reserved for the 'Completed' status" });
      }
      
      const validatedData = insertTaskStatusSchema.parse(data);
      const taskStatus = await storage.createTaskStatus(validatedData);
      
      res.status(201).json(taskStatus);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task status" });
    }
  });

  app.put("/api/v1/setup/task-statuses/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if task status belongs to tenant
      const existingStatus = await storage.getTaskStatus(id, tenantId);
      if (!existingStatus) {
        return res.status(404).json({ message: "Task status not found" });
      }
      
      // Verify rank constraints for updates
      if (req.body.rank) {
        // Prevent changing a New or Completed status rank
        if ((existingStatus.name === "New" && req.body.rank !== 1) ||
            (existingStatus.name === "Completed" && req.body.rank !== 3)) {
          return res.status(400).json({ 
            message: "Cannot change rank for 'New' or 'Completed' statuses" 
          });
        }
        
        // Prevent changing another status to rank 1 or 3
        if ((existingStatus.name !== "New" && req.body.rank === 1) ||
            (existingStatus.name !== "Completed" && req.body.rank === 3)) {
          return res.status(400).json({ 
            message: "Ranks 1 and 3 are reserved for 'New' and 'Completed' statuses respectively" 
          });
        }
      }
      
      // Prevent renaming New or Completed statuses
      if (req.body.name) {
        if ((existingStatus.name === "New" && req.body.name !== "New") ||
            (existingStatus.name === "Completed" && req.body.name !== "Completed")) {
          return res.status(400).json({ 
            message: "Cannot rename 'New' or 'Completed' statuses" 
          });
        }
      }
      
      const updatedStatus = await storage.updateTaskStatus(id, req.body);
      res.json(updatedStatus);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  app.delete("/api/v1/setup/task-statuses/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Get the status first to check if it's New or Completed
      const status = await storage.getTaskStatus(id, tenantId);
      if (!status) {
        return res.status(404).json({ message: "Task status not found" });
      }
      
      // Prevent deleting New or Completed statuses
      if (status.name === "New" || status.name === "Completed") {
        return res.status(400).json({ 
          message: "Cannot delete 'New' or 'Completed' statuses as they are required by the system" 
        });
      }
      
      const success = await storage.deleteTaskStatus(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Task status not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task status" });
    }
  });

  // 6. Service Types
  app.get("/api/v1/setup/service-types", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const countryId = req.query.countryId ? parseInt(req.query.countryId as string) : undefined;
      
      const serviceTypes = await storage.getServiceTypes(tenantId, countryId);
      res.json(serviceTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service types" });
    }
  });

  app.post("/api/v1/setup/service-types", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      // Validate rate is greater than 0
      if (data.rate <= 0) {
        return res.status(400).json({ message: "Service rate must be greater than 0" });
      }
      
      const validatedData = insertServiceTypeSchema.parse(data);
      const serviceType = await storage.createServiceType(validatedData);
      
      res.status(201).json(serviceType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service type" });
    }
  });

  app.put("/api/v1/setup/service-types/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if service type belongs to tenant
      const existingServiceType = await storage.getServiceType(id, tenantId);
      if (!existingServiceType) {
        return res.status(404).json({ message: "Service type not found" });
      }
      
      // Validate rate if provided
      if (req.body.rate !== undefined && req.body.rate <= 0) {
        return res.status(400).json({ message: "Service rate must be greater than 0" });
      }
      
      const updatedServiceType = await storage.updateServiceType(id, req.body);
      res.json(updatedServiceType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update service type" });
    }
  });

  app.delete("/api/v1/setup/service-types/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteServiceType(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Service type not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service type" });
    }
  });

  // Tax Jurisdictions
  app.get("/api/v1/setup/tax-jurisdictions", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const countryId = req.query.countryId ? parseInt(req.query.countryId as string) : undefined;
      
      const taxJurisdictions = await storage.getTaxJurisdictions(tenantId, countryId);
      res.json(taxJurisdictions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tax jurisdictions" });
    }
  });

  app.post("/api/v1/setup/tax-jurisdictions", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      const validatedData = insertTaxJurisdictionSchema.parse(data);
      const newTaxJurisdiction = await storage.createTaxJurisdiction(validatedData);
      res.status(201).json(newTaxJurisdiction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error creating tax jurisdiction:", error);
        res.status(500).json({ message: "Failed to create tax jurisdiction" });
      }
    }
  });

  app.put("/api/v1/setup/tax-jurisdictions/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if tax jurisdiction belongs to tenant
      const existingTaxJurisdiction = await storage.getTaxJurisdiction(id, tenantId);
      if (!existingTaxJurisdiction) {
        return res.status(404).json({ message: "Tax jurisdiction not found" });
      }
      
      const data = { ...req.body };
      const updatedTaxJurisdiction = await storage.updateTaxJurisdiction(id, data);
      res.json(updatedTaxJurisdiction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update tax jurisdiction" });
      }
    }
  });

  app.delete("/api/v1/setup/tax-jurisdictions/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteTaxJurisdiction(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Tax jurisdiction not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tax jurisdiction" });
    }
  });

  // Clients Module Routes
  app.get("/api/v1/clients", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const clients = await storage.getClients(tenantId);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/v1/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const client = await storage.getClient(id, tenantId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/v1/clients", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      const validatedData = insertClientSchema.parse(data);
      const client = await storage.createClient(validatedData);
      
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/v1/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if client belongs to tenant
      const existingClient = await storage.getClient(id, tenantId);
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const updatedClient = await storage.updateClient(id, req.body);
      res.json(updatedClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/v1/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteClient(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Entities (under Clients)
  app.get("/api/v1/clients/:clientId/entities", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const clientId = parseInt(req.params.clientId);
      
      // Check if client belongs to tenant
      const client = await storage.getClient(clientId, tenantId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const entities = await storage.getEntities(tenantId, clientId);
      res.json(entities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch entities" });
    }
  });

  app.get("/api/v1/entities/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const entity = await storage.getEntity(id, tenantId);
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      res.json(entity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch entity" });
    }
  });

  app.post("/api/v1/clients/:clientId/entities", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const clientId = parseInt(req.params.clientId);
      
      // Check if client belongs to tenant
      const client = await storage.getClient(clientId, tenantId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const data = { ...req.body, tenantId, clientId };
      
      const validatedData = insertEntitySchema.parse(data);
      const entity = await storage.createEntity(validatedData);
      
      res.status(201).json(entity);
    } catch (error) {
      console.error("Error creating entity:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create entity", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/v1/entities/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if entity belongs to tenant
      const existingEntity = await storage.getEntity(id, tenantId);
      if (!existingEntity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      const updatedEntity = await storage.updateEntity(id, req.body);
      res.json(updatedEntity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update entity" });
    }
  });

  app.delete("/api/v1/entities/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteEntity(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete entity" });
    }
  });
  
  // Entity Tax Jurisdictions
  app.get("/api/v1/entities/:entityId/tax-jurisdictions", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const entityId = parseInt(req.params.entityId);
      
      // Ensure entity exists and belongs to tenant
      const entity = await storage.getEntity(entityId, tenantId);
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      const taxJurisdictions = await storage.getTaxJurisdictionsForEntity(tenantId, entityId);
      res.json(taxJurisdictions);
    } catch (error) {
      console.error("Error fetching entity tax jurisdictions:", error);
      res.status(500).json({ message: "Failed to fetch tax jurisdictions for entity" });
    }
  });
  
  app.post("/api/v1/entities/:entityId/tax-jurisdictions", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const entityId = parseInt(req.params.entityId);
      
      // Ensure entity exists and belongs to tenant
      const entity = await storage.getEntity(entityId, tenantId);
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      // Ensure tax jurisdiction exists and belongs to tenant
      const taxJurisdictionId = req.body.taxJurisdictionId;
      const taxJurisdiction = await storage.getTaxJurisdiction(taxJurisdictionId, tenantId);
      if (!taxJurisdiction) {
        return res.status(404).json({ message: "Tax jurisdiction not found" });
      }
      
      const data = {
        tenantId,
        entityId,
        taxJurisdictionId
      };
      
      const validatedData = insertEntityTaxJurisdictionSchema.parse(data);
      
      try {
        const entityTaxJurisdiction = await storage.addTaxJurisdictionToEntity(validatedData);
        res.status(201).json(entityTaxJurisdiction);
      } catch (err) {
        if (err instanceof Error && err.message.includes("already associated")) {
          return res.status(400).json({ message: err.message });
        }
        throw err;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding tax jurisdiction to entity:", error);
      res.status(500).json({ message: "Failed to add tax jurisdiction to entity" });
    }
  });
  
  app.delete("/api/v1/entities/:entityId/tax-jurisdictions/:taxJurisdictionId", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const entityId = parseInt(req.params.entityId);
      const taxJurisdictionId = parseInt(req.params.taxJurisdictionId);
      
      // Ensure entity exists and belongs to tenant
      const entity = await storage.getEntity(entityId, tenantId);
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      const success = await storage.removeTaxJurisdictionFromEntity(tenantId, entityId, taxJurisdictionId);
      if (!success) {
        return res.status(404).json({ message: "Tax jurisdiction not associated with this entity" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing tax jurisdiction from entity:", error);
      res.status(500).json({ message: "Failed to remove tax jurisdiction from entity" });
    }
  });
  
  // Entity Service Subscriptions
  app.get("/api/v1/entities/:entityId/services", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const entityId = parseInt(req.params.entityId);
      
      // Ensure entity exists and belongs to tenant
      const entity = await storage.getEntity(entityId, tenantId);
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      // Get all service types for the entity's country
      const serviceTypes = await storage.getServiceTypes(tenantId, entity.countryId);
      
      // Get existing subscriptions
      const subscriptions = await storage.getEntityServiceSubscriptions(tenantId, entityId);
      
      // Merge service types with subscription status
      const servicesWithStatus = serviceTypes.map(serviceType => {
        const subscription = subscriptions.find(sub => sub.serviceTypeId === serviceType.id);
        return {
          ...serviceType,
          isRequired: subscription ? subscription.isRequired : false,
          isSubscribed: subscription ? subscription.isSubscribed : false
        };
      });
      
      res.json(servicesWithStatus);
    } catch (error) {
      console.error("Error fetching entity services:", error);
      res.status(500).json({ message: "Failed to fetch services for entity" });
    }
  });
  
  app.post("/api/v1/entities/:entityId/services", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const entityId = parseInt(req.params.entityId);
      
      // Ensure entity exists and belongs to tenant
      const entity = await storage.getEntity(entityId, tenantId);
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      // Ensure service type exists and belongs to tenant
      const serviceTypeId = req.body.serviceTypeId;
      const serviceType = await storage.getServiceType(serviceTypeId, tenantId);
      if (!serviceType) {
        return res.status(404).json({ message: "Service type not found" });
      }
      
      // Ensure service type matches entity country
      if (serviceType.countryId !== entity.countryId) {
        return res.status(400).json({ 
          message: "Service type country does not match entity country"
        });
      }
      
      const data = {
        tenantId,
        entityId,
        serviceTypeId,
        isRequired: req.body.isRequired || false,
        isSubscribed: req.body.isSubscribed || false
      };
      
      // Business rule: If isSubscribed is true, isRequired must also be true
      if (data.isSubscribed && !data.isRequired) {
        data.isRequired = true;
      }
      
      const validatedData = insertEntityServiceSubscriptionSchema.parse(data);
      const subscription = await storage.createServiceSubscription(validatedData);
      
      res.status(201).json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding service subscription to entity:", error);
      res.status(500).json({ message: "Failed to add service subscription to entity" });
    }
  });
  
  app.put("/api/v1/entities/:entityId/services/:serviceTypeId", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const entityId = parseInt(req.params.entityId);
      const serviceTypeId = parseInt(req.params.serviceTypeId);
      
      // Ensure entity exists and belongs to tenant
      const entity = await storage.getEntity(entityId, tenantId);
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      // Ensure service type exists and belongs to tenant
      const serviceType = await storage.getServiceType(serviceTypeId, tenantId);
      if (!serviceType) {
        return res.status(404).json({ message: "Service type not found" });
      }
      
      const isRequired = req.body.isRequired || false;
      const isSubscribed = req.body.isSubscribed || false;
      
      const subscription = await storage.updateServiceSubscription(
        tenantId, 
        entityId, 
        serviceTypeId, 
        isRequired, 
        isSubscribed
      );
      
      if (!subscription) {
        return res.status(404).json({ message: "Service subscription not found" });
      }
      
      res.json(subscription);
    } catch (error) {
      console.error("Error updating service subscription:", error);
      res.status(500).json({ message: "Failed to update service subscription" });
    }
  });
  
  app.delete("/api/v1/entities/:entityId/services/:serviceTypeId", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const entityId = parseInt(req.params.entityId);
      const serviceTypeId = parseInt(req.params.serviceTypeId);
      
      // Ensure entity exists and belongs to tenant
      const entity = await storage.getEntity(entityId, tenantId);
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      const success = await storage.deleteServiceSubscription(tenantId, entityId, serviceTypeId);
      if (!success) {
        return res.status(404).json({ message: "Service subscription not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing service subscription:", error);
      res.status(500).json({ message: "Failed to remove service subscription" });
    }
  });

  // Member Management Routes
  
  // 1. Designations
  app.get("/api/v1/designations", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const designations = await storage.getDesignations(tenantId);
      res.json(designations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch designations" });
    }
  });

  app.post("/api/v1/designations", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      const validatedData = insertDesignationSchema.parse(data);
      const designation = await storage.createDesignation(validatedData);
      
      res.status(201).json(designation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create designation" });
    }
  });

  app.put("/api/v1/designations/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if designation belongs to tenant
      const existingDesignation = await storage.getDesignation(id, tenantId);
      if (!existingDesignation) {
        return res.status(404).json({ message: "Designation not found" });
      }
      
      const updatedDesignation = await storage.updateDesignation(id, req.body);
      res.json(updatedDesignation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update designation" });
    }
  });

  app.delete("/api/v1/designations/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteDesignation(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Designation not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete designation" });
    }
  });

  // 2. Departments
  app.get("/api/v1/departments", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const departments = await storage.getDepartments(tenantId);
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post("/api/v1/departments", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      const validatedData = insertDepartmentSchema.parse(data);
      const department = await storage.createDepartment(validatedData);
      
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  app.put("/api/v1/departments/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if department belongs to tenant
      const existingDepartment = await storage.getDepartment(id, tenantId);
      if (!existingDepartment) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      const updatedDepartment = await storage.updateDepartment(id, req.body);
      res.json(updatedDepartment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update department" });
    }
  });

  app.delete("/api/v1/departments/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteDepartment(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // 3. Members (Users)
  app.get("/api/v1/members", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const users = await storage.getUsers(tenantId);
      
      // Don't send password data to the client
      const members = users.map(user => {
        const { password, ...memberData } = user;
        return memberData;
      });
      
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.post("/api/v1/members", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      // Validate the user data
      const validatedData = insertUserSchema.parse(data);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email, tenantId);
      if (existingUser) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      
      // Create the user
      const user = await storage.createUser(validatedData);
      
      // Don't send password back to client
      const { password, ...memberData } = user;
      
      res.status(201).json(memberData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create member" });
    }
  });

  app.put("/api/v1/members/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if user belongs to tenant
      const existingUser = await storage.getUser(id);
      if (!existingUser || existingUser.tenantId !== tenantId) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      // Don't send password back to client
      const { password, ...memberData } = updatedUser;
      
      res.json(memberData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  app.delete("/api/v1/members/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Prevent deleting yourself
      if (id === (req.user as any).id) {
        return res.status(403).json({ message: "You cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete member" });
    }
  });
  
  // Task Category Operations
  app.get("/api/v1/setup/task-categories", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const isAdmin = req.query.isAdmin === "true" ? true : 
                      req.query.isAdmin === "false" ? false : undefined;
      
      const categories = await storage.getTaskCategories(tenantId, isAdmin);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task categories" });
    }
  });

  app.post("/api/v1/setup/task-categories", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      const validatedData = insertTaskCategorySchema.parse(data);
      const category = await storage.createTaskCategory(validatedData);
      
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task category" });
    }
  });

  app.put("/api/v1/setup/task-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if category belongs to tenant
      const existingCategory = await storage.getTaskCategory(id, tenantId);
      if (!existingCategory) {
        return res.status(404).json({ message: "Task category not found" });
      }
      
      const updatedCategory = await storage.updateTaskCategory(id, req.body);
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task category" });
    }
  });

  app.delete("/api/v1/setup/task-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteTaskCategory(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Task category not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task category" });
    }
  });
  
  // Tasks Operations
  app.get("/api/v1/tasks", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
      const isAdmin = req.query.isAdmin === "true" ? true : 
                      req.query.isAdmin === "false" ? false : undefined;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const statusId = req.query.statusId ? parseInt(req.query.statusId as string) : undefined;
      
      const tasks = await storage.getTasks(tenantId, clientId, entityId, isAdmin, categoryId, statusId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/v1/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const task = await storage.getTask(id, tenantId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/v1/tasks", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      // Validate data
      const validatedData = insertTaskSchema.parse(data);
      
      // For admin tasks, ensure no client or entity is attached
      if (validatedData.isAdmin) {
        if (validatedData.clientId) {
          return res.status(400).json({ 
            message: "Admin tasks cannot be associated with a client" 
          });
        }
        if (validatedData.entityId) {
          return res.status(400).json({ 
            message: "Admin tasks cannot be associated with an entity" 
          });
        }
      } else {
        // For non-admin tasks, ensure either client or entity is provided
        if (!validatedData.clientId && !validatedData.entityId) {
          return res.status(400).json({ 
            message: "Non-admin tasks must be associated with either a client or an entity" 
          });
        }
      }
      
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/v1/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if task belongs to tenant
      const existingTask = await storage.getTask(id, tenantId);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // For admin tasks, ensure no client or entity is being assigned
      if (existingTask.isAdmin) {
        if (req.body.clientId) {
          return res.status(400).json({ 
            message: "Admin tasks cannot be associated with a client" 
          });
        }
        if (req.body.entityId) {
          return res.status(400).json({ 
            message: "Admin tasks cannot be associated with an entity" 
          });
        }
      }
      
      // Prevent changing isAdmin status after creation
      if (req.body.isAdmin !== undefined && req.body.isAdmin !== existingTask.isAdmin) {
        return res.status(400).json({ 
          message: "Cannot change the admin status of a task after creation" 
        });
      }
      
      const updatedTask = await storage.updateTask(id, req.body);
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/v1/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteTask(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Create an HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
