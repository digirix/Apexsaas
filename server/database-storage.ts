import { 
  tenants, tenantSettings, users, designations, departments, countries, currencies, states, 
  entityTypes, taskStatuses, taskStatusWorkflowRules, taxJurisdictions, serviceTypes, 
  clients, entities, tasks, taskCategories, entityTaxJurisdictions, entityServiceSubscriptions, 
  userPermissions, invoices, invoiceLineItems, payments, paymentGatewaySettings, chartOfAccounts
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
  ChartOfAccount, InsertChartOfAccount
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, isNull, asc, desc, inArray } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcrypt";

const MemoryStore = createMemoryStore(session);
type MemoryStoreType = session.Store;

export class DatabaseStorage implements IStorage {
  sessionStore: MemoryStoreType;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24h
    });
  }

  // Tenant operations
  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantByName(name: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.name, name));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updatedTenant] = await db.update(tenants)
      .set(tenant)
      .where(eq(tenants.id, id))
      .returning();
    return updatedTenant;
  }

  async deleteTenant(id: number): Promise<boolean> {
    const [deletedTenant] = await db.delete(tenants)
      .where(eq(tenants.id, id))
      .returning({ id: tenants.id });
    return !!deletedTenant;
  }

  // Tenant settings operations
  async getTenantSettings(tenantId: number): Promise<TenantSetting[]> {
    return await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId));
  }

  async getTenantSetting(id: number, tenantId: number): Promise<TenantSetting | undefined> {
    const [setting] = await db.select().from(tenantSettings)
      .where(and(
        eq(tenantSettings.id, id),
        eq(tenantSettings.tenantId, tenantId)
      ));
    return setting;
  }

  async getTenantSettingByKey(key: string, tenantId: number): Promise<TenantSetting | undefined> {
    const [setting] = await db.select().from(tenantSettings)
      .where(and(
        eq(tenantSettings.key, key),
        eq(tenantSettings.tenantId, tenantId)
      ));
    return setting;
  }

  async createTenantSetting(setting: InsertTenantSetting): Promise<TenantSetting> {
    const [newSetting] = await db.insert(tenantSettings).values(setting).returning();
    return newSetting;
  }

  async updateTenantSetting(id: number, setting: Partial<InsertTenantSetting>): Promise<TenantSetting | undefined> {
    const [updatedSetting] = await db.update(tenantSettings)
      .set(setting)
      .where(eq(tenantSettings.id, id))
      .returning();
    return updatedSetting;
  }

  async deleteTenantSetting(id: number, tenantId: number): Promise<boolean> {
    const [deletedSetting] = await db.delete(tenantSettings)
      .where(and(
        eq(tenantSettings.id, id),
        eq(tenantSettings.tenantId, tenantId)
      ))
      .returning({ id: tenantSettings.id });
    return !!deletedSetting;
  }

  // User operations
  async getUsers(tenantId?: number): Promise<User[]> {
    if (tenantId) {
      return await db.select().from(users).where(eq(users.tenantId, tenantId));
    }
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Hash password if present
    const userData = { ...user };
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }
    
    const [newUser] = await db.insert(users).values(userData).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    // Hash password if present
    const userData = { ...user };
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }
    
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number, tenantId?: number): Promise<boolean> {
    let query = db.delete(users).where(eq(users.id, id));
    
    if (tenantId) {
      query = query.where(eq(users.tenantId, tenantId));
    }
    
    const [deletedUser] = await query.returning({ id: users.id });
    return !!deletedUser;
  }

  // Finance Module Implementation

  // Invoice operations
  async getInvoices(tenantId: number, clientId?: number, entityId?: number, status?: string): Promise<Invoice[]> {
    let query = db.select().from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.isDeleted, false)
      ));
    
    if (clientId) {
      query = query.where(eq(invoices.clientId, clientId));
    }
    
    if (entityId) {
      query = query.where(eq(invoices.entityId, entityId));
    }
    
    if (status) {
      query = query.where(eq(invoices.status, status));
    }
    
    return await query.orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number, tenantId: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices)
      .where(and(
        eq(invoices.id, id),
        eq(invoices.tenantId, tenantId),
        eq(invoices.isDeleted, false)
      ));
    return invoice;
  }

  async getInvoiceByNumber(invoiceNumber: string, tenantId: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices)
      .where(and(
        eq(invoices.invoiceNumber, invoiceNumber),
        eq(invoices.tenantId, tenantId),
        eq(invoices.isDeleted, false)
      ));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    // Add updatedAt timestamp
    const updateData = {
      ...invoice,
      updatedAt: new Date()
    };
    
    const [updatedInvoice] = await db.update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: number, tenantId: number): Promise<boolean> {
    // Soft delete by setting isDeleted flag
    const [deletedInvoice] = await db.update(invoices)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(
        eq(invoices.id, id),
        eq(invoices.tenantId, tenantId)
      ))
      .returning({ id: invoices.id });
    return !!deletedInvoice;
  }

  // Invoice Line Item operations
  async getInvoiceLineItems(tenantId: number, invoiceId: number): Promise<InvoiceLineItem[]> {
    return await db.select().from(invoiceLineItems)
      .where(and(
        eq(invoiceLineItems.tenantId, tenantId),
        eq(invoiceLineItems.invoiceId, invoiceId)
      ))
      .orderBy(asc(invoiceLineItems.sortOrder));
  }

  async getInvoiceLineItem(id: number, tenantId: number): Promise<InvoiceLineItem | undefined> {
    const [lineItem] = await db.select().from(invoiceLineItems)
      .where(and(
        eq(invoiceLineItems.id, id),
        eq(invoiceLineItems.tenantId, tenantId)
      ));
    return lineItem;
  }

  async createInvoiceLineItem(lineItem: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const [newLineItem] = await db.insert(invoiceLineItems).values(lineItem).returning();
    
    // Update invoice totals
    const invoice = await this.getInvoice(lineItem.invoiceId, lineItem.tenantId);
    if (invoice) {
      const lineTotal = parseFloat(newLineItem.lineTotal);
      await this.updateInvoice(invoice.id, {
        subtotal: (parseFloat(invoice.subtotal) + lineTotal).toString(),
        totalAmount: (parseFloat(invoice.totalAmount) + lineTotal).toString(),
        amountDue: (parseFloat(invoice.amountDue) + lineTotal).toString()
      });
    }
    
    return newLineItem;
  }

  async updateInvoiceLineItem(id: number, lineItem: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem | undefined> {
    // Get current line item to calculate difference
    const currentLineItem = await this.getInvoiceLineItem(id, lineItem.tenantId as number);
    if (!currentLineItem) return undefined;
    
    const [updatedLineItem] = await db.update(invoiceLineItems)
      .set(lineItem)
      .where(eq(invoiceLineItems.id, id))
      .returning();
    
    // Update invoice totals if line total changed
    if (updatedLineItem && lineItem.lineTotal && currentLineItem.lineTotal !== lineItem.lineTotal) {
      const invoice = await this.getInvoice(currentLineItem.invoiceId, currentLineItem.tenantId);
      if (invoice) {
        const lineTotalDiff = parseFloat(lineItem.lineTotal) - parseFloat(currentLineItem.lineTotal);
        await this.updateInvoice(invoice.id, {
          subtotal: (parseFloat(invoice.subtotal) + lineTotalDiff).toString(),
          totalAmount: (parseFloat(invoice.totalAmount) + lineTotalDiff).toString(),
          amountDue: (parseFloat(invoice.amountDue) + lineTotalDiff).toString()
        });
      }
    }
    
    return updatedLineItem;
  }

  async deleteInvoiceLineItem(id: number, tenantId: number): Promise<boolean> {
    // Get line item to adjust invoice totals
    const lineItem = await this.getInvoiceLineItem(id, tenantId);
    if (!lineItem) return false;
    
    const [deletedLineItem] = await db.delete(invoiceLineItems)
      .where(and(
        eq(invoiceLineItems.id, id),
        eq(invoiceLineItems.tenantId, tenantId)
      ))
      .returning({ id: invoiceLineItems.id });
    
    // Update invoice totals
    if (deletedLineItem) {
      const invoice = await this.getInvoice(lineItem.invoiceId, tenantId);
      if (invoice) {
        const lineTotal = parseFloat(lineItem.lineTotal);
        await this.updateInvoice(invoice.id, {
          subtotal: (parseFloat(invoice.subtotal) - lineTotal).toString(),
          totalAmount: (parseFloat(invoice.totalAmount) - lineTotal).toString(),
          amountDue: (parseFloat(invoice.amountDue) - lineTotal).toString()
        });
      }
    }
    
    return !!deletedLineItem;
  }

  // Payment operations
  async getPayments(tenantId: number, invoiceId?: number): Promise<Payment[]> {
    let query = db.select().from(payments)
      .where(eq(payments.tenantId, tenantId));
    
    if (invoiceId) {
      query = query.where(eq(payments.invoiceId, invoiceId));
    }
    
    return await query.orderBy(desc(payments.paymentDate));
  }

  async getPayment(id: number, tenantId: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments)
      .where(and(
        eq(payments.id, id),
        eq(payments.tenantId, tenantId)
      ));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    
    // Update invoice payment status
    const invoice = await this.getInvoice(newPayment.invoiceId, newPayment.tenantId);
    if (invoice) {
      const paymentAmount = parseFloat(newPayment.amount);
      const amountPaid = parseFloat(invoice.amountPaid) + paymentAmount;
      const amountDue = Math.max(0, parseFloat(invoice.totalAmount) - amountPaid);
      
      // Determine new status
      let status = invoice.status;
      if (amountPaid >= parseFloat(invoice.totalAmount)) {
        status = 'paid';
      } else if (amountPaid > 0) {
        status = 'partial';
      }
      
      await this.updateInvoice(invoice.id, {
        amountPaid: amountPaid.toString(),
        amountDue: amountDue.toString(),
        status
      });
    }
    
    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    // Get current payment to calculate difference
    const currentPayment = await this.getPayment(id, payment.tenantId as number);
    if (!currentPayment) return undefined;
    
    const [updatedPayment] = await db.update(payments)
      .set(payment)
      .where(eq(payments.id, id))
      .returning();
    
    // Update invoice payment status if amount changed
    if (updatedPayment && payment.amount && currentPayment.amount !== payment.amount) {
      const invoice = await this.getInvoice(currentPayment.invoiceId, currentPayment.tenantId);
      if (invoice) {
        // First, subtract the old payment amount
        let amountPaid = parseFloat(invoice.amountPaid) - parseFloat(currentPayment.amount);
        
        // Then add the new payment amount
        amountPaid += parseFloat(payment.amount);
        
        const amountDue = Math.max(0, parseFloat(invoice.totalAmount) - amountPaid);
        
        // Determine new status
        let status = invoice.status;
        if (amountPaid >= parseFloat(invoice.totalAmount)) {
          status = 'paid';
        } else if (amountPaid > 0) {
          status = 'partial';
        } else {
          status = 'sent';
        }
        
        await this.updateInvoice(invoice.id, {
          amountPaid: amountPaid.toString(),
          amountDue: amountDue.toString(),
          status
        });
      }
    }
    
    return updatedPayment;
  }

  async deletePayment(id: number, tenantId: number): Promise<boolean> {
    // Get payment to adjust invoice totals
    const payment = await this.getPayment(id, tenantId);
    if (!payment) return false;
    
    const [deletedPayment] = await db.delete(payments)
      .where(and(
        eq(payments.id, id),
        eq(payments.tenantId, tenantId)
      ))
      .returning({ id: payments.id });
    
    // Update invoice payment status
    if (deletedPayment) {
      const invoice = await this.getInvoice(payment.invoiceId, tenantId);
      if (invoice) {
        const paymentAmount = parseFloat(payment.amount);
        const amountPaid = Math.max(0, parseFloat(invoice.amountPaid) - paymentAmount);
        const amountDue = parseFloat(invoice.totalAmount) - amountPaid;
        
        // Determine new status
        let status = invoice.status;
        if (amountPaid >= parseFloat(invoice.totalAmount)) {
          status = 'paid';
        } else if (amountPaid > 0) {
          status = 'partial';
        } else {
          status = 'sent';
        }
        
        await this.updateInvoice(invoice.id, {
          amountPaid: amountPaid.toString(),
          amountDue: amountDue.toString(),
          status
        });
      }
    }
    
    return !!deletedPayment;
  }

  // Payment Gateway Settings operations
  async getPaymentGatewaySettings(tenantId: number): Promise<PaymentGatewaySetting[]> {
    return await db.select().from(paymentGatewaySettings)
      .where(eq(paymentGatewaySettings.tenantId, tenantId));
  }

  async getPaymentGatewaySetting(tenantId: number, gatewayType: string): Promise<PaymentGatewaySetting | undefined> {
    const [setting] = await db.select().from(paymentGatewaySettings)
      .where(and(
        eq(paymentGatewaySettings.tenantId, tenantId),
        eq(paymentGatewaySettings.gatewayType, gatewayType)
      ));
    return setting;
  }

  async createPaymentGatewaySetting(setting: InsertPaymentGatewaySetting): Promise<PaymentGatewaySetting> {
    const [newSetting] = await db.insert(paymentGatewaySettings).values(setting).returning();
    return newSetting;
  }

  async updatePaymentGatewaySetting(id: number, setting: Partial<InsertPaymentGatewaySetting>): Promise<PaymentGatewaySetting | undefined> {
    // Add updatedAt timestamp
    const updateData = {
      ...setting,
      updatedAt: new Date()
    };
    
    const [updatedSetting] = await db.update(paymentGatewaySettings)
      .set(updateData)
      .where(eq(paymentGatewaySettings.id, id))
      .returning();
    return updatedSetting;
  }

  async deletePaymentGatewaySetting(id: number, tenantId: number): Promise<boolean> {
    const [deletedSetting] = await db.delete(paymentGatewaySettings)
      .where(and(
        eq(paymentGatewaySettings.id, id),
        eq(paymentGatewaySettings.tenantId, tenantId)
      ))
      .returning({ id: paymentGatewaySettings.id });
    return !!deletedSetting;
  }

  // Chart of Accounts operations
  async getChartOfAccounts(tenantId: number, accountType?: string): Promise<ChartOfAccount[]> {
    let query = db.select().from(chartOfAccounts)
      .where(eq(chartOfAccounts.tenantId, tenantId));
    
    if (accountType) {
      query = query.where(eq(chartOfAccounts.accountType, accountType));
    }
    
    return await query.orderBy(asc(chartOfAccounts.accountCode));
  }

  async getChartOfAccount(id: number, tenantId: number): Promise<ChartOfAccount | undefined> {
    const [account] = await db.select().from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.id, id),
        eq(chartOfAccounts.tenantId, tenantId)
      ));
    return account;
  }

  async getChartOfAccountByCode(accountCode: string, tenantId: number): Promise<ChartOfAccount | undefined> {
    const [account] = await db.select().from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.accountCode, accountCode),
        eq(chartOfAccounts.tenantId, tenantId)
      ));
    return account;
  }

  async createChartOfAccount(account: InsertChartOfAccount): Promise<ChartOfAccount> {
    const [newAccount] = await db.insert(chartOfAccounts).values(account).returning();
    return newAccount;
  }

  async updateChartOfAccount(id: number, account: Partial<InsertChartOfAccount>): Promise<ChartOfAccount | undefined> {
    // Add updatedAt timestamp
    const updateData = {
      ...account,
      updatedAt: new Date()
    };
    
    const [updatedAccount] = await db.update(chartOfAccounts)
      .set(updateData)
      .where(eq(chartOfAccounts.id, id))
      .returning();
    return updatedAccount;
  }

  async deleteChartOfAccount(id: number, tenantId: number): Promise<boolean> {
    const [deletedAccount] = await db.delete(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.id, id),
        eq(chartOfAccounts.tenantId, tenantId)
      ))
      .returning({ id: chartOfAccounts.id });
    return !!deletedAccount;
  }
}