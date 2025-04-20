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
  insertPaymentGatewaySettingSchema, insertChartOfAccountSchema,
  insertJournalEntryTypeSchema
} from "@shared/schema";

// Import enhanced schemas for finance module with proper type handling
import {
  enhancedInvoiceSchema,
  enhancedInvoiceLineItemSchema,
  enhancedPaymentSchema,
  enhancedPaymentGatewaySettingSchema,
  enhancedChartOfAccountSchema,
  enhancedJournalEntrySchema,
  enhancedJournalEntryLineSchema
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
      
      // If invoiceId is being updated, verify the invoice exists and belongs to the tenant
      if (req.body.invoiceId !== undefined && req.body.invoiceId !== existingTask.invoiceId) {
        // Only allow invoiceId to be set on revenue tasks
        if (existingTask.isAdmin) {
          return res.status(400).json({ message: "Admin tasks cannot be associated with invoices" });
        }
        
        // If we're setting an invoiceId (not removing it), verify the invoice
        if (req.body.invoiceId) {
          const invoice = await storage.getInvoice(req.body.invoiceId, tenantId);
          if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
          }
        }
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
  
  // Payment Gateway Settings
  app.get("/api/v1/finance/payment-gateways", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const settings = await storage.getPaymentGatewaySettings(tenantId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching payment gateways:", error);
      res.status(500).json({ message: "Failed to fetch payment gateway settings" });
    }
  });
  
  app.get("/api/v1/finance/payment-gateways/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const setting = await storage.getPaymentGatewaySetting(id, tenantId);
      if (!setting) {
        return res.status(404).json({ message: "Payment gateway setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error fetching payment gateway:", error);
      res.status(500).json({ message: "Failed to fetch payment gateway setting" });
    }
  });
  
  app.post("/api/v1/finance/payment-gateways", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const data = {
        ...req.body,
        tenantId
      };
      
      // Validate the gateway type doesn't already exist for this tenant
      const existingSettings = await storage.getPaymentGatewaySettings(tenantId);
      const duplicate = existingSettings.find(s => s.gatewayType === data.gatewayType);
      
      if (duplicate) {
        return res.status(400).json({
          message: `A payment gateway of type ${data.gatewayType} already exists for this tenant`
        });
      }
      
      const setting = await storage.createPaymentGatewaySetting(data);
      res.status(201).json(setting);
    } catch (error) {
      console.error("Error creating payment gateway:", error);
      res.status(500).json({ message: "Failed to create payment gateway setting" });
    }
  });
  
  app.put("/api/v1/finance/payment-gateways/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if setting exists and belongs to tenant
      const existingSetting = await storage.getPaymentGatewaySetting(id, tenantId);
      if (!existingSetting) {
        return res.status(404).json({ message: "Payment gateway setting not found" });
      }
      
      // Update the setting
      const updatedSetting = await storage.updatePaymentGatewaySetting(id, {
        ...req.body,
        updatedAt: new Date()
      });
      
      res.json(updatedSetting);
    } catch (error) {
      console.error("Error updating payment gateway:", error);
      res.status(500).json({ message: "Failed to update payment gateway setting" });
    }
  });
  
  app.delete("/api/v1/finance/payment-gateways/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const success = await storage.deletePaymentGatewaySetting(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Payment gateway setting not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment gateway:", error);
      res.status(500).json({ message: "Failed to delete payment gateway setting" });
    }
  });
  
  // Test payment gateway connection
  app.post("/api/v1/finance/payment-gateways/:type/test", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const gatewayType = req.params.type;
      
      // Get the gateway settings
      const settings = await storage.getPaymentGatewaySettings(tenantId);
      const gatewaySetting = settings.find(s => s.gatewayType === gatewayType);
      
      if (!gatewaySetting) {
        return res.status(404).json({ message: `No ${gatewayType} gateway found` });
      }
      
      if (!gatewaySetting.isEnabled) {
        return res.status(400).json({ message: `The ${gatewayType} gateway is not enabled` });
      }
      
      let configData;
      try {
        configData = typeof gatewaySetting.configData === 'string' 
          ? JSON.parse(gatewaySetting.configData)
          : gatewaySetting.configData;
      } catch (e) {
        return res.status(400).json({ message: "Invalid gateway configuration data" });
      }
      
      // Test the connection based on gateway type
      let testResult;
      
      if (gatewayType === 'stripe') {
        // Test Stripe connection
        if (!configData.secret_key) {
          return res.status(400).json({ message: "Stripe secret key is missing" });
        }
        
        const stripeClient = new Stripe(configData.secret_key, {
          apiVersion: '2023-10-16'
        });
        
        try {
          // Try to fetch balance to verify the API key works
          await stripeClient.balance.retrieve();
          testResult = { success: true };
        } catch (stripeError: any) {
          return res.status(400).json({ 
            message: "Failed to connect to Stripe", 
            error: stripeError.message 
          });
        }
      } else if (gatewayType === 'paypal') {
        // Mock successful connection for PayPal
        // In a real implementation, you would use the PayPal SDK to verify credentials
        testResult = { success: true };
      } else {
        return res.status(400).json({ message: `Unsupported gateway type: ${gatewayType}` });
      }
      
      res.json(testResult);
    } catch (error) {
      console.error("Error testing payment gateway:", error);
      res.status(500).json({ message: "Failed to test payment gateway connection" });
    }
  });
  
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
  
  // GET invoice PDF by ID
  app.get("/api/v1/finance/invoices/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Get invoice data
      const invoice = await storage.getInvoice(id, tenantId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Get line items for this invoice
      const lineItems = await storage.getInvoiceLineItems(tenantId, id);
      
      // Get client data
      const client = await storage.getClient(invoice.clientId, tenantId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Get entity data
      const entity = await storage.getEntity(invoice.entityId, tenantId);
      if (!entity) {
        return res.status(404).json({ message: "Entity not found" });
      }
      
      // Get tenant data
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // Import PDF generator
      const { generateInvoicePdf } = await import('./utils/pdf-generator');
      
      // Generate beautifully formatted PDF
      const pdfContent = await generateInvoicePdf(invoice, lineItems, client, entity, tenant);
      
      // Send the PDF to client
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`);
      res.send(pdfContent);
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ message: "Error generating invoice PDF" });
    }
  });
  
  // GET invoice share link by ID
  app.get("/api/v1/finance/invoices/:id/share-link", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const invoice = await storage.getInvoice(id, tenantId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // For demo purposes, we're just generating a fake URL
      // In a real application, this might generate a unique token and persist it
      const shareLink = `https://demo-accounting-app.com/invoices/share/${invoice.id}/${Date.now()}`;
      
      res.json({
        shareLink
      });
    } catch (error) {
      console.error("Error generating share link:", error);
      res.status(500).json({ message: "Error generating share link" });
    }
  });
  
  // POST update invoice status
  app.post("/api/v1/finance/invoices/:id/status", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = (req.user as any).id;
      const id = parseInt(req.params.id);
      const { status, createClientAccount, incomeAccountId } = req.body;
      
      // Validate the requested status
      const validStatuses = ['draft', 'approved', 'sent', 'paid', 'partially_paid', 'overdue', 'canceled', 'void'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid invoice status" });
      }
      
      // Get the invoice
      const invoice = await storage.getInvoice(id, tenantId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if status change is allowed (implementation of business rules)
      const allowedTransitions: Record<string, string[]> = {
        'draft': ['approved', 'sent', 'canceled', 'void'],
        'sent': ['approved', 'paid', 'partially_paid', 'overdue', 'canceled', 'void'],
        'approved': ['paid', 'partially_paid', 'overdue', 'canceled', 'void'],
        'partially_paid': ['paid', 'overdue', 'void'],
        'overdue': ['paid', 'partially_paid', 'void'],
        'paid': ['void'],
        'canceled': ['draft'],
        'void': [],
      };
      
      const isTransitionAllowed = allowedTransitions[invoice.status]?.includes(status);
      if (!isTransitionAllowed) {
        return res.status(400).json({ 
          message: `Cannot change invoice status from '${invoice.status}' to '${status}'` 
        });
      }
      
      // Update invoice status
      await storage.updateInvoice(id, { 
        status, 
        updatedAt: new Date(),
        updatedBy: userId 
      });
      
      // Handle special status transitions with accounting effects
      const previousStatus = invoice.status;
      
      // When invoice is being approved - validate accounts and create accounting entries for double-entry bookkeeping
      if (previousStatus === 'draft' && status === 'approved') {
        try {
          // 1. Validate required chart of accounts before creating journal entries
          const missingAccounts = [];
          
          // Get client information if available
          const client = invoice.clientId ? await storage.getClient(invoice.clientId, tenantId) : null;
          const clientName = client ? client.clientName : "Unknown Client";
          
          // Check if client account exists in the chart of accounts
          let clientAccount = null;
          if (invoice.clientId) {
            // Look for an existing account with this client ID
            const clientAccounts = await storage.getChartOfAccounts(tenantId, "asset");
            clientAccount = clientAccounts.find(acc => acc.clientId === invoice.clientId);
          }
          
          // Handle client account creation if requested
          if (!clientAccount && createClientAccount === true && invoice.clientId) {
            // Find the Trade Debtors detailed group
            const detailedGroups = await storage.getChartOfAccountsDetailedGroups(tenantId);
            const tradeDebtorsGroup = detailedGroups.find(group => 
              group.name.toLowerCase().includes('trade_debtors') || 
              group.name.toLowerCase().includes('accounts receivable')
            );
            
            if (tradeDebtorsGroup) {
              // Create a new client account in Trade Debtors
              clientAccount = await storage.createChartOfAccount({
                tenantId: tenantId,
                detailedGroupId: tradeDebtorsGroup.id,
                accountCode: `1210-${invoice.clientId}`, // Format: 1210-{clientId}
                accountName: `${clientName} - Receivable`,
                accountType: "asset",
                description: `Accounts receivable for client: ${clientName}`,
                isSystemAccount: false,
                isActive: true,
                clientId: invoice.clientId,
                openingBalance: "0.00",
                currentBalance: "0.00"
              });
              
              console.log(`Created new client account in chart of accounts: ${clientAccount.accountName} (ID: ${clientAccount.id})`);
            } else {
              missingAccounts.push("Trade Debtors Group (required for client accounts)");
            }
          } else if (!clientAccount && invoice.clientId) {
            // If client account doesn't exist and createClientAccount is not true, return error
            return res.status(400).json({
              message: "Cannot approve invoice: Client account needed in Chart of Accounts",
              details: {
                missingClientAccount: true,
                clientId: invoice.clientId,
                clientName: clientName,
                guidance: "This client needs an account in your Chart of Accounts to record invoice transactions correctly."
              }
            });
          }
          
          // Accounts receivable (Asset) - Use client-specific account if available, otherwise use Trade Debtors
          const accountsReceivable = clientAccount || await storage.getChartOfAccountByCode("1200", tenantId);
          if (!accountsReceivable) {
            missingAccounts.push("Trade Debtors (1200)");
          }
          
          // Revenue account handling (use selected income account if provided)
          let revenueAccount;
          
          if (incomeAccountId) {
            // Use the income account selected by the user
            revenueAccount = await storage.getChartOfAccount(parseInt(incomeAccountId), tenantId);
            if (!revenueAccount) {
              missingAccounts.push(`Selected Income Account (${incomeAccountId})`);
            }
          } else if (invoice.entityId) {
            // Fall back to entity's revenue account if available
            const entity = await storage.getEntity(invoice.entityId, tenantId);
            
            if (entity && entity.revenueAccountId) {
              revenueAccount = await storage.getChartOfAccount(entity.revenueAccountId, tenantId);
              if (!revenueAccount) {
                missingAccounts.push(`Entity Revenue Account (${entity.revenueAccountId})`);
              }
            }
          }
          
          // Check default revenue account if not found by other methods
          if (!revenueAccount) {
            // If income account selection is needed but not provided, prompt user to select one
            const incomeAccounts = await storage.getChartOfAccounts(tenantId, "revenue");
            if (incomeAccounts.length > 0 && incomeAccountId === undefined) {
              return res.status(400).json({
                message: "Please select an income account for this invoice",
                details: {
                  guidance: "You need to select which income account should be credited for this invoice.",
                  clientName: clientName
                }
              });
            }
            
            revenueAccount = await storage.getChartOfAccountByCode("4000", tenantId);
            if (!revenueAccount) {
              missingAccounts.push("Default Revenue Account (4000)");
            }
          }
          
          // Check tax liability account if invoice has tax
          const taxAmount = parseFloat(invoice.taxAmount || "0");
          if (taxAmount > 0) {
            const taxLiabilityAccount = await storage.getChartOfAccountByCode("2200", tenantId);
            if (!taxLiabilityAccount) {
              missingAccounts.push("Tax Liability Account (2200)");
            }
          }
          
          // If any required accounts are missing, return error with guidance
          if (missingAccounts.length > 0) {
            return res.status(400).json({
              message: "Cannot approve invoice: Missing required accounts in Chart of Accounts",
              details: {
                missingAccounts,
                guidance: "Please set up the required accounts in your Chart of Accounts before approving this invoice. Navigate to Finance > Chart of Accounts to add these accounts."
              }
            });
          }
          
          // Tax liability account (if tax is present)
          const taxLiabilityAccount = await storage.getChartOfAccountByCode("2200", tenantId);
          
          // 2. Create journal entries (all accounts have been validated at this point)
          const totalAmount = parseFloat(invoice.totalAmount);
          const revenueAmount = totalAmount - taxAmount;
          
          // Create journal entry header
          const journalEntry = await storage.createJournalEntry({
            tenantId: tenantId,
            entryDate: new Date(),
            reference: `INV-${invoice.invoiceNumber}`,
            entryType: "INVAP", // Invoice approval entry type
            description: `Invoice ${invoice.invoiceNumber} approved`,
            isPosted: true,
            createdBy: userId,
            sourceDocument: "invoice",
            sourceDocumentId: invoice.id
          });
          
          // Debit Accounts Receivable (Asset increase)
          await storage.createJournalEntryLine({
            tenantId: tenantId,
            journalEntryId: journalEntry.id,
            accountId: accountsReceivable.id,
            description: `Accounts Receivable - Invoice ${invoice.invoiceNumber}`,
            debitAmount: totalAmount.toString(),
            creditAmount: "0",
            lineOrder: 1
          });
          
          // Credit Revenue (Revenue increase)
          await storage.createJournalEntryLine({
            tenantId: tenantId,
            journalEntryId: journalEntry.id,
            accountId: revenueAccount.id,
            description: `Revenue - Invoice ${invoice.invoiceNumber}`,
            debitAmount: "0",
            creditAmount: revenueAmount.toString(),
            lineOrder: 2
          });
          
          // If tax exists, credit Tax Liability
          if (taxAmount > 0 && taxLiabilityAccount) {
            await storage.createJournalEntryLine({
              tenantId: tenantId,
              journalEntryId: journalEntry.id,
              accountId: taxLiabilityAccount.id,
              description: `Tax Liability - Invoice ${invoice.invoiceNumber}`,
              debitAmount: "0",
              creditAmount: taxAmount.toString(),
              lineOrder: 3
            });
          }
            
          console.log(`Created journal entry (ID: ${journalEntry.id}) for approved invoice ${invoice.invoiceNumber}`);
        } catch (error) {
          console.error("Error creating accounting entries for approved invoice:", error);
          // We don't fail the operation if accounting entries fail, but we log the error
        }
      }
      
      // Return updated invoice
      const updatedInvoice = await storage.getInvoice(id, tenantId);
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      res.status(500).json({ message: "Error updating invoice status" });
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
      
      // Update task with invoiceId if taskId was provided
      if (req.body.taskId) {
        try {
          const taskId = parseInt(req.body.taskId);
          const task = await storage.getTask(taskId, tenantId);
          if (task) {
            await storage.updateTask(taskId, { 
              invoiceId: invoice.id,
              invoiceCreatedAt: new Date()
            });
          }
        } catch (error) {
          console.error("Failed to update task with invoice ID:", error);
        }
      }
      
      // Create accounting entries for the invoice (double-entry bookkeeping)
      try {
        // 1. Find accounts needed for bookkeeping
        // Accounts receivable (Asset)
        const accountsReceivable = await storage.getChartOfAccountByCode("1200", tenantId);
        
        // Revenue account (lookup based on client entity or use default)
        let revenueAccount;
        if (invoice.entityId) {
          const entity = await storage.getEntity(invoice.entityId, tenantId);
          if (entity && entity.revenueAccountId) {
            revenueAccount = await storage.getChartOfAccount(entity.revenueAccountId, tenantId);
          }
        }
        
        // Use default revenue account if not found
        if (!revenueAccount) {
          revenueAccount = await storage.getChartOfAccountByCode("4000", tenantId);
        }
        
        // Tax liability account (if tax is present)
        const taxLiabilityAccount = await storage.getChartOfAccountByCode("2200", tenantId);
        
        if (accountsReceivable && revenueAccount) {
          // 2. Create journal entries
          const totalAmount = parseFloat(invoice.totalAmount);
          const taxAmount = parseFloat(invoice.taxAmount || "0");
          const revenueAmount = totalAmount - taxAmount;
          
          // Create journal entry header
          const journalEntry = await storage.createJournalEntry({
            tenantId: tenantId,
            entryDate: invoice.issueDate,
            reference: `INV-${invoice.invoiceNumber}`,
            entryType: "INV", // Invoice entry type
            description: `Invoice ${invoice.invoiceNumber} created`,
            isPosted: true,
            createdBy: userId,
            sourceDocument: "invoice",
            sourceDocumentId: invoice.id
          });
          
          // Debit Accounts Receivable (Asset increase)
          await storage.createJournalEntryLine({
            tenantId: tenantId,
            journalEntryId: journalEntry.id,
            accountId: accountsReceivable.id,
            description: `Accounts Receivable - Invoice ${invoice.invoiceNumber}`,
            debitAmount: totalAmount.toString(),
            creditAmount: "0",
            lineOrder: 1
          });
          
          // Credit Revenue (Revenue increase)
          await storage.createJournalEntryLine({
            tenantId: tenantId,
            journalEntryId: journalEntry.id,
            accountId: revenueAccount.id,
            description: `Revenue - Invoice ${invoice.invoiceNumber}`,
            debitAmount: "0",
            creditAmount: revenueAmount.toString(),
            lineOrder: 2
          });
          
          // If tax exists, credit Tax Liability
          if (taxAmount > 0 && taxLiabilityAccount) {
            await storage.createJournalEntryLine({
              tenantId: tenantId,
              journalEntryId: journalEntry.id,
              accountId: taxLiabilityAccount.id,
              description: `Sales Tax - Invoice ${invoice.invoiceNumber}`,
              debitAmount: "0",
              creditAmount: taxAmount.toString(),
              lineOrder: 3
            });
          }
          
          // 3. Update account balances
          await storage.updateChartOfAccount(accountsReceivable.id, {
            currentBalance: (parseFloat(accountsReceivable.currentBalance || "0") + totalAmount).toString()
          });
          
          await storage.updateChartOfAccount(revenueAccount.id, {
            currentBalance: (parseFloat(revenueAccount.currentBalance || "0") + revenueAmount).toString()
          });
          
          if (taxAmount > 0 && taxLiabilityAccount) {
            await storage.updateChartOfAccount(taxLiabilityAccount.id, {
              currentBalance: (parseFloat(taxLiabilityAccount.currentBalance || "0") + taxAmount).toString()
            });
          }
        }
      } catch (error) {
        // Log the error but don't fail the invoice creation
        console.error("Failed to create accounting entries:", error);
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
      
      // Handle accounting entries when invoice status changes to "passed"
      if (req.body.status === "passed" && existingInvoice.status !== "passed" as any && updatedInvoice) {
        try {
          console.log(`Creating accounting entries for invoice ${updatedInvoice.invoiceNumber} as status changed to "passed"`);
          
          // 1. Find accounts needed for bookkeeping
          // Accounts receivable (Asset)
          const accountsReceivable = await storage.getChartOfAccountByCode("1200", tenantId);
          
          // Revenue account (lookup based on client entity or use default)
          let revenueAccount;
          if (updatedInvoice.entityId) {
            const entity = await storage.getEntity(updatedInvoice.entityId, tenantId);
            if (entity && entity.revenueAccountId) {
              revenueAccount = await storage.getChartOfAccount(entity.revenueAccountId, tenantId);
            }
          }
          
          // Use default revenue account if not found
          if (!revenueAccount) {
            revenueAccount = await storage.getChartOfAccountByCode("4000", tenantId);
          }
          
          // Tax liability account (if tax is present)
          const taxLiabilityAccount = await storage.getChartOfAccountByCode("2200", tenantId);
          
          if (accountsReceivable && revenueAccount) {
            // 2. Create journal entries
            const totalAmount = parseFloat(updatedInvoice.totalAmount);
            const taxAmount = parseFloat(updatedInvoice.taxAmount || "0");
            const revenueAmount = totalAmount - taxAmount;
            
            // Create journal entry header
            const journalEntry = await storage.createJournalEntry({
              tenantId: tenantId,
              entryDate: updatedInvoice.issueDate,
              reference: `INV-${updatedInvoice.invoiceNumber}`,
              entryType: "INV", // Invoice entry type
              description: `Invoice ${updatedInvoice.invoiceNumber} passed to accounting`,
              isPosted: true,
              createdBy: userId,
              sourceDocument: "invoice",
              sourceDocumentId: updatedInvoice.id
            });
            
            // Debit Accounts Receivable (Asset increase)
            await storage.createJournalEntryLine({
              tenantId: tenantId,
              journalEntryId: journalEntry.id,
              accountId: accountsReceivable.id,
              description: `Accounts Receivable - Invoice ${updatedInvoice.invoiceNumber}`,
              debitAmount: totalAmount.toString(),
              creditAmount: "0",
              lineOrder: 1
            });
            
            // Credit Revenue (Revenue increase)
            await storage.createJournalEntryLine({
              tenantId: tenantId,
              journalEntryId: journalEntry.id,
              accountId: revenueAccount.id,
              description: `Revenue - Invoice ${updatedInvoice.invoiceNumber}`,
              debitAmount: "0",
              creditAmount: revenueAmount.toString(),
              lineOrder: 2
            });
            
            // If tax exists, credit Tax Liability
            if (taxAmount > 0 && taxLiabilityAccount) {
              await storage.createJournalEntryLine({
                tenantId: tenantId,
                journalEntryId: journalEntry.id,
                accountId: taxLiabilityAccount.id,
                description: `Sales Tax - Invoice ${updatedInvoice.invoiceNumber}`,
                debitAmount: "0",
                creditAmount: taxAmount.toString(),
                lineOrder: 3
              });
            }
            
            // 3. Update account balances
            await storage.updateChartOfAccount(accountsReceivable.id, {
              currentBalance: (parseFloat(accountsReceivable.currentBalance || "0") + totalAmount).toString()
            });
            
            await storage.updateChartOfAccount(revenueAccount.id, {
              currentBalance: (parseFloat(revenueAccount.currentBalance || "0") + revenueAmount).toString()
            });
            
            if (taxAmount > 0 && taxLiabilityAccount) {
              await storage.updateChartOfAccount(taxLiabilityAccount.id, {
                currentBalance: (parseFloat(taxLiabilityAccount.currentBalance || "0") + taxAmount).toString()
              });
            }
            
            console.log(`Successfully created accounting entries for invoice ${updatedInvoice.invoiceNumber}`);
          } else {
            console.error("Required accounts not found for creating accounting entries");
          }
        } catch (accountingError) {
          // Log the error but don't fail the invoice update
          console.error("Failed to create accounting entries:", accountingError);
        }
      }
      
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
      
      // Create accounting entries for the payment (double-entry bookkeeping)
      try {
        // 1. Find accounts needed for bookkeeping
        // Cash/Bank Account (Asset) based on payment method
        let cashAccount;
        switch(payment.paymentMethod) {
          case 'credit_card':
          case 'bank_transfer':
          case 'direct_debit':
            cashAccount = await storage.getChartOfAccountByCode("1100", tenantId); // Bank
            break;
          case 'cash':
            cashAccount = await storage.getChartOfAccountByCode("1110", tenantId); // Cash
            break;
          default:
            cashAccount = await storage.getChartOfAccountByCode("1100", tenantId); // Default to Bank
        }
        
        // Accounts Receivable (Asset)
        const accountsReceivable = await storage.getChartOfAccountByCode("1200", tenantId);
        
        if (cashAccount && accountsReceivable) {
          // Parse payment amount
          const paymentAmount = parseFloat(payment.amount);
          
          // Create journal entry header
          const journalEntry = await storage.createJournalEntry({
            tenantId: tenantId,
            entryDate: payment.paymentDate,
            reference: `PMT-${payment.id}`,
            entryType: "PMT", // Payment entry type
            description: `Payment received for Invoice ${invoice.invoiceNumber}`,
            isPosted: true,
            createdBy: userId,
            sourceDocument: "payment",
            sourceDocumentId: payment.id
          });
          
          // Debit Cash/Bank (Asset increase)
          await storage.createJournalEntryLine({
            tenantId: tenantId,
            journalEntryId: journalEntry.id,
            accountId: cashAccount.id,
            description: `Cash/Bank - Payment for Invoice ${invoice.invoiceNumber}`,
            debitAmount: paymentAmount.toString(),
            creditAmount: "0",
            lineOrder: 1
          });
          
          // Credit Accounts Receivable (Asset decrease)
          await storage.createJournalEntryLine({
            tenantId: tenantId,
            journalEntryId: journalEntry.id,
            accountId: accountsReceivable.id,
            description: `Accounts Receivable - Payment for Invoice ${invoice.invoiceNumber}`,
            debitAmount: "0",
            creditAmount: paymentAmount.toString(),
            lineOrder: 2
          });
          
          // Update account balances
          await storage.updateChartOfAccount(cashAccount.id, {
            currentBalance: (parseFloat(cashAccount.currentBalance || "0") + paymentAmount).toString()
          });
          
          await storage.updateChartOfAccount(accountsReceivable.id, {
            currentBalance: (parseFloat(accountsReceivable.currentBalance || "0") - paymentAmount).toString()
          });
        }
      } catch (error) {
        // Log the error but don't fail the payment creation
        console.error("Failed to create accounting entries for payment:", error);
      }
      
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
  
  // 4. Chart of Accounts Hierarchy
  
  // 4.1 Main Groups
  app.get("/api/v1/finance/chart-of-accounts/main-groups", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const mainGroups = await storage.getChartOfAccountsMainGroups(tenantId);
      res.json(mainGroups);
    } catch (error) {
      console.error("Error fetching main groups:", error);
      res.status(500).json({ message: "Failed to fetch chart of accounts main groups" });
    }
  });
  
  app.post("/api/v1/finance/chart-of-accounts/main-groups", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      // Add tenant info
      const data = { ...req.body, tenantId };
      
      const mainGroup = await storage.createChartOfAccountsMainGroup(data);
      res.status(201).json(mainGroup);
    } catch (error) {
      console.error("Error creating main group:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create chart of accounts main group" });
    }
  });
  
  app.patch("/api/v1/finance/chart-of-accounts/main-groups/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Add tenant info
      const data = { ...req.body };
      
      const mainGroup = await storage.updateChartOfAccountsMainGroup(id, tenantId, data);
      if (!mainGroup) {
        return res.status(404).json({ message: "Main group not found" });
      }
      
      res.json(mainGroup);
    } catch (error) {
      console.error("Error updating main group:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update chart of accounts main group" });
    }
  });
  
  app.delete("/api/v1/finance/chart-of-accounts/main-groups/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      // Check if there are element groups using this main group
      const elementGroups = await storage.getChartOfAccountsElementGroups(tenantId, id);
      if (elementGroups.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete main group with associated element groups. Remove all element groups first." 
        });
      }
      
      const result = await storage.deleteChartOfAccountsMainGroup(id, tenantId);
      if (!result) {
        return res.status(404).json({ message: "Main group not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting main group:", error);
      res.status(500).json({ message: "Failed to delete chart of accounts main group" });
    }
  });
  
  // 4.2 Element Groups
  app.get("/api/v1/finance/chart-of-accounts/element-groups", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const mainGroupId = req.query.mainGroupId ? parseInt(req.query.mainGroupId as string) : undefined;
      
      const elementGroups = await storage.getChartOfAccountsElementGroups(tenantId, mainGroupId);
      res.json(elementGroups);
    } catch (error) {
      console.error("Error fetching element groups:", error);
      res.status(500).json({ message: "Failed to fetch chart of accounts element groups" });
    }
  });
  
  app.post("/api/v1/finance/chart-of-accounts/element-groups", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      // Add tenant info
      const data = { ...req.body, tenantId };
      
      // Check if main group exists
      const mainGroup = await storage.getChartOfAccountsMainGroup(data.mainGroupId, tenantId);
      if (!mainGroup) {
        return res.status(400).json({ message: "Invalid main group ID" });
      }
      
      const elementGroup = await storage.createChartOfAccountsElementGroup(data);
      res.status(201).json(elementGroup);
    } catch (error) {
      console.error("Error creating element group:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create chart of accounts element group" });
    }
  });
  
  // 4.3 Sub-Element Groups
  app.get("/api/v1/finance/chart-of-accounts/sub-element-groups", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const elementGroupId = req.query.elementGroupId ? parseInt(req.query.elementGroupId as string) : undefined;
      
      const subElementGroups = await storage.getChartOfAccountsSubElementGroups(tenantId, elementGroupId);
      res.json(subElementGroups);
    } catch (error) {
      console.error("Error fetching sub-element groups:", error);
      res.status(500).json({ message: "Failed to fetch chart of accounts sub-element groups" });
    }
  });
  
  // 4.4 Detailed Groups
  app.get("/api/v1/finance/chart-of-accounts/detailed-groups", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const subElementGroupId = req.query.subElementGroupId ? parseInt(req.query.subElementGroupId as string) : undefined;
      
      const detailedGroups = await storage.getChartOfAccountsDetailedGroups(tenantId, subElementGroupId);
      res.json(detailedGroups);
    } catch (error) {
      console.error("Error fetching detailed groups:", error);
      res.status(500).json({ message: "Failed to fetch chart of accounts detailed groups" });
    }
  });
  
  // 4.5 Accounts (AC Heads)
  app.get("/api/v1/finance/chart-of-accounts", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const accountType = req.query.accountType as string | undefined;
      const detailedGroupId = req.query.detailedGroupId ? parseInt(req.query.detailedGroupId as string) : undefined;
      // Add parameter to control whether system accounts are included (default to false)
      const includeSystemAccounts = req.query.includeSystemAccounts === 'true';
      
      const accounts = await storage.getChartOfAccounts(tenantId, accountType, detailedGroupId, includeSystemAccounts);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch chart of accounts" });
    }
  });
  
  app.post("/api/v1/finance/chart-of-accounts", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      // Add tenant info
      const data = { ...req.body, tenantId };
      
      // Set defaults for simplified form
      const simplifiedData = {
        ...data,
        isActive: true,
        isSystemAccount: false,
        description: data.description || null,
        currentBalance: data.openingBalance || "0.00",
      };
      
      // Validate detailed group exists
      if (!simplifiedData.detailedGroupId) {
        return res.status(400).json({ message: "Detailed group is required" });
      }
      
      // Get account type from the hierarchy
      const detailedGroup = await storage.getChartOfAccountsDetailedGroup(simplifiedData.detailedGroupId, tenantId);
      if (!detailedGroup) {
        return res.status(400).json({ message: "Invalid detailed group" });
      }
      
      const subElementGroup = await storage.getChartOfAccountsSubElementGroup(detailedGroup.subElementGroupId, tenantId);
      if (!subElementGroup) {
        return res.status(400).json({ message: "Invalid sub-element group" });
      }
      
      const elementGroup = await storage.getChartOfAccountsElementGroup(subElementGroup.elementGroupId, tenantId);
      if (!elementGroup) {
        return res.status(400).json({ message: "Invalid element group" });
      }
      
      // Determine account type from element group
      let accountType = "asset"; // default
      switch(elementGroup.name.toLowerCase()) {
        case "assets":
          accountType = "asset";
          break;
        case "liabilities":
          accountType = "liability";
          break;
        case "equity":
          accountType = "equity";
          break;
        case "incomes":
          accountType = "revenue";
          break;
        case "expenses":
          accountType = "expense";
          break;
      }
      
      // Generate account code
      const existingAccounts = await storage.getChartOfAccounts(tenantId, accountType, simplifiedData.detailedGroupId);
      const baseCode = `${elementGroup.code}.${subElementGroup.code}.${detailedGroup.code}`;
      const nextNumber = (existingAccounts.length + 1).toString().padStart(3, '0');
      const accountCode = `${baseCode}.${nextNumber}`;
      
      // Prepare complete data
      const completeData = {
        ...simplifiedData,
        accountType,
        accountCode,
      };
      
      console.log("Creating chart of account with data:", JSON.stringify(completeData, null, 2));
      
      // Create the account directly without validation
      const account = await storage.createChartOfAccount(completeData);
      
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account", error: error.toString() });
    }
  });

  // 5. Journal Entries
  app.get("/api/v1/finance/journal-entries", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const sourceDocument = req.query.sourceDocument as string | undefined;
      const sourceDocumentId = req.query.sourceDocumentId ? parseInt(req.query.sourceDocumentId as string) : undefined;
      
      const entries = await storage.getJournalEntries(tenantId, sourceDocument, sourceDocumentId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });
  
  app.get("/api/v1/finance/journal-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const id = parseInt(req.params.id);
      
      const entry = await storage.getJournalEntry(id, tenantId);
      if (!entry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      // Fetch associated journal entry lines
      const lines = await storage.getJournalEntryLines(tenantId, id);
      
      res.json({
        ...entry,
        lines
      });
    } catch (error) {
      console.error("Error fetching journal entry:", error);
      res.status(500).json({ message: "Failed to fetch journal entry" });
    }
  });

  app.post("/api/v1/finance/journal-entries", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const userId = (req.user as any).id;
      
      // Extract data from request body
      const { entryDate, sourceDocument, sourceDocumentId, lines, ...otherBodyData } = req.body;
      
      console.log("Journal Entry Request body:", {
        entryDate,
        sourceDocument,
        sourceDocumentId,
        lines: Array.isArray(lines) ? `${lines.length} lines` : lines,
        ...otherBodyData
      });
      
      // Convert string date to Date object
      const parsedEntryDate = entryDate ? new Date(entryDate) : new Date();
      
      // Validate lines
      if (!lines || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ message: "Journal entry must have at least one line" });
      }
      
      // Calculate totals
      const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debitAmount || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.creditAmount || 0), 0);
      
      // Validate double-entry principle
      if (Math.abs(totalDebit - totalCredit) > 0.0001) {
        return res.status(400).json({ 
          message: "Journal entry must balance (total debits must equal total credits)",
          totalDebit,
          totalCredit
        });
      }
      
      // Set up the entry data with proper null handling for sourceDocument fields
      const entryData = { 
        ...otherBodyData, 
        entryDate: parsedEntryDate,
        tenantId, 
        createdBy: userId,
        // Provide default value for sourceDocument to meet not-null constraint
        sourceDocument: sourceDocument || "manual",
        sourceDocumentId: sourceDocumentId ? Number(sourceDocumentId) : null,
        totalAmount: totalDebit.toString() // Both debit and credit totals should be equal
      };
      
      // Validate the journal entry data using our enhanced schema
      console.log("Validating journal entry data with schema");
      const validatedEntryData = enhancedJournalEntrySchema.parse(entryData);
      
      // Create journal entry
      console.log("Creating journal entry with validated data:", validatedEntryData);
      const journalEntry = await storage.createJournalEntry(validatedEntryData);
      console.log("Journal entry created:", journalEntry);
      
      // Create journal entry lines
      const journalEntryLines = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineData = {
          ...line,
          tenantId,
          journalEntryId: journalEntry.id,
          lineOrder: i + 1, // Ensure line order is set properly
          // Use default values for missing fields
          debitAmount: line.debitAmount || "0",
          creditAmount: line.creditAmount || "0"
        };
        
        // Validate journal entry line data
        console.log(`Validating journal entry line ${i+1}`);
        const validatedLineData = enhancedJournalEntryLineSchema.parse(lineData);
        
        console.log(`Creating journal entry line ${i+1}:`, validatedLineData);
        const journalEntryLine = await storage.createJournalEntryLine(validatedLineData);
        journalEntryLines.push(journalEntryLine);
      }
      
      // Return the complete entry with its lines
      res.status(201).json({
        ...journalEntry,
        lines: journalEntryLines
      });
      
    } catch (error) {
      console.error("Error creating journal entry:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to create journal entry",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // 6. Payment Gateway Settings
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

  // 7. Journal Entry Types
  app.get("/api/v1/finance/journal-entry-types", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      // Get all journal entry types for tenant
      const entryTypes = await storage.getJournalEntryTypes(tenantId);
      res.json(entryTypes);
    } catch (error) {
      console.error("Error fetching journal entry types:", error);
      res.status(500).json({ message: "Failed to fetch journal entry types" });
    }
  });
  
  app.post("/api/v1/finance/journal-entry-types", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any).tenantId;
      
      // Add tenant info
      const data = { ...req.body, tenantId };
      
      // Check for duplicate code
      const existingTypes = await storage.getJournalEntryTypes(tenantId);
      const duplicateCode = existingTypes.find(type => type.code === data.code);
      
      if (duplicateCode) {
        return res.status(400).json({ message: "A journal entry type with this code already exists" });
      }
      
      // Validate and create
      const validatedData = insertJournalEntryTypeSchema.parse(data);
      const entryType = await storage.createJournalEntryType(validatedData);
      
      res.status(201).json(entryType);
    } catch (error) {
      console.error("Error creating journal entry type:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create journal entry type" });
    }
  });

  // Create an HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
