import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { invoices, invoiceLineItems, payments, paymentGatewaySettings, chartOfAccounts } from "./schema";

// Enhanced invoice schema with proper type handling
export const enhancedInvoiceSchema = createInsertSchema(invoices)
  .pick({
    tenantId: true,
    invoiceNumber: true,
    clientId: true,
    entityId: true,
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

// Enhanced payment gateway settings schema
export const enhancedPaymentGatewaySettingSchema = createInsertSchema(paymentGatewaySettings)
  .pick({
    tenantId: true,
    gatewayType: true,
    isEnabled: true,
    configData: true,
  })
  .extend({
    isEnabled: z.boolean().default(false).optional(),
  });

// Enhanced chart of account schema
export const enhancedChartOfAccountSchema = createInsertSchema(chartOfAccounts)
  .pick({
    tenantId: true,
    accountCode: true,
    accountName: true,
    accountType: true,
    description: true,
    isActive: true,
  })
  .extend({
    description: z.string().optional().nullable(),
    isActive: z.boolean().default(true).optional(),
  });

// Export enhanced types
export type EnhancedInvoice = z.infer<typeof enhancedInvoiceSchema>;
export type EnhancedInvoiceLineItem = z.infer<typeof enhancedInvoiceLineItemSchema>;
export type EnhancedPayment = z.infer<typeof enhancedPaymentSchema>;
export type EnhancedPaymentGatewaySetting = z.infer<typeof enhancedPaymentGatewaySettingSchema>;
export type EnhancedChartOfAccount = z.infer<typeof enhancedChartOfAccountSchema>;