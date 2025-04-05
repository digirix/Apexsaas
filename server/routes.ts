import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertCountrySchema, insertCurrencySchema, insertStateSchema, 
  insertEntityTypeSchema, insertTaskStatusSchema, insertServiceTypeSchema,
  insertClientSchema, insertEntitySchema, insertTaskSchema
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create entity" });
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

  // Create an HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
