// Create a quick fix script to modify the dashboard page
const fs = require('fs');

// Read the dashboard file
const filePath = 'client/src/pages/client-portal/dashboard-page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Update the useQuery sections for tasks and invoices to use entityId filtering
const tasksQueryFix = `// Fetch client tasks
  const { 
    data: clientTasks = [], 
    isLoading: isTasksLoading,
    error: tasksError,
    refetch: refetchTasks
  } = useQuery({
    queryKey: ["/api/client-portal/tasks", selectedEntityId],
    queryFn: async () => {
      const url = selectedEntityId 
        ? \`/api/client-portal/tasks?entityId=\${selectedEntityId}\`
        : '/api/client-portal/tasks';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: !!clientProfile
  });`;

const invoicesQueryFix = `// Fetch client invoices
  const {
    data: clientInvoices = [],
    isLoading: isInvoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices
  } = useQuery({
    queryKey: ["/api/client-portal/invoices", selectedEntityId],
    queryFn: async () => {
      const url = selectedEntityId 
        ? \`/api/client-portal/invoices?entityId=\${selectedEntityId}\`
        : '/api/client-portal/invoices';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
    enabled: !!clientProfile
  });`;

// Fix 2: Add entity selector to Tasks tab
const tasksTabHeader = `          <TabsContent value="tasks" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                <div>
                  <CardTitle>Tasks & Deadlines</CardTitle>
                  <CardDescription>
                    Your upcoming and completed tasks
                  </CardDescription>
                </div>
                {clientEntities && clientEntities.length > 0 && (
                  <div className="w-full sm:w-64">
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedEntityId || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedEntityId(value ? parseInt(value) : null);
                        setTimeout(() => refetchTasks(), 100);
                      }}
                    >
                      <option value="">All Entities</option>
                      {clientEntities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}`;

// Fix 3: Add entity selector to Invoices tab
const invoicesTabHeader = `          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                <div>
                  <CardTitle>Your Invoices</CardTitle>
                  <CardDescription>
                    View and manage your invoices
                  </CardDescription>
                </div>
                {clientEntities && clientEntities.length > 0 && (
                  <div className="w-full sm:w-64">
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedEntityId || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedEntityId(value ? parseInt(value) : null);
                        setTimeout(() => refetchInvoices(), 100);
                      }}
                    >
                      <option value="">All Entities</option>
                      {clientEntities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}`;

// Apply the replacements - Careful with regex to match only specific sections
const oldTasksQuery = /\/\/ Fetch client tasks\s+const\s+{\s+data:\s+clientTasks\s+=\s+\[\],\s+isLoading:\s+isTasksLoading,\s+error:\s+tasksError,\s+}\s+=\s+useQuery\({[^}]+}\);/s;
const oldInvoicesQuery = /\/\/ Fetch client invoices\s+const\s+{\s+data:\s+clientInvoices\s+=\s+\[\],\s+isLoading:\s+isInvoicesLoading,\s+error:\s+invoicesError,\s+}\s+=\s+useQuery\({[^}]+}\);/s;

const oldTasksHeader = /<TabsContent value="tasks" className="space-y-6">\s+<Card>\s+<CardHeader[^>]*>/s;
const oldInvoicesHeader = /<TabsContent value="invoices" className="space-y-6">\s+<Card>\s+<CardHeader[^>]*>/s;

// Replace the query sections
content = content.replace(oldTasksQuery, tasksQueryFix);
content = content.replace(oldInvoicesQuery, invoicesQueryFix);

// Replace the tab headers
content = content.replace(oldTasksHeader, tasksTabHeader);
content = content.replace(oldInvoicesHeader, invoicesTabHeader);

// Fix the formatCurrencyAmount function
if (!content.includes('formatCurrencyAmount')) {
  const formatFunction = `// Format currency amount safely, handling both string and number inputs
const formatCurrencyAmount = (amount: any): string => {
  if (!amount) return '0.00';
  // Handle both string and number inputs
  return typeof amount === 'number' 
    ? amount.toFixed(2)
    : parseFloat(String(amount)).toFixed(2);
};`;

  // Insert after imports
  content = content.replace(
    /import { Avatar, AvatarFallback } from "@\/components\/ui\/avatar";(\s+)/,
    'import { Avatar, AvatarFallback } from "@/components/ui/avatar";\n\n' + formatFunction + '$1'
  );
}

// Replace all instances of invoice.totalAmount?.toFixed(2) with formatCurrencyAmount
content = content.replace(
  /invoice\.totalAmount\?\.toFixed\(2\) \|\| '0\.00'/g, 
  'formatCurrencyAmount(invoice.totalAmount)'
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content);
console.log('Dashboard page updated successfully!');
