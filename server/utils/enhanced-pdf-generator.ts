import PDFDocument from 'pdfkit';
import { Invoice, InvoiceLineItem, Client, Entity, Tenant } from '@shared/schema';
import { format } from 'date-fns';

/**
 * Generates a professional PDF invoice matching the client portal format
 */
export async function generateEnhancedInvoicePdf(
  invoice: Invoice & { serviceName?: string; taskDetails?: string },
  lineItems: InvoiceLineItem[],
  client: Client,
  entity: Entity,
  tenant: Tenant,
  tenantSettings?: any[]
): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 40,
      compress: true,
      bufferPages: true,
      layout: 'portrait',
      info: {
        Title: `Invoice ${invoice.invoiceNumber || ''}`,
        Author: tenant?.name || 'Accounting Platform',
        Subject: 'Invoice',
        Creator: 'Accounting Management Platform'
      }
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Helper function to get tenant setting
    const getSetting = (key: string) => {
      if (!tenantSettings || !Array.isArray(tenantSettings)) return '';
      const setting = tenantSettings.find((s: any) => s.key === key);
      return setting?.value || '';
    };

    // Colors matching the client portal design
    const colors = {
      primary: '#7c3aed',     // Purple primary
      secondary: '#e879f9',   // Pink secondary
      text: '#1e293b',        // Slate-800
      muted: '#64748b',       // Slate-500
      light: '#f8fafc',       // Slate-50
      border: '#e2e8f0',      // Slate-200
      success: '#16a34a',     // Green-600
      danger: '#dc2626'       // Red-600
    };

    // Helper functions
    const formatCurrency = (amount: string | number) => {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      return `${invoice.currencyCode || 'USD'} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'paid': return colors.success;
        case 'overdue': return colors.danger;
        case 'sent': return colors.primary;
        default: return colors.muted;
      }
    };

    let currentY = 40;

    // HEADER SECTION - Gradient-style header
    // ====================================
    
    // Background gradient effect (simulated with rectangles)
    doc.rect(40, currentY, 515, 120)
       .fillAndStroke('#f3e8ff', '#e879f9')
       .lineWidth(1);
    
    currentY += 20;

    // Invoice title and status
    doc.fillColor(colors.text)
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('INVOICE', 60, currentY);

    // Status badge (right side)
    const statusColor = getStatusColor(invoice.status);
    doc.rect(450, currentY, 80, 25)
       .fill(statusColor)
       .fillColor('white')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(invoice.status.toUpperCase(), 465, currentY + 8);

    currentY += 40;

    // Issue date
    if (invoice.issueDate) {
      doc.fillColor(colors.muted)
         .fontSize(10)
         .font('Helvetica')
         .text(`Issued: ${format(new Date(invoice.issueDate), 'MMM dd, yyyy')}`, 60, currentY);
    }

    // Invoice number (right aligned)
    doc.fillColor(colors.muted)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('INVOICE NUMBER', 400, currentY - 15)
       .fillColor(colors.text)
       .fontSize(16)
       .text(`#${invoice.invoiceNumber || invoice.id}`, 400, currentY);

    currentY += 60;

    // THREE-COLUMN LAYOUT SECTION
    // ===========================

    const colWidth = 150;
    const col1X = 60;
    const col2X = 220;
    const col3X = 380;

    // Column 1: From (Firm Information)
    doc.fillColor(colors.muted)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('FROM', col1X, currentY);

    currentY += 15;

    const firmName = getSetting('firm_name') || getSetting('name') || tenant.name || 'Your Firm';
    doc.fillColor(colors.text)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(firmName, col1X, currentY, { width: colWidth });

    let firmY = currentY + 20;
    const firmInfo = [
      getSetting('address'),
      getSetting('email'),
      getSetting('phone')
    ].filter(Boolean);

    firmInfo.forEach(info => {
      doc.fillColor(colors.muted)
         .fontSize(9)
         .font('Helvetica')
         .text(info, col1X, firmY, { width: colWidth });
      firmY += 12;
    });

    // Column 2: Bill To
    doc.fillColor(colors.muted)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('BILL TO', col2X, currentY);

    doc.fillColor(colors.text)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(client.displayName || 'Client', col2X, currentY + 15, { width: colWidth });

    doc.fillColor(colors.muted)
       .fontSize(9)
       .font('Helvetica')
       .text(entity.name || 'Entity', col2X, currentY + 35, { width: colWidth });

    if (entity.address) {
      doc.text(entity.address, col2X, currentY + 50, { width: colWidth });
    }

    // Column 3: Amount
    doc.fillColor(colors.muted)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('AMOUNT', col3X, currentY);

    doc.fillColor(colors.text)
       .fontSize(18)
       .font('Helvetica-Bold')
       .text(formatCurrency(invoice.totalAmount), col3X, currentY + 15);

    if (invoice.amountDue && parseFloat(invoice.amountDue) > 0) {
      doc.fillColor(colors.danger)
         .fontSize(10)
         .font('Helvetica')
         .text(`Due: ${formatCurrency(invoice.amountDue)}`, col3X, currentY + 40);
    }

    currentY += 100;

    // SERVICES PROVIDED SECTION
    // =========================

    // Section header with background
    doc.rect(40, currentY, 515, 30)
       .fill(colors.light)
       .fillColor(colors.text)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Services Provided', 60, currentY + 10);

    currentY += 35;

    // Table header
    doc.rect(40, currentY, 515, 25)
       .fill(colors.light)
       .fillColor(colors.muted)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('DESCRIPTION', 60, currentY + 8)
       .text('QTY', 340, currentY + 8)
       .text('RATE', 420, currentY + 8)
       .text('AMOUNT', 480, currentY + 8);

    currentY += 30;

    // Table content
    const taskDetails = invoice.serviceName || invoice.taskDetails || 'Professional Services';
    
    if (!lineItems || lineItems.length === 0) {
      // Single service line
      doc.fillColor(colors.text)
         .fontSize(10)
         .font('Helvetica')
         .text(taskDetails, 60, currentY, { width: 260 })
         .text('1', 340, currentY)
         .text(formatCurrency(invoice.subtotal), 420, currentY)
         .font('Helvetica-Bold')
         .text(formatCurrency(invoice.subtotal), 480, currentY);
      
      currentY += 25;
    } else {
      // Multiple line items
      lineItems.forEach((item, index) => {
        doc.fillColor(colors.text)
           .fontSize(10)
           .font('Helvetica')
           .text(item.description || taskDetails, 60, currentY, { width: 260 })
           .text(item.quantity.toString(), 340, currentY)
           .text(formatCurrency(item.unitPrice), 420, currentY)
           .font('Helvetica-Bold')
           .text(formatCurrency(item.lineTotal), 480, currentY);
        
        currentY += 25;
      });
    }

    // Table border
    doc.rect(40, currentY, 515, 1)
       .fill(colors.border);

    currentY += 20;

    // TOTALS SECTION
    // ==============

    const totalsX = 360;
    const valueX = 480;

    // Subtotal
    if (invoice.subtotal && parseFloat(invoice.subtotal) !== parseFloat(invoice.totalAmount)) {
      doc.fillColor(colors.text)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Subtotal:', totalsX, currentY)
         .font('Helvetica')
         .text(formatCurrency(invoice.subtotal), valueX, currentY);
      currentY += 20;
    }

    // Tax
    if (invoice.taxAmount && parseFloat(invoice.taxAmount) > 0) {
      doc.font('Helvetica-Bold')
         .text('Tax:', totalsX, currentY)
         .font('Helvetica')
         .text(formatCurrency(invoice.taxAmount), valueX, currentY);
      currentY += 20;
    }

    // Discount
    if (invoice.discountAmount && parseFloat(invoice.discountAmount) > 0) {
      doc.font('Helvetica-Bold')
         .text('Discount:', totalsX, currentY)
         .font('Helvetica')
         .text(`-${formatCurrency(invoice.discountAmount)}`, valueX, currentY);
      currentY += 20;
    }

    // Total (highlighted)
    doc.rect(totalsX - 10, currentY - 5, 185, 25)
       .fill(colors.light)
       .fillColor(colors.primary)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('TOTAL:', totalsX, currentY + 5)
       .text(formatCurrency(invoice.totalAmount), valueX, currentY + 5);

    currentY += 40;

    // PAYMENT AND NOTES SECTION
    // =========================

    // Due date and payment terms
    if (invoice.dueDate) {
      currentY += 20;
      doc.fillColor(colors.text)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Payment Due Date: ', 60, currentY)
         .font('Helvetica')
         .text(format(new Date(invoice.dueDate), 'MMMM dd, yyyy'), 160, currentY);
      
      // Calculate payment terms
      const daysDiff = Math.ceil(
        (new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      doc.text(`Payment Terms: Net ${daysDiff} days`, 300, currentY);
      currentY += 25;
    }

    // Notes section
    if (invoice.notes && invoice.notes.trim()) {
      currentY += 10;
      doc.fillColor(colors.text)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Notes:', 60, currentY);
      
      currentY += 15;
      doc.fillColor(colors.muted)
         .fontSize(9)
         .font('Helvetica')
         .text(invoice.notes, 60, currentY, { width: 495, lineGap: 3 });
      
      currentY += doc.heightOfString(invoice.notes, { width: 495, lineGap: 3 }) + 15;
    }

    // Terms and conditions
    if (invoice.termsAndConditions && invoice.termsAndConditions.trim()) {
      currentY += 10;
      doc.fillColor(colors.text)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Terms and Conditions:', 60, currentY);
      
      currentY += 15;
      doc.fillColor(colors.muted)
         .fontSize(9)
         .font('Helvetica')
         .text(invoice.termsAndConditions, 60, currentY, { width: 495, lineGap: 3 });
      
      currentY += doc.heightOfString(invoice.termsAndConditions, { width: 495, lineGap: 3 }) + 15;
    }

    // FOOTER
    // ======

    // Ensure footer stays at bottom
    const footerY = Math.max(currentY + 30, 750);
    
    // Footer line
    doc.moveTo(40, footerY)
       .lineTo(555, footerY)
       .strokeColor(colors.border)
       .lineWidth(1)
       .stroke();

    // Footer text
    doc.fillColor(colors.muted)
       .fontSize(8)
       .font('Helvetica')
       .text(
         `Invoice #${invoice.invoiceNumber} | ${firmName} | Generated on ${format(new Date(), 'MMMM dd, yyyy')}`,
         40, footerY + 10, 
         { align: 'center', width: 515 }
       );

    // Company contact info in footer
    const footerContactInfo = [
      getSetting('email'),
      getSetting('phone'),
      getSetting('website')
    ].filter(Boolean).join(' | ');

    if (footerContactInfo) {
      doc.text(footerContactInfo, 40, footerY + 25, { align: 'center', width: 515 });
    }

    doc.end();
  });
}