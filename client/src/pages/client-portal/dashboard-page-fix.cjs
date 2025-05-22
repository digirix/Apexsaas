// Create a fix script to modify the dashboard page
const fs = require('fs');

// Read the dashboard file
const filePath = 'client/src/pages/client-portal/dashboard-page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix tasks tab to filter by entity
content = content.replace(
  /<TabsContent value="tasks" className="space-y-6">\s+<Card>\s+<CardHeader[^>]*>/s,
  `<TabsContent value="tasks" className="space-y-6">
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
                )}`
);

// Fix invoices tab to filter by entity
content = content.replace(
  /<TabsContent value="invoices" className="space-y-6">\s+<Card>\s+<CardHeader[^>]*>/s,
  `<TabsContent value="invoices" className="space-y-6">
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
                )}`
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content);
console.log('Dashboard page updated successfully!');
