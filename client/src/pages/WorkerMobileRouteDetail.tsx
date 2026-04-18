import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, MapPin, Navigation, Phone, CheckCircle, Circle, 
  AlertTriangle, Camera, FileText, Wifi, WifiOff 
} from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useGPSTracking } from "@/hooks/useGPSTracking";

export default function WorkerMobileRouteDetail() {
  const [, params] = useRoute("/worker-mobile/route/:id");
  const [, setLocation] = useLocation();
  const routeId = params?.id ? parseInt(params.id) : null;
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);

  const { data: route } = trpc.workerAuth.getRouteById.useQuery(
    { routeId: routeId! },
    { enabled: !!routeId }
  );

  const { data: customers = [] } = trpc.workerAuth.getRouteCustomers.useQuery(
    { routeId: routeId! },
    { enabled: !!routeId }
  );
  
  // Get worker ID from localStorage
  const workerId = parseInt(localStorage.getItem('workerId') || '0');
  
  // Enable GPS tracking
  const { position, error: gpsError, permissionStatus } = useGPSTracking({
    workerId,
    routeId: routeId || undefined,
    enabled: !!workerId && !!routeId,
    updateInterval: 30000, // 30 seconds
  });
  
  // Show GPS permission status
  useEffect(() => {
    if (permissionStatus === 'denied') {
      toast.error('Location permission denied. Please enable location access for tracking.');
    } else if (permissionStatus === 'granted' && position) {
      console.log('GPS tracking active:', position);
    }
  }, [permissionStatus, position]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!routeId || !route) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading route...</p>
      </div>
    );
  }

  const completedCount = customers.filter((c: any) => c.completedAt !== null).length;
  const progress = customers.length > 0 ? (completedCount / customers.length) * 100 : 0;

  const handleNavigate = (customer: any) => {
    const lat = customer.customer?.latitude;
    const lng = customer.customer?.longitude;
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    } else {
      toast.error("No coordinates available for this customer");
    }
  };

  const handleReportViolation = (customerId: number) => {
    setSelectedCustomer(customerId);
    setLocation(`/worker-mobile/report-violation/${routeId}/${customerId}`);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Network Status */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
          isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="text-xs font-medium">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/worker-mobile')}
            className="text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="font-semibold text-white">Route #{route.id}</h2>
            <p className="text-xs text-slate-400">
              {route.totalDistance ? `${parseFloat(route.totalDistance).toFixed(1)} km` : 'Distance N/A'}
            </p>
          </div>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              route.status === 'completed'
                ? 'bg-green-500/20 text-green-400'
                : route.status === 'in_progress'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {route.status}
          </span>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Progress</span>
            <span>{completedCount} of {customers.length} completed</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Customers ({customers.length})
        </h3>

        {customers.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No customers in this route</p>
            </CardContent>
          </Card>
        ) : (
          customers.map((customer: any, index: number) => (
            <Card
              key={customer.id}
              className={`border ${
                customer.status === 'completed'
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 mt-1">
                    {customer.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white mb-1">{customer.customer?.name || 'Unknown Customer'}</h4>
                    {customer.customer?.address && (
                      <p className="text-sm text-slate-400 mb-2">{customer.customer.address}</p>
                    )}

                  </div>
                </div>

                {!customer.completedAt && (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation(`/worker-mobile/customer/${routeId}/${customer.customerId}`)}
                      className="w-full"
                    >
                      View Details
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleNavigate(customer)}
                        className="w-full"
                      >
                        <Navigation className="w-4 h-4 mr-1" />
                        Navigate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReportViolation(customer.customerId)}
                        className="w-full"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Report
                      </Button>
                    </div>
                  </div>
                )}

                {customer.completedAt && (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Visit completed</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      {route.status !== 'completed' && (
        <div className="fixed bottom-6 right-6">
          <Button
            size="lg"
            className="rounded-full shadow-lg"
            onClick={() => toast.info("Mark route as complete")}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Complete Route
          </Button>
        </div>
      )}
    </div>
  );
}

