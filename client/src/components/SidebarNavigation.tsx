import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Route,
  Truck,
  CheckSquare,
  Settings,
  Link2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  UserCog,
  Building2,
  Navigation,
  Package,
  ClipboardCheck,
  Wrench,
  Zap,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdminNotificationBell from "./AdminNotificationBell";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: "Dashboard & Analytics",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Performance", href: "/performance-dashboard", icon: BarChart3 },
      { label: "Route Analytics", href: "/route-analytics-dashboard", icon: BarChart3 },
    ],
  },
  {
    title: "Field Operations",
    icon: Users,
    items: [
      { label: "Workers", href: "/workers", icon: Users },
      { label: "Field Manager Admin", href: "/field-manager-admin", icon: UserCog },
      { label: "Field Manager Tagging", href: "/field-manager-tagging", icon: UserCog },
      { label: "Manager Dashboard", href: "/manager", icon: UserCog },
    ],
  },
  {
    title: "Customer Management",
    icon: Building2,
    items: [
      { label: "Customers", href: "/customers", icon: Building2 },
      { label: "Add Customer", href: "/add-customer", icon: Building2 },
      { label: "Building Groups", href: "/building-groups", icon: Building2 },
      { label: "Customer Filtering", href: "/dynamic-customer-filtering", icon: Building2 },
    ],
  },
  {
    title: "Route Management",
    icon: Route,
    items: [
      { label: "Routes", href: "/routes", icon: Route },
      { label: "Route Schedules", href: "/route-schedules", icon: CalendarDays },
      { label: "Create Route", href: "/create-route", icon: Route },
      { label: "Area Route Creation", href: "/area-route-creation", icon: Route },
      { label: "Tag-Based Routes", href: "/tag-based-route-creation", icon: Route },
      { label: "Route Optimization", href: "/route-optimization", icon: Navigation },
      { label: "Clusters", href: "/clusters", icon: Route },
    ],
  },
  {
    title: "Logistics & Tracking",
    icon: Truck,
    items: [
      { label: "Real-Time Tracking", href: "/real-time-tracking", icon: MapPin },
      { label: "Tracking", href: "/tracking", icon: MapPin },
      { label: "Geofencing Alerts", href: "/geofencing-alerts", icon: MapPin },
    ],
  },
  {
    title: "Compliance & Quality",
    icon: CheckSquare,
    items: [
      { label: "Compliance", href: "/compliance", icon: ClipboardCheck },
      { label: "Tags", href: "/tags", icon: ClipboardCheck },
      { label: "Filter", href: "/filter", icon: ClipboardCheck },
    ],
  },
  {
    title: "System Management",
    icon: Settings,
    items: [
      { label: "Modular Dashboard", href: "/modular-dashboard", icon: Settings },
    ],
  },
  {
    title: "Integrations",
    icon: Link2,
    items: [
      { label: "Zoho", href: "/zoho", icon: Zap },
      { label: "Sync History", href: "/sync-history-dashboard", icon: Zap },
      { label: "Financial Dashboard", href: "/financial-dashboard", icon: BarChart3 },
      { label: "Report Builder", href: "/report-builder", icon: BarChart3 },
      { label: "Scheduled Reports", href: "/scheduled-reports", icon: BarChart3 },
    ],
  },
];

export default function SidebarNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("sidebarExpandedGroups");
    return saved ? new Set(JSON.parse(saved)) : new Set(["Dashboard & Analytics"]);
  });
  const [location] = useLocation();

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  const toggleGroup = (title: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedGroups(newExpanded);
    localStorage.setItem("sidebarExpandedGroups", JSON.stringify([...newExpanded]));
  };

  const isActive = (href: string) => location === href;

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-700 transition-all duration-300 z-50 flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold">Field Scheduler</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        {navigationGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.title);
          const GroupIcon = group.icon;

          return (
            <div key={group.title} className="mb-2">
              {/* Group Header */}
              <button
                onClick={() => !isCollapsed && toggleGroup(group.title)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  "hover:bg-slate-800",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? group.title : undefined}
              >
                <GroupIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-medium text-slate-300 flex-1 text-left">
                      {group.title}
                    </span>
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 text-slate-400 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </>
                )}
              </button>

              {/* Group Items */}
              {!isCollapsed && isExpanded && (
                <div className="mt-1 ml-2 space-y-1">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <Link key={item.href} href={item.href}>
                        <a
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                            active
                              ? "bg-blue-600 text-white"
                              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          )}
                        >
                          <ItemIcon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </a>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Collapsed state - show items on hover */}
              {isCollapsed && (
                <div className="relative group">
                  <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 min-w-[200px]">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-400 border-b border-slate-700">
                        {group.title}
                      </div>
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isActive(item.href);

                        return (
                          <Link key={item.href} href={item.href}>
                            <a
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 transition-colors text-sm",
                                active
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-300 hover:bg-slate-700"
                              )}
                            >
                              <ItemIcon className="w-4 h-4 flex-shrink-0" />
                              <span>{item.label}</span>
                            </a>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 p-3 space-y-2">
        <AdminNotificationBell isCollapsed={isCollapsed} />
        {!isCollapsed ? (
          <div className="text-xs text-slate-500 text-center px-1">
            © 2025 Field Scheduler
          </div>
        ) : (
          <div className="w-2 h-2 bg-green-500 rounded-full mx-auto" title="System Online" />
        )}
      </div>
    </div>
  );
}
