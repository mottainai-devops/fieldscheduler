/**
 * T26 — Field Manager Dashboard
 *
 * Personal dashboard for authenticated field managers. All data is scoped to
 * ctx.user.fieldManagerId on the server — no worker ID is passed from the client
 * (Pattern #51 / Rule #59).
 *
 * Five panels:
 *   1. Metrics strip: customer count, pending routes, unrouted customers, completion rate
 *   2. Revenue card: invoiced total for selected date range
 *   3. Outstanding balances table: per-invoice, sorted by balance DESC
 *   4. Recent routes table: last 10 routes with supervisor and stop count
 *   5. Per-MAF Breakdown table: MAF | Customers | Revenue | Outstanding | Invoices | Completion
 *      (T31 — full-width row below panels 3 & 4; driven by same date range as Revenue)
 *
 * Route guard: RequireFieldManager (superadmin + admin + field_manager).
 * Superadmin/admin callers with fieldManagerId=null see a friendly "no worker
 * account linked" message (server returns FORBIDDEN, caught below).
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Route,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Calendar,
  DollarSign,
  ClipboardList,
  MapPin,
  Loader2,
  LogOut,
  User,
  BarChart3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NULL_MAF_DISPLAY_LABEL } from '@shared/constants/maf';
import { formatCurrencyRounded as formatCurrency } from '@/utils/currency';
import { defaultDateRange } from '@/utils/dateRange';
// Helpers
// ────────────────────────────────────────────────────────────────────────────────
// T32 (Rule #66): formatCurrency = formatCurrencyRounded from @/utils/currency (0 decimal places)

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "overdue": return "destructive";
    case "sent": return "default";
    case "draft": return "secondary";
    default: return "outline";
  }
}

function routeStatusBadge(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed": return "default";
    case "in_progress": return "secondary";
    case "assigned": return "secondary";
    case "pending_assignment": return "outline";
    case "cancelled": return "destructive";
    default: return "outline";
  }
}

/** Explicit colour overrides so badges are readable on the dark slate-800 background. */
function routeStatusClass(status: string): string {
  switch (status) {
    case "completed": return "bg-emerald-600/20 text-emerald-300 border-emerald-500/40";
    case "in_progress": return "bg-blue-600/20 text-blue-300 border-blue-500/40";
    case "assigned": return "bg-blue-600/20 text-blue-300 border-blue-500/40";
    case "pending_assignment": return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "cancelled": return "bg-red-600/20 text-red-300 border-red-500/40";
    default: return "bg-slate-600/20 text-slate-300 border-slate-500/40";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accentColor = "text-blue-400",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
}) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${accentColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function FieldManagerDashboard() {
  const [, setLocation] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => setLocation("/admin/login"),
  });

  const handleSignOut = () => logoutMutation.mutate();

  // T27 Item 1 — Option C: admin/superadmin graceful redirect
  // RequireFieldManager lets admins through; but /field-manager/dashboard is
  // scoped to fieldManagerId which is null for admins → server returns FORBIDDEN.
  // Instead of showing FORBIDDEN, redirect admins to /dashboard immediately.
  const { data: meUser } = trpc.auth.me.useQuery();
  const isAdminOrAbove = meUser?.role === "admin" || meUser?.role === "superadmin";
  // Redirect is handled in the render path below — see early return after hooks

  // Date range state for revenue panel AND MAF breakdown — rolling 30-day default (Rule #99)
  const { start: _defaultStart, end: _defaultEnd } = defaultDateRange();
  const [startDate, setStartDate] = useState(_defaultStart);
  const [endDate, setEndDate] = useState(_defaultEnd);
  // revenueRange drives both getMyRevenue and getMyMAFBreakdown (Decision i — T31)
  const [revenueRange, setRevenueRange] = useState({ startDate: _defaultStart, endDate: _defaultEnd });

  // ── tRPC queries ──────────────────────────────────────────────────────────
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = trpc.fieldManager.getMyMetrics.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const {
    data: revenue,
    isLoading: revenueLoading,
    refetch: refetchRevenue,
  } = trpc.fieldManager.getMyRevenue.useQuery(revenueRange, {
    refetchOnWindowFocus: false,
  });

  const {
    data: outstanding,
    isLoading: outstandingLoading,
    refetch: refetchOutstanding,
  } = trpc.fieldManager.getMyOutstandingBalances.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const {
    data: recentRoutes,
    isLoading: routesLoading,
    refetch: refetchRoutes,
  } = trpc.fieldManager.getMyRecentRoutes.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // T31 — Per-MAF Breakdown: same date range as Revenue (Decision i)
  const {
    data: mafBreakdown,
    isLoading: mafLoading,
    refetch: refetchMaf,
  } = trpc.fieldManager.getMyMAFBreakdown.useQuery(revenueRange, {
    refetchOnWindowFocus: false,
  });

  // ── Option C: admin/superadmin redirect (after all hooks) ─────────────────
  if (isAdminOrAbove) {
    setLocation("/dashboard");
    return null;
  }

  // ── Error: no fieldManagerId linked ──────────────────────────────────────
  if (metricsError?.data?.code === "FORBIDDEN") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Worker Account Linked</h2>
            <p className="text-slate-400 text-sm">
              Your admin account is not linked to a field manager worker record.
              Contact a superadmin to assign your worker account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Completion rate display ───────────────────────────────────────────────
  const completionPct = metrics?.completionRate.percentage;
  const completionDisplay =
    completionPct === null || completionPct === undefined
      ? "No routes yet"
      : `${completionPct}%`;
  const completionSub =
    completionPct !== null && completionPct !== undefined
      ? `${metrics?.completionRate.picked ?? 0} / ${metrics?.completionRate.total ?? 0} stops (last 30 days)`
      : undefined;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Page header */}
      <div className="border-b border-slate-700 bg-slate-800/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Your personal field manager overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2"
              onClick={() => {
                refetchMetrics();
                refetchRevenue();
                refetchOutstanding();
                refetchRoutes();
                refetchMaf();
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
                <DropdownMenuLabel className="text-white text-sm">
                  Field Manager
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-400 hover:text-red-300 hover:bg-slate-700 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Panel 1: Metrics strip ──────────────────────────────────────── */}
        {metricsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700">
                <CardContent className="pt-5 pb-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-700 rounded w-2/3" />
                    <div className="h-8 bg-slate-700 rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={Users}
              label="My Customers"
              value={(metrics?.customerCount ?? 0).toLocaleString()}
              accentColor="text-blue-400"
            />
            <MetricCard
              icon={Route}
              label="Pending Routes"
              value={metrics?.pendingRouteCount ?? 0}
              sub="Awaiting assignment"
              accentColor="text-amber-400"
            />
            <MetricCard
              icon={AlertCircle}
              label="Unrouted Customers"
              value={(metrics?.unroutedCustomerCount ?? 0).toLocaleString()}
              sub="Unassigned + untreated"
              accentColor="text-red-400"
            />
            <MetricCard
              icon={CheckCircle2}
              label="Completion Rate"
              value={completionDisplay}
              sub={completionSub}
              accentColor="text-green-400"
            />
          </div>
        )}

        {/* ── Panel 2: Revenue ─────────────────────────────────────────────── */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Revenue
              </CardTitle>
              {/* Date range picker — drives Revenue AND Per-MAF Breakdown (T31 Decision i) */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-xs">From</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white text-xs h-8 w-36"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-xs">To</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white text-xs h-8 w-36"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                  onClick={() => setRevenueRange({ startDate, endDate })}
                >
                  Apply
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <div className="animate-pulse h-12 bg-slate-700 rounded w-48" />
            ) : (
              <div className="flex items-end gap-6 flex-wrap">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Invoiced Total</p>
                  <p className="text-3xl font-bold text-green-400 mt-1">
                    {formatCurrency(revenue?.total ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Invoices</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {revenue?.invoiceCount ?? 0}
                  </p>
                </div>
                <div className="text-xs text-slate-500 self-end pb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  {revenue?.dateRange.startDate} → {revenue?.dateRange.endDate}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Panels 3 & 4: Side by side on large screens ─────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Panel 3: Outstanding balances */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                Outstanding Balances
                {outstanding && outstanding.summary.totalCount > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {outstanding.summary.totalCount} invoice{outstanding.summary.totalCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
              {outstanding && outstanding.summary.totalOutstanding > 0 && (
                <p className="text-sm text-amber-400 font-semibold">
                  Total: {formatCurrency(outstanding.summary.totalOutstanding)}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {outstandingLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-10 bg-slate-700 rounded" />
                  ))}
                </div>
              ) : !outstanding || outstanding.items.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No outstanding balances</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-slate-700">
                        <th className="text-left pb-2">Invoice</th>
                        <th className="text-left pb-2">Customer</th>
                        <th className="text-right pb-2">Balance</th>
                        <th className="text-left pb-2 pl-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {outstanding.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-2.5 text-slate-300 font-mono text-xs">
                            {item.invoiceNumber || `#${item.id}`}
                          </td>
                          <td className="py-2.5 text-slate-300 max-w-[140px] truncate">
                            {item.customerName ?? item.maf ?? "—"}
                          </td>
                          <td className="py-2.5 text-right text-amber-400 font-semibold whitespace-nowrap">
                            {formatCurrency(item.balance)}
                          </td>
                          <td className="py-2.5 pl-3">
                            <Badge variant={statusBadgeVariant(item.status)} className="text-xs capitalize">
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panel 4: Recent routes */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-400" />
                Recent Routes
                <span className="text-xs text-slate-500 font-normal ml-1">(last 10)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {routesLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse h-10 bg-slate-700 rounded" />
                  ))}
                </div>
              ) : !recentRoutes || recentRoutes.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No routes created yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-slate-700">
                        <th className="text-left pb-2">Date</th>
                        <th className="text-right pb-2">Stops</th>
                        <th className="text-left pb-2 pl-3">Supervisor</th>
                        <th className="text-left pb-2 pl-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {recentRoutes.map((route) => (
                        <tr key={route.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-2.5 text-slate-300 whitespace-nowrap">
                            {formatDate(route.scheduledDate)}
                          </td>
                          <td className="py-2.5 text-right text-slate-300 font-semibold">
                            {route.customerCount}
                          </td>
                          <td className="py-2.5 pl-3 text-slate-400 max-w-[120px] truncate">
                            {route.supervisorName ?? <span className="text-slate-600 italic">Unassigned</span>}
                          </td>
                          <td className="py-2.5 pl-3">
                            <Badge
                              variant={routeStatusBadge(route.status)}
                              className={`text-xs capitalize ${routeStatusClass(route.status)}`}
                            >
                              {route.status.replace(/_/g, " ")}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* ── Panel 5: Per-MAF Breakdown (T31) ─────────────────────────────── */}
        {/* Full-width row below Outstanding Balances / Recent Routes.           */}
        {/* Driven by the same From/To date range as Revenue (Decision i).      */}
        {/* NULL maf rows shown as "(No MAF set)" (Decision 3). Column renamed customermaf→maf in T38. */}
        {/* Sort: outstanding DESC (Decision 2). Completion: "—" if null (Decision 1). */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Per-MAF Breakdown
              </CardTitle>
              <p className="text-xs text-slate-500">
                <Calendar className="w-3 h-3 inline mr-1" />
                {revenueRange.startDate} → {revenueRange.endDate}
              </p>
            </div>
            {/* Summary row */}
            {!mafLoading && mafBreakdown && mafBreakdown.summary.totalCustomers > 0 && (
              <div className="flex gap-6 mt-1 flex-wrap">
                <span className="text-xs text-slate-400">
                  <span className="text-white font-semibold">{mafBreakdown.summary.totalCustomers.toLocaleString()}</span> customers
                </span>
                <span className="text-xs text-slate-400">
                  <span className="text-green-400 font-semibold">{formatCurrency(mafBreakdown.summary.totalRevenue)}</span> revenue
                </span>
                <span className="text-xs text-slate-400">
                  <span className="text-amber-400 font-semibold">{formatCurrency(mafBreakdown.summary.totalOutstanding)}</span> outstanding
                </span>
                <span className="text-xs text-slate-400">
                  <span className="text-white font-semibold">{mafBreakdown.summary.totalInvoices}</span> invoices
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {mafLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse h-10 bg-slate-700 rounded" />
                ))}
              </div>
            ) : !mafBreakdown || mafBreakdown.items.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No MAF data yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-slate-700">
                      <th className="text-left pb-2">MAF</th>
                      <th className="text-right pb-2">Customers</th>
                      <th className="text-right pb-2">Revenue</th>
                      <th className="text-right pb-2">Outstanding</th>
                      <th className="text-right pb-2">Invoices</th>
                      <th className="text-right pb-2">Completion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {mafBreakdown.items.map((row, idx) => (
                      <tr key={row.maf ?? `__null_${idx}`} className="hover:bg-slate-700/30 transition-colors">
                        <td className="py-2.5 font-mono text-xs text-purple-300 font-semibold">
                          {row.maf ?? <span className="text-slate-500 italic font-sans font-normal">{NULL_MAF_DISPLAY_LABEL}</span>}
                        </td>
                        <td className="py-2.5 text-right text-slate-300">
                          {row.customerCount.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right text-green-400 whitespace-nowrap">
                          {row.revenue > 0 ? formatCurrency(row.revenue) : <span className="text-slate-600">₦0</span>}
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          {row.outstanding > 0
                            ? <span className="text-amber-400 font-semibold">{formatCurrency(row.outstanding)}</span>
                            : <span className="text-slate-600">₦0</span>
                          }
                        </td>
                        <td className="py-2.5 text-right text-slate-300">
                          {row.invoiceCount > 0 ? row.invoiceCount : <span className="text-slate-600">0</span>}
                        </td>
                        <td className="py-2.5 text-right">
                          {row.completionRate === null
                            ? <span className="text-slate-600">—</span>
                            : <span className={row.completionRate >= 80 ? "text-green-400" : row.completionRate >= 50 ? "text-amber-400" : "text-red-400"}>
                                {row.completionRate}%
                              </span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
