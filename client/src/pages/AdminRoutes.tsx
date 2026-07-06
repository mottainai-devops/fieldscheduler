/**
 * T40 — Admin Route Management
 *
 * Provides admins with the ability to:
 *   - Browse all routes with status filter
 *   - Edit route metadata (date, worker, notes) for editable-status routes
 *   - Add/remove customers from editable routes
 *   - Reorder customers via drag-and-drop (up/down buttons)
 *   - Delete editable/cancelled routes (with confirmation dialog)
 *
 * Status gates (enforced server-side; also reflected in UI):
 *   Editable: pending, pending_assignment, optimized, assigned, cancelled
 *   Locked (read-only): in_progress, completed
 *
 * T40 Rule #83: Admin route editing UI must surface the status gate reason
 * when a mutation is blocked, not just show a generic error toast.
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Route,
  Calendar,
  User,
  Trash2,
  Edit,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  RefreshCw,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { EDITABLE_ROUTE_STATUSES } from "../../../shared/constants/routes";

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteStatus =
  | "pending"
  | "pending_assignment"
  | "optimized"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

const STATUS_COLORS: Record<RouteStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  pending_assignment: "bg-orange-100 text-orange-800 border-orange-200",
  optimized: "bg-blue-100 text-blue-800 border-blue-200",
  assigned: "bg-green-100 text-green-800 border-green-200",
  in_progress: "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

function isEditable(status: string): boolean {
  return (EDITABLE_ROUTE_STATUSES as readonly string[]).includes(status);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminRoutes() {
  const utils = trpc.useUtils();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: routes = [], isLoading: routesLoading, refetch: refetchRoutes } =
    trpc.fieldWorker.getRoutes.useQuery();
  const { data: workers = [] } = trpc.fieldWorker.getWorkers.useQuery();
  const { data: allCustomers = [] } = trpc.fieldWorker.getAllCustomers.useQuery();

  // ── Local state ───────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<number | null>(null);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  // Edit form state
  const [editForm, setEditForm] = useState<{
    scheduledDate: string;
    workerId: string;
    routingReasonNote: string;
    status: string;
  }>({ scheduledDate: "", workerId: "", routingReasonNote: "", status: "" });

  // ── Selected route data ───────────────────────────────────────────────────
  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const { data: routeCustomers = [], refetch: refetchCustomers } =
    trpc.fieldWorker.getRouteCustomers.useQuery(
      { routeId: selectedRouteId! },
      { enabled: selectedRouteId !== null }
    );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateRouteMutation = trpc.fieldWorker.updateRoute.useMutation({
    onSuccess: () => {
      toast.success("Route updated");
      utils.fieldWorker.getRoutes.invalidate();
      refetchCustomers();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteRouteMutation = trpc.fieldWorker.deleteRoute.useMutation({
    onSuccess: () => {
      toast.success("Route deleted");
      setDeleteDialogOpen(false);
      setEditSheetOpen(false);
      setSelectedRouteId(null);
      utils.fieldWorker.getRoutes.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const addCustomerMutation = trpc.fieldWorker.addCustomerToRoute.useMutation({
    onSuccess: () => {
      toast.success("Customer added to route");
      setAddCustomerDialogOpen(false);
      setCustomerSearchQuery("");
      refetchCustomers();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeCustomerMutation = trpc.fieldWorker.removeCustomerFromRoute.useMutation({
    onSuccess: () => {
      toast.success("Customer removed from route");
      refetchCustomers();
    },
    onError: (err) => toast.error(err.message),
  });

  const reorderMutation = trpc.fieldWorker.reorderRouteCustomers.useMutation({
    onSuccess: () => {
      refetchCustomers();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Filtered routes ───────────────────────────────────────────────────────
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        String(r.id).includes(searchQuery) ||
        (r.workerName ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.scheduledDate ?? "").includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [routes, statusFilter, searchQuery]);

  // ── Customers not yet on route ────────────────────────────────────────────
  const routeCustomerIds = useMemo(
    () => new Set(routeCustomers.map((rc) => rc.customerId)),
    [routeCustomers]
  );

  const availableCustomers = useMemo(() => {
    return allCustomers.filter(
      (c) =>
        !routeCustomerIds.has(c.id) &&
        (!customerSearchQuery ||
          c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
          (c.address ?? "").toLowerCase().includes(customerSearchQuery.toLowerCase()))
    );
  }, [allCustomers, routeCustomerIds, customerSearchQuery]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openEditSheet(routeId: number) {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;
    setSelectedRouteId(routeId);
    setEditForm({
      scheduledDate: route.scheduledDate ?? "",
      workerId: route.workerId ? String(route.workerId) : "",
      routingReasonNote: (route as any).routingReasonNote ?? "",
      status: route.status,
    });
    setEditSheetOpen(true);
  }

  function handleSaveEdit() {
    if (!selectedRouteId) return;
    updateRouteMutation.mutate({
      id: selectedRouteId,
      scheduledDate: editForm.scheduledDate || undefined,
      workerId: editForm.workerId ? Number(editForm.workerId) : undefined,
      routingReasonNote: editForm.routingReasonNote || undefined,
      status: editForm.status as any,
    });
  }

  function handleMoveCustomer(customerId: number, direction: "up" | "down") {
    if (!selectedRouteId) return;
    const ordered = [...routeCustomers].sort(
      (a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0)
    );
    const idx = ordered.findIndex((rc) => rc.customerId === customerId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ordered.length) return;
    const newOrder = ordered.map((rc) => rc.customerId!);
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    reorderMutation.mutate({ routeId: selectedRouteId, orderedCustomerIds: newOrder });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Route className="w-6 h-6" />
            Route Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Edit, reorder, and delete routes. Routes in{" "}
            <span className="font-medium">in_progress</span> or{" "}
            <span className="font-medium">completed</span> status are read-only.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchRoutes()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by ID, worker, or date…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="pending_assignment">Pending Assignment</SelectItem>
            <SelectItem value="optimized">Optimized</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center">
          {filteredRoutes.length} route{filteredRoutes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Routes table */}
      {routesLoading ? (
        <div className="text-muted-foreground text-sm">Loading routes…</div>
      ) : filteredRoutes.length === 0 ? (
        <div className="text-muted-foreground text-sm">No routes match the current filter.</div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutes.map((route) => {
                const editable = isEditable(route.status);
                return (
                  <TableRow key={route.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">#{route.id}</TableCell>
                    <TableCell>{route.scheduledDate ?? "—"}</TableCell>
                    <TableCell>{route.workerName ?? "Unassigned"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[route.status as RouteStatus] ?? ""}
                      >
                        {editable ? null : <Lock className="w-3 h-3 mr-1 inline" />}
                        {route.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{(route as any).customerCount ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditSheet(route.id)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {editable ? "Edit" : "View"}
                      </Button>
                      {editable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setRouteToDelete(route.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Edit / View sheet ─────────────────────────────────────────────── */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedRoute && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Route className="w-5 h-5" />
                  Route #{selectedRoute.id}
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[selectedRoute.status as RouteStatus] ?? ""}
                  >
                    {!isEditable(selectedRoute.status) && (
                      <Lock className="w-3 h-3 mr-1 inline" />
                    )}
                    {selectedRoute.status}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {isEditable(selectedRoute.status)
                    ? "Edit route details, manage customers, and reorder stops."
                    : "This route is read-only while in progress or completed."}
                </SheetDescription>
              </SheetHeader>

              {/* Read-only locked banner */}
              {!isEditable(selectedRoute.status) && (
                <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Routes in <strong className="mx-1">{selectedRoute.status}</strong> status
                  cannot be modified.
                </div>
              )}

              {/* Route metadata form */}
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Route Details
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="scheduledDate">Scheduled Date</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={editForm.scheduledDate}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, scheduledDate: e.target.value }))
                      }
                      disabled={!isEditable(selectedRoute.status)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="worker">Assigned Worker</Label>
                    <Select
                      value={editForm.workerId}
                      onValueChange={(v) =>
                        setEditForm((f) => ({ ...f, workerId: v }))
                      }
                      disabled={!isEditable(selectedRoute.status)}
                    >
                      <SelectTrigger id="worker">
                        <SelectValue placeholder="Select worker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {workers.map((w) => (
                          <SelectItem key={w.id} value={String(w.id)}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="routingReasonNote">Routing Note (optional)</Label>
                  <Textarea
                    id="routingReasonNote"
                    placeholder="Add a note about why this route was modified…"
                    value={editForm.routingReasonNote}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, routingReasonNote: e.target.value }))
                    }
                    disabled={!isEditable(selectedRoute.status)}
                    maxLength={500}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {editForm.routingReasonNote.length}/500
                  </p>
                </div>

                {isEditable(selectedRoute.status) && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveEdit}
                      disabled={updateRouteMutation.isPending}
                    >
                      {updateRouteMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setRouteToDelete(selectedRoute.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Route
                    </Button>
                  </div>
                )}
              </div>

              {/* Customer list */}
              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Customers ({routeCustomers.length})
                  </h3>
                  {isEditable(selectedRoute.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddCustomerDialogOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Customer
                    </Button>
                  )}
                </div>

                {routeCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No customers on this route.</p>
                ) : (
                  <div className="space-y-2">
                    {[...routeCustomers]
                      .sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0))
                      .map((rc, idx, arr) => (
                        <div
                          key={rc.id}
                          className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
                        >
                          <span className="w-6 text-center text-sm font-mono text-muted-foreground">
                            {rc.sequenceNumber}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {rc.customer?.name ?? `Customer #${rc.customerId}`}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {rc.customer?.address ?? "No address"}
                            </p>
                          </div>
                          {isEditable(selectedRoute.status) && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={idx === 0 || reorderMutation.isPending}
                                onClick={() => handleMoveCustomer(rc.customerId!, "up")}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={idx === arr.length - 1 || reorderMutation.isPending}
                                onClick={() => handleMoveCustomer(rc.customerId!, "down")}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                disabled={removeCustomerMutation.isPending}
                                onClick={() =>
                                  removeCustomerMutation.mutate({
                                    routeId: selectedRoute.id,
                                    customerId: rc.customerId!,
                                  })
                                }
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Route #{routeToDelete}
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the route and all its customer assignments.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteRouteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteRouteMutation.isPending}
              onClick={() => {
                if (routeToDelete !== null) {
                  deleteRouteMutation.mutate({ id: routeToDelete });
                }
              }}
            >
              {deleteRouteMutation.isPending ? "Deleting…" : "Delete Route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add customer dialog ───────────────────────────────────────────── */}
      <Dialog open={addCustomerDialogOpen} onOpenChange={setAddCustomerDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Customer to Route #{selectedRouteId}</DialogTitle>
            <DialogDescription>
              Search for a customer not already on this route.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search by name or address…"
            value={customerSearchQuery}
            onChange={(e) => setCustomerSearchQuery(e.target.value)}
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
            {availableCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No matching customers found.
              </p>
            ) : (
              availableCustomers.slice(0, 50).map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left rounded-md px-3 py-2 hover:bg-muted text-sm"
                  disabled={addCustomerMutation.isPending}
                  onClick={() => {
                    if (selectedRouteId !== null) {
                      addCustomerMutation.mutate({
                        routeId: selectedRouteId,
                        customerId: c.id,
                      });
                    }
                  }}
                >
                  <span className="font-medium">{c.name}</span>
                  {c.address && (
                    <span className="text-muted-foreground ml-2">{c.address}</span>
                  )}
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCustomerDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
