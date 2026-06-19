import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Camera, CheckCircle, Loader2, Package, AlertTriangle, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  enqueuePickup, resizePhoto, saveDraft, loadDraft, deleteDraft, makeDraftKey,
  MAX_QUEUE_SIZE, getPickupQueueCount,
} from "@/lib/pickupQueue";

interface PickupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  routeId: number;
  // G3: scheduleId for reset-on-pickup (consecutiveSkips reset)
  scheduleId?: number;
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
    // D3: Customer billing type for correct customerType derivation
    customerType?: string | null;
    monthlyBilling?: boolean | null;
  };
  // E6: Prefill from a queued pickup (Edit flow)
  prefill?: {
    binType?: string;
    binQty?: string;
    incidentReport?: string;
    webhookType?: "payt" | "monthly";
    beforePhotoBlob?: Blob;
    beforePhotoName?: string;
    afterPhotoBlob?: Blob;
    afterPhotoName?: string;
  };
  // E6: Called after the original queued item should be removed (Edit flow)
  onDiscardQueued?: () => Promise<void>;
}

// D3: Expanded to match Survey App pickupRequest model enum (7 values)
const BIN_TYPES = ["120L", "240L", "660L", "1100L", "MAMMOTH (1100 LITRE)", "7-11 TONNE COMPACTOR", "other"];
// D3: Wheelie bin types for the wheelieBinType field
const WHEELIE_BIN_TYPES = ["120L", "240L", "660L", "1100L"];

