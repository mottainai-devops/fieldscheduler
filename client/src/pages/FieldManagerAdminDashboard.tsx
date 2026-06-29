import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import FieldManagerBreadcrumb from "@/components/FieldManagerBreadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tags,
  Filter,
  Route,
  BarChart3,
  Users,
  Building2,
  ArrowRight,
  Zap,
  TrendingUp,
} from "lucide-react";

export default function FieldManagerAdminDashboard() {
  const [, navigate] = useLocation();

  const features = [
    {
      id: "tagging",
      title: "Field Manager Tagging",
      description: "Assign and manage CUSTOMERMAF building IDs to field managers",
      icon: Tags,
      color: "from-blue-600 to-blue-400",
      stats: [
        { label: "Field Managers", value: "4" },
        { label: "Total Building IDs", value: "20" },
      ],
      features: [
        "Assign building IDs to managers",
        "Edit tag descriptions",
        "Bulk load from Excel",
        "Real-time statistics",
      ],
      action: "Manage Tags",
      route: "/field-manager-tagging",
    },
    {
      id: "filtering",
      title: "Dynamic Customer Filtering",
      description: "Filter and export customers by field manager tags",
      icon: Filter,
      color: "from-purple-600 to-purple-400",
      stats: [
        { label: "Filter Options", value: "3+" },
        { label: "Export Format", value: "CSV" },
      ],
      features: [
        "Multi-select tag filtering",
        "Search by name/email/phone",
        "Priority-based filtering",
        "CSV export functionality",
      ],
      action: "Filter Customers",
      route: "/dynamic-customer-filtering",
    },
  ]; // T17 Item 3: Tag-Based Route Creation card removed (page never created routes in production)

  const stats = [
    {
      icon: Users,
      label: "Field Managers",
      value: "4",
      color: "text-blue-400",
      bg: "bg-blue-900/20",
    },
    {
      icon: Building2,
      label: "Building IDs",
      value: "20",
      color: "text-purple-400",
      bg: "bg-purple-900/20",
    },
    {
      icon: TrendingUp,
      label: "Active Routes",
      value: "12",
      color: "text-green-400",
      bg: "bg-green-900/20",
    },
    {
      icon: Zap,
      label: "System Status",
      value: "Online",
      color: "text-emerald-400",
      bg: "bg-emerald-900/20",
    },
  ];

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <FieldManagerBreadcrumb />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Field Manager Admin</h1>
              <p className="text-slate-400 mt-1">Manage tags, filter customers, and create routes</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-slate-400 text-sm mb-2">{stat.label}</p>
                      <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bg}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.id}
                className="bg-slate-800 border-slate-700 hover:border-slate-600 transition overflow-hidden group"
              >
                {/* Gradient Header */}
                <div className={`h-2 bg-gradient-to-r ${feature.color}`} />

                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 bg-gradient-to-br ${feature.color} rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-slate-700 text-slate-300">Active</Badge>
                  </div>

                  <CardTitle className="text-white text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-slate-400">{feature.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    {feature.stats.map((stat, idx) => (
                      <div key={idx} className="bg-slate-700/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                        <p className="text-lg font-semibold text-white">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Key Features</p>
                    <ul className="space-y-2">
                      {feature.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-blue-400 mt-1">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => navigate(feature.route)}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold group/btn"
                  >
                    {feature.action}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Start Guide */}
        <Card className="bg-slate-800 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Quick Start Guide
            </CardTitle>
            <CardDescription>Get started with the Field Manager Tagging System in 3 steps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600 text-white font-bold">
                      1
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Assign Tags</h3>
                    <p className="text-slate-400 text-sm mb-3">
                      Go to Field Manager Tagging and assign building IDs to each field manager.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/field-manager-tagging")}
                      className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                    >
                      Open Tagging →
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-600 text-white font-bold">
                      2
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Filter Customers</h3>
                    <p className="text-slate-400 text-sm mb-3">
                      Use Dynamic Filtering to view customers by tags and export as CSV.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/dynamic-customer-filtering")}
                      className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                    >
                      Open Filtering →
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-600 text-white font-bold">
                      3
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Create Routes</h3>
                    <p className="text-slate-400 text-sm mb-3">
                      Build optimized routes using Manual Selection or Cluster Selection.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/create-route")}
                      className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                    >
                      Create Route →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Field Manager Overview */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Field Manager Overview</CardTitle>
            <CardDescription>Current assignments and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Bukola", tags: 5, color: "bg-blue-900/30 border-blue-700" },
                { name: "Halleluyah", tags: 6, color: "bg-purple-900/30 border-purple-700" },
                { name: "Juwon", tags: 6, color: "bg-green-900/30 border-green-700" },
                { name: "Aishat", tags: 3, color: "bg-yellow-900/30 border-yellow-700" },
              ].map((manager) => (
                <div key={manager.name} className={`p-4 rounded-lg border ${manager.color}`}>
                  <p className="text-white font-semibold mb-2">{manager.name}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{manager.tags}</span>
                    <span className="text-sm text-slate-400">building IDs</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

