import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Camera, Upload, Wifi, WifiOff, CheckCircle } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function WorkerMobileReportViolation() {
  const [, params] = useRoute("/worker-mobile/report-violation/:routeId/:customerId");
  const [, setLocation] = useLocation();
  const routeId = params?.routeId ? parseInt(params.routeId) : null;
  const customerId = params?.customerId ? parseInt(params.customerId) : null;
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedViolations, setSelectedViolations] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const { data: violationTypes = [] } = trpc.workerAuth.getAllViolationTypes.useQuery();
  const { data: customer, isLoading: isLoadingCustomer, isError: isErrorCustomer } = trpc.workerAuth.getCustomerById.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId }
  );

  const createViolation = trpc.compliance.createViolation.useMutation();

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

  const handleViolationToggle = (violationId: number) => {
    setSelectedViolations(prev =>
      prev.includes(violationId)
        ? prev.filter(id => id !== violationId)
        : [...prev, violationId]
    );
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleSubmit = async () => {
    if (selectedViolations.length === 0) {
      toast.error("Please select at least one violation");
      return;
    }

    if (!customerId) {
      toast.error("Customer ID is missing");
      return;
    }

    try {
      // If offline, save to localStorage for later sync
      if (!isOnline) {
        const offlineReport = {
          customerId,
          violationIds: selectedViolations,
          notes,
          timestamp: new Date().toISOString(),
        };
        
        const existingReports = JSON.parse(localStorage.getItem('offlineViolationReports') || '[]');
        localStorage.setItem('offlineViolationReports', JSON.stringify([...existingReports, offlineReport]));
        
        toast.success("Report saved offline. Will sync when online.");
        setLocation(`/worker-mobile/route/${routeId}`);
        return;
      }

      // Online: submit immediately
      for (const violationTypeId of selectedViolations) {
        await createViolation.mutateAsync({
          customerId,
          violationTypeId,
          notes,
          reportedBy: parseInt(localStorage.getItem('selectedWorkerId') || '0'),
        });
      }

      toast.success("Violation(s) reported successfully");
      setLocation(`/worker-mobile/route/${routeId}`);
    } catch (error) {
      toast.error("Failed to report violation");
      console.error(error);
    }
  };

  if (!customerId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 text-lg font-semibold mb-2">Invalid Customer</p>
          <p className="text-slate-400 text-sm">Customer ID is missing</p>
          <Button
            className="mt-4"
            onClick={() => setLocation(`/worker-mobile/route/${routeId}`)}
          >
            Back to Route
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingCustomer) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading customer data...</p>
      </div>
    );
  }

  if (isErrorCustomer || !customer) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 text-lg font-semibold mb-2">Customer Not Found</p>
          <p className="text-slate-400 text-sm mb-1">Customer ID: {customerId}</p>
          <p className="text-slate-500 text-xs">This customer may have been removed or does not exist in the system.</p>
          <Button
            className="mt-4"
            onClick={() => setLocation(`/worker-mobile/route/${routeId}`)}
          >
            Back to Route
          </Button>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/worker-mobile/route/${routeId}`)}
            className="text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="font-semibold text-white">Report Violation</h2>
            <p className="text-xs text-slate-400">{customer.name}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Violation Types */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Select Violations</h3>
          <div className="space-y-2">
            {violationTypes.map((type) => (
              <Card
                key={type.id}
                className={`cursor-pointer transition-colors ${
                  selectedViolations.includes(type.id)
                    ? 'bg-red-500/20 border-red-500'
                    : 'bg-slate-800/50 border-slate-700'
                }`}
                onClick={() => handleViolationToggle(type.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedViolations.includes(type.id)
                        ? 'bg-red-500 border-red-500'
                        : 'border-slate-600'
                    }`}>
                      {selectedViolations.includes(type.id) && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{type.name}</h4>
                      {type.description && (
                        <p className="text-xs text-slate-400 mt-1">{type.description}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        type.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : type.severity === 'high'
                          ? 'bg-orange-500/20 text-orange-400'
                          : type.severity === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {type.severity}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Additional Notes</h3>
          <Textarea
            placeholder="Add any additional details about the violation..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
          />
        </div>

        {/* Photo Capture */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Evidence Photos</h3>
          <div className="space-y-3">
            <label htmlFor="photo-capture">
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-slate-600 transition-colors">
                <Camera className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Tap to capture photo</p>
              </div>
              <input
                id="photo-capture"
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </label>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Evidence ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={selectedViolations.length === 0 || createViolation.isPending}
        >
          {createViolation.isPending ? 'Submitting...' : 'Submit Report'}
        </Button>

        {!isOnline && (
          <p className="text-xs text-center text-yellow-400">
            You're offline. Report will be saved locally and synced when online.
          </p>
        )}
      </div>
    </div>
  );
}

