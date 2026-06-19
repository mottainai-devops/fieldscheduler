import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Ban,
  ArrowRightLeft,
  Archive,
  CheckCircle2,
  XCircle,
  Users,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  scheduleId: number;
  title: string;
  workerId: number;
  workerName: string | null;
  supervisorId: number | null;
  date: string;
  originalDate: string;
  instanceType: "virtual" | "cancelled" | "rescheduled" | "override";
  instanceId: number | null;
  routeId: number | null;
  lotCodes: string[];
  status: string;
}

// ─── RRULE presets ────────────────────────────────────────────────────────────

const RRULE_PRESETS = [
  { label: "Every day", value: "FREQ=DAILY" },
  { label: "Every weekday (Mon–Fri)", value: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { label: "Every Monday & Thursday", value: "FREQ=WEEKLY;BYDAY=MO,TH" },
  { label: "Every Monday, Wednesday & Friday", value: "FREQ=WEEKLY;BYDAY=MO,WE,FR" },
  { label: "Every week (Monday)", value: "FREQ=WEEKLY;BYDAY=MO" },
  { label: "Every 2 weeks (Monday)", value: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO" },
  { label: "Every month (1st)", value: "FREQ=MONTHLY;BYMONTHDAY=1" },
  { label: "Custom…", value: "CUSTOM" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid({
  year,
  month,
  events,
  onDayClick,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDayClick: (date: string, dayEvents: CalendarEvent[]) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date().toISOString().slice(0, 10);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="h-20" />;
          const dateStr = toISO(year, month, day);
          const dayEvents = eventsByDate.get(dateStr) ?? [];
          const isToday = dateStr === today;
          return (
            <div
              key={dateStr}
              onClick={() => onDayClick(dateStr, dayEvents)}
              className={`h-20 rounded-lg p-1 cursor-pointer border transition-colors ${
                isToday
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 bg-slate-800 hover:bg-slate-700"
              }`}
            >
              <div className={`text-xs font-semibold mb-1 ${isToday ? "text-blue-400" : "text-slate-300"}`}>
                {day}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev, i) => (
                  <div
                    key={i}
                    className={`text-[10px] truncate rounded px-1 py-0.5 font-medium ${
                      ev.instanceType === "cancelled"
                        ? "bg-red-500/20 text-red-400 line-through"
                        : ev.instanceType === "rescheduled"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-slate-500">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule Form Dialog ─────────────────────────────────────────────────────

interface ScheduleFormData {
  workerId: string;
  supervisorId: string;
  title: string;
  description: string;
  rrulePreset: string;
  rruleCustom: string;
  dtstart: string;
  dtend: string;
  lotCodes: string;
  status: "active" | "paused" | "ended";
}

const DEFAULT_FORM: ScheduleFormData = {
  workerId: "",
  supervisorId: "",
  title: "",
  description: "",
  rrulePreset: "FREQ=WEEKLY;BYDAY=MO,TH",
  rruleCustom: "",
  dtstart: new Date().toISOString().slice(0, 10),
  dtend: "",
  lotCodes: "",
  status: "active",
};

function ScheduleFormDialog({
  open,
  onClose,
  editSchedule,
  workers,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editSchedule: any | null;
  workers: { id: number; name: string; role: string }[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ScheduleFormData>(() => {
    if (editSchedule) {
      const preset = RRULE_PRESETS.find((p) => p.value === editSchedule.rrule);
      return {
        workerId: String(editSchedule.workerId),
        supervisorId: editSchedule.supervisorId ? String(editSchedule.supervisorId) : "",
        title: editSchedule.title,
        description: editSchedule.description ?? "",
        rrulePreset: preset ? preset.value : "CUSTOM",
        rruleCustom: preset ? "" : editSchedule.rrule,
        dtstart: editSchedule.dtstart,
        dtend: editSchedule.dtend ?? "",
        lotCodes: JSON.parse(editSchedule.lotCodes || "[]").join(", "),
        status: editSchedule.status,
      };
    }
    return DEFAULT_FORM;
  });

  const createMutation = trpc.calendar.createSchedule.useMutation();
  const updateMutation = trpc.calendar.updateSchedule.useMutation();

  const fieldManagers = workers.filter((w) => w.role === "field_manager");
  const supervisors = workers.filter((w) => w.role === "supervisor");

  const effectiveRrule =
    form.rrulePreset === "CUSTOM" ? form.rruleCustom : form.rrulePreset;

  const handleSave = async () => {
    if (!form.workerId || !form.title || !effectiveRrule || !form.dtstart) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const payload = {
      workerId: parseInt(form.workerId),
      supervisorId: (form.supervisorId && form.supervisorId !== 'none') ? parseInt(form.supervisorId) : undefined,
      title: form.title,
      description: form.description || undefined,
      rrule: effectiveRrule,
      dtstart: form.dtstart,
      dtend: form.dtend || undefined,
      exdates: [],
      rdates: [],
      lotCodes: form.lotCodes
        ? form.lotCodes.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      status: form.status,
    };
    try {
      if (editSchedule) {
        await updateMutation.mutateAsync({ id: editSchedule.id, ...payload });
        toast.success("Schedule updated.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Schedule created.");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save schedule.");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editSchedule ? "Edit Schedule" : "New Recurring Schedule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <Label className="text-slate-300">Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Zone A Monday Pickup"
              className="bg-slate-900 border-slate-700 text-white mt-1"
            />
          </div>
          {/* Worker */}
          <div>
            <Label className="text-slate-300">Field Manager *</Label>
            <Select value={form.workerId} onValueChange={(v) => setForm((f) => ({ ...f, workerId: v }))}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                <SelectValue placeholder="Select field manager" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {fieldManagers.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)} className="text-white">
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Supervisor */}
          {supervisors.length > 0 && (
            <div>
              <Label className="text-slate-300">Supervisor (optional)</Label>
              <Select value={form.supervisorId} onValueChange={(v) => setForm((f) => ({ ...f, supervisorId: v }))}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-slate-400">None</SelectItem>
                  {supervisors.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)} className="text-white">
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* RRULE preset */}
          <div>
            <Label className="text-slate-300">Recurrence *</Label>
            <Select value={form.rrulePreset} onValueChange={(v) => setForm((f) => ({ ...f, rrulePreset: v }))}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {RRULE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-white">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.rrulePreset === "CUSTOM" && (
              <Input
                value={form.rruleCustom}
                onChange={(e) => setForm((f) => ({ ...f, rruleCustom: e.target.value }))}
                placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR"
                className="bg-slate-900 border-slate-700 text-white mt-2 font-mono text-sm"
              />
            )}
          </div>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300">Start date *</Label>
              <Input
                type="date"
                value={form.dtstart}
                onChange={(e) => setForm((f) => ({ ...f, dtstart: e.target.value }))}
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">End date (optional)</Label>
              <Input
                type="date"
                value={form.dtend}
                onChange={(e) => setForm((f) => ({ ...f, dtend: e.target.value }))}
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
          </div>
          {/* Lot codes */}
          <div>
            <Label className="text-slate-300">Lot codes (comma-separated)</Label>
            <Input
              value={form.lotCodes}
              onChange={(e) => setForm((f) => ({ ...f, lotCodes: e.target.value }))}
              placeholder="e.g. 410, 411, 412"
              className="bg-slate-900 border-slate-700 text-white mt-1"
            />
          </div>
          {/* Description */}
          <div>
            <Label className="text-slate-300">Notes (optional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-white mt-1"
              rows={2}
            />
          </div>
          {/* Status */}
          <div>
            <Label className="text-slate-300">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="active" className="text-white">Active</SelectItem>
                <SelectItem value="paused" className="text-white">Paused</SelectItem>
                <SelectItem value="ended" className="text-white">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
            {editSchedule ? "Save changes" : "Create schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── H4: Customer Override Manager Dialog ───────────────────────────────────
function CustomerOverrideDialog({
  open,
  onClose,
  instanceId,
  scheduleId,
}: {
  open: boolean;
  onClose: () => void;
  instanceId: number;
  scheduleId: number;
}) {
  const utils = trpc.useUtils();
  const [addCustomerId, setAddCustomerId] = useState("");
  const { data: resolvedCustomers = [], isLoading } = trpc.calendarOverrides.getResolvedCustomersForInstance.useQuery(
    { instanceId },
    { enabled: open }
  );
  const { data: allCustomers = [] } = trpc.fieldWorker.getCustomers.useQuery();
  const setOverrideMutation = trpc.calendarOverrides.setInstanceCustomerOverride.useMutation({
    onSuccess: () => { utils.calendarOverrides.getResolvedCustomersForInstance.invalidate(); toast.success("Customer override saved."); },
    onError: (e) => toast.error(e.message),
  });
  const removeOverrideMutation = trpc.calendarOverrides.removeInstanceCustomerOverride.useMutation({
    onSuccess: () => { utils.calendarOverrides.getResolvedCustomersForInstance.invalidate(); toast.success("Override removed."); },
    onError: (e) => toast.error(e.message),
  });

  const handleExclude = (customerId: number) => {
    setOverrideMutation.mutate({ instanceId, customerId, overrideType: "excluded" });
  };
  const handleAdd = () => {
    const id = parseInt(addCustomerId);
    if (!id) return;
    setOverrideMutation.mutate({ instanceId, customerId: id, overrideType: "added" });
    setAddCustomerId("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Manage Customers — Instance #{instanceId}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-slate-400 text-sm py-4 text-center">Loading...</p>
        ) : (
          <div className="space-y-3 py-2 max-h-96 overflow-y-auto">
            {resolvedCustomers.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">No customers in this occurrence.</p>
            )}
            {resolvedCustomers.map((rc: any) => (
              <div key={rc.customerId} className="flex items-center justify-between bg-slate-900 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-white">{rc.customer?.name ?? `Customer #${rc.customerId}`}</p>
                  {rc.customer?.customermaf && <p className="text-xs text-slate-500">{rc.customer.customermaf}</p>}
                  {rc.overrideType === 'added' && (
                    <span className="text-xs text-green-400 flex items-center gap-1"><UserPlus className="w-3 h-3" /> Added for this occurrence</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                  onClick={() => rc.overrideType === 'added'
                    ? removeOverrideMutation.mutate({ instanceId, customerId: rc.customerId })
                    : handleExclude(rc.customerId)
                  }
                >
                  <UserMinus className="w-3 h-3 mr-1" />
                  {rc.overrideType === 'added' ? 'Remove' : 'Exclude'}
                </Button>
              </div>
            ))}
          </div>
        )}
        {/* Add customer to this occurrence */}
        <div className="border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-400 mb-2">Add a customer to this occurrence only:</p>
          <div className="flex gap-2">
            <select
              value={addCustomerId}
              onChange={e => setAddCustomerId(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="">Select customer...</option>
              {(allCustomers as any[]).filter(c => !resolvedCustomers.some((rc: any) => rc.customerId === c.id)).map((c: any) => (
                <option key={c.id} value={String(c.id)}>{c.name} {c.customermaf ? `(${c.customermaf})` : ''}</option>
              ))}
            </select>
            <Button size="sm" onClick={handleAdd} disabled={!addCustomerId} className="bg-purple-600 hover:bg-purple-700">
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Day Detail Dialog ────────────────────────────────────────────────────────
function DayDetailDialog({
  open,
  onClose,
  date,
  events,
  onCancel,
  onReschedule,
  onManageCustomers,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  events: CalendarEvent[];
  onCancel: (scheduleId: number, originalDate: string) => void;
  onReschedule: (scheduleId: number, originalDate: string) => void;
  // H4: callback to open the customer override manager for a specific instance
  onManageCustomers: (instanceId: number, scheduleId: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-400" />
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </DialogTitle>
        </DialogHeader>
        {events.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">No scheduled routes on this day.</p>
        ) : (
          <div className="space-y-3 py-2">
            {events.map((ev, i) => (
              <div key={i} className="bg-slate-900 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{ev.title}</p>
                    <p className="text-xs text-slate-400">{ev.workerName ?? `Worker #${ev.workerId}`}</p>
                  </div>
                  <Badge
                    className={
                      ev.instanceType === "cancelled"
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : ev.instanceType === "rescheduled"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    }
                  >
                    {ev.instanceType === "virtual" ? "Scheduled" : ev.instanceType}
                  </Badge>
                </div>
                {ev.lotCodes.length > 0 && (
                  <p className="text-xs text-slate-500">Lots: {ev.lotCodes.join(", ")}</p>
                )}
                {ev.instanceType !== "cancelled" && (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => { onCancel(ev.scheduleId, ev.originalDate); onClose(); }}
                      >
                        <Ban className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                        onClick={() => { onReschedule(ev.scheduleId, ev.originalDate); onClose(); }}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                        Reschedule
                      </Button>
                    </div>
                    {/* H4: Manage customers for this instance */}
                    {ev.instanceId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                        onClick={() => { onManageCustomers(ev.instanceId!, ev.scheduleId); onClose(); }}
                      >
                        <Users className="w-3.5 h-3.5 mr-1.5" />
                        Manage Customers
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RouteSchedules() {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [view, setView] = useState<"calendar" | "list">("calendar");

  // Dialogs
  const [showForm, setShowForm] = useState(false);
  const [editSchedule, setEditSchedule] = useState<any | null>(null);
  const [dayDialog, setDayDialog] = useState<{ date: string; events: CalendarEvent[] } | null>(null);
  // H4: Customer override manager state
  const [customerOverrideDialog, setCustomerOverrideDialog] = useState<{ instanceId: number; scheduleId: number } | null>(null);
  const [overrideAddCustomerId, setOverrideAddCustomerId] = useState<string>("");
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    scheduleId: number;
    originalDate: string;
  } | null>(null);
  const [rescheduleNewDate, setRescheduleNewDate] = useState("");

  // Data
  const utils = trpc.useUtils();
  const { data: schedules = [], isLoading: schedulesLoading } = trpc.calendar.listSchedules.useQuery();
  const { data: workers = [] } = trpc.fieldWorker.getWorkers.useQuery();

  const calFrom = toISO(calYear, calMonth, 1);
  const calTo = toISO(calYear, calMonth, getDaysInMonth(calYear, calMonth));
  const { data: calEvents = [] } = trpc.calendar.getCalendarEvents.useQuery({ from: calFrom, to: calTo });

  const deleteMutation = trpc.calendar.deleteSchedule.useMutation({
    onSuccess: () => { utils.calendar.listSchedules.invalidate(); utils.calendar.getCalendarEvents.invalidate(); toast.success("Schedule deleted."); },
    onError: (e) => toast.error(e.message),
  });
  const cancelMutation = trpc.calendar.cancelOccurrence.useMutation({
    onSuccess: () => { utils.calendar.getCalendarEvents.invalidate(); toast.success("Occurrence cancelled."); },
    onError: (e) => toast.error(e.message),
  });
  const rescheduleMutation = trpc.calendar.rescheduleOccurrence.useMutation({
    onSuccess: () => { utils.calendar.getCalendarEvents.invalidate(); setRescheduleDialog(null); toast.success("Occurrence rescheduled."); },
    onError: (e) => toast.error(e.message),
  });

  // H6: Archive-and-recreate
  const [archiveDialog, setArchiveDialog] = useState<{ scheduleId: number; currentRrule: string; title: string } | null>(null);
  const [archiveNewRrule, setArchiveNewRrule] = useState("");
  const [archiveRrulePreset, setArchiveRrulePreset] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const archiveAndRecreateMutation = trpc.calendarOverrides.archiveAndRecreate.useMutation({
    onSuccess: () => {
      utils.calendar.listSchedules.invalidate();
      utils.calendar.getCalendarEvents.invalidate();
      setArchiveDialog(null);
      setArchiveNewRrule("");
      setArchiveRrulePreset("");
      setArchiveReason("");
      toast.success("Schedule updated going forward. Old schedule archived.");
    },
    onError: (e) => toast.error(e.message),
  });

  // I1: Handoff requests
  const { data: handoffRequests = [] } = trpc.calendarOverrides.listHandoffRequests.useQuery({ status: "pending" });
  const resolveHandoffMutation = trpc.calendarOverrides.resolveHandoffRequest.useMutation({
    onSuccess: () => {
      utils.calendarOverrides.listHandoffRequests.invalidate();
      toast.success("Handoff request resolved.");
    },
    onError: (e) => toast.error(e.message),
  });

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Route Schedules</h1>
          <p className="text-slate-400 text-sm mt-1">Manage recurring route assignments for field workers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`border-slate-700 ${view === "calendar" ? "bg-slate-700 text-white" : "text-slate-400"}`}
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="w-4 h-4 mr-1.5" /> Calendar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`border-slate-700 ${view === "list" ? "bg-slate-700 text-white" : "text-slate-400"}`}
            onClick={() => setView("list")}
          >
            List
          </Button>
          <Button
            onClick={() => { setEditSchedule(null); setShowForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> New Schedule
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="text-slate-400 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold text-white">
                {MONTH_NAMES[calMonth]} {calYear}
              </h2>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="text-slate-400 hover:text-white">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CalendarGrid
              year={calYear}
              month={calMonth}
              events={calEvents as CalendarEvent[]}
              onDayClick={(date, events) => setDayDialog({ date, events })}
            />
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {view === "list" && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-0">
            {schedulesLoading ? (
              <div className="p-8 text-center text-slate-400">Loading schedules…</div>
            ) : schedules.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No recurring schedules yet. Click "New Schedule" to create one.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Title</TableHead>
                    <TableHead className="text-slate-400">Worker</TableHead>
                    <TableHead className="text-slate-400">Recurrence</TableHead>
                    <TableHead className="text-slate-400">Start</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => {
                    const worker = (workers as any[]).find((w: any) => w.id === s.workerId);
                    const preset = RRULE_PRESETS.find((p) => p.value === s.rrule);
                    return (
                      <TableRow key={s.id} className="border-slate-700 hover:bg-slate-750">
                        <TableCell className="text-white font-medium">{s.title}</TableCell>
                        <TableCell className="text-slate-300">{worker?.name ?? `#${s.workerId}`}</TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          {preset ? preset.label : <span className="font-mono text-xs">{s.rrule}</span>}
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">{s.dtstart}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              s.status === "active"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : s.status === "paused"
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            }
                          >
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:text-white h-8 w-8"
                              title="Edit schedule"
                              onClick={() => { setEditSchedule(s); setShowForm(true); }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {/* H6: Edit going forward */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-orange-400 hover:text-orange-300 h-8 w-8"
                              title="Edit going forward (archive current, create new)"
                              onClick={() => {
                                setArchiveDialog({ scheduleId: s.id, currentRrule: s.rrule, title: s.title });
                                setArchiveNewRrule("");
                                setArchiveRrulePreset("");
                                setArchiveReason("");
                              }}
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-300 h-8 w-8"
                              title="Delete schedule"
                              onClick={() => {
                                if (confirm(`Delete schedule "${s.title}"? This cannot be undone.`)) {
                                  deleteMutation.mutate({ id: s.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule Form Dialog */}
      {showForm && (
        <ScheduleFormDialog
          open={showForm}
          onClose={() => { setShowForm(false); setEditSchedule(null); }}
          editSchedule={editSchedule}
          workers={(workers as any[]).map((w: any) => ({ id: w.id, name: w.name, role: w.role }))}
          onSaved={() => {
            utils.calendar.listSchedules.invalidate();
            utils.calendar.getCalendarEvents.invalidate();
          }}
        />
      )}

      {/* Day Detail Dialog */}
      {dayDialog && (
        <DayDetailDialog
          open={!!dayDialog}
          onClose={() => setDayDialog(null)}
          date={dayDialog.date}
          events={dayDialog.events}
          onCancel={(scheduleId, originalDate) =>
            cancelMutation.mutate({ scheduleId, originalDate })
          }
          onReschedule={(scheduleId, originalDate) => {
            setRescheduleDialog({ scheduleId, originalDate });
            setRescheduleNewDate("");
          }}
          onManageCustomers={(instanceId, scheduleId) =>
            setCustomerOverrideDialog({ instanceId, scheduleId })
          }
        />
      )}

      {/* H4: Customer Override Manager Dialog */}
      {customerOverrideDialog && (
        <CustomerOverrideDialog
          open={!!customerOverrideDialog}
          onClose={() => { setCustomerOverrideDialog(null); setOverrideAddCustomerId(""); }}
          instanceId={customerOverrideDialog.instanceId}
          scheduleId={customerOverrideDialog.scheduleId}
        />
      )}

      {/* Reschedule Dialog */}
      {rescheduleDialog && (
        <Dialog open={!!rescheduleDialog} onOpenChange={(o) => !o && setRescheduleDialog(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle>Reschedule Occurrence</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-slate-400 text-sm">
                Original date: <span className="text-white font-medium">{rescheduleDialog.originalDate}</span>
              </p>
              <div>
                <Label className="text-slate-300">New date *</Label>
                <Input
                  type="date"
                  value={rescheduleNewDate}
                  onChange={(e) => setRescheduleNewDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRescheduleDialog(null)} className="text-slate-400">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!rescheduleNewDate) { toast.error("Please select a new date."); return; }
                  rescheduleMutation.mutate({
                    scheduleId: rescheduleDialog.scheduleId,
                    originalDate: rescheduleDialog.originalDate,
                    newDate: rescheduleNewDate,
                  });
                }}
                disabled={rescheduleMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Confirm Reschedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* H6: Archive-and-recreate dialog */}
      {archiveDialog && (
        <Dialog open={!!archiveDialog} onOpenChange={(o) => !o && setArchiveDialog(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-orange-400" />
                Edit Going Forward
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-sm text-orange-300">
                This will <strong>archive</strong> the current schedule (ending yesterday) and create a new one with the updated recurrence starting today. Existing customer assignments will be copied.
              </div>
              <p className="text-slate-400 text-sm">
                Schedule: <span className="text-white font-medium">{archiveDialog.title}</span>
              </p>
              <p className="text-slate-400 text-sm">
                Current recurrence: <span className="font-mono text-xs text-slate-300">{archiveDialog.currentRrule}</span>
              </p>
              <div>
                <Label className="text-slate-300">New recurrence *</Label>
                <Select
                  value={archiveRrulePreset}
                  onValueChange={(v) => {
                    setArchiveRrulePreset(v);
                    if (v !== "CUSTOM") setArchiveNewRrule(v);
                    else setArchiveNewRrule("");
                  }}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Select recurrence pattern" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {RRULE_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="text-white">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {archiveRrulePreset === "CUSTOM" && (
                  <Input
                    value={archiveNewRrule}
                    onChange={(e) => setArchiveNewRrule(e.target.value)}
                    placeholder="e.g. FREQ=WEEKLY;BYDAY=TU,FR"
                    className="bg-slate-900 border-slate-700 text-white mt-2 font-mono text-sm"
                  />
                )}
              </div>
              <div>
                <Label className="text-slate-300">Reason (optional)</Label>
                <Textarea
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Why is the recurrence changing?"
                  className="bg-slate-900 border-slate-700 text-white mt-1 resize-none"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setArchiveDialog(null)} className="text-slate-400">Cancel</Button>
              <Button
                disabled={!archiveNewRrule || archiveAndRecreateMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => {
                  if (!archiveNewRrule) { toast.error("Please select a new recurrence."); return; }
                  archiveAndRecreateMutation.mutate({
                    scheduleId: archiveDialog.scheduleId,
                    newRrule: archiveNewRrule,
                    reason: archiveReason || undefined,
                  });
                }}
              >
                {archiveAndRecreateMutation.isPending ? "Applying..." : "Apply Going Forward"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* I1: Pending handoff requests panel */}
      {handoffRequests.length > 0 && (
        <Card className="bg-slate-800 border-orange-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-400 flex items-center gap-2 text-base">
              <ArrowRightLeft className="w-4 h-4" />
              Pending Handoff Requests ({handoffRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(handoffRequests as any[]).map((req: any) => (
              <div key={req.id} className="flex items-start justify-between gap-4 p-3 bg-slate-700/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {req.supervisorName ?? `Supervisor #${req.supervisorId}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{req.reason}</p>
                  {req.scheduleId && (
                    <p className="text-xs text-slate-500 mt-0.5">Schedule #{req.scheduleId}</p>
                  )}
                  <p className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-green-400 hover:text-green-300 hover:bg-green-500/10 h-8 px-2"
                    onClick={() => resolveHandoffMutation.mutate({ handoffRequestId: req.id, resolution: "accepted" })}
                    disabled={resolveHandoffMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                    onClick={() => resolveHandoffMutation.mutate({ handoffRequestId: req.id, resolution: "declined" })}
                    disabled={resolveHandoffMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
