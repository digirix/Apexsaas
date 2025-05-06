import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, Check, AlertCircle } from 'lucide-react';

export default function DatabaseSettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<{postgres: boolean; mysql: boolean}>({ postgres: false, mysql: false });
  const [dbConfig, setDbConfig] = useState({
    databaseType: 'postgres',
    mysqlHost: '',
    mysqlPort: '3306',
    mysqlUser: '',
    mysqlPassword: '',
    mysqlDatabase: '',
  });

  // Fetch current database connection status
  useEffect(() => {
    const checkDatabaseStatus = async () => {
      try {
        setIsLoading(true);
        // Check PostgreSQL status
        const pgResponse = await fetch('/api/v1/ping');
        const pgConnected = pgResponse.ok;
        
        // Check MySQL status
        const mysqlResponse = await fetch('/api/v1/mysql/status');
        const mysqlData = await mysqlResponse.json();
        
        setDbStatus({ 
          postgres: pgConnected, 
          mysql: mysqlData.connected 
        });
        
        // Get current configuration
        const configResponse = await fetch('/api/v1/database/config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setDbConfig(prev => ({
            ...prev,
            databaseType: configData.databaseType || 'postgres',
            mysqlHost: configData.mysqlHost || '',
            mysqlPort: configData.mysqlPort || '3306',
            mysqlUser: configData.mysqlUser || '',
            mysqlPassword: '', // For security, password is not returned
            mysqlDatabase: configData.mysqlDatabase || '',
          }));
        }
      } catch (error) {
        console.error('Error checking database status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkDatabaseStatus();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDbConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleDatabaseTypeChange = (value: string) => {
    setDbConfig(prev => ({ ...prev, databaseType: value }));
  };

  const handleSaveConfig = async () => {
    try {
      setIsLoading(true);
      // This endpoint would be implemented on the server side
      const response = await fetch('/api/v1/database/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig)
      });

      if (response.ok) {
        toast({
          title: 'Configuration saved',
          description: 'Database settings have been updated. Server restart may be required.',
          variant: 'default',
        });
        
        // Reload status after saving
        const mysqlResponse = await fetch('/api/v1/mysql/status');
        const mysqlData = await mysqlResponse.json();
        setDbStatus(prev => ({ ...prev, mysql: mysqlData.connected }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save database configuration');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save database configuration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsLoading(true);
      
      // Test MySQL connection specifically
      if (dbConfig.databaseType === 'mysql') {
        const response = await fetch('/api/v1/mysql/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: dbConfig.mysqlHost,
            port: dbConfig.mysqlPort,
            user: dbConfig.mysqlUser,
            password: dbConfig.mysqlPassword,
            database: dbConfig.mysqlDatabase
          })
        });

        const data = await response.json();
        
        if (data.connected) {
          toast({
            title: 'Connection successful',
            description: 'Successfully connected to MySQL database',
            variant: 'default',
          });
        } else {
          throw new Error(data.message || 'Failed to connect to MySQL database');
        }
      } else {
        // Just check PostgreSQL status
        const response = await fetch('/api/v1/ping');
        if (response.ok) {
          toast({
            title: 'Connection successful',
            description: 'Successfully connected to PostgreSQL database',
            variant: 'default',
          });
        } else {
          throw new Error('Failed to connect to PostgreSQL database');
        }
      }
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to test database connection',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Database Settings</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>Current database connection status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>PostgreSQL:</span>
                </div>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : dbStatus.postgres ? (
                  <div className="flex items-center text-green-500">
                    <Check className="h-5 w-5 mr-1" />
                    <span>Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-500">
                    <AlertCircle className="h-5 w-5 mr-1" />
                    <span>Disconnected</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>MySQL:</span>
                </div>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : dbStatus.mysql ? (
                  <div className="flex items-center text-green-500">
                    <Check className="h-5 w-5 mr-1" />
                    <span>Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-500">
                    <AlertCircle className="h-5 w-5 mr-1" />
                    <span>Disconnected</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Database Configuration</CardTitle>
            <CardDescription>Configure database connection settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Database Type</Label>
                <RadioGroup 
                  value={dbConfig.databaseType} 
                  onValueChange={handleDatabaseTypeChange}
                  className="flex space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="postgres" id="postgres" />
                    <Label htmlFor="postgres">PostgreSQL</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mysql" id="mysql" />
                    <Label htmlFor="mysql">MySQL</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {dbConfig.databaseType === 'mysql' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mysqlHost">Host</Label>
                      <Input 
                        id="mysqlHost" 
                        name="mysqlHost" 
                        value={dbConfig.mysqlHost} 
                        onChange={handleInputChange} 
                        placeholder="localhost" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="mysqlPort">Port</Label>
                      <Input 
                        id="mysqlPort" 
                        name="mysqlPort" 
                        value={dbConfig.mysqlPort} 
                        onChange={handleInputChange} 
                        placeholder="3306" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="mysqlUser">Username</Label>
                    <Input 
                      id="mysqlUser" 
                      name="mysqlUser" 
                      value={dbConfig.mysqlUser} 
                      onChange={handleInputChange} 
                      placeholder="root" 
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mysqlPassword">Password</Label>
                    <Input 
                      id="mysqlPassword" 
                      name="mysqlPassword" 
                      type="password" 
                      value={dbConfig.mysqlPassword} 
                      onChange={handleInputChange} 
                      placeholder="••••••••" 
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mysqlDatabase">Database</Label>
                    <Input 
                      id="mysqlDatabase" 
                      name="mysqlDatabase" 
                      value={dbConfig.mysqlDatabase} 
                      onChange={handleInputChange} 
                      placeholder="accounting_platform" 
                    />
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={handleTestConnection} 
                  variant="outline" 
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
                </Button>
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Configuration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Database Information</CardTitle>
            <CardDescription>Important information about database configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                <strong>PostgreSQL:</strong> The application is pre-configured to work with PostgreSQL. 
                The connection is managed through the DATABASE_URL environment variable.
              </p>
              <p>
                <strong>MySQL:</strong> To use MySQL, you need to provide the connection details above. 
                After saving, the application will attempt to connect to the MySQL database. 
                You may need to restart the server for changes to take effect.
              </p>
              <p>
                <strong>Note:</strong> Changing database types may require data migration. It's recommended 
                to perform this operation during maintenance periods to avoid data loss.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}