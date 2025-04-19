import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { TaskScheduler } from "./task-scheduler";
import { 
  insertCountrySchema, insertCurrencySchema, insertStateSchema, 
  insertEntityTypeSchema, insertTaskStatusSchema, insertTaskCategorySchema, insertServiceTypeSchema,
  insertClientSchema, insertEntitySchema, insertTaskSchema,
  insertDesignationSchema, insertDepartmentSchema, insertUserSchema,
  insertTaxJurisdictionSchema, insertEntityTaxJurisdictionSchema,
  insertEntityServiceSubscriptionSchema, insertUserPermissionSchema,
  insertTaskStatusWorkflowRuleSchema,
  // Basic finance module schemas from schema.ts
  insertInvoiceSchema, insertInvoiceLineItemSchema, insertPaymentSchema, 
  insertPaymentGatewaySettingSchema, insertChartOfAccountSchema
} from "@shared/schema";

// Import enhanced schemas for finance module with proper type handling
import {
  enhancedInvoiceSchema,
  enhancedInvoiceLineItemSchema,
  enhancedPaymentSchema,
  enhancedPaymentGatewaySettingSchema,
  enhancedChartOfAccountSchema
} from "@shared/finance-schema";
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
      
      // Check for duplicate country name
      const existingCountries = await storage.getCountries(tenantId);
      const duplicateName = existingCountries.find(
        country => country.name.toLowerCase() === data.name.toLowerCase() && 
        country.tenantId === tenantId
      );
      
      if (duplicateName) {
        return res.status(400).json({ message: "A country with this name already exists" });
      }
      
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
      
      // Check for duplicate currency code
      const existingCurrencies = await storage.getCurrencies(tenantId);
      const duplicateCode = existingCurrencies.find(
        currency => currency.code.toLowerCase() === data.code.toLowerCase() && 
        currency.tenantId === tenantId
      );
      
      if (duplicateCode) {
        return res.status(400).json({ message: "A currency with this code already exists" });
      }
      
      // Check for duplicate currency per country (only one currency allowed per country)
      const currencyForCountry = existingCurrencies.find(
        currency => currency.countryId === data.countryId && 
        currency.tenantId === tenantId
      );
      
      if (currencyForCountry) {
        return res.status(400).json({ 
          message: "Only one currency is allowed per country. This country already has a currency assigned." 
        });
      }
      
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
      
      // Check for duplicate currency code
      if (req.body.code && req.body.code !== existingCurrency.code) {
        const existingCurrencies = await storage.getCurrencies(tenantId);
        const duplicateCode = existingCurrencies.find(
          currency => currency.code.toLowerCase() === req.body.code.toLowerCase() && 
          currency.id !== id &&
          currency.tenantId === tenantId
        );
        
        if (duplicateCode) {
          return res.status(400).json({ message: "A currency with this code already exists" });
        }
      }
      
      // Check for duplicate currency per country (only one currency allowed per country)
      if (req.body.countryId && req.body.countryId !== existingCurrency.countryId) {
        const existingCurrencies = await storage.getCurrencies(tenantId);
        const currencyForCountry = existingCurrencies.find(
          currency => currency.countryId === req.body.countryId && 
          currency.id !== id &&
          currency.tenantId === tenantId
        );
        
        if (currencyForCountry) {
          return res.status(400).json({ 
            message: "Only one currency is allowed per country. This country already has a currency assigned." 
          });
        }
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
      
      console.log("Creating state with data:", data);
      
      // Check for duplicate state name for the selected country
      const existingStates = await storage.getStates(tenantId, data.countryId);
      const duplicateName = existingStates.find(
        state => state.name.toLowerCase() === data.name.toLowerCase() && 
        state.countryId === data.countryId &&
        state.tenantId === tenantId
      );
      
      if (duplicateName) {
        return res.status(400).json({ 
          message: "A state with this name already exists for the selected country" 
        });
      }
      
      try {
        const validatedData = insertStateSchema.parse(data);
        console.log("Validated state data:", validatedData);
        
        const state = await storage.createState(validatedData);
        console.log("State created successfully:", state);
        
        res.status(201).json(state);
      } catch (validationError) {
        console.error("Validation error:", validationError);
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation error", errors: validationError.errors });
        }
        throw validationError;
      }
    } catch (error) {
      console.error("Error creating state:", error);
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
      
      // Check for duplicate state name if name or countryId is being changed
      if ((req.body.name && req.body.name !== existingState.name) || 
          (req.body.countryId && req.body.countryId !== existingState.countryId)) {
        
        const countryId = req.body.countryId || existingState.countryId;
        const name = req.body.name || existingState.name;
        
        const existingStates = await storage.getStates(tenantId, countryId);
        const duplicateName = existingStates.find(
          state => state.name.toLowerCase() === name.toLowerCase() && 
          state.id !== id &&
          state.countryId === countryId &&
          state.tenantId === tenantId
        );
        
        if (duplicateName) {
          return res.status(400).json({ 
            message: "A state with this name already exists for the selected country" 
          });
        }
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
      
      // Check for duplicate entity type name for the selected country
      const existingEntityTypes = await storage.getEntityTypes(tenantId, data.countryId);
      const duplicateName = existingEntityTypes.find(
        entityType => entityType.name.toLowerCase() === data.name.toLowerCase() && 
        entityType.countryId === data.countryId &&
        entityType.tenantId === tenantId
      );
      
      if (duplicateName) {
        return res.status(400).json({ 
          message: "An entity type with this name already exists for the selected country" 
        });
      }
      
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
      
      // Check for duplicate entity type name if name or countryId is being changed
      if ((req.body.name && req.body.name !== existingEntityType.name) || 
          (req.body.countryId && req.body.countryId !== existingEntityType.countryId)) {
        
        const countryId = req.body.countryId || existingEntityType.countryId;
        const name = req.body.name || existingEntityType.name;
        
        const existingEntityTypes = await storage.getEntityTypes(tenantId, countryId);
        const duplicateName = existingEntityTypes.find(
          entityType => entityType.name.toLowerCase() === name.toLowerCase() && 
          entityType.id !== id &&
          entityType.countryId === countryId &&
          entityType.tenantId === tenantId
        );
        
        if (duplicateName) {
          return res.status(400).json({ 
            message: "An entity type with this name already exists for the selected country" 
          });
        }
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
      
      // Ensure rank is between 1 and 3 (inclusive)
      if (data.rank < 1 || data.rank > 3) {
        return res.status(400).json({ message: "Rank must be between 1 and 3" });
      }
      
      // Check for duplicate status name
      const existingStatuses = await storage.getTaskStatuses(tenantId);
      const duplicateName = existingStatuses.find(status => 
        status.name.toLowerCase() === data.name.toLowerCase() && status.tenantId === tenantId
      );
      
      if (duplicateName) {
        return res.status(400).json({ message: "A task status with this name already exists" });
      }
      
      // Check for duplicate rank
      const duplicateRank = existingStatuses.find(status => 
        status.rank === data.rank && status.tenantId === tenantId
      );
      
      if (duplicateRank) {
        return res.status(400).json({ message: "A task status with this rank already exists" });
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
      if (req.body.rank !== undefined) {
        // Ensure rank is between 1 and 3 (inclusive)
        if (req.body.rank < 1 || req.body.rank > 3) {
          return res.status(400).json({ message: "Rank must be between 1 and 3" });
        }
        
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
        
        // Check for duplicate rank
        const existingStatuses = await storage.getTaskStatuses(tenantId);
        const duplicateRank = existingStatuses.find(status => 
          status.rank === req.body.rank && status.id !== id && status.tenantId === tenantId
        );
        
        if (duplicateRank) {
          return res.status(400).json({ message: "A task status with this rank already exists" });
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
        
        // Check for duplicate name
        const existingStatuses = await storage.getTaskStatuses(tenantId);
        const duplicateName = existingStatuses.find(status => 
          status.name.toLowerCase() === req.body.name.toLowerCase() && 
          status.id !== id && 
          status.tenantId === tenantId
        );
        
        if (duplicateName) {
          return res.status(400).json({ message: "A task status with this name already exists" });
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

  // 5.1 Task Status Workflow Rules
  app.get("/api/v1/setup/task-status-workflow-rules", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const fromStatusId = req.query.fromStatusId ? parseInt(req.query.fromStatusId as string) : undefined;
      
      const workflowRules = await storage.getTaskStatusWorkflowRules(tenantId, fromStatusId);
      res.json(workflowRules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task status workflow rules" });
    }
  });
  
  app.get("/api/v1/setup/task-status-workflow-rules/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const workflowRule = await storage.getTaskStatusWorkflowRule(id, tenantId);
      if (workflowRule) {
        res.json(workflowRule);
      } else {
        res.status(404).json({ message: "Task status workflow rule not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task status workflow rule" });
    }
  });
  
  app.post("/api/v1/setup/task-status-workflow-rules", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      // Validate that both status IDs exist
      const fromStatus = await storage.getTaskStatus(data.fromStatusId, tenantId);
      const toStatus = await storage.getTaskStatus(data.toStatusId, tenantId);
      
      if (!fromStatus) {
        return res.status(400).json({ message: "From status not found" });
      }
      
      if (!toStatus) {
        return res.status(400).json({ message: "To status not found" });
      }
      
      // Check if this rule already exists
      const existingRule = await storage.getTaskStatusWorkflowRuleByStatuses(
        tenantId, 
        data.fromStatusId, 
        data.toStatusId
      );
      
      if (existingRule) {
        return res.status(400).json({ 
          message: "A workflow rule between these statuses already exists" 
        });
      }
      
      // Validate data with zod schema
      const validatedData = insertTaskStatusWorkflowRuleSchema.parse(data);
      const workflowRule = await storage.createTaskStatusWorkflowRule(validatedData);
      
      res.status(201).json(workflowRule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating task status workflow rule:", error);
      res.status(500).json({ message: "Failed to create task status workflow rule" });
    }
  });
  
  app.put("/api/v1/setup/task-status-workflow-rules/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if rule exists
      const existingRule = await storage.getTaskStatusWorkflowRule(id, tenantId);
      if (!existingRule) {
        return res.status(404).json({ message: "Task status workflow rule not found" });
      }
      
      // Check if modifying from/to status IDs
      if (req.body.fromStatusId !== undefined || req.body.toStatusId !== undefined) {
        const fromStatusId = req.body.fromStatusId || existingRule.fromStatusId;
        const toStatusId = req.body.toStatusId || existingRule.toStatusId;
        
        // Validate that both status IDs exist
        const fromStatus = await storage.getTaskStatus(fromStatusId, tenantId);
        const toStatus = await storage.getTaskStatus(toStatusId, tenantId);
        
        if (!fromStatus) {
          return res.status(400).json({ message: "From status not found" });
        }
        
        if (!toStatus) {
          return res.status(400).json({ message: "To status not found" });
        }
        
        // Check if this creates a duplicate rule
        if (fromStatusId !== existingRule.fromStatusId || toStatusId !== existingRule.toStatusId) {
          const duplicateRule = await storage.getTaskStatusWorkflowRuleByStatuses(
            tenantId, 
            fromStatusId, 
            toStatusId
          );
          
          if (duplicateRule && duplicateRule.id !== id) {
            return res.status(400).json({ 
              message: "A workflow rule between these statuses already exists" 
            });
          }
        }
      }
      
      const updatedRule = await storage.updateTaskStatusWorkflowRule(id, req.body);
      res.json(updatedRule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task status workflow rule" });
    }
  });
  
  app.delete("/api/v1/setup/task-status-workflow-rules/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const result = await storage.deleteTaskStatusWorkflowRule(id, tenantId);
      if (result) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Task status workflow rule not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task status workflow rule" });
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
      
      // Check for duplicate service type name for the selected country
      const existingServiceTypes = await storage.getServiceTypes(tenantId, data.countryId);
      const duplicateName = existingServiceTypes.find(
        serviceType => serviceType.name.toLowerCase() === data.name.toLowerCase() && 
        serviceType.countryId === data.countryId &&
        serviceType.tenantId === tenantId
      );
      
      if (duplicateName) {
        return res.status(400).json({ 
          message: "A service type with this name already exists for the selected country" 
        });
      }
      
      const validatedData = insertServiceTypeSchema.parse(data);
      const serviceType = await storage.createServiceType(validatedData);
      
      res.status(201).json(serviceType);
    } catch (error) {
      console.error("Error creating service type:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service type", details: error instanceof Error ? error.message : String(error) });
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
      
      // Check for duplicate service type name if name or countryId is being changed
      if ((req.body.name && req.body.name !== existingServiceType.name) || 
          (req.body.countryId && req.body.countryId !== existingServiceType.countryId)) {
        
        const countryId = req.body.countryId || existingServiceType.countryId;
        const name = req.body.name || existingServiceType.name;
        
        const existingServiceTypes = await storage.getServiceTypes(tenantId, countryId);
        const duplicateName = existingServiceTypes.find(
          serviceType => serviceType.name.toLowerCase() === name.toLowerCase() && 
          serviceType.id !== id &&
          serviceType.countryId === countryId &&
          serviceType.tenantId === tenantId
        );
        
        if (duplicateName) {
          return res.status(400).json({ 
            message: "A service type with this name already exists for the selected country" 
          });
        }
      }
      
      const updatedServiceType = await storage.updateServiceType(id, req.body);
      res.json(updatedServiceType);
    } catch (error) {
      console.error("Error updating service type:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update service type", details: error instanceof Error ? error.message : String(error) });
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
      
      // Check for duplicate tax jurisdiction name for the selected country
      const existingTaxJurisdictions = await storage.getTaxJurisdictions(tenantId, data.countryId);
      const duplicateName = existingTaxJurisdictions.find(
        taxJurisdiction => taxJurisdiction.name.toLowerCase() === data.name.toLowerCase() && 
        taxJurisdiction.countryId === data.countryId &&
        taxJurisdiction.tenantId === tenantId
      );
      
      if (duplicateName) {
        return res.status(400).json({ 
          message: "A tax jurisdiction with this name already exists for the selected country" 
        });
      }
      
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
      
      // Check for duplicate tax jurisdiction name if name or countryId is being changed
      if ((req.body.name && req.body.name !== existingTaxJurisdiction.name) || 
          (req.body.countryId && req.body.countryId !== existingTaxJurisdiction.countryId)) {
        
        const countryId = req.body.countryId || existingTaxJurisdiction.countryId;
        const name = req.body.name || existingTaxJurisdiction.name;
        
        const existingTaxJurisdictions = await storage.getTaxJurisdictions(tenantId, countryId);
        const duplicateName = existingTaxJurisdictions.find(
          taxJurisdiction => taxJurisdiction.name.toLowerCase() === name.toLowerCase() && 
          taxJurisdiction.id !== id &&
          taxJurisdiction.countryId === countryId &&
          taxJurisdiction.tenantId === tenantId
        );
        
        if (duplicateName) {
          return res.status(400).json({ 
            message: "A tax jurisdiction with this name already exists for the selected country" 
          });
        }
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
      console.log("Fetching clients for tenant:", tenantId);
      
      const clients = await storage.getClients(tenantId);
      console.log(`Found ${clients.length} clients`);
      
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
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
      
      console.log("Creating client with data:", data);
      
      // Check for duplicate client name
      const existingClients = await storage.getClients(tenantId);
      const duplicateName = existingClients.find(
        client => client.displayName.toLowerCase() === data.displayName.toLowerCase() && 
        client.tenantId === tenantId
      );
      
      if (duplicateName) {
        return res.status(400).json({ message: "A client with this name already exists" });
      }
      
      // Check for duplicate email if provided
      if (data.email) {
        const duplicateEmail = existingClients.find(
          client => client.email && client.email.toLowerCase() === data.email.toLowerCase() && 
          client.tenantId === tenantId
        );
        
        if (duplicateEmail) {
          return res.status(400).json({ message: "A client with this email already exists" });
        }
      }
      
      // Check for duplicate mobile if provided
      if (data.mobile) {
        const duplicateMobile = existingClients.find(
          client => client.mobile && client.mobile === data.mobile && 
          client.tenantId === tenantId
        );
        
        if (duplicateMobile) {
          return res.status(400).json({ message: "A client with this mobile number already exists" });
        }
      }
      
      try {
        const validatedData = insertClientSchema.parse(data);
        console.log("Validated client data:", validatedData);
        
        const client = await storage.createClient(validatedData);
        console.log("Client created successfully:", client);
        
        res.status(201).json(client);
      } catch (validationError) {
        console.error("Validation error:", validationError);
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation error", errors: validationError.errors });
        }
        throw validationError;
      }
    } catch (error) {
      console.error("Error creating client:", error);
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
      
      const existingClients = await storage.getClients(tenantId);
      
      // Check for duplicate client name if being changed
      if (req.body.displayName && req.body.displayName !== existingClient.displayName) {
        const duplicateName = existingClients.find(
          client => client.displayName.toLowerCase() === req.body.displayName.toLowerCase() && 
          client.id !== id &&
          client.tenantId === tenantId
        );
        
        if (duplicateName) {
          return res.status(400).json({ message: "A client with this name already exists" });
        }
      }
      
      // Check for duplicate email if provided and changed
      if (req.body.email && req.body.email !== existingClient.email) {
        const duplicateEmail = existingClients.find(
          client => client.email && client.email.toLowerCase() === req.body.email.toLowerCase() && 
          client.id !== id &&
          client.tenantId === tenantId
        );
        
        if (duplicateEmail) {
          return res.status(400).json({ message: "A client with this email already exists" });
        }
      }
      
      // Check for duplicate mobile if provided and changed
      if (req.body.mobile && req.body.mobile !== existingClient.mobile) {
        const duplicateMobile = existingClients.find(
          client => client.mobile && client.mobile === req.body.mobile && 
          client.id !== id &&
          client.tenantId === tenantId
        );
        
        if (duplicateMobile) {
          return res.status(400).json({ message: "A client with this mobile number already exists" });
        }
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
      
      try {
        // First, find existing subscriptions for this entity and service type
        const existingSubscriptions = await storage.getEntityServiceSubscriptions(tenantId, entityId);
        const existingSub = existingSubscriptions.find(sub => sub.serviceTypeId === serviceTypeId);
        
        let subscription;
        
        if (existingSub) {
          // Update existing subscription
          subscription = await storage.updateServiceSubscription(existingSub.id, {
            isRequired,
            isSubscribed
          });
        } else {
          // Create new subscription
          subscription = await storage.createServiceSubscription({
            tenantId,
            entityId,
            serviceTypeId,
            isRequired,
            isSubscribed
          });
        }
        
        if (!subscription) {
          return res.status(500).json({ message: "Failed to update service subscription" });
        }
        
        // Return the updated subscription
        res.json(subscription);
        return;
      } catch (error) {
        console.error("Error updating service subscription:", error);
        return res.status(500).json({ message: "Failed to update service subscription" });
      }
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
      
      try {
        // First, find existing subscriptions for this entity and service type
        const existingSubscriptions = await storage.getEntityServiceSubscriptions(tenantId, entityId);
        const existingSub = existingSubscriptions.find(sub => sub.serviceTypeId === serviceTypeId);
        
        if (!existingSub) {
          return res.status(404).json({ message: "Service subscription not found" });
        }
        
        const success = await storage.deleteServiceSubscription(existingSub.id, tenantId);
        if (!success) {
          return res.status(404).json({ message: "Failed to delete service subscription" });
        }
      } catch (error) {
        console.error("Error deleting service subscription:", error);
        return res.status(500).json({ message: "Failed to delete service subscription" });
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
      console.error("Error fetching designations:", error);
      res.status(500).json({ message: "Failed to fetch designations" });
    }
  });

  app.post("/api/v1/designations", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      // Check for duplicate designation name
      const existingDesignations = await storage.getDesignations(tenantId);
      const duplicateName = existingDesignations.find(
        designation => designation.name.toLowerCase() === data.name.toLowerCase() && 
        designation.tenantId === tenantId
      );
      
      if (duplicateName) {
        return res.status(400).json({ message: "A designation with this name already exists" });
      }
      
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
      
      // Check for duplicate designation name if name is being changed
      if (req.body.name && req.body.name !== existingDesignation.name) {
        const existingDesignations = await storage.getDesignations(tenantId);
        const duplicateName = existingDesignations.find(
          designation => designation.name.toLowerCase() === req.body.name.toLowerCase() && 
          designation.id !== id &&
          designation.tenantId === tenantId
        );
        
        if (duplicateName) {
          return res.status(400).json({ message: "A designation with this name already exists" });
        }
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
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post("/api/v1/departments", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      // Check for duplicate department name
      const existingDepartments = await storage.getDepartments(tenantId);
      const duplicateName = existingDepartments.find(
        department => department.name.toLowerCase() === data.name.toLowerCase() && 
        department.tenantId === tenantId
      );
      
      if (duplicateName) {
        return res.status(400).json({ message: "A department with this name already exists" });
      }
      
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
      
      // Check for duplicate department name if name is being changed
      if (req.body.name && req.body.name !== existingDepartment.name) {
        const existingDepartments = await storage.getDepartments(tenantId);
        const duplicateName = existingDepartments.find(
          department => department.name.toLowerCase() === req.body.name.toLowerCase() && 
          department.id !== id &&
          department.tenantId === tenantId
        );
        
        if (duplicateName) {
          return res.status(400).json({ message: "A department with this name already exists" });
        }
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
  // Support both endpoints for users (/members for legacy, /users for new frontend)
  app.get("/api/v1/users", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const users = await storage.getUsers(tenantId);
      
      // Don't send password data to the client
      const members = users.map(user => {
        const { password, ...memberData } = user;
        return memberData;
      });
      
      console.log(`GET /api/v1/users - Found ${members.length} users`);
      res.json(members);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Legacy endpoint for backward compatibility
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

  // New endpoint for creating users
  app.post("/api/v1/users", isAuthenticated, async (req, res) => {
    console.log("POST /api/v1/users - Received request with body:", req.body);
    try {
      const tenantId = (req.user as any).tenantId;
      console.log("Request User:", req.user);
      console.log("Tenant ID:", tenantId);
      const data = { ...req.body, tenantId };
      console.log("Data for validation:", data);
      
      // Validate the user data
      try {
        const validatedData = insertUserSchema.parse(data);
        console.log("Data validated successfully:", validatedData);
        
        // Check if email already exists
        const existingUser = await storage.getUserByEmail(validatedData.email, tenantId);
        console.log("Existing user check:", existingUser ? "Found user" : "No existing user");
        if (existingUser) {
          console.log("User already exists with email:", validatedData.email);
          return res.status(409).json({ message: "A user with this email already exists" });
        }
        
        // Create the user
        console.log("Creating user with data:", validatedData);
        const user = await storage.createUser(validatedData);
        
        // Don't send password back to client
        const { password, ...userData } = user;
        
        console.log("Created new user:", userData);
        res.status(201).json(userData);
      } catch (validationError) {
        console.error("Validation error:", validationError);
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation error", errors: validationError.errors });
        }
        throw validationError;
      }
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Legacy endpoint for creating members
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

  // Add PUT endpoint for users
  app.put("/api/v1/users/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if user belongs to tenant
      const existingUser = await storage.getUser(id);
      if (!existingUser || existingUser.tenantId !== tenantId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password back to client
      const { password, ...userData } = updatedUser;
      
      res.json(userData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Add DELETE endpoint for users
  app.delete("/api/v1/users/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Prevent deleting yourself
      if (id === (req.user as any).id) {
        return res.status(403).json({ message: "You cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Legacy PUT endpoint for members
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

  // Legacy DELETE endpoint for members
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
  
  // User Permissions
  // GET endpoint for user permissions (updated to support both paths)
  app.get("/api/v1/users/:userId/permissions", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = parseInt(req.params.userId);
      
      const permissions = await storage.getUserPermissions(tenantId, userId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });
  
  // Legacy endpoint kept for backward compatibility
  app.get("/api/v1/members/:userId/permissions", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = parseInt(req.params.userId);
      
      const permissions = await storage.getUserPermissions(tenantId, userId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });
  
  app.get("/api/v1/users/:userId/permissions/:module", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = parseInt(req.params.userId);
      const module = req.params.module;
      
      const permission = await storage.getUserPermission(tenantId, userId, module);
      if (!permission) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      res.json(permission);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permission" });
    }
  });

  // Legacy endpoint for backward compatibility
  app.get("/api/v1/members/:userId/permissions/:module", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = parseInt(req.params.userId);
      const module = req.params.module;
      
      const permission = await storage.getUserPermission(tenantId, userId, module);
      if (!permission) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      res.json(permission);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permission" });
    }
  });
  
  // Updated endpoint for POST /api/v1/user-permissions
  app.post("/api/v1/user-permissions", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = req.body.userId;
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user || user.tenantId !== tenantId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if permission for this module already exists
      const existingPermission = await storage.getUserPermission(tenantId, userId, req.body.module);
      if (existingPermission) {
        return res.status(400).json({ message: "Permission for this module already exists" });
      }
      
      const data = { ...req.body, tenantId, userId };
      const validatedData = insertUserPermissionSchema.parse(data);
      const permission = await storage.createUserPermission(validatedData);
      
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create permission" });
    }
  });
  
  // Legacy endpoint for backward compatibility
  app.post("/api/v1/members/:userId/permissions", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = parseInt(req.params.userId);
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user || user.tenantId !== tenantId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if permission for this module already exists
      const existingPermission = await storage.getUserPermission(tenantId, userId, req.body.module);
      if (existingPermission) {
        return res.status(400).json({ message: "Permission for this module already exists" });
      }
      
      const data = { ...req.body, tenantId, userId };
      const validatedData = insertUserPermissionSchema.parse(data);
      const permission = await storage.createUserPermission(validatedData);
      
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create permission" });
    }
  });
  
  // New endpoint for updating permissions via PUT /api/v1/user-permissions/:id
  app.put("/api/v1/user-permissions/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Get the permission directly
      const permissionToUpdate = await storage.getUserPermissionById(id, tenantId);
      if (!permissionToUpdate) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      const updatedPermission = await storage.updateUserPermission(id, req.body);
      res.json(updatedPermission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update permission" });
    }
  });
  
  // Legacy endpoint kept for backward compatibility
  app.put("/api/v1/members/:userId/permissions/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = parseInt(req.params.userId);
      const id = parseInt(req.params.id);
      
      // Verify the permission belongs to this tenant and user
      const existingPermission = await storage.getUserPermission(tenantId, userId, req.body.module);
      if (!existingPermission || existingPermission.id !== id) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      const updatedPermission = await storage.updateUserPermission(id, req.body);
      res.json(updatedPermission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update permission" });
    }
  });
  
  // New endpoint for DELETE /api/v1/user-permissions/:id
  app.delete("/api/v1/user-permissions/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteUserPermission(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete permission" });
    }
  });
  
  // Legacy endpoint for backward compatibility
  app.delete("/api/v1/members/:userId/permissions/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteUserPermission(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete permission" });
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
      
      // Check for duplicate task category name for the same type (admin or revenue)
      const existingCategories = await storage.getTaskCategories(tenantId);
      const duplicateName = existingCategories.find(
        category => category.name.toLowerCase() === data.name.toLowerCase() && 
        category.isAdmin === data.isAdmin && 
        category.tenantId === tenantId
      );
      
      if (duplicateName) {
        return res.status(400).json({ 
          message: `A ${data.isAdmin ? 'administrative' : 'revenue'} task category with this name already exists` 
        });
      }
      
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
      
      // Check for duplicate task category name if name is being changed
      if (req.body.name && req.body.name !== existingCategory.name) {
        const isAdmin = req.body.isAdmin !== undefined ? req.body.isAdmin : existingCategory.isAdmin;
        
        const existingCategories = await storage.getTaskCategories(tenantId);
        const duplicateName = existingCategories.find(
          category => category.name.toLowerCase() === req.body.name.toLowerCase() && 
          category.isAdmin === isAdmin && 
          category.id !== id &&
          category.tenantId === tenantId
        );
        
        if (duplicateName) {
          return res.status(400).json({ 
            message: `A ${isAdmin ? 'administrative' : 'revenue'} task category with this name already exists` 
          });
        }
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
      
      // Validate data - our schema now handles date conversions automatically
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
      
      // Validate status transitions if status is being changed
      if (req.body.statusId !== undefined && req.body.statusId !== existingTask.statusId) {
        // Fetch current and target statuses to get their ranks
        const currentStatus = await storage.getTaskStatus(existingTask.statusId, tenantId);
        const targetStatus = await storage.getTaskStatus(req.body.statusId, tenantId);
        
        if (!currentStatus || !targetStatus) {
          return res.status(400).json({ message: "Invalid task status" });
        }
        
        // Skip workflow validation for admin tasks - they can transition freely
        if (!existingTask.isAdmin) {
          // For revenue tasks, use workflow rules to restrict transitions
          // Find any workflow rule for this transition
          const workflowRule = await storage.getTaskStatusWorkflowRuleByStatuses(
            tenantId,
            currentStatus.id,
            targetStatus.id
          );
          
          // If there's an explicit rule that forbids this transition, block it
          if (workflowRule && !workflowRule.isAllowed) {
            return res.status(400).json({ 
              message: `Status transition from '${currentStatus.name}' to '${targetStatus.name}' is not allowed by workflow rules` 
            });
          }
        }
        // Otherwise allow the transition (default to allowing transitions for all status types)
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

  // Auto Generated Tasks API
  
  // Task Scheduler route for manually generating tasks
  app.post("/api/v1/admin/generate-recurring-tasks", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.isSuperAdmin) {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }
      
      const taskScheduler = new TaskScheduler(storage);
      
      // If tenant ID is provided, generate for that tenant only
      if (req.body.tenantId) {
        const tenantId = parseInt(req.body.tenantId);
        await taskScheduler.generateRecurringTasksForTenant(tenantId);
        res.json({ 
          message: `Recurring tasks generated successfully for tenant ${tenantId}` 
        });
      } else {
        // Otherwise generate for all tenants
        await taskScheduler.generateUpcomingRecurringTasks();
        res.json({ 
          message: "Recurring tasks generated successfully for all tenants" 
        });
      }
    } catch (error) {
      console.error("Error generating recurring tasks:", error);
      res.status(500).json({ 
        message: "Failed to generate recurring tasks",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get tasks that need approval
  app.get("/api/v1/auto-generated-tasks", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const taskScheduler = new TaskScheduler(storage);
      
      const tasks = await taskScheduler.getTasksNeedingApproval(tenantId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching auto-generated tasks:", error);
      res.status(500).json({ 
        message: "Failed to fetch auto-generated tasks",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Approve a single auto-generated task
  app.post("/api/v1/auto-generated-tasks/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const taskId = parseInt(req.params.id);
      
      const taskScheduler = new TaskScheduler(storage);
      const success = await taskScheduler.approveTask(taskId, tenantId);
      
      if (success) {
        res.json({ message: "Task approved successfully" });
      } else {
        res.status(404).json({ message: "Task not found or not eligible for approval" });
      }
    } catch (error) {
      console.error("Error approving task:", error);
      res.status(500).json({ 
        message: "Failed to approve task",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Reject a single auto-generated task
  app.post("/api/v1/auto-generated-tasks/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const taskId = parseInt(req.params.id);
      
      const taskScheduler = new TaskScheduler(storage);
      const success = await taskScheduler.rejectTask(taskId, tenantId);
      
      if (success) {
        res.json({ message: "Task rejected successfully" });
      } else {
        res.status(404).json({ message: "Task not found or not eligible for rejection" });
      }
    } catch (error) {
      console.error("Error rejecting task:", error);
      res.status(500).json({ 
        message: "Failed to reject task",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Approve all pending tasks
  app.post("/api/v1/auto-generated-tasks/approve-all", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      const taskScheduler = new TaskScheduler(storage);
      const approvedCount = await taskScheduler.approveAllPendingTasks(tenantId);
      
      res.json({ 
        message: `Approved ${approvedCount} pending tasks successfully` 
      });
    } catch (error) {
      console.error("Error approving all tasks:", error);
      res.status(500).json({ 
        message: "Failed to approve all tasks",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Tenant Settings routes
  app.get("/api/v1/tenant/settings", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const settings = await storage.getTenantSettings(tenantId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenant settings" });
    }
  });
  
  app.get("/api/v1/tenant/settings/:key", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const key = req.params.key;
      
      const setting = await storage.getTenantSetting(tenantId, key);
      if (!setting) {
        return res.status(404).json({ message: `Setting '${key}' not found` });
      }
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenant setting" });
    }
  });
  
  app.post("/api/v1/tenant/settings", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { key, value } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ message: "Key and value are required" });
      }
      
      const setting = await storage.setTenantSetting(tenantId, key, value);
      res.status(201).json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to create tenant setting" });
    }
  });
  
  app.delete("/api/v1/tenant/settings/:key", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const key = req.params.key;
      
      const success = await storage.deleteTenantSetting(tenantId, key);
      if (!success) {
        return res.status(404).json({ message: `Setting '${key}' not found` });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tenant setting" });
    }
  });

  // Finance Module API Routes
  
  // 1. Invoices
  app.get("/api/v1/finance/invoices", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
      const status = req.query.status as string | undefined;
      
      const invoices = await storage.getInvoices(tenantId, clientId, entityId, status);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });
  
  app.get("/api/v1/finance/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const invoice = await storage.getInvoice(id, tenantId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Get line items for this invoice
      const lineItems = await storage.getInvoiceLineItems(tenantId, id);
      
      // Return combined response
      res.json({
        ...invoice,
        lineItems
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice details" });
    }
  });
  
  app.post("/api/v1/finance/invoices", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = (req.user as any).id;
      
      // Add tenant and creator info
      const data = { 
        ...req.body, 
        tenantId,
        createdBy: userId
      };
      
      // Validate invoice number uniqueness
      if (data.invoiceNumber) {
        const existingInvoice = await storage.getInvoiceByNumber(data.invoiceNumber, tenantId);
        if (existingInvoice) {
          return res.status(400).json({ message: "An invoice with this invoice number already exists" });
        }
      }
      
      // Create the invoice
      const validatedData = enhancedInvoiceSchema.parse(data);
      const invoice = await storage.createInvoice(validatedData);
      
      // Process line items if included
      const lineItems = [];
      if (req.body.lineItems && Array.isArray(req.body.lineItems)) {
        for (const item of req.body.lineItems) {
          const lineItemData = {
            ...item,
            tenantId,
            invoiceId: invoice.id
          };
          
          const validatedLineItem = enhancedInvoiceLineItemSchema.parse(lineItemData);
          const lineItem = await storage.createInvoiceLineItem(validatedLineItem);
          lineItems.push(lineItem);
        }
      }
      
      res.status(201).json({
        ...invoice,
        lineItems
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });
  
  app.put("/api/v1/finance/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      
      // Check if invoice belongs to tenant
      const existingInvoice = await storage.getInvoice(id, tenantId);
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check invoice number uniqueness if changed
      if (req.body.invoiceNumber && req.body.invoiceNumber !== existingInvoice.invoiceNumber) {
        const duplicateInvoice = await storage.getInvoiceByNumber(req.body.invoiceNumber, tenantId);
        if (duplicateInvoice && duplicateInvoice.id !== id) {
          return res.status(400).json({ message: "An invoice with this invoice number already exists" });
        }
      }
      
      // Add updater info
      const data = { 
        ...req.body, 
        updatedBy: userId
      };
      
      const updatedInvoice = await storage.updateInvoice(id, data);
      
      // Get updated line items
      const lineItems = await storage.getInvoiceLineItems(tenantId, id);
      
      res.json({
        ...updatedInvoice,
        lineItems
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });
  
  app.delete("/api/v1/finance/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteInvoice(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });
  
  // 2. Invoice Line Items
  app.post("/api/v1/finance/invoice-line-items", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = { ...req.body, tenantId };
      
      // Check if invoice exists
      const invoice = await storage.getInvoice(data.invoiceId, tenantId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const validatedData = enhancedInvoiceLineItemSchema.parse(data);
      const lineItem = await storage.createInvoiceLineItem(validatedData);
      
      // Update invoice totals
      const lineTotal = Number(lineItem.lineTotal);
      await storage.updateInvoice(invoice.id, {
        subtotal: (Number(invoice.subtotal) + lineTotal).toString(),
        totalAmount: (Number(invoice.totalAmount) + lineTotal).toString(),
        amountDue: (Number(invoice.amountDue) + lineTotal).toString()
      });
      
      res.status(201).json(lineItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invoice line item" });
    }
  });
  
  // 3. Payments
  app.get("/api/v1/finance/payments", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const invoiceId = req.query.invoiceId ? parseInt(req.query.invoiceId as string) : undefined;
      
      const payments = await storage.getPayments(tenantId, invoiceId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });
  
  app.post("/api/v1/finance/payments", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = (req.user as any).id;
      
      // Add tenant and creator info
      const data = { 
        ...req.body, 
        tenantId,
        createdBy: userId
      };
      
      // Check if invoice exists
      const invoice = await storage.getInvoice(data.invoiceId, tenantId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const validatedData = enhancedPaymentSchema.parse(data);
      const payment = await storage.createPayment(validatedData);
      
      // Fetch updated invoice after payment has been recorded
      const updatedInvoice = await storage.getInvoice(data.invoiceId, tenantId);
      
      res.status(201).json({
        payment,
        invoice: updatedInvoice
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment" });
    }
  });
  
  // 4. Chart of Accounts
  app.get("/api/v1/finance/chart-of-accounts", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const accountType = req.query.accountType as string | undefined;
      
      const accounts = await storage.getChartOfAccounts(tenantId, accountType);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chart of accounts" });
    }
  });
  
  app.post("/api/v1/finance/chart-of-accounts", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      // Add tenant info
      const data = { ...req.body, tenantId };
      
      // Check for duplicate account code
      const existingAccountByCode = await storage.getChartOfAccountByCode(data.accountCode, tenantId);
      if (existingAccountByCode) {
        return res.status(400).json({ message: "An account with this code already exists" });
      }
      
      const validatedData = enhancedChartOfAccountSchema.parse(data);
      const account = await storage.createChartOfAccount(validatedData);
      
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // 5. Payment Gateway Settings
  app.get("/api/v1/finance/payment-gateways", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      const settings = await storage.getPaymentGatewaySettings(tenantId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment gateway settings" });
    }
  });
  
  app.post("/api/v1/finance/payment-gateways", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      // Add tenant info
      const data = { ...req.body, tenantId };
      
      // Check for duplicate gateway
      const existingGateway = await storage.getPaymentGatewaySetting(tenantId, data.gatewayType);
      if (existingGateway) {
        return res.status(400).json({ message: "A setting for this payment gateway already exists" });
      }
      
      const validatedData = enhancedPaymentGatewaySettingSchema.parse(data);
      const setting = await storage.createPaymentGatewaySetting(validatedData);
      
      res.status(201).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment gateway setting" });
    }
  });

  // Create an HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
