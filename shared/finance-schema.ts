import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { invoices, invoiceLineItems, payments, paymentTransactions, chartOfAccounts, journalEntries, journalEntryLines, stripeConfigurations, paypalConfigurations, meezanBankConfigurations, bankAlfalahConfigurations } from "./schema";

// Enhanced invoice schema with proper type handling
export const enhancedInvoiceSchema = createInsertSchema(invoices)
  .pick({
    tenantId: true,
    invoiceNumber: true,
    clientId: true,
    entityId: true,
    taskId: true,
    status: true,
    issueDate: true,
    dueDate: true,
    currencyCode: true,
    subtotal: true,
    taxAmount: true,
    discountAmount: true,
    totalAmount: true,
    amountPaid: true,
    amountDue: true,
    notes: true,
    termsAndConditions: true,
    isDeleted: true,
    createdBy: true,
    updatedBy: true,
  })
  .extend({
    // Allow number input for decimal fields
    subtotal: z.union([z.string(), z.number().transform(n => n.toString())]),
    taxAmount: z.union([z.string(), z.number().transform(n => n.toString())]).optional(),
    discountAmount: z.union([z.string(), z.number().transform(n => n.toString())]).optional(),
    totalAmount: z.union([z.string(), z.number().transform(n => n.toString())]),
    amountPaid: z.union([z.string(), z.number().transform(n => n.toString())]).optional(),
    amountDue: z.union([z.string(), z.number().transform(n => n.toString())]),
    // Handle date fields
    issueDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
    dueDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
  });

// Enhanced invoice line item schema
export const enhancedInvoiceLineItemSchema = createInsertSchema(invoiceLineItems)
  .pick({
    tenantId: true,
    invoiceId: true,
    taskId: true,
    description: true,
    quantity: true,
    unitPrice: true,
    taxRate: true,
    taxAmount: true,
    discountRate: true,
    discountAmount: true,
    lineTotal: true,
    sortOrder: true,
  })
  .extend({
    // Allow number input for decimal fields
    quantity: z.union([z.string(), z.number().transform(n => n.toString())]),
    unitPrice: z.union([z.string(), z.number().transform(n => n.toString())]),
    taxRate: z.union([z.string(), z.number().transform(n => n.toString())]).optional(),
    taxAmount: z.union([z.string(), z.number().transform(n => n.toString())]).optional(),
    discountRate: z.union([z.string(), z.number().transform(n => n.toString())]).optional(),
    discountAmount: z.union([z.string(), z.number().transform(n => n.toString())]).optional(),
    lineTotal: z.union([z.string(), z.number().transform(n => n.toString())]),
    taskId: z.number().optional().nullable(),
  });

// Enhanced payment schema  
export const enhancedPaymentSchema = createInsertSchema(payments)
  .pick({
    tenantId: true,
    invoiceId: true,
    paymentDate: true,
    amount: true,
    paymentMethod: true,
    referenceNumber: true,
    notes: true,
    createdBy: true,
  })
  .extend({
    // Allow number input for amount
    amount: z.union([z.string(), z.number().transform(n => n.toString())]),
    // Handle date fields
    paymentDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
    referenceNumber: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  });

// Enhanced payment gateway configuration schemas
export const enhancedStripeConfigurationSchema = createInsertSchema(stripeConfigurations)
  .pick({
    tenantId: true,
    isEnabled: true,
    publicKey: true,
    secretKey: true,
    webhookSecret: true,
  })
  .extend({
    publicKey: z.string().min(1, "Stripe public key is required"),
    secretKey: z.string().min(1, "Stripe secret key is required"),
    isEnabled: z.boolean().default(true).optional(),
  });

export const enhancedPaypalConfigurationSchema = createInsertSchema(paypalConfigurations)
  .pick({
    tenantId: true,
    isEnabled: true,
    clientId: true,
    clientSecret: true,
    webhookId: true,
    environment: true,
  })
  .extend({
    clientId: z.string().min(1, "PayPal client ID is required"),
    clientSecret: z.string().min(1, "PayPal client secret is required"),
    environment: z.enum(["sandbox", "production"]),
    isEnabled: z.boolean().default(true).optional(),
  });

export const enhancedMeezanBankConfigurationSchema = createInsertSchema(meezanBankConfigurations)
  .pick({
    tenantId: true,
    isEnabled: true,
    merchantId: true,
    secretKey: true,
    apiEndpoint: true,
  })
  .extend({
    merchantId: z.string().min(1, "Meezan Bank merchant ID is required"),
    secretKey: z.string().min(1, "Meezan Bank secret key is required"),
    apiEndpoint: z.string().url("Valid API endpoint URL is required"),
    isEnabled: z.boolean().default(true).optional(),
  });

