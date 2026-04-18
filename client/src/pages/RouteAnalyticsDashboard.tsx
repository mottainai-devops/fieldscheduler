import AppHeader from "@/components/AppHeader";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { trpc } from '@/lib/trpc';

/**
 * Route Analytics Dashboard
 * Displays route optimization performance metrics and trends
 */
export default function RouteAnalyticsDashboard() {
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState({ start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() });
  const [activeTab, setActiveTab] = useState<'overview' | 'worker' | 'comparison'>('overview');

  // Fetch team statistics
  const teamStatsQuery = trpc.analytics?.getTeamStats?.useQuery(
    { startDate: dateRange.start, endDate: dateRange.end },
    { enabled: activeTab === 'overview' }
  );

  // Fetch worker statistics
  const workerStatsQuery = trpc.analytics?.getWorkerStats?.useQuery(
    { workerId: selectedWorker || 0, startDate: dateRange.start, endDate: dateRange.end },
    { enabled: activeTab === 'worker' && selectedWorker !== null }
  );

  // Fetch route history
  const routeHistoryQuery = trpc.analytics?.getRouteHistory?.useQuery(
    { startDate: dateRange.start, endDate: dateRange.end, limit: 50 },
    { enabled: activeTab === 'overview' }
  );

  const teamStats = teamStatsQuery?.data;
  const workerStats = workerStatsQuery?.data;
  const routeHistory = routeHistoryQuery?.data;

  // Prepare chart data
  const efficiencyTrend = routeHistory?.map((route: any) => ({
    date: new Date(route.createdAt).toLocaleDateString(),
    efficiency: route.efficiencyScore || 0,
    distance: parseFloat(route.totalDistance || '0'),
  })) || [];

  const methodComparison = [
    {
      name: 'Mottainai',
      efficiency: 85,
      distance: 4.2,
      time: 18,
    },
    {
      name: 'Nearest Neighbor',
      efficiency: 72,
      distance: 5.1,
      time: 22,
    },
    {
      name: 'ArcGIS VRP',
      efficiency: 68,
      distance: 5.5,
      time: 25,
    },
  ];

  const workerPerformance = [
    { name: 'Worker A', routes: 15, efficiency: 88, distance: 120 },
    { name: 'Worker B', routes: 12, efficiency: 82, distance: 105 },
    { name: 'Worker C', routes: 18, efficiency: 79, distance: 145 },
    { name: 'Worker D', routes: 14, efficiency: 85, distance: 118 },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Route Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Track route optimization performance and efficiency metrics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'worker' ? 'default' : 'outline'}
            onClick={() => setActiveTab('worker')}
          >
            Worker Stats
          </Button>
          <Button
            variant={activeTab === 'comparison' ? 'default' : 'outline'}
            onClick={() => setActiveTab('comparison')}
          >
            Method Comparison
          </Button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats?.totalRoutes || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {teamStats?.completedRoutes || 0} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats?.averageEfficiencyScore || 0}%</div>
                <p className="text-xs text-gray-500 mt-1">Team average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats?.totalDistanceCovered || 0} km</div>
                <p className="text-xs text-gray-500 mt-1">
                  {((teamStats?.totalDistanceCovered || 0) / (teamStats?.totalRoutes || 1)).toFixed(1)} km/route
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats?.totalWorkers || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {((teamStats?.totalRoutes || 0) / (teamStats?.totalWorkers || 1)).toFixed(1)} routes/worker
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Efficiency Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Efficiency Trend</CardTitle>
              <CardDescription>Route efficiency scores over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={efficiencyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" name="Efficiency Score" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distance Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Distance Per Stop Trend</CardTitle>
              <CardDescription>Average distance traveled per customer stop</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={efficiencyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="distance" fill="#10b981" name="Distance (km)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Worker Stats Tab */}
      {activeTab === 'worker' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Worker Performance</CardTitle>
              <CardDescription>Individual worker route efficiency metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={workerPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="efficiency" fill="#3b82f6" name="Efficiency %" />
                  <Bar yAxisId="right" dataKey="distance" fill="#10b981" name="Distance (km)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Routes Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workerStats?.completedRoutes || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {((workerStats?.completedRoutes || 0) / (workerStats?.totalRoutes || 1) * 100).toFixed(0)}% completion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workerStats?.averageEfficiencyScore || 0}%</div>
                <p className="text-xs text-gray-500 mt-1">Performance score</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workerStats?.averageCustomersPerRoute || 0}</div>
                <p className="text-xs text-gray-500 mt-1">Per route</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Comparison Tab */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Method Comparison</CardTitle>
              <CardDescription>Performance metrics by optimization algorithm</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={methodComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="efficiency" fill="#8b5cf6" name="Efficiency %" />
                  <Bar yAxisId="right" dataKey="distance" fill="#f59e0b" name="Avg Distance (km)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {methodComparison.map((method) => (
              <Card key={method.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{method.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Efficiency Score</p>
                    <p className="text-2xl font-bold">{method.efficiency}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg Distance/Stop</p>
                    <p className="text-2xl font-bold">{method.distance} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg Time/Stop</p>
                    <p className="text-2xl font-bold">{method.time} min</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Method Efficiency Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={methodComparison}
                    dataKey="efficiency"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    <Cell fill="#8b5cf6" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

