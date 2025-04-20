import PDFDocument from 'pdfkit';
import { Invoice, InvoiceLineItem, Client, Entity, Tenant } from '@shared/schema';

/**
 * Generates a professionally designed PDF invoice
 * @param invoice The invoice data
 * @param lineItems Line items for the invoice
 * @param client The client data
 * @param entity The entity data
 * @param tenant The tenant data
 * @returns Buffer containing the PDF document
 */
export async function generateInvoicePdf(
  invoice: Invoice,
  lineItems: InvoiceLineItem[],
  client: Client,
  entity: Entity,
  tenant: Tenant
): Promise<Buffer> {
  return new Promise((resolve) => {
    // Create a document
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50,
      info: {
        Title: `Invoice ${invoice.invoiceNumber}`,
        Author: tenant.displayName,
        Subject: 'Invoice',
        Keywords: 'invoice, finance, accounting',
        Creator: 'Accounting Management Platform',
        Producer: 'PDFKit'
      }
    });

    // Collect the PDF data chunks
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Set some basic styles
    const primaryColor = '#4f46e5'; // Indigo for branding accent
    const textColor = '#334155';    // Slate-700 for main text
    const mutedColor = '#94a3b8';   // Slate-400 for secondary text

    // Helper function for formatted currency
    const formatCurrency = (amount: string) => {
      return `${invoice.currencyCode} ${parseFloat(amount).toLocaleString('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    };

    // Add company logo and header
    doc
      .fillColor(primaryColor)
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(tenant.displayName, 50, 50)
      .fontSize(10)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Accounting Management Platform', 50, 80);

    // Add line
    doc.moveTo(50, 100).lineTo(550, 100).strokeColor(primaryColor).lineWidth(1).stroke();

    // Invoice details section
    doc
      .fillColor(primaryColor)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, 120)
      .fontSize(12)
      .text(invoice.invoiceNumber, 400, 145);

    // Date section
    doc
      .fillColor(textColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('ISSUE DATE:', 400, 175)
      .font('Helvetica')
      .text(new Date(invoice.issueDate).toLocaleDateString(), 480, 175)
      .font('Helvetica-Bold')
      .text('DUE DATE:', 400, 190)
      .font('Helvetica')
      .text(new Date(invoice.dueDate).toLocaleDateString(), 480, 190);

    // Status section
    doc
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('STATUS:', 400, 210)
      .font('Helvetica');
    
    // Color code the status
    let statusColor = primaryColor;
    switch(invoice.status) {
      case 'paid':
        statusColor = '#22c55e'; // Green
        break;
      case 'overdue':
        statusColor = '#ef4444'; // Red
        break;
      case 'sent':
        statusColor = '#f97316'; // Orange
        break;
      case 'passed':
        statusColor = '#0ea5e9'; // Blue
        break;
    }
    
    doc.fillColor(statusColor)
      .text(invoice.status.toUpperCase(), 480, 210);

    // Bill to section
    doc
      .fillColor(primaryColor)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('BILL TO:', 50, 120)
      .fillColor(textColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(client.displayName, 50, 140)
      .font('Helvetica')
      .text(`Entity: ${entity.name}`, 50, 155);

    // Add address if available
    if (entity.address) {
      doc.text(entity.address, 50, 170);
    }

    // Add line items table
    doc
      .moveTo(50, 250)
      .lineTo(550, 250)
      .stroke();

    // Table headers
    doc
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('Description', 50, 260)
      .text('Quantity', 300, 260)
      .text('Unit Price', 370, 260)
      .text('Amount', 480, 260);

    // Add horizontal rule
    doc
      .moveTo(50, 275)
      .lineTo(550, 275)
      .stroke();

    // Table data rows
    let y = 285;
    
    // If no line items, add service description as a single line item
    if (!lineItems || lineItems.length === 0) {
      doc
        .fillColor(textColor)
        .font('Helvetica')
        .text(invoice.serviceDescription || 'Professional Services', 50, y, { width: 240 });
      
      // Fill to the end of the line
      const textHeight = doc.heightOfString(invoice.serviceDescription || 'Professional Services', { width: 240 });
      const finalY = y + Math.max(textHeight, 20);
      
      doc
        .text('1', 300, y)
        .text(formatCurrency(invoice.subtotal), 370, y)
        .text(formatCurrency(invoice.subtotal), 480, y);
      
      y = finalY + 10;
    } else {
      // Add each line item
      lineItems.forEach(item => {
        // Check if we need a new page
        if (y > 700) {
          doc.addPage();
          y = 50;
          
          // Add header for continuation
          doc
            .fillColor(primaryColor)
            .font('Helvetica-Bold')
            .text('Description', 50, y)
            .text('Quantity', 300, y)
            .text('Unit Price', 370, y)
            .text('Amount', 480, y);
          
          // Add horizontal rule
          doc
            .moveTo(50, y + 15)
            .lineTo(550, y + 15)
            .stroke();
          
          y += 25;
        }
        
        doc
          .fillColor(textColor)
          .font('Helvetica')
          .text(item.description, 50, y, { width: 240 });
        
        // Measure the height of multi-line description to align the row
        const textHeight = doc.heightOfString(item.description, { width: 240 });
        const finalY = y + Math.max(textHeight, 20);
        
        doc
          .text(item.quantity.toString(), 300, y)
          .text(formatCurrency(item.unitPrice), 370, y)
          .text(formatCurrency(item.lineTotal), 480, y);
        
        y = finalY + 10;
      });
    }

    // Add a divider
    doc
      .moveTo(50, y)
      .lineTo(550, y)
      .stroke();
    
    y += 20;

    // Summary section
    doc
      .font('Helvetica-Bold')
      .text('Subtotal:', 400, y)
      .font('Helvetica')
      .text(formatCurrency(invoice.subtotal), 480, y);
    
    y += 20;
    
    // Add tax if present
    if (parseFloat(invoice.taxAmount) > 0) {
      doc
        .font('Helvetica-Bold')
        .text('Tax:', 400, y)
        .font('Helvetica')
        .text(formatCurrency(invoice.taxAmount), 480, y);
      
      y += 20;
    }
    
    // Add discount if present
    if (parseFloat(invoice.discountAmount) > 0) {
      doc
        .font('Helvetica-Bold')
        .text('Discount:', 400, y)
        .font('Helvetica')
        .text(`-${formatCurrency(invoice.discountAmount)}`, 480, y);
      
      y += 20;
    }
    
    // Add total
    doc
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .fontSize(12)
      .text('TOTAL:', 400, y)
      .text(formatCurrency(invoice.totalAmount), 480, y);
    
    y += 25;
    
    // Add amount due
    if (parseFloat(invoice.amountDue) > 0 && invoice.amountDue !== invoice.totalAmount) {
      doc
        .text('AMOUNT DUE:', 400, y)
        .text(formatCurrency(invoice.amountDue), 480, y);
      
      y += 30;
    }
    
    // Add notes if provided
    if (invoice.notes) {
      y += 20;
      doc
        .fillColor(textColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Notes:', 50, y)
        .font('Helvetica')
        .fontSize(10)
        .text(invoice.notes, 50, y + 15, { width: 500 });
    }
    
    // Add terms and conditions if provided
    if (invoice.termsAndConditions) {
      y += 60;
      doc
        .fillColor(textColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Terms and Conditions:', 50, y)
        .font('Helvetica')
        .fontSize(10)
        .text(invoice.termsAndConditions, 50, y + 15, { width: 500 });
    }

    // Add footer
    const footerY = doc.page.height - 50;
    doc
      .moveTo(50, footerY - 10)
      .lineTo(550, footerY - 10)
      .stroke();
    
    doc
      .fillColor(mutedColor)
      .fontSize(9)
      .text(
        `Invoice #${invoice.invoiceNumber} | Created with Accounting Management Platform | Generated on ${new Date().toLocaleDateString()}`,
        50, footerY, { align: 'center', width: 500 }
      );

    // Finalize the PDF
    doc.end();
  });
}