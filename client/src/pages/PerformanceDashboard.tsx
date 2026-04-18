import AppHeader from "@/components/AppHeader";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Award, Clock, Zap, Star, Target } from "lucide-react";
import FieldManagerBreadcrumb from "@/components/FieldManagerBreadcrumb";

interface ManagerMetrics {
  name: string;
  efficiency: number;
  satisfactionRating: number;
  avgCompletionTime: number;
  routesCompleted: number;
  customersServed: number;
  onTimePercentage: number;
  avgDistance: number;
}

export default function PerformanceDashboard() {
  const [selectedManager, setSelectedManager] = useState<string | null>(null);

  // Mock performance data
  const managerMetrics: ManagerMetrics[] = [
    {
      name: "Bukola",
      efficiency: 92,
      satisfactionRating: 4.8,
      avgCompletionTime: 45,
      routesCompleted: 24,
      customersServed: 120,
      onTimePercentage: 96,
      avgDistance: 12.5,
    },
    {
      name: "Halleluyah",
      efficiency: 88,
      satisfactionRating: 4.6,
      avgCompletionTime: 55,
      routesCompleted: 22,
      customersServed: 132,
      onTimePercentage: 91,
      avgDistance: 14.2,
    },
    {
      name: "Juwon",
      efficiency: 85,
      satisfactionRating: 4.5,
      avgCompletionTime: 60,
      routesCompleted: 20,
      customersServed: 120,
      onTimePercentage: 88,
      avgDistance: 15.8,
    },
    {
      name: "Aishat",
      efficiency: 90,
      satisfactionRating: 4.7,
      avgCompletionTime: 50,
      routesCompleted: 23,
      customersServed: 115,
      onTimePercentage: 94,
      avgDistance: 13.1,
    },
  ];

  // Trend data for line chart
  const trendData = [
    { week: "Week 1", Bukola: 88, Halleluyah: 85, Juwon: 80, Aishat: 87 },
    { week: "Week 2", Bukola: 89, Halleluyah: 86, Juwon: 82, Aishat: 88 },
    { week: "Week 3", Bukola: 90, Halleluyah: 87, Juwon: 84, Aishat: 89 },
    { week: "Week 4", Bukola: 92, Halleluyah: 88, Juwon: 85, Aishat: 90 },
  ];

  // Routes completed data
  const routesData = managerMetrics.map((m) => ({
    name: m.name,
    completed: m.routesCompleted,
    pending: Math.floor(Math.random() * 5) + 2,
  }));

  // Satisfaction data
  const satisfactionData = managerMetrics.map((m) => ({
    name: m.name,
    rating: m.satisfactionRating,
  }));

  // On-time performance
  const onTimeData = managerMetrics.map((m) => ({
    name: m.name,
    onTime: m.onTimePercentage,
    late: 100 - m.onTimePercentage,
  }));

  const COLORS = ["#10b981", "#ef4444"];

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return "text-green-400";
    if (efficiency >= 80) return "text-yellow-400";
    return "text-orange-400";
  };

  const getRatingStars = (rating: number) => {
    return "⭐".repeat(Math.round(rating));
  };

  return (
    <>
      <AppHeader
        title="Performance Dashboard"
        subtitle="Field worker performance metrics"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Analytics", href: "/analytics" }, { label: "Performance", href: "/performance-dashboard" }]}
      />
    <div className="space-y-6">
      <FieldManagerBreadcrumb
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Field Manager", href: "/field-manager-admin" },
          { label: "Performance Dashboard", href: "/performance-dashboard" },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Performance Dashboard</h1>
        <p className="text-slate-400 mt-1">Manager efficiency scores, customer satisfaction, and completion metrics</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Avg Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">
              {(managerMetrics.reduce((sum, m) => sum + m.efficiency, 0) / managerMetrics.length).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Across all managers</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Avg Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">
              {(managerMetrics.reduce((sum, m) => sum + m.satisfactionRating, 0) / managerMetrics.length).toFixed(1)}/5
            </p>
            <p className="text-xs text-slate-500 mt-1">Customer ratings</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Target className="w-4 h-4" />
              On-Time Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-400">
              {(managerMetrics.reduce((sum, m) => sum + m.onTimePercentage, 0) / managerMetrics.length).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Routes completed on schedule</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Total Served
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">
              {managerMetrics.reduce((sum, m) => sum + m.customersServed, 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Customers this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Manager Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {managerMetrics.map((manager) => (
          <Card
            key={manager.name}
            className={`bg-slate-800 border cursor-pointer transition ${
              selectedManager === manager.name
                ? "border-blue-500 ring-2 ring-blue-500/50"
                : "border-slate-700 hover:border-slate-600"
            }`}
            onClick={() => setSelectedManager(selectedManager === manager.name ? null : manager.name)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">{manager.name}</CardTitle>
                <Badge className={`${getEfficiencyColor(manager.efficiency)} bg-slate-700 border-0`}>
                  {manager.efficiency}% Efficiency
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Satisfaction Rating */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Customer Satisfaction</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getRatingStars(manager.satisfactionRating)}</span>
                  <span className="text-sm font-semibold text-blue-400">{manager.satisfactionRating}/5</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded p-2">
                  <p className="text-xs text-slate-400">Routes Completed</p>
                  <p className="text-lg font-bold text-green-400">{manager.routesCompleted}</p>
                </div>
                <div className="bg-slate-700/50 rounded p-2">
                  <p className="text-xs text-slate-400">Customers Served</p>
                  <p className="text-lg font-bold text-blue-400">{manager.customersServed}</p>
                </div>
                <div className="bg-slate-700/50 rounded p-2">
                  <p className="text-xs text-slate-400">Avg Completion</p>
                  <p className="text-lg font-bold text-yellow-400">{manager.avgCompletionTime}m</p>
                </div>
                <div className="bg-slate-700/50 rounded p-2">
                  <p className="text-xs text-slate-400">On-Time Rate</p>
                  <p className="text-lg font-bold text-purple-400">{manager.onTimePercentage}%</p>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedManager === manager.name && (
                <div className="border-t border-slate-700 pt-3 mt-3 space-y-2">
                  <h4 className="text-sm font-semibold text-white">Detailed Metrics</h4>
                  <div className="space-y-1 text-xs text-slate-400">
                    <p>📊 Efficiency Score: {manager.efficiency}% (Excellent)</p>
                    <p>⭐ Customer Rating: {manager.satisfactionRating}/5.0</p>
                    <p>✅ On-Time Completion: {manager.onTimePercentage}% of routes</p>
                    <p>🚗 Avg Distance per Route: {manager.avgDistance}km</p>
                    <p>⏱️ Avg Route Duration: {manager.avgCompletionTime} minutes</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Efficiency Trend Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Efficiency Trend (Last 4 Weeks)
          </CardTitle>
          <CardDescription>Manager efficiency scores over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="week" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Legend />
              <Line type="monotone" dataKey="Bukola" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Halleluyah" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="Juwon" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="Aishat" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Routes Completed Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Routes Completed</CardTitle>
            <CardDescription>Completed vs Pending routes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={routesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* On-Time Performance */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">On-Time Performance</CardTitle>
            <CardDescription>Routes completed on schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={onTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="onTime" fill="#10b981" name="On-Time" />
                <Bar dataKey="late" fill="#ef4444" name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Satisfaction Ratings */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Customer Satisfaction Ratings</CardTitle>
          <CardDescription>Average ratings by field manager</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={satisfactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[0, 5]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="rating" fill="#3b82f6" name="Rating (out of 5)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="bg-blue-900/20 border-blue-700">
        <CardHeader>
          <CardTitle className="text-blue-300">Performance Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-200">
          <p>🏆 Top Performer: Bukola with 92% efficiency and 4.8/5 customer rating</p>
          <p>📈 Improvement Trend: All managers showing positive efficiency growth over the past 4 weeks</p>
          <p>✅ On-Time Excellence: 92.25% average on-time completion rate across all managers</p>
          <p>👥 Team Capacity: Serving 487 customers this month with consistent quality</p>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

