/**
 * T15 Item 5: Pending Assignments page.
 * Shows all routes with status='pending_assignment' and allows admins to assign
 * a supervisor to each route, moving it to status='assigned'.
 *
 * T15 close-out: supervisor picker uses the same lot-coverage grouping as
 * CreateRoute (Full Coverage / Partial Coverage / No Lot Access) so admins
 * can immediately identify the best supervisor for each route.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ClockAlert,
  MapPin,
  Users,
  Calendar,
  CheckCircle2,
  ChevronsUpDown,
  Check,
  RefreshCw,
  Route,
} from "lucide-react";

// ─── Lot-coverage helpers (mirrored from CreateRoute.tsx) ─────────────────────

function lotCodesMatch(supLotCode: string, customerMaf: string): boolean {
  const s = String(supLotCode).trim();
  const c = String(customerMaf).trim();
  if (!s || !c) return false;
  if (s === c) return true;
  if (s === c.replace(/^0+/, '')) return true;
  const sn = parseInt(s, 10);
  const cn = parseInt(c, 10);
  if (!isNaN(sn) && !isNaN(cn) && sn === cn) return true;
  return false;
}

type CoverageGroup = 'full_coverage' | 'partial_coverage' | 'no_access';

function checkSupervisorLotAccess(
  supObj: any | null,
  customerMafs: string[]
): { group: CoverageGroup; badge: string } {
  if (!supObj) return { group: 'full_coverage', badge: '' };

  // cherry_picker role: unrestricted
  if (supObj.role === 'cherry_picker') {
    return { group: 'full_coverage', badge: '✓ Any Lot' };
  }

  const supLots: any[] = supObj?.lots ?? supObj?.assignedLots ?? [];

  // No lots assigned → no restriction (soft advisory)
  if (!supLots.length) {
    return { group: 'full_coverage', badge: `✓ ${supLots.length === 0 ? 'Any Lot' : supLots.length + ' lot' + (supLots.length !== 1 ? 's' : '')}` };
  }

  const relevantMafs = customerMafs.filter(Boolean);
  if (!relevantMafs.length) {
    return { group: 'full_coverage', badge: `✓ ${supLots.length} lot${supLots.length !== 1 ? 's' : ''}` };
  }

  const unmatched = relevantMafs.filter(
    (maf) => !supLots.some((l: any) => lotCodesMatch(String(l.lotCode), maf))
  );

  if (unmatched.length === 0) {
    return { group: 'full_coverage', badge: '✓ Full' };
  }

  if (unmatched.length < relevantMafs.length) {
    const listed = unmatched.slice(0, 3).join(', ');
    const extra = unmatched.length > 3 ? ` +${unmatched.length - 3}` : '';
    return { group: 'partial_coverage', badge: `⚠ Missing: ${listed}${extra}` };
  }

  return { group: 'no_access', badge: '✗ No lot access' };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supervisor {
  id: string;
  fullName: string;
  email?: string;
  companyName?: string;
  defaultLotCode?: string;
  role?: string;
  lots?: { lotCode: string }[];
  assignedLots?: { lotCode: string }[];
}

interface PendingRoute {
  id: number;
  workerId: number | null;
  supervisorId: number | null;
  status: string;
  totalDistance: string | null;
  estimatedDuration: string | null;
  scheduledDate: string | null;
  createdAt: Date | string;
  workerName: string | null;
  customerCount: number;
  customerMafs: string[];
  isRecurring: number | null;
  cadence: string | null;
  startingPointLabel: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PendingAssignments() {
  const utils = trpc.useUtils();

  // Fetch pending routes (includes customerMafs for lot-coverage grouping)
  const { data: pendingRoutes = [], isLoading, error, refetch } =
    trpc.fieldWorker.getPendingAssignmentRoutes.useQuery(undefined, {
      refetchInterval: 30_000,
    });

  // Fetch supervisors from Survey App (same source as CreateRoute)
  const { data: supervisorsData } = trpc.fieldWorker.getSurveyAppSupervisors.useQuery();
  const supervisors: Supervisor[] = (supervisorsData as any)?.supervisors ?? [];

  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<PendingRoute | null>(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
  const [supervisorPickerOpen, setSupervisorPickerOpen] = useState(false);
  const [supervisorSearch, setSupervisorSearch] = useState("");

  // Assign mutation
  const assignMutation = trpc.fieldWorker.assignSupervisorToRoute.useMutation({
    onSuccess: () => {
      toast.success(`Route #${selectedRoute?.id} assigned to ${selectedSupervisor?.fullName}`);
      utils.fieldWorker.getPendingAssignmentRoutes.invalidate();
      setAssignDialogOpen(false);
      setSelectedRoute(null);
      setSelectedSupervisor(null);
    },
    onError: (err) => {
      toast.error(`Failed to assign: ${err.message}`);
    },
  });

  const openAssignDialog = (route: PendingRoute) => {
    setSelectedRoute(route);
    setSelectedSupervisor(null);
    setSupervisorSearch("");
    setAssignDialogOpen(true);
  };

  const handleAssign = () => {
    if (!selectedRoute || !selectedSupervisor) {
      toast.error("Select a supervisor before assigning.");
      return;
    }
    assignMutation.mutate({
      routeId: selectedRoute.id,
      surveyAppSupervisorId: String(selectedSupervisor.id),
      surveyAppSupervisorName: selectedSupervisor.fullName,
      surveyAppSupervisorEmail: selectedSupervisor.email,
    });
  };

  const formatDate = (d: string | Date | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ── Grouped picker helpers ──────────────────────────────────────────────────
  const routeMafs: string[] = selectedRoute?.customerMafs ?? [];

  const filteredSupervisors = supervisors.filter((sup) => {
    if (!supervisorSearch) return true;
    const q = supervisorSearch.toLowerCase();
    return (
      (sup.fullName || "").toLowerCase().includes(q) ||
      (sup.email || "").toLowerCase().includes(q) ||
      (sup.companyName || "").toLowerCase().includes(q) ||
      (sup.defaultLotCode || "").toLowerCase().includes(q) ||
      (sup.lots || []).some((l) => String(l.lotCode).toLowerCase().includes(q))
    );
  });

  const fullCoverage: Supervisor[] = [];
  const partialCoverage: Supervisor[] = [];
  const noAccess: Supervisor[] = [];

  filteredSupervisors.forEach((sup) => {
    const { group } = checkSupervisorLotAccess(sup, routeMafs);
    if (group === 'full_coverage') fullCoverage.push(sup);
    else if (group === 'partial_coverage') partialCoverage.push(sup);
    else noAccess.push(sup);
  });

  const renderSupervisorItem = (sup: Supervisor, coverageBadge?: React.ReactNode) => (
    <CommandItem
      key={String(sup.id)}
      value={`${sup.fullName} ${sup.email ?? ""} ${sup.companyName ?? ""}`}
      onSelect={() => {
        setSelectedSupervisor(sup);
        setSupervisorPickerOpen(false);
        setSupervisorSearch("");
      }}
      className="text-white cursor-pointer"
    >
      <Check
        className={`mr-2 h-4 w-4 ${
          selectedSupervisor && String(selectedSupervisor.id) === String(sup.id)
            ? "opacity-100"
            : "opacity-0"
        }`}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{sup.fullName}</span>
          {coverageBadge}
        </div>
        <span className="text-xs text-slate-400 truncate">
          {sup.email}
          {sup.companyName ? ` · ${sup.companyName}` : ""}
          {sup.role === "cherry_picker"
            ? " · cherry picker"
            : sup.lots?.length
            ? ` · ${sup.lots.length} lot${sup.lots.length !== 1 ? "s" : ""}`
            : ""}
        </span>
      </div>
    </CommandItem>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClockAlert className="h-7 w-7 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Pending Assignments</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Routes awaiting supervisor assignment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-amber-500 text-amber-400 px-3 py-1 text-sm">
            {isLoading ? "…" : pendingRoutes.length} pending
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading pending routes…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-48 text-red-400">
          Failed to load pending routes. Please refresh.
        </div>
      ) : pendingRoutes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
          <CheckCircle2 className="h-12 w-12 text-green-500 opacity-60" />
          <p className="text-lg font-medium">All routes are assigned</p>
          <p className="text-sm">No routes are currently awaiting supervisor assignment.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {(pendingRoutes as PendingRoute[]).map((route) => (
            <div
              key={route.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-5 flex flex-col md:flex-row md:items-center gap-4"
            >
              {/* Route info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-blue-400 shrink-0" />
                  <span className="text-white font-semibold">Route #{route.id}</span>
                  {route.isRecurring ? (
                    <Badge variant="outline" className="border-purple-500 text-purple-400 text-xs">
                      Recurring · {route.cadence}
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="border-amber-500 text-amber-400 text-xs">
                    Pending Assignment
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-300">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    Field Manager: <span className="text-white ml-1">{route.workerName ?? "—"}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Scheduled: <span className="text-white ml-1">{formatDate(route.scheduledDate)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {route.customerCount} customer{route.customerCount !== 1 ? "s" : ""}
                  </span>
                  {route.totalDistance ? (
                    <span className="text-slate-400">
                      {parseFloat(route.totalDistance).toFixed(1)} km
                    </span>
                  ) : null}
                  {route.startingPointLabel ? (
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {route.startingPointLabel}
                    </span>
                  ) : null}
                </div>

                <div className="text-xs text-slate-500">
                  Created {formatDate(route.createdAt)}
                </div>
              </div>

              {/* Assign button */}
              <Button
                onClick={() => openAssignDialog(route)}
                className="bg-amber-600 hover:bg-amber-500 text-white shrink-0"
              >
                Assign Supervisor
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Assign Supervisor Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ClockAlert className="h-5 w-5 text-amber-400" />
              Assign Supervisor — Route #{selectedRoute?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedRoute && (
            <div className="space-y-4">
              {/* Route summary */}
              <div className="bg-slate-700 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Field Manager</span>
                  <span className="text-white">{selectedRoute.workerName ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Scheduled Date</span>
                  <span className="text-white">{formatDate(selectedRoute.scheduledDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customers</span>
                  <span className="text-white">{selectedRoute.customerCount}</span>
                </div>
              </div>

              {/* Supervisor picker — grouped by lot coverage */}
              <div className="space-y-1.5">
                <label className="text-sm text-slate-300 font-medium">Select Supervisor</label>
                <Popover open={supervisorPickerOpen} onOpenChange={setSupervisorPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={supervisorPickerOpen}
                      className="w-full justify-between bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:text-white"
                    >
                      {selectedSupervisor
                        ? `${selectedSupervisor.fullName}${selectedSupervisor.companyName ? ` (${selectedSupervisor.companyName})` : ""}`
                        : "Choose a supervisor…"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 bg-slate-800 border-slate-600">
                    <Command className="bg-slate-800">
                      <CommandInput
                        placeholder="Search by name, email, or company…"
                        value={supervisorSearch}
                        onValueChange={setSupervisorSearch}
                        className="text-white placeholder:text-slate-400"
                      />
                      <CommandList>
                        <CommandEmpty className="text-slate-400 py-3 text-center text-sm">
                          {supervisors.length === 0
                            ? "Loading supervisors…"
                            : "No supervisor found."}
                        </CommandEmpty>

                        {/* Full Coverage group */}
                        {fullCoverage.length > 0 && (
                          <CommandGroup
                            heading={
                              routeMafs.length > 0
                                ? `Full Coverage (${fullCoverage.length})`
                                : `Available (${fullCoverage.length})`
                            }
                          >
                            {fullCoverage.map((sup) => {
                              const { badge } = checkSupervisorLotAccess(sup, routeMafs);
                              return renderSupervisorItem(
                                sup,
                                routeMafs.length > 0
                                  ? <span className="text-xs text-green-400 shrink-0">{badge}</span>
                                  : undefined
                              );
                            })}
                          </CommandGroup>
                        )}

                        {/* Partial Coverage group */}
                        {partialCoverage.length > 0 && (
                          <CommandGroup heading={`Partial Coverage (${partialCoverage.length})`}>
                            {partialCoverage.map((sup) => {
                              const { badge } = checkSupervisorLotAccess(sup, routeMafs);
                              return renderSupervisorItem(
                                sup,
                                <span className="text-xs text-red-400 shrink-0">{badge}</span>
                              );
                            })}
                          </CommandGroup>
                        )}

                        {/* No Lot Access group */}
                        {noAccess.length > 0 && (
                          <CommandGroup heading={`No Lot Access (${noAccess.length})`}>
                            {noAccess.map((sup) =>
                              renderSupervisorItem(
                                sup,
                                <span className="text-xs text-red-400 shrink-0">✗ No lot access</span>
                              )
                            )}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedSupervisor || assignMutation.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {assignMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Assigning…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Assign Supervisor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
