import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  reportType: string;
  filters?: Record<string, any>;
}

export class PDFExporter {
  private doc: jsPDF;
  private currentY: number = 20;
  private margin: number = 20;
  private pageWidth: number;
  private pageHeight: number;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  async exportReport(elementId: string, options: PDFExportOptions): Promise<void> {
    // Add header
    this.addHeader(options);
    
    // Add filters section if provided
    if (options.filters) {
      this.addFiltersSection(options.filters);
    }

    // Capture the report content
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID ${elementId} not found`);
    }

    try {
      // Hide any interactive elements before capture
      this.hideInteractiveElements(element);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        height: element.scrollHeight,
        width: element.scrollWidth
      });

      // Show interactive elements back
      this.showInteractiveElements(element);

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = this.pageWidth - (this.margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if we need to add a new page
      if (this.currentY + imgHeight > this.pageHeight - this.margin) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      this.doc.addImage(imgData, 'PNG', this.margin, this.currentY, imgWidth, imgHeight);

      // Add footer
      this.addFooter();

      // Download the PDF
      this.doc.save(`${options.reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      throw new Error('Failed to export PDF');
    }
  }

  private addHeader(options: PDFExportOptions): void {
    // Company logo area (placeholder)
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('AccFirm', this.margin, this.currentY);

    // Report title
    this.currentY += 15;
    this.doc.setFontSize(16);
    this.doc.text(options.title, this.margin, this.currentY);

    // Subtitle if provided
    if (options.subtitle) {
      this.currentY += 10;
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(options.subtitle, this.margin, this.currentY);
    }

    // Report date and time
    this.currentY += 10;
    this.doc.setFontSize(10);
    this.doc.text(`Generated on: ${new Date().toLocaleString()}`, this.margin, this.currentY);

    this.currentY += 15;
    
    // Add separator line
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
  }

  private addFiltersSection(filters: Record<string, any>): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Applied Filters:', this.margin, this.currentY);
    this.currentY += 8;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        const filterText = `${this.formatFilterKey(key)}: ${this.formatFilterValue(value)}`;
        this.doc.text(filterText, this.margin + 10, this.currentY);
        this.currentY += 6;
      }
    });

    this.currentY += 10;
  }

  private formatFilterKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private formatFilterValue(value: any): string {
    if (typeof value === 'object' && value !== null) {
      if (value.start && value.end) {
        return `${value.start} to ${value.end}`;
      }
      return JSON.stringify(value);
    }
    return String(value);
  }

  private hideInteractiveElements(element: HTMLElement): void {
    // Hide buttons, inputs, and other interactive elements
    const interactiveSelectors = [
      'button',
      'input',
      'select',
      'textarea',
      '.no-print',
      '[data-no-print]'
    ];

    interactiveSelectors.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
    });
  }

  private showInteractiveElements(element: HTMLElement): void {
    // Show buttons, inputs, and other interactive elements back
    const interactiveSelectors = [
      'button',
      'input',
      'select',
      'textarea',
      '.no-print',
      '[data-no-print]'
    ];

    interactiveSelectors.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => {
        (el as HTMLElement).style.display = '';
      });
    });
  }

  private addFooter(): void {
    const footerY = this.pageHeight - 15;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(
      `Page ${this.doc.getCurrentPageInfo().pageNumber} - AccFirm Analytics Report`,
      this.margin,
      footerY
    );

    // Add page border
    this.doc.setLineWidth(0.5);
    this.doc.rect(
      this.margin - 5,
      this.margin - 5,
      this.pageWidth - (this.margin * 2) + 10,
      this.pageHeight - (this.margin * 2) + 10
    );
  }
}

// Export hook for easy use in components
export const usePDFExport = () => {
  const exportToPDF = async (elementId: string, options: PDFExportOptions) => {
    const exporter = new PDFExporter();
    await exporter.exportReport(elementId, options);
  };

  return { exportToPDF };
};