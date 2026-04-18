import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, ChevronRight, Search, User, Settings, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import FieldManagerQuickStats from "@/components/FieldManagerQuickStats";
import ExportAnalytics from "@/components/ExportAnalytics";
import NotificationsPanel from "@/components/NotificationsPanel";
import ThemeToggle from "@/components/ThemeToggle";
import AdvancedFilters from "@/components/AdvancedFilters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export default function AppHeader({ 
  title = "Dashboard", 
  subtitle = "Field Worker Scheduler",
  showBackButton = false,
  backTo,
  backLabel = "Back",
  breadcrumbs
}: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results or filter current page
      console.log("Searching for:", searchQuery);
      // TODO: Implement global search functionality
    }
  };

  const handleLogout = () => {
    // TODO: Implement logout functionality
    console.log("Logging out...");
    setLocation("/");
  };

  return (
    <>
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left Section: Logo + Title + Breadcrumbs */}
            <div className="flex items-center gap-4 min-w-0 flex-shrink">
              {/* Logo with Company Name */}
              <Link href="/dashboard">
                <div className="flex items-center gap-2 cursor-pointer group">
                  <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-700 transition-colors">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div className="hidden lg:block">
                    <div className="text-white font-bold text-lg leading-tight">Field Scheduler</div>
                    <div className="text-slate-400 text-xs">Route Management</div>
                  </div>
                </div>
              </Link>

              {/* Vertical Divider */}
              <div className="h-10 w-px bg-slate-700 hidden md:block"></div>

              {/* Page Title and Breadcrumbs */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {showBackButton && backTo && (
                    <Link href={backTo}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-slate-400 hover:text-white hover:bg-slate-800 px-2"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        {backLabel}
                      </Button>
                    </Link>
                  )}
                  <h1 className="text-xl font-bold text-white truncate">{title}</h1>
                </div>
                
                {/* Breadcrumbs */}
                {breadcrumbs && breadcrumbs.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                    {breadcrumbs.map((crumb, index) => (
                      <div key={index} className="flex items-center gap-1">
                        {index > 0 && <ChevronRight className="w-3 h-3" />}
                        {index === breadcrumbs.length - 1 ? (
                          <span className="text-slate-300">{crumb.label}</span>
                        ) : (
                          <Link href={crumb.href}>
                            <span className="hover:text-white cursor-pointer transition-colors">
                              {crumb.label}
                            </span>
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Center Section: Search Bar */}
            <div className="flex-1 max-w-md hidden md:block">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search customers, routes, workers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>
              </form>
            </div>

            {/* Right Section: Actions + Utilities */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Primary Action: Create Route */}
              <Link href="/create-route">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <MapPin className="w-4 h-4 mr-2" />
                  Create Route
                </Button>
              </Link>

              {/* Vertical Divider */}
              <div className="h-8 w-px bg-slate-700"></div>

              {/* Utility Tools */}
              <AdvancedFilters />
              <ExportAnalytics />
              <NotificationsPanel />
              <ThemeToggle />

              {/* User Profile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
                  <DropdownMenuLabel className="text-white">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-300 hover:bg-slate-700 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      <FieldManagerQuickStats />
    </>
  );
}