export const enhancedBankAlfalahConfigurationSchema = createInsertSchema(bankAlfalahConfigurations)
  .pick({
    tenantId: true,
    isEnabled: true,
    merchantId: true,
    secretKey: true,
    apiEndpoint: true,
  })
  .extend({
    merchantId: z.string().min(1, "Bank Alfalah merchant ID is required"),
    secretKey: z.string().min(1, "Bank Alfalah secret key is required"),
    apiEndpoint: z.string().url("Valid API endpoint URL is required"),
    isEnabled: z.boolean().default(true).optional(),
  });

// Enhanced chart of account schema
export const enhancedChartOfAccountSchema = createInsertSchema(chartOfAccounts)
  .pick({
    tenantId: true,
    detailedGroupId: true,
    accountCode: true,
    accountName: true,
    accountType: true,
    description: true,
    isActive: true,
    isSystemAccount: true,
    openingBalance: true,
    currentBalance: true
  })
  .extend({
    description: z.string().optional().nullable(),
    isActive: z.boolean().default(true).optional(),
    isSystemAccount: z.boolean().default(false).optional(),
    openingBalance: z.union([z.string(), z.number().transform(n => n.toString())]).default("0").optional(),
    currentBalance: z.union([z.string(), z.number().transform(n => n.toString())]).default("0").optional(),
  });

// Enhanced journal entry schema
export const enhancedJournalEntrySchema = createInsertSchema(journalEntries)
  .pick({
    tenantId: true,
    entryDate: true,
    reference: true,
    entryType: true,
    description: true,
    isPosted: true,
    createdBy: true,
  })
  .extend({
    entryDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
    sourceDocument: z.string().optional().nullable(),
    sourceDocumentId: z.number().optional().nullable(),
    updatedBy: z.number().optional(),
    postedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
    isPosted: z.boolean().default(false).optional(),
  });

// Enhanced journal entry line schema
export const enhancedJournalEntryLineSchema = createInsertSchema(journalEntryLines)
  .pick({
    tenantId: true,
    journalEntryId: true,
    accountId: true,
    description: true,
    debitAmount: true,
    creditAmount: true,
    lineOrder: true,
  })
  .extend({
    debitAmount: z.union([z.string(), z.number().transform(n => n.toString())]).default("0"),
    creditAmount: z.union([z.string(), z.number().transform(n => n.toString())]).default("0"),
  });

// Enhanced payment transaction schema
export const enhancedPaymentTransactionSchema = createInsertSchema(paymentTransactions)
  .pick({
    tenantId: true,
    invoiceId: true,
    paymentId: true,
    gatewayType: true,
    gatewayTransactionId: true,
    gatewayPaymentIntentId: true,
    amount: true,
    currency: true,
    status: true,
    paymentMethod: true,
    gatewayResponse: true,
    failureReason: true,
    clientSecret: true,
    returnUrl: true,
    cancelUrl: true,
    webhookProcessed: true,
    createdBy: true,
    processedAt: true,
  })
  .extend({
    amount: z.union([z.string(), z.number().transform(n => n.toString())]),
    processedAt: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  });

// Enhanced payment gateway configuration schema
export const paymentGatewayConfigSchema = z.object({
  stripe: z.object({
    publicKey: z.string().optional(),
    secretKey: z.string().optional(),
    webhookSecret: z.string().optional(),
    currency: z.string().default('PKR'),
  }).optional(),
  paypal: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    mode: z.enum(['sandbox', 'production']).default('sandbox'),
    currency: z.string().default('USD'),
  }).optional(),
  meezan_bank: z.object({
    merchantId: z.string().optional(),
    merchantKey: z.string().optional(),
    apiUrl: z.string().optional(),
    currency: z.string().default('PKR'),
  }).optional(),
  bank_alfalah: z.object({
    merchantId: z.string().optional(),
    merchantKey: z.string().optional(),
    apiUrl: z.string().optional(),
    currency: z.string().default('PKR'),
  }).optional(),
});

// Export enhanced types
export type EnhancedInvoice = z.infer<typeof enhancedInvoiceSchema>;
export type EnhancedInvoiceLineItem = z.infer<typeof enhancedInvoiceLineItemSchema>;
export type EnhancedPayment = z.infer<typeof enhancedPaymentSchema>;
export type EnhancedStripeConfiguration = z.infer<typeof enhancedStripeConfigurationSchema>;
export type EnhancedPaypalConfiguration = z.infer<typeof enhancedPaypalConfigurationSchema>;
export type EnhancedMeezanBankConfiguration = z.infer<typeof enhancedMeezanBankConfigurationSchema>;
export type EnhancedBankAlfalahConfiguration = z.infer<typeof enhancedBankAlfalahConfigurationSchema>;
export type EnhancedPaymentTransaction = z.infer<typeof enhancedPaymentTransactionSchema>;
export type PaymentGatewayConfig = z.infer<typeof paymentGatewayConfigSchema>;
export type EnhancedChartOfAccount = z.infer<typeof enhancedChartOfAccountSchema>;
export type EnhancedJournalEntry = z.infer<typeof enhancedJournalEntrySchema>;
export type EnhancedJournalEntryLine = z.infer<typeof enhancedJournalEntryLineSchema>;