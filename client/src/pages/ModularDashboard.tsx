import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Brain, Zap, User, Shield, Settings, ChevronRight, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "wouter";

interface DashboardModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  route: string;
  stats: Array<{ label: string; value: string; color: string }>;
}

export default function ModularDashboard() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const modules: DashboardModule[] = [
    {
      id: "customer",
      title: "Customer Management",
      description: "Manage customers, locations, and contact information",
      icon: <Users className="w-8 h-8" />,
      color: "from-blue-600 to-blue-800",
      features: [
        "Customer database (6,473 total)",
        "Building ID mapping (CUSTOMERMAF)",
        "Contact information management",
        "Customer priority classification",
        "Service history tracking",
        "Dynamic customer filtering",
      ],
      route: "/customers",
      stats: [
        { label: "Total Customers", value: "6,473", color: "text-blue-400" },
        { label: "With GPS", value: "6,374", color: "text-green-400" },
        { label: "Active", value: "6,200", color: "text-purple-400" },
      ],
    },
    {
      id: "intelligence",
      title: "Intelligence & Analytics",
      description: "Performance metrics, trends, and business intelligence",
      icon: <Brain className="w-8 h-8" />,
      color: "from-purple-600 to-purple-800",
      features: [
        "Performance dashboards",
        "Efficiency scoring (92% avg)",
        "Customer satisfaction ratings (4.65/5)",
        "Trend analysis (4-week history)",
        "Route completion analytics",
        "On-time performance tracking (92.25%)",
      ],
      route: "/performance-dashboard",
      stats: [
        { label: "Avg Efficiency", value: "92%", color: "text-green-400" },
        { label: "Satisfaction", value: "4.65/5", color: "text-yellow-400" },
        { label: "On-Time Rate", value: "92.25%", color: "text-blue-400" },
      ],
    },
    {
      id: "operations",
      title: "Operations Management",
      description: "Routes, scheduling, and operational workflows",
      icon: <Zap className="w-8 h-8" />,
      color: "from-yellow-600 to-yellow-800",
      features: [
        "Route creation and management",
        "Route optimization engine",
        "Scheduling and time windows",
        "Vehicle/resource allocation",
        "Area-based clustering",
        "Real-time route tracking",
      ],
      route: "/routes",
      stats: [
        { label: "Active Routes", value: "24", color: "text-yellow-400" },
        { label: "Pending", value: "8", color: "text-orange-400" },
        { label: "Completed", value: "89", color: "text-green-400" },
      ],
    },
    {
      id: "field-manager",
      title: "Field Manager Management",
      description: "Manager assignments, tags, and performance tracking",
      icon: <User className="w-8 h-8" />,
      color: "from-green-600 to-green-800",
      features: [
        "Field manager profiles (4 managers)",
        "Tag-based customer assignment",
        "Real-time GPS tracking",
        "Mobile device management",
        "Performance metrics",
        "Geofencing & auto check-in/out",
      ],
      route: "/field-manager-admin",
      stats: [
        { label: "Active Managers", value: "4", color: "text-green-400" },
        { label: "Connected Devices", value: "4", color: "text-blue-400" },
        { label: "Avg Battery", value: "74%", color: "text-yellow-400" },
      ],
    },
    {
      id: "compliance",
      title: "Compliance & Tracking",
      description: "Compliance monitoring, violations, and audit trails",
      icon: <Shield className="w-8 h-8" />,
      color: "from-red-600 to-red-800",
      features: [
        "Compliance rules management",
        "Violation tracking and reporting",
        "Audit trail logging",
        "SLA monitoring",
        "Quality assurance checks",
        "Incident management",
      ],
      route: "/compliance",
      stats: [
        { label: "Compliance Score", value: "98%", color: "text-green-400" },
        { label: "Violations", value: "3", color: "text-red-400" },
        { label: "Resolved", value: "100%", color: "text-green-400" },
      ],
    },
    {
      id: "settings",
      title: "System Settings",
      description: "Configuration, integrations, and system administration",
      icon: <Settings className="w-8 h-8" />,
      color: "from-slate-600 to-slate-800",
      features: [
        "User management & roles",
        "API integrations (Zoho CRM)",
        "Notification settings",
        "Export & reporting",
        "System configuration",
        "Data management",
      ],
      route: "/admin-dashboard",
      stats: [
        { label: "Users", value: "12", color: "text-blue-400" },
        { label: "Integrations", value: "3", color: "text-purple-400" },
        { label: "Uptime", value: "99.9%", color: "text-green-400" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Modular Dashboard</h1>
          <p className="text-slate-400">Organized system modules for efficient operations management</p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Card
              key={module.id}
              className={`bg-slate-800 border-slate-700 cursor-pointer transition hover:border-slate-500 ${
                selectedModule === module.id ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setSelectedModule(selectedModule === module.id ? null : module.id)}
            >
              <CardHeader>
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${module.color} w-fit mb-3`}>
                  <div className="text-white">{module.icon}</div>
                </div>
                <CardTitle className="text-white">{module.title}</CardTitle>
                <CardDescription className="text-slate-400">{module.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {module.stats.map((stat, idx) => (
                    <div key={idx} className="bg-slate-700/50 rounded p-2 text-center">
                      <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Features - Show only if selected */}
                {selectedModule === module.id && (
                  <div className="border-t border-slate-700 pt-4 space-y-2">
                    <h4 className="text-sm font-semibold text-white">Key Features</h4>
                    <ul className="space-y-1">
                      {module.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle className="w-3 h-3 mt-0.5 text-green-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Button */}
                <Link href={module.route}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm mt-2">
                    Open Module
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Recent Activity */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                <span className="text-sm text-slate-300">Route optimization completed</span>
                <Badge className="bg-green-900/20 border-green-700 text-green-400 text-xs">2 min ago</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                <span className="text-sm text-slate-300">Geofence entry detected</span>
                <Badge className="bg-blue-900/20 border-blue-700 text-blue-400 text-xs">5 min ago</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                <span className="text-sm text-slate-300">Performance report generated</span>
                <Badge className="bg-purple-900/20 border-purple-700 text-purple-400 text-xs">15 min ago</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                <span className="text-sm text-slate-300">Customer data synchronized</span>
                <Badge className="bg-yellow-900/20 border-yellow-700 text-yellow-400 text-xs">1 hour ago</Badge>
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">API Uptime</span>
                  <span className="text-green-400 font-semibold">99.9%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: "99.9%" }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Database Performance</span>
                  <span className="text-green-400 font-semibold">Excellent</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: "95%" }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">GPS Tracking</span>
                  <span className="text-green-400 font-semibold">4/4 Active</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Storage Usage</span>
                  <span className="text-yellow-400 font-semibold">62%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{ width: "62%" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Description */}
        <Card className="bg-blue-900/20 border-blue-700">
          <CardHeader>
            <CardTitle className="text-blue-300">Dashboard Organization</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-200 space-y-2">
            <p>This modular dashboard breaks down the system into 6 key functional areas:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Customer Management:</strong> All customer-related operations and data</li>
              <li><strong>Intelligence & Analytics:</strong> Performance metrics and business insights</li>
              <li><strong>Operations Management:</strong> Routes, scheduling, and workflows</li>
              <li><strong>Field Manager Management:</strong> Manager assignments and tracking</li>
              <li><strong>Compliance & Tracking:</strong> Compliance monitoring and audit trails</li>
              <li><strong>System Settings:</strong> Configuration and administration</li>
            </ul>
            <p className="mt-3">Each module is self-contained with its own features, statistics, and navigation for cleaner, more interactive user experience.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

