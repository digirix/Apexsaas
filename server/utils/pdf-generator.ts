import PDFDocument from 'pdfkit';
import { Invoice, InvoiceLineItem, Client, Entity, Tenant } from '@shared/schema';
import { format } from 'date-fns';

/**
 * Generates a professional PDF invoice with detailed layout matching client portal format
 * @param invoice The invoice data
 * @param lineItems Line items for the invoice
 * @param client The client data
 * @param entity The entity data
 * @param tenant The tenant data
 * @param tenantSettings Optional tenant settings for firm information
 * @returns Buffer containing the PDF document
 */
export async function generateInvoicePdf(
  invoice: Invoice & { serviceName?: string; taskDetails?: string },
  lineItems: InvoiceLineItem[],
  client: Client,
  entity: Entity,
  tenant: Tenant,
  tenantSettings?: any[]
): Promise<Buffer> {
  return new Promise((resolve) => {
    // Create a document that strictly enforces a single-page output
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 25, // Minimum margin to maximize content space
      compress: true, // Enable compression for smaller file size
      bufferPages: true, // Allow buffering for single-page handling
      layout: 'portrait', // Ensure portrait orientation
      info: {
        Title: `Invoice ${invoice.invoiceNumber || ''}`,
        Author: tenant?.name || 'Accounting Platform',
        Subject: 'Invoice',
        Creator: 'Accounting Management Platform'
      }
    });
    
    // Hard limit the document to exactly one page
    doc.on('pageAdded', () => {
      // If PDFKit tries to add a new page, immediately end the document
      // This forces everything to be on page 1
      doc.end();
    });

    // Collect the PDF data chunks
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Set some basic styles
    const primaryColor = '#4f46e5'; // Indigo for branding accent
    const textColor = '#334155';    // Slate-700 for main text
    const mutedColor = '#94a3b8';   // Slate-400 for secondary text
    const headerColor = '#1e293b';  // Slate-800 for table headers

    // Helper function for formatted currency (shorter format)
    const formatCurrency = (amount: string) => {
      return `${invoice.currencyCode}${parseFloat(amount).toFixed(2)}`;
    };
    
    // Helper function to calculate days between dates
    const getDaysBetween = (start: Date, end: Date) => {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };
    
    // Top margin is tighter to maximize space
    let currentY = 25;
    
    // HEADER SECTION - More horizontal layout to save vertical space
    // =================================================================
    
    // Brand on left side
    doc
      .fillColor(primaryColor)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(tenant.name, 40, currentY);
    
    // Invoice title and number on right side
    doc
      .fillColor(primaryColor)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, currentY)
      .fontSize(10)
      .text(`#${invoice.invoiceNumber}`, 400, currentY + 16);
    
    currentY += 25;
      
    // Horizontal rule - very thin
    doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor(mutedColor).lineWidth(0.25).stroke();
    
    currentY += 10;
    
    // CLIENT AND DATES SECTION - Side by side to save space
    // =================================================================
    
    // Bill to section (left)
    doc
      .fillColor(primaryColor)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('BILL TO:', 40, currentY)
      .fillColor(textColor)
      .fontSize(9)
      .text(client.displayName || '', 40, currentY + 10)
      .font('Helvetica')
      .fontSize(7)
      .text(`Entity: ${entity.name || ''}`, 40, currentY + 20);
    
    // Address (1 line only, truncated)
    if (entity.address) {
      const addressText = entity.address.length > 45 ? 
        entity.address.substring(0, 45) + '...' : 
        entity.address;
      doc.text(addressText, 40, currentY + 28, { width: 180 });
    }
    
    // Invoice details (right) - More compact horizontal arrangement
    const dateInfoX = 280; // Moved left to create more space
    doc
      .fillColor(textColor)
      .fontSize(7)
      .font('Helvetica-Bold')
      .text('ISSUE DATE:', dateInfoX, currentY)
      .font('Helvetica')
      .text(format(new Date(invoice.issueDate), 'MM/dd/yyyy'), dateInfoX + 60, currentY);
      
    doc
      .font('Helvetica-Bold')
      .text('DUE DATE:', dateInfoX, currentY + 10)
      .font('Helvetica')
      .text(format(new Date(invoice.dueDate), 'MM/dd/yyyy'), dateInfoX + 60, currentY + 10);
    
    // Payment terms
    const paymentDays = getDaysBetween(new Date(invoice.issueDate), new Date(invoice.dueDate));
    doc
      .font('Helvetica-Bold')
      .text('PAYMENT TERMS:', dateInfoX, currentY + 20)
      .font('Helvetica')
      .text(`Net ${paymentDays} days`, dateInfoX + 60, currentY + 20);
      
    // Totals on far right - Pre-summarize the key financial data
    const totalsX = 450;
    doc
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('TOTAL DUE:', totalsX, currentY)
      .text(formatCurrency(invoice.amountDue), totalsX, currentY + 10);
    
    currentY += 30;
    
    // SERVICE DESCRIPTION SECTION - Display task details prominently
    // =================================================================
    
    if (invoice.serviceName || invoice.taskDetails) {
      // Section header
      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('SERVICE DESCRIPTION', 40, currentY);
      
      currentY += 15;
      
      // Service name (if available)
      if (invoice.serviceName) {
        doc
          .fillColor(headerColor)
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .text(invoice.serviceName, 40, currentY);
        
        currentY += 12;
      }
      
      // Task details description
      if (invoice.taskDetails) {
        const taskDetails = invoice.taskDetails.length > 300 ? 
          invoice.taskDetails.substring(0, 300) + '...' : 
          invoice.taskDetails;
        
        doc
          .fillColor(textColor)
          .fontSize(8)
          .font('Helvetica')
          .text(taskDetails, 40, currentY, { 
            width: 515, 
            align: 'left',
            lineGap: 2
          });
        
        // Calculate height used by text to adjust currentY
        const textHeight = doc.heightOfString(taskDetails, { 
          width: 515, 
          lineGap: 2 
        });
        
        currentY += textHeight + 8;
      }
      
      // Add separator line
      doc
        .moveTo(40, currentY)
        .lineTo(555, currentY)
        .strokeColor(mutedColor)
        .lineWidth(0.25)
        .stroke();
      
      currentY += 15;
    }
    
    // LINE ITEMS TABLE - More compact with fixed height rows
    // =================================================================
    
    // Table header
    doc
      .moveTo(40, currentY)
      .lineTo(555, currentY)
      .strokeColor(mutedColor)
      .lineWidth(0.5)
      .stroke();
    
    currentY += 5;
    
    // Table header text
    doc
      .fillColor(headerColor)
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .text('Description', 40, currentY)
      .text('Qty', 340, currentY)
      .text('Unit Price', 400, currentY)
      .text('Amount', 500, currentY);
    
    currentY += 10;
    
    // Header separator
    doc
      .moveTo(40, currentY)
      .lineTo(555, currentY)
      .stroke();
    
    currentY += 5;
    
    // Determine maximum table height to ensure we don't overflow page
    // This is key to forcing the invoice onto a single page
    const maxTableHeight = 380; // Leave space for summary and footer
    const maxY = currentY + maxTableHeight;
    
    let tableEndY = currentY;
    
    // Table data - Enforce maximum height
    if (!lineItems || lineItems.length === 0) {
      // Single line item from invoice itself - prioritize service name
      const description = invoice.serviceName || invoice.notes || 'Professional Services';
      
      doc
        .fillColor(textColor)
        .font('Helvetica')
        .fontSize(8)
        .text(description.substring(0, 80) + (description.length > 80 ? '...' : ''), 40, currentY, { width: 280 });
      
      // Use a fixed row height to save space
      doc
        .text('1', 340, currentY)
        .text(formatCurrency(invoice.subtotal), 400, currentY)
        .text(formatCurrency(invoice.subtotal), 500, currentY);
      
      tableEndY = currentY + 15;
    } else {
      // Calculate how many items we can show while staying on one page
      // Each item takes about 12-15px height, we'll use 15px to be safe
      const rowHeight = 15;
      const maxRows = Math.floor(maxTableHeight / rowHeight) - 3; // Leave space for summary
      
      const itemsToShow = Math.min(lineItems.length, maxRows);
      const itemsToRender = lineItems.slice(0, itemsToShow);
      
      itemsToRender.forEach((item, index) => {
        // Truncate description if too long
        const description = item.description.length > 70 ? 
          item.description.substring(0, 70) + '...' : 
          item.description;
        
        doc
          .fillColor(textColor)
          .font('Helvetica')
          .fontSize(7.5)
          .text(description, 40, currentY, { width: 290 });
        
        // Fixed position columns for tabular look
        doc
          .text(item.quantity.toString(), 340, currentY)
          .text(formatCurrency(item.unitPrice), 400, currentY)
          .text(formatCurrency(item.lineTotal), 500, currentY);
        
        currentY += rowHeight;
      });
      
      // Show count of hidden items if needed
      if (lineItems.length > itemsToShow) {
        doc
          .fillColor(mutedColor)
          .fontSize(7)
          .font('Helvetica-Oblique')
          .text(`... and ${lineItems.length - itemsToShow} more items not shown`, 40, currentY);
        
        currentY += 10;
      }
      
      tableEndY = currentY;
    }
    
    // Bottom table border
    doc
      .moveTo(40, tableEndY)
      .lineTo(555, tableEndY)
      .stroke();
    
    // SUMMARY SECTION - Compact right-aligned summary
    // =================================================================
    
    // Position summary section with fixed positions rather than flowing
    // This ensures consistent layout regardless of table content
    const summaryY = Math.min(tableEndY + 10, 650); // Cap the max position
    const summaryColX = 400;
    const valueColX = 500;
    
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor(textColor)
      .text('Subtotal:', summaryColX, summaryY)
      .font('Helvetica')
      .text(formatCurrency(invoice.subtotal), valueColX, summaryY);
    
    // Tax (always show)
    doc
      .font('Helvetica-Bold')
      .text('Tax:', summaryColX, summaryY + 12)
      .font('Helvetica')
      .text(formatCurrency(invoice.taxAmount), valueColX, summaryY + 12);
    
    // Discount (only if nonzero)
    let discountY = 0;
    if (parseFloat(invoice.discountAmount) > 0) {
      discountY = 12;
      doc
        .font('Helvetica-Bold')
        .text('Discount:', summaryColX, summaryY + 24)
        .font('Helvetica')
        .text(`-${formatCurrency(invoice.discountAmount)}`, valueColX, summaryY + 24);
    }
    
    // Bold total
    doc
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('TOTAL:', summaryColX, summaryY + 24 + discountY)
      .text(formatCurrency(invoice.totalAmount), valueColX, summaryY + 24 + discountY);
    
    // SERVICE DESCRIPTION SECTION - For task-based invoices
    // =================================================================
    
    let serviceDescriptionY = summaryY + 48 + discountY;
    
    // Service Description section - prominently display service name and task details
    if (invoice.serviceName || invoice.taskDetails) {
      doc
        .fillColor(primaryColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Service Description:', 40, serviceDescriptionY);
      
      serviceDescriptionY += 12;
      
      // Service Name
      if (invoice.serviceName) {
        doc
          .fillColor(textColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Service:', 40, serviceDescriptionY)
          .font('Helvetica')
          .text(invoice.serviceName, 80, serviceDescriptionY, { width: 470 });
        
        serviceDescriptionY += 12;
      }
      
      // Task Details
      if (invoice.taskDetails && invoice.taskDetails.trim() !== '') {
        doc
          .fillColor(textColor)
          .fontSize(7)
          .font('Helvetica-Bold')
          .text('Details:', 40, serviceDescriptionY)
          .font('Helvetica')
          .text(
            invoice.taskDetails.length > 200 ? invoice.taskDetails.substring(0, 200) + '...' : invoice.taskDetails,
            80, serviceDescriptionY, 
            { width: 470 }
          );
        
        serviceDescriptionY += 20;
      }
    }
    
    // NOTES/TERMS SECTION - Optional with truncation
    // =================================================================
    
    // Notes and terms in a single row to save space
    const notesY = serviceDescriptionY + 10;
    
    // Notes section (left column)
    if (invoice.notes && invoice.notes.trim() !== '') {
      doc
        .fillColor(textColor)
        .fontSize(7)
        .font('Helvetica-Bold')
        .text('Notes:', 40, notesY)
        .font('Helvetica')
        .text(
          invoice.notes.length > 80 ? invoice.notes.substring(0, 80) + '...' : invoice.notes, 
          40, notesY + 8, 
          { width: 250 }
        );
    }
    
    // Terms section (right column)
    if (invoice.termsAndConditions && invoice.termsAndConditions.trim() !== '') {
      doc
        .fillColor(textColor)
        .fontSize(7)
        .font('Helvetica-Bold')
        .text('Terms and Conditions:', 300, notesY)
        .font('Helvetica')
        .text(
          invoice.termsAndConditions.length > 80 ? 
            invoice.termsAndConditions.substring(0, 80) + '...' : 
            invoice.termsAndConditions, 
          300, notesY + 8, 
          { width: 250 }
        );
    }
    
    // FOOTER - Absolutely positioned to avoid page overflow
    // =================================================================
    
    // Limit the size of the document to ensure everything fits on one page
    const maxPageHeight = 740; // Maximum safe height for A4 with smaller margin
    
    // Hard-coded coordinates for the footer to ensure it's always on page 1
    // Make sure footer is always at least 20px from the bottom of the content
    const contentBottom = Math.max(notesY + 20, tableEndY + 100);
    // Force the footer to be at a safe distance from the bottom of the page
    const footerY = Math.min(contentBottom, maxPageHeight); 
    
    // Always move to the first page before adding footer
    doc.switchToPage(0);
    
    // Draw the footer at a safe position
    doc
      .moveTo(40, footerY)
      .lineTo(555, footerY)
      .strokeColor(mutedColor)
      .lineWidth(0.25)
      .stroke();
    
    doc
      .fillColor(mutedColor)
      .fontSize(6)
      .text(
        `Invoice #${invoice.invoiceNumber} | ${tenant.name} | Generated on ${format(new Date(), 'MM/dd/yyyy')}`,
        40, footerY + 5, { align: 'center', width: 515 }
      );
    
    // FINALIZE - Ensure single page constraint
    // =================================================================
    
    // Explicitly limit the document to one page by flattening all content to the first page
    const totalPages = doc.bufferedPageRange().count;
    
    // If more than one page was created, flatten to single page
    if (totalPages > 1) {
      // Keep only the first page
      for (let i = totalPages - 1; i > 0; i--) {
        doc.switchToPage(i);
        doc.flushPages();
      }
      
      // Ensure we end up on the first page
      doc.switchToPage(0);
    }
    
    // Finalize the PDF
    doc.end();
  });
}