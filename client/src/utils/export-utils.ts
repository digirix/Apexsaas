import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

// Types for report data
interface HierarchyNode {
  name: string;
  amount: string;
  children?: Record<string, HierarchyNode>;
}

interface ReportData {
  incomeHierarchy?: Record<string, HierarchyNode>;
  expenseHierarchy?: Record<string, HierarchyNode>;
  assetsHierarchy?: Record<string, HierarchyNode>;
  liabilitiesHierarchy?: Record<string, HierarchyNode>;
  equityHierarchy?: Record<string, HierarchyNode>;
  totalIncome?: string;
  totalExpenses?: string;
  netProfit?: string;
  totalAssets?: string;
  totalLiabilities?: string;
  totalEquity?: string;
}

// Helper function to extract account-level data and calculate hierarchy totals
function extractAccountLevelData(hierarchy: Record<string, HierarchyNode>): Array<{
  accountName: string;
  amount: number;
  detailedGroup: string;
  subElementGroup: string;
  elementGroup: string;
  mainGroup: string;
}> {
  const accounts: Array<{
    accountName: string;
    amount: number;
    detailedGroup: string;
    subElementGroup: string;
    elementGroup: string;
    mainGroup: string;
  }> = [];

  // Navigate through the hierarchy: Main Group -> Element Group -> Sub Element Group -> Detailed Group -> Account Name
  for (const [mainGroupKey, mainGroupNode] of Object.entries(hierarchy)) {
    if (mainGroupNode.children) {
      for (const [elementGroupKey, elementGroupNode] of Object.entries(mainGroupNode.children)) {
        if (elementGroupNode.children) {
          for (const [subElementGroupKey, subElementGroupNode] of Object.entries(elementGroupNode.children)) {
            if (subElementGroupNode.children) {
              for (const [detailedGroupKey, detailedGroupNode] of Object.entries(subElementGroupNode.children)) {
                if (detailedGroupNode.children) {
                  // This is the account level
                  for (const [accountKey, accountNode] of Object.entries(detailedGroupNode.children)) {
                    const amount = parseFloat(accountNode.amount || '0');
                    if (amount !== 0) { // Only include accounts with non-zero balances
                      accounts.push({
                        accountName: accountNode.name,
                        amount: amount,
                        detailedGroup: detailedGroupNode.name,
                        subElementGroup: subElementGroupNode.name,
                        elementGroup: elementGroupNode.name,
                        mainGroup: mainGroupNode.name
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return accounts;
}

// Helper function to build Excel hierarchy with calculated totals
function buildExcelHierarchy(accounts: Array<{
  accountName: string;
  amount: number;
  detailedGroup: string;
  subElementGroup: string;
  elementGroup: string;
  mainGroup: string;
}>): Array<{
  level: number;
  name: string;
  amount: number | string;
  indent: string;
  isTotal: boolean;
}> {
  const result: Array<{
    level: number;
    name: string;
    amount: number | string;
    indent: string;
    isTotal: boolean;
  }> = [];

  // Group accounts by hierarchy levels
  const hierarchyMap = new Map();

  accounts.forEach(account => {
    const mainGroupKey = account.mainGroup;
    const elementGroupKey = `${mainGroupKey}|${account.elementGroup}`;
    const subElementGroupKey = `${elementGroupKey}|${account.subElementGroup}`;
    const detailedGroupKey = `${subElementGroupKey}|${account.detailedGroup}`;

    if (!hierarchyMap.has(mainGroupKey)) {
      hierarchyMap.set(mainGroupKey, {
        name: account.mainGroup,
        level: 0,
        amount: 0,
        elementGroups: new Map()
      });
    }

    if (!hierarchyMap.get(mainGroupKey).elementGroups.has(elementGroupKey)) {
      hierarchyMap.get(mainGroupKey).elementGroups.set(elementGroupKey, {
        name: account.elementGroup,
        level: 1,
        amount: 0,
        subElementGroups: new Map()
      });
    }

    if (!hierarchyMap.get(mainGroupKey).elementGroups.get(elementGroupKey).subElementGroups.has(subElementGroupKey)) {
      hierarchyMap.get(mainGroupKey).elementGroups.get(elementGroupKey).subElementGroups.set(subElementGroupKey, {
        name: account.subElementGroup,
        level: 2,
        amount: 0,
        detailedGroups: new Map()
      });
    }

    if (!hierarchyMap.get(mainGroupKey).elementGroups.get(elementGroupKey).subElementGroups.get(subElementGroupKey).detailedGroups.has(detailedGroupKey)) {
      hierarchyMap.get(mainGroupKey).elementGroups.get(elementGroupKey).subElementGroups.get(subElementGroupKey).detailedGroups.set(detailedGroupKey, {
        name: account.detailedGroup,
        level: 3,
        amount: 0,
        accounts: []
      });
    }

    // Add the account
    hierarchyMap.get(mainGroupKey).elementGroups.get(elementGroupKey).subElementGroups.get(subElementGroupKey).detailedGroups.get(detailedGroupKey).accounts.push(account);
    
    // Update amounts at all levels
    hierarchyMap.get(mainGroupKey).elementGroups.get(elementGroupKey).subElementGroups.get(subElementGroupKey).detailedGroups.get(detailedGroupKey).amount += account.amount;
    hierarchyMap.get(mainGroupKey).elementGroups.get(elementGroupKey).subElementGroups.get(subElementGroupKey).amount += account.amount;
    hierarchyMap.get(mainGroupKey).elementGroups.get(elementGroupKey).amount += account.amount;
    hierarchyMap.get(mainGroupKey).amount += account.amount;
  });

  // Build the flattened structure
  for (const [, mainGroup] of hierarchyMap) {
    result.push({
      level: 0,
      name: mainGroup.name,
      amount: '',
      indent: '',
      isTotal: false
    });

    for (const [, elementGroup] of mainGroup.elementGroups) {
      result.push({
        level: 1,
        name: elementGroup.name,
        amount: '',
        indent: '  ',
        isTotal: false
      });

      for (const [, subElementGroup] of elementGroup.subElementGroups) {
        result.push({
          level: 2,
          name: subElementGroup.name,
          amount: '',
          indent: '    ',
          isTotal: false
        });

        for (const [, detailedGroup] of subElementGroup.detailedGroups) {
          result.push({
            level: 3,
            name: detailedGroup.name,
            amount: '',
            indent: '      ',
            isTotal: false
          });

          // Add accounts with actual figures
          detailedGroup.accounts.forEach((account: any) => {
            result.push({
              level: 4,
              name: account.accountName,
              amount: account.amount,
              indent: '        ',
              isTotal: false
            });
          });

          // Add detailed group total
          result.push({
            level: 3,
            name: `Total ${detailedGroup.name}`,
            amount: detailedGroup.amount,
            indent: '      ',
            isTotal: true
          });
        }

        // Add sub element group total
        result.push({
          level: 2,
          name: `Total ${subElementGroup.name}`,
          amount: subElementGroup.amount,
          indent: '    ',
          isTotal: true
        });
      }

      // Add element group total
      result.push({
        level: 1,
        name: `Total ${elementGroup.name}`,
        amount: elementGroup.amount,
        indent: '  ',
        isTotal: true
      });
    }

    // Add main group total
    result.push({
      level: 0,
      name: `Total ${mainGroup.name}`,
      amount: mainGroup.amount,
      indent: '',
      isTotal: true
    });
  }

  return result;
}

// Format currency for display
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Export Profit & Loss to Excel
export function exportProfitLossToExcel(
  reportData: ReportData,
  displayLevel: string,
  fromDate?: Date,
  toDate?: Date
) {
  const workbook = XLSX.utils.book_new();
  
  // Create main data array
  const data: Array<Array<string | number>> = [];
  
  // Header
  data.push(['PROFIT & LOSS STATEMENT']);
  data.push(['Accounting Firm']);
  if (fromDate && toDate) {
    data.push([`For the period from ${format(fromDate, "PP")} to ${format(toDate, "PP")}`]);
  } else {
    data.push(['For the current period']);
  }
  data.push(['']); // Empty row
  
  // Income Section
  data.push(['INCOME', '', '']);
  if (reportData.incomeHierarchy) {
    const incomeAccounts = extractAccountLevelData(reportData.incomeHierarchy);
    const incomeHierarchy = buildExcelHierarchy(incomeAccounts);
    incomeHierarchy.forEach(item => {
      if (item.amount === '') {
        data.push([item.indent + item.name, '', '']);
      } else {
        data.push([item.indent + item.name, '', formatCurrency(typeof item.amount === 'number' ? item.amount : 0)]);
      }
    });
  }
  data.push(['Total Income', '', formatCurrency(parseFloat(reportData.totalIncome || '0'))]);
  data.push(['']); // Empty row
  
  // Expenses Section
  data.push(['EXPENSES', '', '']);
  if (reportData.expenseHierarchy) {
    const expenseAccounts = extractAccountLevelData(reportData.expenseHierarchy);
    const expenseHierarchy = buildExcelHierarchy(expenseAccounts);
    expenseHierarchy.forEach(item => {
      if (item.amount === '') {
        data.push([item.indent + item.name, '', '']);
      } else {
        data.push([item.indent + item.name, '', formatCurrency(typeof item.amount === 'number' ? item.amount : 0)]);
      }
    });
  }
  data.push(['Total Expenses', '', formatCurrency(parseFloat(reportData.totalExpenses || '0'))]);
  data.push(['']); // Empty row
  
  // Net Profit
  data.push(['NET PROFIT', '', formatCurrency(parseFloat(reportData.netProfit || '0'))]);
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  worksheet['!cols'] = [
    { width: 40 }, // Account names
    { width: 10 }, // Spacing
    { width: 15 }  // Amounts
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Profit & Loss');
  
  // Generate filename
  const filename = `profit-loss-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  
  // Save file
  XLSX.writeFile(workbook, filename);
}

// Export Balance Sheet to Excel
export function exportBalanceSheetToExcel(
  reportData: ReportData,
  displayLevel: string,
  asOfDate?: Date
) {
  const workbook = XLSX.utils.book_new();
  
  // Create main data array
  const data: Array<Array<string | number>> = [];
  
  // Header
  data.push(['BALANCE SHEET']);
  data.push(['Accounting Firm']);
  data.push([asOfDate ? `As of ${format(asOfDate, "PP")}` : 'As of today']);
  data.push(['']); // Empty row
  
  // Assets Section
  data.push(['ASSETS', '', '']);
  if (reportData.assetsHierarchy) {
    const assetAccounts = extractAccountLevelData(reportData.assetsHierarchy);
    const assetHierarchy = buildExcelHierarchy(assetAccounts);
    assetHierarchy.forEach(item => {
      if (item.amount === '') {
        data.push([item.indent + item.name, '', '']);
      } else {
        data.push([item.indent + item.name, '', formatCurrency(typeof item.amount === 'number' ? item.amount : 0)]);
      }
    });
  }
  data.push(['Total Assets', '', formatCurrency(parseFloat(reportData.totalAssets || '0'))]);
  data.push(['']); // Empty row
  
  // Liabilities Section
  data.push(['LIABILITIES', '', '']);
  if (reportData.liabilitiesHierarchy) {
    const liabilityAccounts = extractAccountLevelData(reportData.liabilitiesHierarchy);
    const liabilityHierarchy = buildExcelHierarchy(liabilityAccounts);
    liabilityHierarchy.forEach(item => {
      if (item.amount === '') {
        data.push([item.indent + item.name, '', '']);
      } else {
        data.push([item.indent + item.name, '', formatCurrency(typeof item.amount === 'number' ? item.amount : 0)]);
      }
    });
  }
  data.push(['Total Liabilities', '', formatCurrency(parseFloat(reportData.totalLiabilities || '0'))]);
  data.push(['']); // Empty row
  
  // Equity Section
  data.push(['EQUITY', '', '']);
  if (reportData.equityHierarchy) {
    const equityAccounts = extractAccountLevelData(reportData.equityHierarchy);
    const equityHierarchy = buildExcelHierarchy(equityAccounts);
    equityHierarchy.forEach(item => {
      if (item.amount === '') {
        data.push([item.indent + item.name, '', '']);
      } else {
        data.push([item.indent + item.name, '', formatCurrency(typeof item.amount === 'number' ? item.amount : 0)]);
      }
    });
  }
  data.push(['Total Equity', '', formatCurrency(parseFloat(reportData.totalEquity || '0'))]);
  data.push(['']); // Empty row
  
  // Total Liabilities + Equity
  const totalLiabilitiesEquity = parseFloat(reportData.totalLiabilities || '0') + parseFloat(reportData.totalEquity || '0');
  data.push(['TOTAL LIABILITIES + EQUITY', '', formatCurrency(totalLiabilitiesEquity)]);
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  worksheet['!cols'] = [
    { width: 40 }, // Account names
    { width: 10 }, // Spacing
    { width: 15 }  // Amounts
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Sheet');
  
  // Generate filename
  const filename = `balance-sheet-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  
  // Save file
  XLSX.writeFile(workbook, filename);
}

// Export to PDF using print functionality
export async function exportToPDF(elementId: string, filename: string) {
  try {
    // Show the print-only version
    const printElement = document.querySelector('.print-only') as HTMLElement;
    if (!printElement) {
      throw new Error('Print layout not found');
    }
    
    // Temporarily show the print element
    printElement.style.display = 'block';
    printElement.style.position = 'fixed';
    printElement.style.top = '0';
    printElement.style.left = '0';
    printElement.style.zIndex = '9999';
    printElement.style.background = 'white';
    printElement.style.width = '210mm';
    printElement.style.padding = '20px';
    
    // Capture the element as canvas
    const canvas = await html2canvas(printElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // Hide the print element again
    printElement.style.display = 'none';
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate dimensions to fit A4
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;
    
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    
    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export PDF');
  }
}

// Enhanced print function
export function printReport() {
  // Create a new window for printing with only the print content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the report');
    return;
  }
  
  const printElement = document.querySelector('.print-only');
  if (!printElement) {
    alert('Print layout not found');
    return;
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Financial Report</title>
      <style>
        @page {
          margin: 0.5in;
          size: A4;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: black;
          background: white;
          margin: 0;
          padding: 20px;
        }
        .text-center { text-align: center; }
        .text-lg { font-size: 18px; }
        .text-xl { font-size: 20px; }
        .text-2xl { font-size: 24px; }
        .font-bold { font-weight: bold; }
        .font-semibold { font-weight: 600; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mb-8 { margin-bottom: 2rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }
        .border-t { border-top: 1px solid #000; }
        .border-b { border-bottom: 1px solid #000; }
        .border-double { border-style: double; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
        .ml-4 { margin-left: 1rem; }
        .ml-8 { margin-left: 2rem; }
        .ml-12 { margin-left: 3rem; }
        .ml-16 { margin-left: 4rem; }
        .text-right { text-align: right; }
        .page-break { page-break-after: always; }
      </style>
    </head>
    <body>
      ${printElement.innerHTML}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  // Print after a short delay to ensure content is loaded
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}