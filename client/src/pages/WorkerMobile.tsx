import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, CheckCircle, Clock, AlertTriangle, Wifi, WifiOff, LogOut, Lock, Bell, Download } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { WorkerCardSkeleton, RouteCardSkeleton, LoadingSpinner } from "@/components/LoadingSkeleton";
import { useOfflineSync, useOfflineRoutes } from "@/hooks/useOfflineSync";
import { getPickupQueueCount, syncPickupQueue } from "@/lib/pickupQueue";

export default function WorkerMobile() {
  const [, setLocation] = useLocation();
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(true); // Default to true for convenience
  const [routeFilter, setRouteFilter] = useState<'today' | 'all' | 'upcoming'>('today');

  // Pending pickup queue count for badge
  const [pickupQueueCount, setPickupQueueCount] = useState(0);

  // Supervisor Survey App login state
  const [loginMode, setLoginMode] = useState<'select' | 'pin' | 'supervisor'>('select');
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [supervisorPassword, setSupervisorPassword] = useState("");
  const [supervisorLoginError, setSupervisorLoginError] = useState("");
  const [supervisorLoginLoading, setSupervisorLoginLoading] = useState(false);
  
  // Offline support
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();
  const { cachedRoutes, cacheRoutes } = useOfflineRoutes(selectedWorkerId);


  const { data: workers = [], isLoading: workersLoading, refetch: refetchWorkers } = trpc.workerAuth.getAllWorkers.useQuery();
  const { data: routes = [], isLoading: routesLoading, refetch: refetchRoutes } = trpc.workerAuth.getRoutesByWorkerId.useQuery(
    { workerId: selectedWorkerId || 0 },
    { enabled: !!selectedWorkerId }
  );
  const { data: unreadCount } = trpc.workerNotifications.getUnreadCount.useQuery(
    { workerId: selectedWorkerId || 0 },
    { enabled: !!selectedWorkerId, refetchInterval: 30000 } // Poll every 30 seconds
  );
  
  // Cache routes when they load
  useEffect(() => {
    if (routes.length > 0 && selectedWorkerId) {
      const workerRoutes = routes.filter(r => r.workerId === selectedWorkerId);
      if (workerRoutes.length > 0) {
        cacheRoutes(workerRoutes);
      }
    }
  }, [routes, selectedWorkerId, cacheRoutes]);

  // Pull to refresh
  const { isPulling, isRefreshing, pullDistance, shouldTrigger } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([refetchWorkers(), refetchRoutes()]);
    },
  });



  // Load authenticated worker from localStorage with expiration check
  useEffect(() => {
    const savedWorkerId = localStorage.getItem('selectedWorkerId');
    const savedAuth = localStorage.getItem('workerAuthenticated');
    const authExpiry = localStorage.getItem('workerAuthExpiry');
    
    if (savedWorkerId && savedAuth === 'true' && authExpiry) {
      const expiryDate = new Date(authExpiry);
      const now = new Date();
      
      // Check if auth hasn't expired (30 days)
      if (expiryDate > now) {
        setSelectedWorkerId(parseInt(savedWorkerId));
        setIsAuthenticated(true);
      } else {
        // Clear expired auth
        localStorage.removeItem('selectedWorkerId');
        localStorage.removeItem('workerAuthenticated');
        localStorage.removeItem('workerAuthExpiry');
      }
    }
  }, []);

  // Poll pickup queue count every 10 seconds
  useEffect(() => {
    const update = () => getPickupQueueCount().then(setPickupQueueCount).catch(() => {});
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  const supervisorLoginMutation = trpc.workerAuth.supervisorLogin.useMutation();

  const handleWorkerSelect = (workerId: number) => {
    setSelectedWorkerId(workerId);
    setPin("");
    setLoginMode('pin');
  };

  const handleSupervisorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupervisorLoginError("");
    setSupervisorLoginLoading(true);
    try {
      const encodedPassword = btoa(supervisorPassword);
      const result = await supervisorLoginMutation.mutateAsync({
        email: supervisorEmail,
        password: encodedPassword,
      });
      if (result.success && result.worker) {
        const w = result.worker;
        setSelectedWorkerId(w.id);
        setIsAuthenticated(true);
        localStorage.setItem('workerRole', w.role ?? 'supervisor');
        localStorage.setItem('workerPreferredWebhookType', w.preferredWebhookType ?? '');
        localStorage.setItem('workerName', w.name ?? '');
        localStorage.setItem('workerId', w.id.toString());
        localStorage.setItem('workerSurveyToken', result.surveyToken ?? '');
        localStorage.setItem('workerSurveyAppUserId', w.surveyAppUserId ?? '');
        localStorage.setItem('workerCompanyId', w.companyId ?? '');
        localStorage.setItem('workerCompanyName', w.companyName ?? '');
        localStorage.setItem('workerDefaultLotCode', w.defaultLotCode ?? '');
        localStorage.setItem('workerMonthlyBilling', String(w.monthlyBilling ?? false));
        if (rememberMe) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          localStorage.setItem('selectedWorkerId', w.id.toString());
          localStorage.setItem('workerAuthenticated', 'true');
          localStorage.setItem('workerAuthExpiry', expiryDate.toISOString());
        }
        setLocation('/worker-mobile/routes');
      }
    } catch (err: any) {
      setSupervisorLoginError(err?.message || 'Login failed. Check your credentials.');
    } finally {
      setSupervisorLoginLoading(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const worker = workers.find(w => w.id === selectedWorkerId);
    
    if (!worker) {
      alert("Worker not found");
      return;
    }

    // If worker has no PIN set, allow access (for backward compatibility)
    if (!worker.pin || worker.pin === pin) {
      setIsAuthenticated(true);
      
      // Always persist role and webhook preference for the session
      localStorage.setItem('workerRole', (worker as any).role ?? 'field_manager');
      localStorage.setItem('workerPreferredWebhookType', (worker as any).preferredWebhookType ?? '');
      localStorage.setItem('workerName', worker.name ?? '');
      localStorage.setItem('workerId', selectedWorkerId!.toString());

      if (rememberMe) {
        // Set auth with 30-day expiration
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        localStorage.setItem('selectedWorkerId', selectedWorkerId!.toString());
        localStorage.setItem('workerAuthenticated', 'true');
        localStorage.setItem('workerAuthExpiry', expiryDate.toISOString());
      }
      
      setLocation(`/worker-mobile/routes`);
    } else {
      alert("Invalid PIN. Please try again.");
      setPin("");
    }
  };

  const handleSignOut = () => {
    setSelectedWorkerId(null);
    setIsAuthenticated(false);
    setPin("");
    setLoginMode('select');
    setSupervisorEmail("");
    setSupervisorPassword("");
    setSupervisorLoginError("");
    localStorage.removeItem('selectedWorkerId');
    localStorage.removeItem('workerAuthenticated');
    localStorage.removeItem('workerAuthExpiry');
    localStorage.removeItem('workerRole');
    localStorage.removeItem('workerPreferredWebhookType');
    localStorage.removeItem('workerName');
    localStorage.removeItem('workerId');
    localStorage.removeItem('workerSurveyToken');
    localStorage.removeItem('workerSurveyAppUserId');
    localStorage.removeItem('workerCompanyId');
    localStorage.removeItem('workerCompanyName');
    localStorage.removeItem('workerDefaultLotCode');
    localStorage.removeItem('workerMonthlyBilling');
    setLocation('/worker-mobile');
  };

  const worker = workers.find(w => w.id === selectedWorkerId);
  // Routes are already filtered by workerId from the API
  const workerRoutes = routes;
  
  const todayRoutes = workerRoutes.filter(r => {
    if (!r.scheduledDate) return false;
    const routeDate = new Date(r.scheduledDate);
    const today = new Date();
    return routeDate.toDateString() === today.toDateString();
  });

  const upcomingRoutes = workerRoutes.filter(r => {
    if (!r.scheduledDate) return false;
    const routeDate = new Date(r.scheduledDate);
    const today = new Date();
    return routeDate > today;
  });

  const filteredRoutes = routeFilter === 'today' ? todayRoutes : 
                        routeFilter === 'upcoming' ? upcomingRoutes : 
                        workerRoutes;

  // Worker Selection Screen
  if (!selectedWorkerId) {
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        {/* Network Status */}
        <div className="fixed top-4 right-4 z-50">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
            isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Field Worker App</h1>
          <p className="text-slate-400">Select your profile to continue</p>
        </div>

        {/* Worker Selection */}
        <div className="space-y-3 max-w-md mx-auto">
          {workersLoading ? (
            <>
              <WorkerCardSkeleton />
              <WorkerCardSkeleton />
              <WorkerCardSkeleton />
            </>
          ) : workers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>No workers found</p>
            </div>
          ) : (
            workers.map((w) => (
            <Card
              key={w.id}
              className="bg-slate-800/50 border-slate-700"
            >
              <CardContent 
                className="p-4 cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => handleWorkerSelect(w.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-400">
                      {w.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{w.name}</h3>
                    <p className="text-sm text-slate-400">{w.phone}</p>
                  </div>
                  <Navigation className="w-5 h-5 text-slate-500" />
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>

        {/* Supervisor Login Option */}
        <div className="text-center mt-6">
          <p className="text-slate-500 text-sm mb-2">Are you a supervisor?</p>
          <Button
            variant="outline"
            className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
            onClick={() => setLoginMode('supervisor')}
          >
            <Lock className="w-4 h-4 mr-2" />
            Supervisor Login
          </Button>
        </div>

        {/* Admin Link */}
        <div className="text-center mt-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              Go to Admin Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Supervisor Survey App Login Screen
  if (loginMode === 'supervisor' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Supervisor Login</h2>
              <p className="text-slate-400 text-sm">Sign in with your Mottainai Survey App account</p>
            </div>

            <form onSubmit={handleSupervisorLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <Input
                  type="email"
                  placeholder="supervisor@example.com"
                  value={supervisorEmail}
                  onChange={(e) => setSupervisorEmail(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={supervisorPassword}
                  onChange={(e) => setSupervisorPassword(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                  required
                />
              </div>

              {supervisorLoginError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{supervisorLoginError}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMeSupervisor"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-500"
                />
                <label htmlFor="rememberMeSupervisor" className="text-sm text-slate-300 cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={() => { setLoginMode('select'); setSupervisorLoginError(''); }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={supervisorLoginLoading || !supervisorEmail || !supervisorPassword}
                >
                  {supervisorLoginLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PIN Entry Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Enter PIN</h2>
              <p className="text-slate-400">{worker?.name}</p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest bg-slate-900 border-slate-700 text-white"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <label htmlFor="rememberMe" className="text-sm text-slate-300 cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={() => {
                    setSelectedWorkerId(null);
                    setPin("");
                  }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={pin.length === 0}
                >
                  Login
                </Button>
              </div>
            </form>

            <p className="text-xs text-slate-500 text-center mt-4">
              Contact your administrator if you forgot your PIN
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Worker Routes Screen (Authenticated)
  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <PullToRefreshIndicator
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        shouldTrigger={shouldTrigger}
      />
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-b-3xl shadow-2xl">
        {/* Worker Info Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {worker?.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-white">{worker?.name}</h2>
              <p className="text-xs text-slate-400">Field Worker</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSignOut}
            className="text-slate-400 hover:text-white hover:bg-slate-800 flex-shrink-0"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
        
        {/* Notification Bell & Network Status Bar */}
        <div className="flex items-center justify-end gap-3 mb-4">
          {/* Notification Bell */}
          <button
            onClick={() => setLocation('/worker-mobile/notifications')}
            className="relative p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0"
          >
            <Bell className="w-5 h-5 text-white" />
            {unreadCount && unreadCount.count > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount.count > 9 ? '9+' : unreadCount.count}
              </span>
            )}
          </button>

          {/* Pending Pickups Queue Badge — only shown for supervisors */}
          {localStorage.getItem('workerRole') === 'supervisor' && (
            <button
              onClick={() => setLocation('/worker-mobile/pending-pickups')}
              className="relative p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0"
              title="Pending Pickups"
            >
              <Download className="w-5 h-5 text-white" />
              {pickupQueueCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {pickupQueueCount > 9 ? '9+' : pickupQueueCount}
                </span>
              )}
            </button>
          )}
          
          {/* Network Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full flex-shrink-0 ${
            isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-white">{todayRoutes.length}</div>
            <div className="text-xs text-slate-400">Routes Today</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-green-400">
              {workerRoutes.filter(r => r.status === 'completed').length}
            </div>
            <div className="text-xs text-slate-400">Completed</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {workerRoutes.filter(r => r.status === 'in_progress').length}
            </div>
            <div className="text-xs text-slate-400">In Progress</div>
          </div>
        </div>


      </div>

      {/* Routes List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">ROUTES</h3>
          <div className="flex gap-1 bg-slate-800 rounded p-1">
            <button
              onClick={() => setRouteFilter('today')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                routeFilter === 'today' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setRouteFilter('upcoming')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                routeFilter === 'upcoming' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setRouteFilter('all')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                routeFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>
        </div>
        
        {routesLoading ? (
          <div className="space-y-3">
            <RouteCardSkeleton />
            <RouteCardSkeleton />
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="bg-slate-800/50 rounded-lg p-8 text-center border border-slate-700">
            <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">
              {routeFilter === 'today' ? 'No routes assigned for today' :
               routeFilter === 'upcoming' ? 'No upcoming routes' :
               'No routes assigned'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRoutes.map((route) => (
              <Link key={route.id} href={`/worker-mobile/route/${route.id}`}>
                <Card className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white">Route #{route.id}</h4>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        route.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        route.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {route.status === 'completed' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                        {route.status === 'in_progress' && <Clock className="w-3 h-3 inline mr-1" />}
                        {route.status?.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>{route.totalDistance ? `${Number(route.totalDistance).toFixed(2)}km` : 'N/A'}</span>
                      <span>•</span>
                      <span>
                        {route.estimatedDuration ? (() => {
                          const duration = Number(route.estimatedDuration);
                          const hours = Math.floor(duration);
                          const minutes = Math.round((duration - hours) * 60);
                          return `${hours}h ${minutes}min`;
                        })() : 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

