import { pgTable, pgEnum, serial, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// AI Provider enum
export const AI_PROVIDERS = ["Google", "OpenAI", "Anthropic"] as const;
export const aiProviderEnum = pgEnum("ai_provider", AI_PROVIDERS);
export type AiProvider = typeof AI_PROVIDERS[number];

// AI Configuration table
export const aiConfigurations = pgTable("ai_configurations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  provider: aiProviderEnum("provider").notNull(),
  model: text("model").notNull(),
  apiKey: text("api_key").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Chat Conversation table
export const aiChatConversations = pgTable("ai_chat_conversations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Chat Message table
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  message: text("message"), // user's message
  response: text("response"), // AI's response
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Task Suggestions table
export const aiTaskSuggestions = pgTable("ai_task_suggestions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  entityId: integer("entity_id").notNull(),
  suggestions: jsonb("suggestions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Compliance Analysis table
export const aiComplianceAnalyses = pgTable("ai_compliance_analyses", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  entityId: integer("entity_id").notNull(),
  analysis: text("analysis").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Document Analysis table
export const aiDocumentAnalyses = pgTable("ai_document_analyses", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  userId: integer("user_id").notNull(),
  documentType: text("document_type").notNull(), // 'invoice', 'tax_form', etc.
  documentHash: text("document_hash").notNull(), // Used to avoid re-analyzing the same document
  extractedInfo: jsonb("extracted_info").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Learning Data table - stores data for continual learning
export const aiLearningData = pgTable("ai_learning_data", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  dataType: text("data_type").notNull(), // 'user_feedback', 'task_completion', etc.
  data: jsonb("data").notNull(),
  processed: boolean("processed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for each table
export const insertAiConfigurationSchema = createInsertSchema(aiConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiChatConversationSchema = createInsertSchema(aiChatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAiTaskSuggestionSchema = createInsertSchema(aiTaskSuggestions).omit({
  id: true,
  createdAt: true,
});

export const insertAiComplianceAnalysisSchema = createInsertSchema(aiComplianceAnalyses).omit({
  id: true,
  createdAt: true,
});

export const insertAiDocumentAnalysisSchema = createInsertSchema(aiDocumentAnalyses).omit({
  id: true,
  createdAt: true,
});

export const insertAiLearningDataSchema = createInsertSchema(aiLearningData).omit({
  id: true,
  createdAt: true,
});

// Types for each insert schema
export type InsertAiConfiguration = z.infer<typeof insertAiConfigurationSchema>;
export type InsertAiChatConversation = z.infer<typeof insertAiChatConversationSchema>;
export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;
export type InsertAiTaskSuggestion = z.infer<typeof insertAiTaskSuggestionSchema>;
export type InsertAiComplianceAnalysis = z.infer<typeof insertAiComplianceAnalysisSchema>;
export type InsertAiDocumentAnalysis = z.infer<typeof insertAiDocumentAnalysisSchema>;
export type InsertAiLearningData = z.infer<typeof insertAiLearningDataSchema>;

// Types for select operations
export type SelectAiConfiguration = typeof aiConfigurations.$inferSelect;
export type SelectAiChatConversation = typeof aiChatConversations.$inferSelect;
export type SelectAiChatMessage = typeof aiChatMessages.$inferSelect;
export type SelectAiTaskSuggestion = typeof aiTaskSuggestions.$inferSelect;
export type SelectAiComplianceAnalysis = typeof aiComplianceAnalyses.$inferSelect;
export type SelectAiDocumentAnalysis = typeof aiDocumentAnalyses.$inferSelect;
export type SelectAiLearningData = typeof aiLearningData.$inferSelect;