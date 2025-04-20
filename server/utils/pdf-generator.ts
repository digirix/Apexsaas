import PDFDocument from 'pdfkit';
import { Invoice, InvoiceLineItem, Client, Entity, Tenant } from '@shared/schema';

/**
 * Generates a more compact and efficient PDF invoice that fits on a single page
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
    // Create a document with compression enabled for smaller file size
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 40,
      compress: true, // Enable compression for smaller file size
      info: {
        Title: `Invoice ${invoice.invoiceNumber || ''}`,
        Author: tenant?.name || 'Accounting Platform',
        Subject: 'Invoice',
        Creator: 'Accounting Management Platform'
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

    // Helper function for formatted currency (shorter format)
    const formatCurrency = (amount: string) => {
      return `${invoice.currencyCode}${parseFloat(amount).toFixed(2)}`;
    };

    // Add company logo and header (more compact)
    doc
      .fillColor(primaryColor)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(tenant.name, 40, 40)
      .fontSize(8)
      .fillColor(mutedColor)
      .font('Helvetica')
      .text('Accounting Management Platform', 40, 60);

    // Invoice details section (right aligned for better space usage)
    doc
      .fillColor(primaryColor)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, 40)
      .fontSize(10)
      .text(`#${invoice.invoiceNumber}`, 400, 60);

    // Horizontal rule
    doc.moveTo(40, 75).lineTo(555, 75).strokeColor(primaryColor).lineWidth(0.5).stroke();

    // More compact date section
    doc
      .fillColor(textColor)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('ISSUE DATE:', 400, 85)
      .font('Helvetica')
      .text(new Date(invoice.issueDate).toLocaleDateString(), 460, 85)
      .font('Helvetica-Bold')
      .text('DUE DATE:', 400, 95)
      .font('Helvetica')
      .text(new Date(invoice.dueDate).toLocaleDateString(), 460, 95);

    // Status section
    doc
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('STATUS:', 400, 105)
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
      case 'approved':
        statusColor = '#0ea5e9'; // Blue
        break;
      case 'passed':
        statusColor = '#0ea5e9'; // Blue
        break;
    }
    
    doc.fillColor(statusColor)
      .text(invoice.status.toUpperCase(), 460, 105);

    // Bill to section
    doc
      .fillColor(primaryColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('BILL TO:', 40, 85)
      .fillColor(textColor)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(client.name, 40, 100)
      .font('Helvetica')
      .fontSize(8)
      .text(`Entity: ${entity.name}`, 40, 110);

    // Add address if available (truncated with ellipsis if too long)
    if (entity.address) {
      const addressText = entity.address.length > 50 ? 
        entity.address.substring(0, 50) + '...' : 
        entity.address;
      doc.text(addressText, 40, 120, { width: 200 });
    }

    // Add line items table (start higher on page for more space)
    const tableStartY = 140;
    doc
      .moveTo(40, tableStartY)
      .lineTo(555, tableStartY)
      .strokeColor(mutedColor)
      .lineWidth(0.5)
      .stroke();

    // Table headers (smaller font size)
    doc
      .fillColor(primaryColor)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('Description', 40, tableStartY + 5)
      .text('Quantity', 300, tableStartY + 5)
      .text('Unit Price', 370, tableStartY + 5)
      .text('Amount', 480, tableStartY + 5);

    // Add horizontal rule
    doc
      .moveTo(40, tableStartY + 15)
      .lineTo(555, tableStartY + 15)
      .stroke();

    // Table data rows
    let y = tableStartY + 20;
    
    // If no line items, add service description as a single line item
    if (!lineItems || lineItems.length === 0) {
      doc
        .fillColor(textColor)
        .font('Helvetica')
        .fontSize(8)
        .text(invoice.notes || 'Professional Services', 40, y, { width: 250 });
      
      // Fill to the end of the line
      const textHeight = doc.heightOfString(invoice.notes || 'Professional Services', { width: 250 });
      const finalY = y + Math.max(textHeight, 12);
      
      doc
        .text('1', 300, y)
        .text(formatCurrency(invoice.subtotal), 370, y)
        .text(formatCurrency(invoice.subtotal), 480, y);
      
      y = finalY + 5;
    } else {
      // Add each line item (with limits to prevent overflow)
      const maxItemsToShow = 10; // Limit items to ensure everything fits on one page
      const itemsToRender = lineItems.slice(0, maxItemsToShow);
      
      itemsToRender.forEach((item, index) => {
        // Truncate description if too long
        const description = item.description.length > 50 ? 
          item.description.substring(0, 50) + '...' : 
          item.description;
        
        doc
          .fillColor(textColor)
          .font('Helvetica')
          .fontSize(8)
          .text(description, 40, y, { width: 250 });
        
        // Use fixed height rows to conserve space
        doc
          .text(item.quantity.toString(), 300, y)
          .text(formatCurrency(item.unitPrice), 370, y)
          .text(formatCurrency(item.lineTotal), 480, y);
        
        y += 15; // Fixed height per row
      });
      
      // If we truncated items, add a note
      if (lineItems.length > maxItemsToShow) {
        doc
          .fillColor(mutedColor)
          .fontSize(7)
          .font('Helvetica-Oblique')
          .text(`... and ${lineItems.length - maxItemsToShow} more items not shown`, 40, y);
        y += 15;
      }
    }

    // Add a divider
    doc
      .moveTo(40, y)
      .lineTo(555, y)
      .stroke();
    
    y += 10;

    // Summary section (more compact)
    const summaryColX = 420;
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('Subtotal:', summaryColX, y)
      .font('Helvetica')
      .text(formatCurrency(invoice.subtotal), 490, y);
    
    y += 12;
    
    // Add tax if present
    if (parseFloat(invoice.taxAmount) > 0) {
      doc
        .font('Helvetica-Bold')
        .text('Tax:', summaryColX, y)
        .font('Helvetica')
        .text(formatCurrency(invoice.taxAmount), 490, y);
      
      y += 12;
    }
    
    // Add discount if present
    if (parseFloat(invoice.discountAmount) > 0) {
      doc
        .font('Helvetica-Bold')
        .text('Discount:', summaryColX, y)
        .font('Helvetica')
        .text(`-${formatCurrency(invoice.discountAmount)}`, 490, y);
      
      y += 12;
    }
    
    // Add total (smaller but still prominent)
    doc
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .fontSize(10)
      .text('TOTAL:', summaryColX, y)
      .text(formatCurrency(invoice.totalAmount), 490, y);
    
    y += 15;
    
    // Add amount due if different from total
    if (parseFloat(invoice.amountDue) > 0 && invoice.amountDue !== invoice.totalAmount) {
      doc
        .text('AMOUNT DUE:', summaryColX, y)
        .text(formatCurrency(invoice.amountDue), 490, y);
      
      y += 15;
    }
    
    // Add notes if provided (limited height)
    if (invoice.notes) {
      y += 10;
      doc
        .fillColor(textColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Notes:', 40, y)
        .font('Helvetica')
        .fontSize(7);
      
      // Limit notes to prevent overflow
      const truncatedNotes = invoice.notes.length > 150 ? 
        invoice.notes.substring(0, 150) + '...' : 
        invoice.notes;
      
      doc.text(truncatedNotes, 40, y + 10, { width: 515 });
    }
    
    // Add terms and conditions if provided (limited height)
    if (invoice.termsAndConditions) {
      y += 35;
      doc
        .fillColor(textColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Terms and Conditions:', 40, y)
        .font('Helvetica')
        .fontSize(7);
      
      // Limit T&C to prevent overflow
      const truncatedTerms = invoice.termsAndConditions.length > 200 ? 
        invoice.termsAndConditions.substring(0, 200) + '...' : 
        invoice.termsAndConditions;
      
      doc.text(truncatedTerms, 40, y + 10, { width: 515 });
    }

    // Add footer
    const footerY = doc.page.height - 30;
    doc
      .moveTo(40, footerY - 10)
      .lineTo(555, footerY - 10)
      .strokeColor(mutedColor)
      .lineWidth(0.5)
      .stroke();
    
    doc
      .fillColor(mutedColor)
      .fontSize(7)
      .text(
        `Invoice #${invoice.invoiceNumber} | ${tenant.name} | Generated on ${new Date().toLocaleDateString()}`,
        40, footerY, { align: 'center', width: 515 }
      );

    // Finalize the PDF
    doc.end();
  });
}