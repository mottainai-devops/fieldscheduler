import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Camera, CheckCircle, Loader2, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface PickupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  routeId: number;
  customer: {
    id: number;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    customermaf?: string;
    unitCode?: string;
    arcgisBuildingId?: string;
    latitude?: string | number;
    longitude?: string | number;
  };
}

const BIN_TYPES = ["240L", "120L", "1100L", "Skip", "Bag"];

export default function PickupModal({ open, onClose, onSuccess, routeId, customer }: PickupModalProps) {
  const workerId = parseInt(localStorage.getItem("workerId") || "0");
  const workerName = localStorage.getItem("workerName") || "";
  const storedWebhookType = localStorage.getItem("workerPreferredWebhookType") as "payt" | "monthly" | "" | null;

  const [step, setStep] = useState<"webhook-choice" | "form">(
    storedWebhookType ? "form" : "webhook-choice"
  );
  const [webhookType, setWebhookType] = useState<"payt" | "monthly">(
    (storedWebhookType as "payt" | "monthly") || "payt"
  );
  const [binType, setBinType] = useState("");
  const [binQty, setBinQty] = useState("1");
  const [incidentReport, setIncidentReport] = useState("");
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const setWebhookPref = trpc.workerAuth.setWebhookPreference.useMutation();
  const markPicked = trpc.workerAuth.markCustomerPicked.useMutation();

  const { data: webhookData } = trpc.workerAuth.getWebhookForCustomer.useQuery(
    { customermaf: customer.customermaf || "", webhookType },
    { enabled: !!customer.customermaf && step === "form" }
  );

  const handlePhotoCapture = useCallback((type: "before" | "after", file: File) => {
    const url = URL.createObjectURL(file);
    if (type === "before") {
      setBeforePhoto(file);
      setBeforePreview(url);
    } else {
      setAfterPhoto(file);
      setAfterPreview(url);
    }
  }, []);

  const handleWebhookChoice = async (choice: "payt" | "monthly") => {
    setWebhookType(choice);
    try {
      await setWebhookPref.mutateAsync({ workerId, webhookType: choice });
      localStorage.setItem("workerPreferredWebhookType", choice);
      setStep("form");
    } catch {
      toast.error("Failed to save preference. Please try again.");
    }
  };

  const handleSubmit = async () => {
    if (!binType) { toast.error("Please select a bin type"); return; }
    if (!beforePhoto) { toast.error("Before photo is required"); return; }
    if (!afterPhoto) { toast.error("After photo is required"); return; }

    const webhookUrl = webhookData?.webhookUrl;
    if (!webhookUrl) {
      toast.error("Could not resolve webhook URL for this customer's lot. Please contact admin.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("formId", webhookUrl);
      formData.append("customerName", customer.name || "");
      formData.append("customerPhone", customer.phone || "");
      formData.append("customerEmail", customer.email || "");
      formData.append("customerAddress", customer.address || "");
      formData.append("customerId", String(customer.id));
      formData.append("unitCode", customer.unitCode || "");
      formData.append("arcgisBuildingId", customer.arcgisBuildingId || "");
      formData.append("mafCode", customer.customermaf || "");
      formData.append("supervisorId", workerName);
      formData.append("binType", binType);
      formData.append("binQuantity", binQty);
      formData.append("incidentReport", incidentReport);
      formData.append("latitude", String(customer.latitude || ""));
      formData.append("longitude", String(customer.longitude || ""));
      formData.append("beforePhoto", beforePhoto, beforePhoto.name);
      formData.append("afterPhoto", afterPhoto, afterPhoto.name);

      const res = await fetch("https://upwork.kowope.xyz/forms/submit", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Submission failed");
      }

      // Mark as picked in DB
      await markPicked.mutateAsync({ routeId, customerId: customer.id });

      toast.success("Pickup recorded successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit pickup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    // Reset state
    setBinType(""); setBinQty("1"); setIncidentReport("");
    setBeforePhoto(null); setAfterPhoto(null);
    setBeforePreview(null); setAfterPreview(null);
    setStep(storedWebhookType ? "form" : "webhook-choice");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" />
            Record Pickup — {customer.name || "Customer"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Webhook choice (first time only) */}
        {step === "webhook-choice" && (
          <div className="space-y-4 pt-2">
            <p className="text-slate-300 text-sm">
              This is your first pickup. Please select the billing type for your lot.
              <span className="block text-slate-400 text-xs mt-1">This preference will be saved and applied to all future pickups. Only an admin can change it.</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleWebhookChoice("payt")}
                disabled={setWebhookPref.isPending}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-600 hover:border-green-500 hover:bg-green-500/10 transition-all"
              >
                <span className="text-2xl">💳</span>
                <span className="font-semibold text-white">PAYT</span>
                <span className="text-xs text-slate-400 text-center">Pay As You Throw</span>
              </button>
              <button
                onClick={() => handleWebhookChoice("monthly")}
                disabled={setWebhookPref.isPending}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-600 hover:border-blue-500 hover:bg-blue-500/10 transition-all"
              >
                <span className="text-2xl">📅</span>
                <span className="font-semibold text-white">Monthly</span>
                <span className="text-xs text-slate-400 text-center">Monthly billing</span>
              </button>
            </div>
            {setWebhookPref.isPending && (
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving preference...
              </div>
            )}
          </div>
        )}

        {/* Step 2: Pickup form */}
        {step === "form" && (
          <div className="space-y-4 pt-2">
            {/* Customer info summary */}
            <div className="bg-slate-700/50 rounded-lg p-3 text-sm space-y-1">
              <p className="text-slate-300"><span className="text-slate-500">MAF:</span> {customer.customermaf || "—"}</p>
              <p className="text-slate-300"><span className="text-slate-500">Address:</span> {customer.address || "—"}</p>
              <p className="text-slate-300">
                <span className="text-slate-500">Billing:</span>{" "}
                <span className={webhookType === "payt" ? "text-green-400" : "text-blue-400"}>
                  {webhookType === "payt" ? "PAYT" : "Monthly"}
                </span>
              </p>
              {!webhookData?.webhookUrl && customer.customermaf && (
                <p className="text-amber-400 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Webhook URL not found for this lot
                </p>
              )}
            </div>

            {/* Bin type */}
            <div className="space-y-1">
              <label className="text-sm text-slate-300 font-medium">Bin Type *</label>
              <Select value={binType} onValueChange={setBinType}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select bin type..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {BIN_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="text-white hover:bg-slate-600">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bin quantity */}
            <div className="space-y-1">
              <label className="text-sm text-slate-300 font-medium">Bin Quantity</label>
              <Select value={binQty} onValueChange={setBinQty}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {["1","2","3","4","5","6","7","8","9","10"].map(n => (
                    <SelectItem key={n} value={n} className="text-white hover:bg-slate-600">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Before photo */}
            <div className="space-y-1">
              <label className="text-sm text-slate-300 font-medium">Before Photo *</label>
              <input
                ref={beforeInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => e.target.files?.[0] && handlePhotoCapture("before", e.target.files[0])}
              />
              {beforePreview ? (
                <div className="relative">
                  <img src={beforePreview} alt="Before" className="w-full h-32 object-cover rounded-lg" />
                  <button
                    onClick={() => beforeInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-slate-800/80 text-white text-xs px-2 py-1 rounded-md"
                  >Retake</button>
                </div>
              ) : (
                <button
                  onClick={() => beforeInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-all"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">Tap to capture before photo</span>
                </button>
              )}
            </div>

            {/* After photo */}
            <div className="space-y-1">
              <label className="text-sm text-slate-300 font-medium">After Photo *</label>
              <input
                ref={afterInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => e.target.files?.[0] && handlePhotoCapture("after", e.target.files[0])}
              />
              {afterPreview ? (
                <div className="relative">
                  <img src={afterPreview} alt="After" className="w-full h-32 object-cover rounded-lg" />
                  <button
                    onClick={() => afterInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-slate-800/80 text-white text-xs px-2 py-1 rounded-md"
                  >Retake</button>
                </div>
              ) : (
                <button
                  onClick={() => afterInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-all"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">Tap to capture after photo</span>
                </button>
              )}
            </div>

            {/* Incident report */}
            <div className="space-y-1">
              <label className="text-sm text-slate-300 font-medium">Incident Report (optional)</label>
              <Textarea
                value={incidentReport}
                onChange={e => setIncidentReport(e.target.value)}
                placeholder="Note any issues encountered..."
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 resize-none"
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !binType || !beforePhoto || !afterPhoto}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" />Submit Pickup</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
