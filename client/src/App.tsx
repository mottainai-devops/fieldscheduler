import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import MainLayout from "./components/MainLayout";
import LayoutRoute from "./components/LayoutRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import AddCustomer from "./pages/AddCustomer";
import CustomerDetail from "./pages/CustomerDetail";
import Routes from "./pages/Routes";
import Workers from "./pages/Workers";
import CreateRoute from "./pages/CreateRoute";
// [DEPRECATED T10] import AreaRouteCreation from "./pages/AreaRouteCreation";
import ClusterManagement from "./pages/ClusterManagement";
import WorkerTracking from "./pages/WorkerTracking";
import Analytics from "./pages/Analytics";
import ZohoIntegration from "./pages/ZohoIntegration";
import ZohoCallback from "./pages/ZohoCallback";
import ZohoTokenGenerator from "./pages/ZohoTokenGenerator";
import ZohoAuthorization from "./pages/ZohoAuthorization";
import SyncHistoryDashboard from "./pages/SyncHistoryDashboard";
import BuildingGroups from "./pages/BuildingGroups";
import Compliance from "./pages/Compliance";
import WorkerMobile from "./pages/WorkerMobile";
import WorkerMobileRouteDetail from "./pages/WorkerMobileRouteDetail";
import WorkerMobileReportViolation from "./pages/WorkerMobileReportViolation";
import WorkerMobileCustomerDetail from "./pages/WorkerMobileCustomerDetail";
import WorkerMobileNotifications from "./pages/WorkerMobileNotifications";
import PendingPickups from "./pages/PendingPickups";
import RouteSchedules from "./pages/RouteSchedules";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import FieldManagerTagging from "./pages/FieldManagerTagging";
import DynamicCustomerFiltering from "./pages/DynamicCustomerFiltering";
import FieldManagerAdminDashboard from "./pages/FieldManagerAdminDashboard";
import RealTimeTracking from "./pages/RealTimeTracking";
import PerformanceDashboard from "./pages/PerformanceDashboard";
import GeofencingAlerts from "./pages/GeofencingAlerts";
import RouteOptimization from "./pages/RouteOptimization";
import ModularDashboard from "./pages/ModularDashboard";
import RouteAnalyticsDashboard from "./pages/RouteAnalyticsDashboard";
import AdvancedFilters from "./components/AdvancedFilters";
import FinancialDashboard from "./pages/FinancialDashboard";
import ReportBuilderPage from "./pages/ReportBuilderPage";
import ScheduledReportsPage from "./pages/ScheduledReportsPage";
import PendingAssignments from "./pages/PendingAssignments";
import AdminRoutes from "./pages/AdminRoutes";
// T26: Field Manager personal dashboard
import FieldManagerDashboard from "./pages/FieldManagerDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireAuth from "./components/RequireAuth";
import RequireFieldManager from "./components/RequireFieldManager";
import RequireAdmin from "./components/RequireAdmin";
// T26 Fix 2: RequireAdminOnly restricts /dashboard to admin/superadmin; redirects field_managers
import RequireAdminOnly from "./components/RequireAdminOnly";
import InactivityLogout from "./components/InactivityLogout";


