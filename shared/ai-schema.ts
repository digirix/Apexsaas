import { pgTable, text, serial, integer, boolean, timestamp, json, varchar, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// AI Provider Enum (as a string in the database for flexibility)
export const AI_PROVIDERS = ["OpenRouter.ai", "OpenAI", "Google AI", "DeepSeek", "Anthropic (Claude)"] as const;

// AI Configuration table for tenant-specific AI settings
export const aiConfigurations = pgTable("ai_configurations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  provider: text("provider").notNull(), // One of AI_PROVIDERS
  apiKey: text("api_key").notNull(), // Encrypted API key
  modelId: text("model_id"), // The selected model ID
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantProviderUnique: unique().on(table.tenantId, table.provider),
  };
});

// Schema for inserting a new AI configuration
export const insertAiConfigurationSchema = createInsertSchema(aiConfigurations).pick({
  tenantId: true,
  provider: true,
  apiKey: true,
  modelId: true,
  isActive: true,
});

// Type for AI configuration insert
export type InsertAiConfiguration = z.infer<typeof insertAiConfigurationSchema>;
// Type for AI configuration select
export type SelectAiConfiguration = typeof aiConfigurations.$inferSelect;

// AI Chat History table to store chat interactions
export const aiChatHistory = pgTable("ai_chat_history", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  response: text("response").notNull(),
  metadata: json("metadata"), // Additional metadata about the interaction
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for inserting a new chat history entry
export const insertAiChatHistorySchema = createInsertSchema(aiChatHistory).pick({
  tenantId: true,
  userId: true,
  message: true,
  response: true,
  metadata: true,
});

// Type for AI chat history insert
export type InsertAiChatHistory = z.infer<typeof insertAiChatHistorySchema>;
// Type for AI chat history select
export type SelectAiChatHistory = typeof aiChatHistory.$inferSelect;

// AI Report History table to store generated reports
export const aiReportHistory = pgTable("ai_report_history", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  query: text("query").notNull(), // The natural language query
  generatedSql: text("generated_sql"), // The SQL query generated (if applicable)
  results: json("results"), // The query results
  reportText: text("report_text").notNull(), // The generated report text
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for inserting a new AI report history entry
export const insertAiReportHistorySchema = createInsertSchema(aiReportHistory).pick({
  tenantId: true,
  userId: true,
  query: true,
  generatedSql: true,
  results: true,
  reportText: true,
});

// Type for AI report history insert
export type InsertAiReportHistory = z.infer<typeof insertAiReportHistorySchema>;
// Type for AI report history select
export type SelectAiReportHistory = typeof aiReportHistory.$inferSelect;

// Zod schema for validating client-side API key testing
export const testAiConnectionSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().min(1, "API key is required")
});

// Type for AI connection test
export type TestAiConnection = z.infer<typeof testAiConnectionSchema>;

// Response type for the test connection API
export const testAiConnectionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  models: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
  })).optional(),
});

// Type for test connection response
export type TestAiConnectionResponse = z.infer<typeof testAiConnectionResponseSchema>;