export default function PickupModal({ open, onClose, onSuccess, routeId, scheduleId, customer, prefill, onDiscardQueued }: PickupModalProps) {
  const workerId = parseInt(localStorage.getItem("workerId") || "0");
  const workerName = localStorage.getItem("workerName") || "";
  const storedWebhookType = localStorage.getItem("workerPreferredWebhookType") as "payt" | "monthly" | "" | null;

  const [step, setStep] = useState<"webhook-choice" | "form">(
    prefill || storedWebhookType ? "form" : "webhook-choice"
  );
  const [webhookType, setWebhookType] = useState<"payt" | "monthly">(
    prefill?.webhookType || (storedWebhookType as "payt" | "monthly") || "payt"
  );
  const [binType, setBinType] = useState(prefill?.binType || "");
  const [binQty, setBinQty] = useState(prefill?.binQty || "1");
  const [incidentReport, setIncidentReport] = useState(prefill?.incidentReport || "");
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // E6: Rehydrate prefill photos when editing a queued item
  useEffect(() => {
    if (!open || !prefill) return;
    if (prefill.beforePhotoBlob) {
      const f = new File([prefill.beforePhotoBlob], prefill.beforePhotoName || 'before.jpg', { type: 'image/jpeg' });
      setBeforePhoto(f);
      setBeforePreview(URL.createObjectURL(prefill.beforePhotoBlob));
    }
    if (prefill.afterPhotoBlob) {
      const f = new File([prefill.afterPhotoBlob], prefill.afterPhotoName || 'after.jpg', { type: 'image/jpeg' });
      setAfterPhoto(f);
      setAfterPreview(URL.createObjectURL(prefill.afterPhotoBlob));
    }
  }, [open, prefill]);

  // E7: Rehydrate draft on open (only when not in edit/prefill mode)
  useEffect(() => {
    if (!open || prefill) return;
    loadDraft(routeId, customer.id).then((draft) => {
      if (!draft) return;
      if (draft.binType) setBinType(draft.binType);
      if (draft.binQty) setBinQty(draft.binQty);
      if (draft.incidentReport) setIncidentReport(draft.incidentReport);
      if (draft.webhookType) setWebhookType(draft.webhookType);
      if (draft.beforePhotoBlob) {
        setBeforePhoto(new File([draft.beforePhotoBlob], draft.beforePhotoName || 'before.jpg', { type: 'image/jpeg' }));
        setBeforePreview(URL.createObjectURL(draft.beforePhotoBlob));
      }
      if (draft.afterPhotoBlob) {
        setAfterPhoto(new File([draft.afterPhotoBlob], draft.afterPhotoName || 'after.jpg', { type: 'image/jpeg' }));
        setAfterPreview(URL.createObjectURL(draft.afterPhotoBlob));
      }
      toast.info('Draft restored — your previous progress has been reloaded.', { duration: 3000 });
    }).catch(() => {});
  }, [open, routeId, customer.id]);

  // E7: Auto-save draft on form field changes (debounced 1s)
  const triggerDraftSave = useCallback((overrides?: Partial<{ binType: string; binQty: string; incidentReport: string; webhookType: 'payt' | 'monthly'; beforePhotoBlob?: Blob; beforePhotoName?: string; afterPhotoBlob?: Blob; afterPhotoName?: string }>) => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      const draftKey = makeDraftKey(routeId, customer.id);
      saveDraft({
        draftKey,
        routeId,
        customerId: customer.id,
        binType: overrides?.binType ?? binType,
        binQty: overrides?.binQty ?? binQty,
        incidentReport: overrides?.incidentReport ?? incidentReport,
        webhookType: overrides?.webhookType ?? webhookType,
        beforePhotoBlob: overrides?.beforePhotoBlob ?? (beforePhoto ? beforePhoto : undefined),
        beforePhotoName: overrides?.beforePhotoName ?? (beforePhoto ? beforePhoto.name : undefined),
        afterPhotoBlob: overrides?.afterPhotoBlob ?? (afterPhoto ? afterPhoto : undefined),
        afterPhotoName: overrides?.afterPhotoName ?? (afterPhoto ? afterPhoto.name : undefined),
      }).catch(() => {});
    }, 1000);
  }, [routeId, customer.id, binType, binQty, incidentReport, webhookType, beforePhoto, afterPhoto]);

  const setWebhookPref = trpc.workerAuth.setWebhookPreference.useMutation();
  const markPicked = trpc.workerAuth.markCustomerPicked.useMutation();
  // C1/C2/C3/D5: Resolve webhook URL from the lots cache (written at login time)
  // instead of calling the admin dashboard live. Falls back to getWebhookForCustomer
  // only when the cache is absent (e.g. first login before cache is warm).
  const webhookData = (() => {
    try {
      const raw = localStorage.getItem("lots.cache");
      if (!raw) return undefined;
      const lots: Array<{ lotCode: string; paytWebhook?: string | null; monthlyWebhook?: string | null }> = JSON.parse(raw);
      const lotMatch = (customer.customermaf || "").match(/-?(\d+)$/);
      const lotCode = lotMatch ? lotMatch[1] : null;
      if (!lotCode) return undefined;
      const lot = lots.find((l) =>
        l.lotCode === lotCode ||
        l.lotCode === lotCode.replace(/^0+/, "") ||
        l.lotCode === lotCode.padStart(3, "0")
      );
      if (!lot) return undefined;
      const webhookUrl = webhookType === "payt" ? lot.paytWebhook : lot.monthlyWebhook;
      return webhookUrl ? { webhookUrl } : undefined;
    } catch {
      return undefined;
    }
  })();
  // Fallback: live admin dashboard call when cache is absent or lot not found
  const { data: webhookDataFallback } = trpc.workerAuth.getWebhookForCustomer.useQuery(
    { customermaf: customer.customermaf || "", webhookType },
    { enabled: !!customer.customermaf && step === "form" && !webhookData }
  );
  const resolvedWebhookData = webhookData ?? webhookDataFallback;

  const handlePhotoCapture = useCallback((type: "before" | "after", file: File) => {
    const url = URL.createObjectURL(file);
    if (type === "before") {
      setBeforePhoto(file);
      setBeforePreview(url);
      triggerDraftSave({ beforePhotoBlob: file, beforePhotoName: file.name });
    } else {
      setAfterPhoto(file);
      setAfterPreview(url);
      triggerDraftSave({ afterPhotoBlob: file, afterPhotoName: file.name });
    }
  }, [triggerDraftSave]);

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

    const webhookUrl = resolvedWebhookData?.webhookUrl;
    if (!webhookUrl) {
      toast.error("Could not resolve webhook URL for this customer's lot. Please contact admin.");
      return;
    }

    // Read supervisor session data written by WorkerMobile supervisorLogin handler
    const surveyToken = localStorage.getItem("workerSurveyToken") || "";
    const companyId = localStorage.getItem("workerCompanyId") || "";
    const companyName = localStorage.getItem("workerCompanyName") || "";
    const defaultLotCode = localStorage.getItem("workerDefaultLotCode") || "";
    const surveyAppUserId = localStorage.getItem("workerSurveyAppUserId") || "";
    const isMonthlyBilling = localStorage.getItem("workerMonthlyBilling") === "true";

    // C3: Cache-miss guard — block submission if lot cache is absent.
    // This prevents submissions with missing provenance data.
    // The cache is written at login time (C1) and refreshed on foreground (C2).
    const lotsCache = localStorage.getItem("lots.cache");
    if (!lotsCache) {
      toast.error(
        "Lot data not loaded. Please log out and log back in to refresh your lot assignments.",
        { duration: 6000 }
      );
      setSubmitting(false);
      return;
    }

    // Derive lot code from customer MAF (e.g. "DIC-410" -> "410")
    const lotMatch = (customer.customermaf || "").match(/-?(\d+)$/);
    const lotCode = lotMatch ? lotMatch[1] : defaultLotCode;

    setSubmitting(true);
    try {
      // Resize photos before submission to reduce payload size
      const [resizedBefore, resizedAfter] = await Promise.all([
        resizePhoto(beforePhoto, beforePhoto.name),
        resizePhoto(afterPhoto, afterPhoto.name),
      ]);

      // If offline, enqueue for later and mark optimistically
      if (!navigator.onLine) {
        // E4: Check queue cap before enqueuing
        const queueCount = await getPickupQueueCount();
        if (queueCount >= MAX_QUEUE_SIZE) {
          toast.error(
            `You have ${queueCount} pending pickups. Please sync your pending pickups before continuing.`,
            { duration: 8000 }
          );
          setSubmitting(false);
          return;
        }
        // D3: Compute composite customerId and derived values for the queue payload
        const offlineCompositeId = (customer.arcgisBuildingId && customer.unitCode)
          ? `${customer.arcgisBuildingId} ${customer.unitCode}`
          : undefined;
        const offlineCustomerType = (() => {
          if (customer.monthlyBilling) return "Monthly Billing - Residential";
          if (customer.customerType === "business") return "PAYT - Commercial";
          return webhookType === "monthly" ? "Monthly Billing - Residential" : "PAYT - Residential";
        })();
        const offlineWheelieType = ["120L", "240L", "660L", "1100L"].includes(binType) ? binType : undefined;
        const result = await enqueuePickup({
          routeId,
          customerId: customer.id,
          customerName: customer.name || "",
          webhookUrl,
          supervisorId: workerName,
          binType,
          wheelieBinType: offlineWheelieType,
          binQuantity: binQty,
          incidentReport,
          customerPhone: customer.phone || "",
          customerEmail: customer.email || "",
          customerAddress: customer.address || "",
          unitCode: customer.unitCode || "",
          arcgisBuildingId: customer.arcgisBuildingId || "",
          compositeCustomerId: offlineCompositeId,
          customerType: offlineCustomerType,
          mafCode: customer.customermaf || "",
          latitude: String(customer.latitude || ""),
          longitude: String(customer.longitude || ""),
          lotCode,
          companyId,
          companyName,
          webhookType,
          pickUpDate: new Date().toISOString(),
          submittedFrom: "FieldWorker",
          source: "field_worker",
          surveyToken,
          surveyAppUserId,
          beforePhotoBlob: resizedBefore.blob,
          beforePhotoName: resizedBefore.name,
          afterPhotoBlob: resizedAfter.blob,
          afterPhotoName: resizedAfter.name,
        });
        if ('blocked' in result) {
          toast.error(
            `Queue full (${result.count}/${MAX_QUEUE_SIZE}). Please sync your pending pickups before continuing.`,
            { duration: 8000 }
          );
          setSubmitting(false);
          return;
        }
        // E7: Clear draft after successful queue
        await deleteDraft(routeId, customer.id).catch(() => {});
        toast.warning("You are offline. Pickup queued — it will be submitted automatically when you reconnect.", { duration: 5000 });
        onSuccess();
        onClose();
        return;
      }

      // D4: Helper — only append non-null, non-empty fields
      const appendIfPresent = (fd: FormData, key: string, value: string | null | undefined) => {
        if (value !== null && value !== undefined && value !== '' && value !== 'null' && value !== 'undefined') {
          fd.append(key, value);
        }
      };

      // D3: Derive composite customerId from arcgisBuildingId + unitCode
      const compositeCustomerId = (customer.arcgisBuildingId && customer.unitCode)
        ? `${customer.arcgisBuildingId} ${customer.unitCode}`
        : String(customer.id);
      // D3: Derive customerType from customer record, not supervisor preference
      const derivedCustomerType = (() => {
        if (customer.monthlyBilling) return "Monthly Billing - Residential";
        if (customer.customerType === "business") return "PAYT - Commercial";
        return webhookType === "monthly" ? "Monthly Billing - Residential" : "PAYT - Residential";
      })();
      // D3: wheelieBinType — set when binType is a standard wheelie bin size
      const isWheelieSize = WHEELIE_BIN_TYPES.includes(binType);
      const formData = new FormData();
      // ── Required fields — always present ────────────────────────────────────
      formData.append("formId", webhookUrl);
      formData.append("supervisorId", workerName);
      formData.append("binType", binType);
      formData.append("binQuantity", binQty);
      formData.append("customerId", compositeCustomerId);
      formData.append("isMonthly", String(webhookType === "monthly"));
      formData.append("customerType", derivedCustomerType);
      if (isWheelieSize) formData.append("wheelieBinType", binType);
      formData.append("pickUpDate", new Date().toISOString());
      formData.append("pickupDate", new Date().toISOString());
      formData.append("submittedFrom", "FieldWorker");
      formData.append("source", "field_worker");
      formData.append("beforePhoto", resizedBefore.blob, resizedBefore.name);
      formData.append("afterPhoto", resizedAfter.blob, resizedAfter.name);
      // ── D4: Nullable fields — omit if null/empty ─────────────────────────────
      appendIfPresent(formData, "incidentReport", incidentReport);
      appendIfPresent(formData, "customerName", customer.name);
      appendIfPresent(formData, "customerPhone", customer.phone);
      appendIfPresent(formData, "customerEmail", customer.email);
      appendIfPresent(formData, "customerAddress", customer.address);
      appendIfPresent(formData, "unitCode", customer.unitCode);
      appendIfPresent(formData, "arcgisBuildingId", customer.arcgisBuildingId);
      appendIfPresent(formData, "buildingId", customer.arcgisBuildingId);
      appendIfPresent(formData, "mafCode", customer.customermaf);
      appendIfPresent(formData, "userIdentificationNumber", customer.customermaf);
      appendIfPresent(formData, "latitude", customer.latitude != null ? String(customer.latitude) : null);
      appendIfPresent(formData, "longitude", customer.longitude != null ? String(customer.longitude) : null);
      appendIfPresent(formData, "lotCode", lotCode);
      appendIfPresent(formData, "companyId", companyId);
      appendIfPresent(formData, "companyName", companyName);
      // ── Survey App auth token ────────────────────────────────────────────────
      if (surveyToken) formData.append("surveyToken", surveyToken);
      if (surveyAppUserId) formData.append("surveyAppUserId", surveyAppUserId);

      const headers: HeadersInit = {};
      if (surveyToken) headers["Authorization"] = `Bearer ${surveyToken}`;

      const res = await fetch("https://upwork.kowope.xyz/forms/submit", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Submission failed");
      }

      // Mark as picked in DB (G3: pass scheduleId for reset-on-pickup)
      await markPicked.mutateAsync({ routeId, customerId: customer.id, scheduleId });

      // E7: Clear draft after successful submission
      await deleteDraft(routeId, customer.id).catch(() => {});

      // E6: If this was an edit of a queued item, remove the old queued entry
      if (onDiscardQueued) {
        await onDiscardQueued().catch(() => {});
      }

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
              {!resolvedWebhookData?.webhookUrl && customer.customermaf && (
                <p className="text-amber-400 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Webhook URL not found for this lot
                </p>
              )}
            </div>

            {/* Bin type */}
            <div className="space-y-1">
              <label className="text-sm text-slate-300 font-medium">Bin Type *</label>
              <Select value={binType} onValueChange={(v) => { setBinType(v); triggerDraftSave({ binType: v }); }}>
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
              <Select value={binQty} onValueChange={(v) => { setBinQty(v); triggerDraftSave({ binQty: v }); }}>
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
                onChange={e => { setIncidentReport(e.target.value); triggerDraftSave({ incidentReport: e.target.value }); }}
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