function Router() {
  return (
    <>
      <InactivityLogout />
      <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/admin/login"} component={AdminLogin} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      {/* T26 Fix 2: /dashboard restricted to admin/superadmin only.
           field_manager role → RequireAdminOnly redirects to /field-manager/dashboard */}
      <Route path={"/dashboard"}>
        <RequireAdminOnly>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </RequireAdminOnly>
      </Route>
      {/* T14 Item 4: fieldManager tier — customers accessible to all admin-tier roles */}
      <Route path={"/customers"}>
        <RequireFieldManager>
          <MainLayout>
            <Customers />
          </MainLayout>
        </RequireFieldManager>
      </Route>
      {/* T14 Item 4: admin tier — adding customers is admin-tier */}
      <Route path={"/customers/new"}>
        <RequireAdmin>
          <MainLayout>
            <AddCustomer />
          </MainLayout>
        </RequireAdmin>
      </Route>
      {/* T14 Item 4: fieldManager tier — customer detail accessible to all admin-tier roles */}
      <Route path={"/customers/:id"}>
        <RequireFieldManager>
          <MainLayout>
            <CustomerDetail />
          </MainLayout>
        </RequireFieldManager>
      </Route>
      {/* T14 Item 4: fieldManager tier — routes accessible to all admin-tier roles */}
      <Route path={"/routes"}>
        <RequireFieldManager>
          <MainLayout>
            <Routes />
          </MainLayout>
        </RequireFieldManager>
      </Route>
      {/* T14 Item 4: superadmin only — worker management is highest-privilege */}
      <LayoutRoute path={"/workers"} component={Workers} requireSuperadmin />
      {/* T14 Item 4: fieldManagerProcedure tier — route creation is field operation */}
      <LayoutRoute path={"/create-route"} component={CreateRoute} requireFieldManager />
      {/* [DEPRECATED T10] <LayoutRoute path={"/area-route-creation"} component={AreaRouteCreation} requireAdmin /> */}
      <LayoutRoute path={"/cluster-management"} component={ClusterManagement} />
      <LayoutRoute path={"/tracking"} component={WorkerTracking} />
      {/* T14 Item 4: fieldManager tier — analytics accessible to all admin-tier roles */}
      <LayoutRoute path={"/analytics"} component={Analytics} requireFieldManager />
      {/* T14 Item 4: superadmin only — Zoho integration is system-level */}
      <LayoutRoute path={"/zoho"} component={ZohoIntegration} requireSuperadmin />
      <Route path={"/zoho/authorize"} component={ZohoAuthorization} />
      <Route path={"/zoho/callback"} component={ZohoCallback} />
      <Route path={"/zoho/token-generator"} component={ZohoTokenGenerator} />
      <LayoutRoute path={"/zoho/sync-history"} component={SyncHistoryDashboard} />
      <LayoutRoute path={"/building-groups"} component={BuildingGroups} />
      <LayoutRoute path={"/compliance"} component={Compliance} />
      {/* T14 Item 4: admin tier — MAF tagging is admin-tier (superadmin + admin) */}
      <LayoutRoute path={"/field-manager-tagging"} component={FieldManagerTagging} requireAdmin />
      <LayoutRoute path={"/dynamic-customer-filtering"} component={DynamicCustomerFiltering} />
      {/* T17 Item 3: TagBasedRouteCreation removed — page never created routes in production (setTimeout simulation, no tRPC call) */}
      {/* T14 Item 4: superadmin only — field manager admin is system-level */}
      <LayoutRoute path={"/field-manager-admin"} component={FieldManagerAdminDashboard} requireSuperadmin />
      <LayoutRoute path={"/real-time-tracking"} component={RealTimeTracking} />
      <LayoutRoute path={"/performance-dashboard"} component={PerformanceDashboard} />
      <LayoutRoute path={"/geofencing-alerts"} component={GeofencingAlerts} />
      <LayoutRoute path={"/route-optimization"} component={RouteOptimization} />
      <LayoutRoute path={"/modular-dashboard"} component={ModularDashboard} />
      <LayoutRoute path={"/route-analytics-dashboard"} component={RouteAnalyticsDashboard} />
      <Route path={"/clusters"} component={() => { window.location.href = "/cluster-management"; return null; }} />
      <Route path={"/add-customer"} component={() => { window.location.href = "/customers/new"; return null; }} />
      <Route path={"/filter"} component={() => { window.location.href = "/dynamic-customer-filtering"; return null; }} />
      {/* T14 Item 4: superadmin only — financial dashboard is highest-privilege */}
      <LayoutRoute path={"/financial-dashboard"} component={FinancialDashboard} requireSuperadmin />
      {/* T14 Item 4: admin tier — report builder is admin-tier */}
      <LayoutRoute path={"/report-builder"} component={ReportBuilderPage} requireAdmin />
      {/* T14 Item 4: admin tier — scheduled reports is admin-tier */}
      <LayoutRoute path={"/scheduled-reports"} component={ScheduledReportsPage} requireAdmin />
      {/* T14 Item 4: fieldManager tier — route schedules accessible to all admin-tier roles */}
      <LayoutRoute path={"/route-schedules"} component={RouteSchedules} requireFieldManager />
      {/* T15 Item 5: admin tier — pending assignments visible to superadmin + admin only */}
      <LayoutRoute path={"/pending-assignments"} component={PendingAssignments} requireAdmin />
      {/* T40: Admin route management — edit/delete/reorder customers on editable routes */}
      <LayoutRoute path={"/admin/routes"} component={AdminRoutes} requireAdmin />
      {/* T26: Field Manager personal dashboard — scoped to ctx.user.fieldManagerId (Pattern #51 / Rule #59) */}
      <LayoutRoute path={"/field-manager/dashboard"} component={FieldManagerDashboard} requireFieldManager />

      <Route path={"/worker-mobile"} component={WorkerMobile} />
      <Route path={"/worker-mobile/routes"} component={WorkerMobile} />
      <Route path={"/worker-mobile/route/:id"} component={WorkerMobileRouteDetail} />
      <Route path={"/worker-mobile/notifications"} component={WorkerMobileNotifications} />
      <Route path={"/worker-mobile/report-violation/:routeId/:customerId"} component={WorkerMobileReportViolation} />
      <Route path={"/worker-mobile/customer/:routeId/:customerId"} component={WorkerMobileCustomerDetail} />
      <Route path={"/worker-mobile/pending-pickups"} component={PendingPickups} />
      <Route path={"/manager"} component={() => { window.location.replace("/dashboard"); return null; }} />
      <Route path={"/sync-history-dashboard"} component={() => { window.location.replace("/zoho/sync-history"); return null; }} />
      <Route path={"/tags"} component={() => { window.location.replace("/field-manager-tagging"); return null; }} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
      </Switch>
    </>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
