import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, MapPin, Navigation, CheckCircle,
  AlertTriangle, Package, Wifi, WifiOff, SkipForward, ArrowRightLeft
} from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useGPSTracking } from "@/hooks/useGPSTracking";
import PickupModal from "@/components/PickupModal";

export default function WorkerMobileRouteDetail() {
  const [, params] = useRoute("/worker-mobile/route/:id");
  const [, setLocation] = useLocation();
  const routeId = params?.id ? parseInt(params.id) : null;
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pickupCustomer, setPickupCustomer] = useState<any | null>(null);

  // G1/G2/G3: Skip dialog state
  const [skipTarget, setSkipTarget] = useState<{ customerId: number; customerName: string } | null>(null);
  const [skipReason, setSkipReason] = useState<string>('');
  const [skipNote, setSkipNote] = useState<string>('');
  const [skipLoading, setSkipLoading] = useState(false);
  // I1: Handoff request state
  const [showHandoffDialog, setShowHandoffDialog] = useState(false);
  const [handoffReason, setHandoffReason] = useState('');
  const [handoffLoading, setHandoffLoading] = useState(false);
  const requestHandoff = trpc.calendarOverrides.requestHandoff.useMutation();
  // G1/G2/G3: Must be declared before early return (Rules of Hooks)
  const skipCustomerMutation = trpc.workerAuth.skipCustomer.useMutation();

  // Worker session from localStorage
  const workerId = parseInt(localStorage.getItem("workerId") || localStorage.getItem("selectedWorkerId") || "0");
  const workerRole = localStorage.getItem("workerRole") || "field_manager";
  const isSupervisor = workerRole === "supervisor";

  const { data: route } = trpc.workerAuth.getRouteById.useQuery(
    { routeId: routeId! },
    { enabled: !!routeId }
  );

  const { data: customers = [], refetch: refetchCustomers } = trpc.workerAuth.getRouteCustomers.useQuery(
    { routeId: routeId! },
    { enabled: !!routeId }
  );

  // G3: Resolve scheduleId for this route via routeInstances and write to localStorage
  const { data: scheduleIdData } = trpc.workerAuth.getScheduleIdForRoute.useQuery(
    { routeId: routeId! },
    { enabled: !!routeId }
  );
  const currentScheduleId = scheduleIdData?.scheduleId ?? null;
  // Write to localStorage so skipCustomer and PickupModal can read it
  useEffect(() => {
    if (currentScheduleId != null) {
      localStorage.setItem('currentScheduleId', String(currentScheduleId));
    } else {
      localStorage.removeItem('currentScheduleId');
    }
  }, [currentScheduleId]);

  // Enable GPS tracking
  const { position, permissionStatus } = useGPSTracking({
    workerId,
    routeId: routeId || undefined,
    enabled: !!workerId && !!routeId,
    updateInterval: 30000,
  });

  useEffect(() => {
    if (permissionStatus === "denied") {
      toast.error("Location permission denied. Please enable location access for tracking.");
    }
  }, [permissionStatus, position]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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
  const pickedCount = customers.filter((c: any) => c.pickedAt !== null).length;
  const progress = customers.length > 0 ? (completedCount / customers.length) * 100 : 0;

  const handleNavigate = (customer: any) => {
    const lat = customer.customer?.latitude;
    const lng = customer.customer?.longitude;
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
    } else {
      toast.error("No coordinates available for this customer");
    }
  };

  const handleReportViolation = (customerId: number) => {
    setLocation(`/worker-mobile/report-violation/${routeId}/${customerId}`);
  };

  const handlePickupSuccess = () => {
    refetchCustomers();
  };

  const handleSkipSubmit = async () => {
    if (!skipTarget || !skipReason) return;
    if (skipReason === 'other' && !skipNote.trim()) {
      toast.error('Please provide a note for "Other" skip reason');
      return;
    }
    setSkipLoading(true);
    try {
      const scheduleId = parseInt(localStorage.getItem('currentScheduleId') || '0') || undefined;
      const result = await skipCustomerMutation.mutateAsync({
        scheduleId: scheduleId && scheduleId > 0 ? scheduleId : undefined,
        routeId: routeId!,
        customerId: skipTarget.customerId,
        skipReason: skipReason as any,
        skipNote: skipNote.trim() || undefined,
        workerId,
      });
      if (result.action === 'removed') {
        toast.success('Customer permanently removed from schedule. Admin notified.');
      } else if (result.action === 'auto_paused') {
        toast.warning(`Customer paused after 3 consecutive skips. Admin notified urgently.`);
      } else {
        toast.success('Customer skipped. Will reappear on next occurrence.');
      }
      setSkipTarget(null);
      setSkipReason('');
      setSkipNote('');
      refetchCustomers();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to skip customer');
    } finally {
      setSkipLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Network Status */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
          isOnline ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="text-xs font-medium">{isOnline ? "Online" : "Offline"}</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/worker-mobile")}
            className="text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="font-semibold text-white">Route #{route.id}</h2>
            <p className="text-xs text-slate-400">
              {route.totalDistance ? `${parseFloat(route.totalDistance).toFixed(1)} km` : "Distance N/A"}
              {isSupervisor && (
                <span className="ml-2 px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                  Supervisor
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              route.status === "completed"
                ? "bg-green-500/20 text-green-400"
                : route.status === "in_progress"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-blue-500/20 text-blue-400"
            }`}>
              {route.status}
            </span>
            {/* I1: Request Handoff — supervisor only */}
            {isSupervisor && (
              <Button
                size="sm"
                variant="outline"
                className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10 text-xs px-2 py-1 h-auto"
                onClick={() => setShowHandoffDialog(true)}
              >
                <ArrowRightLeft className="w-3 h-3 mr-1" />
                Handoff
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Progress</span>
            <span>
              {isSupervisor
                ? `${pickedCount} of ${customers.length} picked`
                : `${completedCount} of ${customers.length} completed`}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${isSupervisor ? (customers.length > 0 ? (pickedCount / customers.length) * 100 : 0) : progress}%` }}
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
          customers.map((customer: any, index: number) => {
            const isPicked = !!customer.pickedAt;
            const isCompleted = !!customer.completedAt;

            return (
              <Card
                key={customer.id}
                className={`border ${
                  isSupervisor
                    ? isPicked
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-slate-800/50 border-slate-700"
                    : isCompleted
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-slate-800/50 border-slate-700"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 mt-1">
                      {(isSupervisor ? isPicked : isCompleted) ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white mb-1">
                        {customer.customer?.name || "Unknown Customer"}
                      </h4>
                      {customer.customer?.customermaf && (
                        <p className="text-xs text-slate-500 mb-1">{customer.customer.customermaf}</p>
                      )}
                      {customer.customer?.address && (
                        <p className="text-sm text-slate-400">{customer.customer.address}</p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {isSupervisor ? (
                    /* SUPERVISOR: View Details + Navigate + Pickup/Picked */
                    isPicked ? (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Picked</span>
                      </div>
                    ) : (
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
                            onClick={() => setPickupCustomer({ ...customer.customer, id: customer.customerId })}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0"
                          >
                            <Package className="w-4 h-4 mr-1" />
                            Pickup
                          </Button>
                        </div>
                        {/* G1/G2/G3: Skip button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSkipTarget({ customerId: customer.customerId, customerName: customer.customer?.name || 'Customer' })}
                          className="w-full text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                        >
                          <SkipForward className="w-4 h-4 mr-1" />
                          Skip
                        </Button>
                      </div>
                    )
                  ) : (
                    /* FIELD MANAGER: View Details + Navigate + Report */
                    isCompleted ? (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Visit completed</span>
                      </div>
                    ) : (
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
                    )
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Floating Complete Route Button */}
      {route.status !== "completed" && (
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

      {/* Pickup Modal (supervisor only) */}
      {pickupCustomer && routeId && (
        <PickupModal
          open={!!pickupCustomer}
          onClose={() => setPickupCustomer(null)}
          onSuccess={handlePickupSuccess}
          routeId={routeId}
          scheduleId={currentScheduleId ?? undefined}
          customer={pickupCustomer}
        />
      )}

      {/* G1/G2/G3: Skip Reason Dialog */}
      {skipTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="bg-slate-800 rounded-t-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Skip Customer</h3>
              <button
                onClick={() => { setSkipTarget(null); setSkipReason(''); setSkipNote(''); }}
                className="text-slate-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>
            <p className="text-sm text-slate-400">{skipTarget.customerName}</p>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wide">Reason</label>
              {[
                { value: 'no_access', label: 'Gate locked / no access' },
                { value: 'customer_not_present', label: 'Customer not present (absent)' },
                { value: 'customer_request', label: 'Customer opt-out (asked to skip)' },
                { value: 'bin_not_out', label: 'Bins not out' },
                { value: 'safety_concern', label: 'Weather / safety' },
                { value: 'permanent_moved', label: 'Permanent — customer moved out' },
                { value: 'permanent_closed', label: 'Permanent — business closed' },
                { value: 'other', label: 'Other (note required)' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSkipReason(opt.value)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    skipReason === opt.value
                      ? opt.value.startsWith('permanent')
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-slate-700 text-slate-300 border border-transparent hover:bg-slate-600'
                  }`}
                >
                  {opt.label}
                  {opt.value.startsWith('permanent') && (
                    <span className="ml-2 text-xs text-red-400">(permanent)</span>
                  )}
                </button>
              ))}
            </div>

            {(skipReason === 'other' || skipReason.startsWith('permanent')) && (
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">Note {skipReason === 'other' ? '(required)' : '(optional)'}</label>
                <textarea
                  value={skipNote}
                  onChange={(e) => setSkipNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="w-full mt-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-yellow-500"
                />
              </div>
            )}

            <Button
              onClick={handleSkipSubmit}
              disabled={!skipReason || skipLoading || (skipReason === 'other' && !skipNote.trim())}
              className={`w-full ${
                skipReason.startsWith('permanent')
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-yellow-600 hover:bg-yellow-700'
              } text-white border-0`}
            >
              {skipLoading ? 'Skipping...' : skipReason.startsWith('permanent') ? 'Permanently Remove' : 'Skip Customer'}
            </Button>
          </div>
        </div>
      )}

      {/* I1: Request Handoff dialog */}
      {showHandoffDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="bg-slate-800 rounded-t-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-orange-400" />
                Request Handoff
              </h3>
              <button
                onClick={() => { setShowHandoffDialog(false); setHandoffReason(''); }}
                className="text-slate-400 hover:text-white text-xl"
              >&times;</button>
            </div>
            <p className="text-sm text-slate-400">
              Route #{route?.id} — this will notify the admin to reassign this route.
            </p>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wide">Reason (required)</label>
              {[
                'Unable to complete — vehicle issue',
                'Unable to complete — personal emergency',
                'Route too large — need assistance',
                'Safety concern on route',
                'Other',
              ].map((r) => (
                <button
                  key={r}
                  onClick={() => setHandoffReason(r)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    handoffReason === r
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                      : 'bg-slate-700 text-slate-300 border border-transparent hover:bg-slate-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button
              disabled={!handoffReason || handoffLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white border-0"
              onClick={async () => {
                if (!handoffReason || !workerId) return;
                setHandoffLoading(true);
                try {
                  await requestHandoff.mutateAsync({
                    scheduleId: undefined,
                    instanceId: undefined,
                    supervisorId: workerId,
                    reason: handoffReason,
                  });
                  toast.success('Handoff request submitted. Admin has been notified.');
                  setShowHandoffDialog(false);
                  setHandoffReason('');
                } catch (err: any) {
                  toast.error(err?.message || 'Failed to submit handoff request.');
                } finally {
                  setHandoffLoading(false);
                }
              }}
            >
              {handoffLoading ? 'Submitting...' : 'Submit Handoff Request'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
