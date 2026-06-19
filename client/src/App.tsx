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
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import AddCustomer from "./pages/AddCustomer";
import CustomerDetail from "./pages/CustomerDetail";
import Routes from "./pages/Routes";
import Workers from "./pages/Workers";
import CreateRoute from "./pages/CreateRoute";
import AreaRouteCreation from "./pages/AreaRouteCreation";
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
import TagBasedRouteCreation from "./pages/TagBasedRouteCreation";
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
import ProtectedRoute from "./components/ProtectedRoute";
import RequireAuth from "./components/RequireAuth";
import InactivityLogout from "./components/InactivityLogout";


function Router() {
  return (
    <>
      <InactivityLogout />
      <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/admin/login"} component={AdminLogin} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/dashboard"}>
        <RequireAuth>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </RequireAuth>
      </Route>
      <Route path={"/customers"}>
        <RequireAuth>
          <MainLayout>
            <Customers />
          </MainLayout>
        </RequireAuth>
      </Route>
      <Route path={"/customers/new"}>
        <RequireAuth>
          <MainLayout>
            <AddCustomer />
          </MainLayout>
        </RequireAuth>
      </Route>
      <Route path={"/customers/:id"}>
        <RequireAuth>
          <MainLayout>
            <CustomerDetail />
          </MainLayout>
        </RequireAuth>
      </Route>
      <Route path={"/routes"}>
        <RequireAuth>
          <MainLayout>
            <Routes />
          </MainLayout>
        </RequireAuth>
      </Route>
      <LayoutRoute path={"/workers"} component={Workers} requireAuth />
      <LayoutRoute path={"/create-route"} component={CreateRoute} requireAuth />
      <LayoutRoute path={"/area-route-creation"} component={AreaRouteCreation} />
      <LayoutRoute path={"/cluster-management"} component={ClusterManagement} />
      <LayoutRoute path={"/tracking"} component={WorkerTracking} />
      <LayoutRoute path={"/analytics"} component={Analytics} />
      <LayoutRoute path={"/zoho"} component={ZohoIntegration} />
      <Route path={"/zoho/authorize"} component={ZohoAuthorization} />
      <Route path={"/zoho/callback"} component={ZohoCallback} />
      <Route path={"/zoho/token-generator"} component={ZohoTokenGenerator} />
      <LayoutRoute path={"/zoho/sync-history"} component={SyncHistoryDashboard} />
      <LayoutRoute path={"/building-groups"} component={BuildingGroups} />
      <LayoutRoute path={"/compliance"} component={Compliance} />
      <LayoutRoute path={"/field-manager-tagging"} component={FieldManagerTagging} />
      <LayoutRoute path={"/dynamic-customer-filtering"} component={DynamicCustomerFiltering} />
      <LayoutRoute path={"/tag-based-route-creation"} component={TagBasedRouteCreation} />
      <LayoutRoute path={"/field-manager-admin"} component={FieldManagerAdminDashboard} />
      <LayoutRoute path={"/real-time-tracking"} component={RealTimeTracking} />
      <LayoutRoute path={"/performance-dashboard"} component={PerformanceDashboard} />
      <LayoutRoute path={"/geofencing-alerts"} component={GeofencingAlerts} />
      <LayoutRoute path={"/route-optimization"} component={RouteOptimization} />
      <LayoutRoute path={"/modular-dashboard"} component={ModularDashboard} />
      <LayoutRoute path={"/route-analytics-dashboard"} component={RouteAnalyticsDashboard} />
      <Route path={"/clusters"} component={() => { window.location.href = "/cluster-management"; return null; }} />
      <Route path={"/add-customer"} component={() => { window.location.href = "/customers/new"; return null; }} />
      <Route path={"/filter"} component={() => { window.location.href = "/dynamic-customer-filtering"; return null; }} />
      <LayoutRoute path={"/financial-dashboard"} component={FinancialDashboard} requireAuth />
      <LayoutRoute path={"/report-builder"} component={ReportBuilderPage} requireAuth />
      <LayoutRoute path={"/scheduled-reports"} component={ScheduledReportsPage} requireAuth />
      <LayoutRoute path={"/route-schedules"} component={RouteSchedules} requireAuth />

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
