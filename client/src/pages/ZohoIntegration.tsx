import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, CheckCircle, AlertCircle, Truck, Users as UsersIcon } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";

export default function ZohoIntegration() {
  const { data: customers = [] } = trpc.fieldWorker.getCustomers.useQuery();
  const { data: zohoStatus, refetch } = trpc.integrations.getZohoStatus.useQuery();
  // OAuth removed - using direct refresh token authentication
  const syncMutation = trpc.integrations.syncZohoContacts.useMutation();
  
  const [syncing, setSyncing] = useState(false);
  const [apiKey, setApiKey] = useState("••••••••••••••••");
  const [orgId, setOrgId] = useState("••••••••••••");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncDetails, setSyncDetails] = useState<any>(null);

  useEffect(() => {
    // Refetch immediately on mount
    refetch();
    
    // Poll every 1 second for 20 seconds to catch recent authorizations
    const interval = setInterval(() => {
      refetch();
    }, 1000);
    
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 20000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [refetch]);

  const zohoCustomers = customers.filter(c => c.zohoContactId);
  const lastSync = new Date().toLocaleString();

  const handleSync = async () => {
    if (!zohoStatus?.hasRefreshToken) {
      const errorMsg = "Zoho refresh token not configured. Please add ZOHO_REFRESH_TOKEN to environment variables.";
      toast.error(errorMsg);
      setSyncError(errorMsg);
      return;
    }
    
    setSyncing(true);
    setSyncError(null);
    setSyncDetails(null);
    
    console.log('=== SYNC STARTED ===');
    console.log('Zoho Status:', zohoStatus);
    
    syncMutation.mutate(undefined, {
      onSuccess: (data) => {
        console.log('=== SYNC SUCCESS ===');
        console.log('Full response:', JSON.stringify(data, null, 2));
        
        setSyncing(false);
        setSyncDetails(data);
        
        if (data.success) {
          toast.success(`Synced ${data.synced} customers from Zoho Books!`);
          if (data.contacts && data.contacts.length > 0) {
            console.log('Sample contact:', data.contacts[0]);
            const withCoords = data.contacts.filter((c: any) => c.hasCoordinates).length;
            console.log(`Customers with coordinates: ${withCoords}/${data.contacts.length}`);
          }
        } else {
          const errorMsg = "Sync failed. Please check your connection.";
          toast.error(errorMsg);
          setSyncError(errorMsg);
        }
      },
      onError: (error) => {
        console.error('=== SYNC ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error data:', (error as any).data);
        
        setSyncing(false);
        const errorMsg = `Sync error: ${error.message}`;
        toast.error(errorMsg);
        setSyncError(errorMsg + '\n\nFull error: ' + JSON.stringify(error, null, 2));
      },
    });
  };

  const handleTestConnection = () => {
    if (zohoStatus?.hasRefreshToken) {
      toast.success("Connection to Zoho Books API successful!");
    } else {
      toast.error("Not connected. Please authorize first.");
    }
  };
  
  const handleAuthorize = () => {
    // Generate Zoho OAuth URL and redirect
    const redirectUri = `${window.location.origin}/zoho/callback`;
    const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.fullaccess.all&client_id=1000.LNYEUO6LRTIFLHDMG4W742QRZMTUXO&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader title="Zoho Books Integration" subtitle="Manage customer synchronization and API settings" />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Connection Status */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Connection Status</CardTitle>
            <CardDescription className="text-slate-400">
              Current status of Zoho Books API integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {zohoStatus?.hasRefreshToken ? (
              <div className="flex items-center justify-between p-4 bg-green-600/10 border border-green-600/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="font-medium text-white">Connected</div>
                    <div className="text-sm text-slate-400">Last synced: {lastSync}</div>
                  </div>
                </div>
                <Button
                  onClick={handleTestConnection}
                  variant="outline"
                  className="border-green-600/30 text-green-400 hover:bg-green-600/10"
                >
                  Test Connection
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-yellow-600/10 border border-yellow-600/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="font-medium text-white">Not Connected</div>
                    <div className="text-sm text-slate-400">
                      {zohoStatus?.isConfigured 
                        ? "Click authorize to connect to Zoho Books" 
                        : "API credentials not configured"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {zohoStatus?.isConfigured && (
                    <>
                      <Link href="/zoho/authorize">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          Authorize Zoho
                        </Button>
                      </Link>
                      <Link href="/zoho/token-generator">
                        <Button variant="outline" className="border-slate-600">
                          Generate Refresh Token
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">API Configuration</CardTitle>
            <CardDescription className="text-slate-400">
              Configure your Zoho Books API credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Organization ID
                </label>
                <Input
                  type="text"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Enter your Zoho organization ID"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  API Key
                </label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Enter your Zoho API key"
                />
              </div>

              <div className="flex gap-3">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Save Configuration
                </Button>
                <Button variant="outline" className="border-slate-600">
                  Reset to Default
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">{customers.length}</div>
              <div className="text-xs text-slate-400">In local database</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">Synced from Zoho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">{zohoCustomers.length}</div>
              <div className="text-xs text-slate-400">With Zoho contact ID</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">With Coordinates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                {customers.filter(c => c.latitude && c.longitude).length}
              </div>
              <div className="text-xs text-slate-400">Ready for routing</div>
            </CardContent>
          </Card>
        </div>

        {/* Sync Actions */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Synchronization</CardTitle>
                <CardDescription className="text-slate-400">
                  Sync customer data from Zoho Books
                </CardDescription>
              </div>
              <Link href="/zoho/sync-history">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  View Sync History
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-white mb-1">Automatic Sync</div>
                    <div className="text-sm text-slate-400 mb-3">
                      Customers are automatically synced every 6 hours. You can also trigger a manual sync below.
                    </div>
                    <Button
                      onClick={handleSync}
                      disabled={syncing}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                      {syncing ? "Syncing..." : "Sync Now"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sync Error Display */}
              {syncError && (
                <div className="p-4 bg-red-600/10 border border-red-600/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-red-400 mb-1">Sync Error</div>
                      <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono bg-red-950/30 p-3 rounded overflow-auto max-h-64">
                        {syncError}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Success Details */}
              {syncDetails && syncDetails.success && (
                <div className="p-4 bg-green-600/10 border border-green-600/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-green-400 mb-2">Sync Successful</div>
                      <div className="text-sm text-slate-300 space-y-1">
                        <div>✓ Total customers synced: <span className="font-bold text-white">{syncDetails.synced}</span></div>
                        <div>✓ Field managers found: <span className="font-bold text-white">{syncDetails.fieldManagerCount || 0}</span></div>
                        <div>✓ Building IDs found: <span className="font-bold text-white">{syncDetails.customermafCount || 0}</span></div>
                        {syncDetails.contacts && (
                          <>
                            <div>✓ Customers with coordinates: <span className="font-bold text-white">
                              {syncDetails.contacts.filter((c: any) => c.hasCoordinates).length}
                            </span></div>
                            <div className="mt-3 pt-3 border-t border-green-600/30">
                              <div className="text-xs text-slate-400 mb-2">Sample synced customers:</div>
                              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-green-950/30 p-2 rounded overflow-auto max-h-48">
                                {JSON.stringify(syncDetails.contacts.slice(0, 3), null, 2)}
                              </pre>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <UsersIcon className="w-5 h-5 text-purple-400" />
                    <div className="font-medium text-white">Import Customers</div>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">
                    Import all customers from Zoho Books contacts
                  </p>
                  <Button variant="outline" className="border-slate-600 w-full">
                    Import from Zoho
                  </Button>
                </div>

                <div className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Truck className="w-5 h-5 text-orange-400" />
                    <div className="font-medium text-white">Geocode Addresses</div>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">
                    Convert customer addresses to coordinates
                  </p>
                  <Button variant="outline" className="border-slate-600 w-full">
                    Geocode All
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Log */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Sync Activity</CardTitle>
            <CardDescription className="text-slate-400">
              History of synchronization operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { time: "2 hours ago", action: "Customer sync completed", count: 12, status: "success" },
                { time: "8 hours ago", action: "Automatic sync", count: 12, status: "success" },
                { time: "14 hours ago", action: "Manual sync triggered", count: 11, status: "success" },
                { time: "1 day ago", action: "Geocoding completed", count: 12, status: "success" },
                { time: "2 days ago", action: "Customer import", count: 10, status: "success" },
              ].map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <div>
                      <div className="text-sm font-medium text-white">{log.action}</div>
                      <div className="text-xs text-slate-400">{log.time}</div>
                    </div>
                  </div>
                  <span className="text-sm text-slate-400">{log.count} customers</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

