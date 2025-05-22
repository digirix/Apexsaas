const fs = require('fs');
const path = require('path');

// Read the dashboard file
const filePath = 'client/src/pages/client-portal/dashboard-page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace both occurrences of totalAmount?.toFixed with our helper function
content = content.replace(
  /Amount: \$\{invoice\.totalAmount\?\.toFixed\(2\) \|\| '0\.00'\}/g, 
  "Amount: \${formatCurrencyAmount(invoice.totalAmount)}"
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log('Fixed invoice.totalAmount in dashboard-page.tsx');
