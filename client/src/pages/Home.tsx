import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, Truck, TrendingUp, Zap, Navigation, LogIn } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { data: worker, isLoading } = trpc.workerAuth.me.useQuery();
  const isAuthenticated = !!worker;

  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Field Worker Scheduler</h1>
            </div>
            {isLoading ? (
              <Button size="lg" disabled className="bg-blue-600">
                Loading...
              </Button>
            ) : isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Launch Dashboard
                </Button>
              </Link>
            ) : (
              <Button size="lg" onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700">
                <LogIn className="w-5 h-5 mr-2" />
                Login with Manus
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-white mb-6">
            Intelligent Route Management for
            <span className="text-blue-400"> Field Operations</span>
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Dynamic route optimization powered by ArcGIS and OR-Tools. Seamlessly integrate with Zoho Books,
            track workers in real-time, and maximize operational efficiency.
          </p>
          <div className="flex gap-4 justify-center">
            {isLoading ? (
              <Button size="lg" disabled className="bg-blue-600">
                Loading...
              </Button>
            ) : isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Zap className="w-5 h-5 mr-2" />
                  Get Started
                </Button>
              </Link>
            ) : (
              <Button size="lg" onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700">
                <LogIn className="w-5 h-5 mr-2" />
                Login to Get Started
              </Button>
            )}
            <Link href="/routes">
              <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                <Navigation className="w-5 h-5 mr-2" />
                View Routes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="p-3 bg-blue-600/20 rounded-lg w-fit mb-3">
                <MapPin className="w-8 h-8 text-blue-400" />
              </div>
              <CardTitle className="text-white">Smart Route Optimization</CardTitle>
              <CardDescription className="text-slate-400">
                ArcGIS-powered distance calculations with proximity clustering for maximum efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  Real-time coordinate validation
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  Neighborhood-based clustering
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  OR-Tools VRP solving
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="p-3 bg-green-600/20 rounded-lg w-fit mb-3">
                <Users className="w-8 h-8 text-green-400" />
              </div>
              <CardTitle className="text-white">Real-time Worker Tracking</CardTitle>
              <CardDescription className="text-slate-400">
                Monitor field workers with live GPS tracking and device health monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Live location updates
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Battery & signal monitoring
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Route progress tracking
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="p-3 bg-purple-600/20 rounded-lg w-fit mb-3">
                <Truck className="w-8 h-8 text-purple-400" />
              </div>
              <CardTitle className="text-white">Zoho Books Integration</CardTitle>
              <CardDescription className="text-slate-400">
                Seamless customer synchronization with automatic coordinate geocoding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  Automatic customer sync
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  Address geocoding
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  Building ID management
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">95%</div>
              <div className="text-slate-400">Route Efficiency</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">40%</div>
              <div className="text-slate-400">Time Savings</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">100+</div>
              <div className="text-slate-400">Customers Managed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-400 mb-2">24/7</div>
              <div className="text-slate-400">Real-time Tracking</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to optimize your field operations?
          </h3>
          <p className="text-xl text-slate-300 mb-8">
            Experience the power of intelligent route management today.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              <TrendingUp className="w-5 h-5 mr-2" />
              Launch Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-slate-400">
            <p>© 2024 Field Worker Scheduler. Built with React, tRPC, ArcGIS & OR-Tools.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
