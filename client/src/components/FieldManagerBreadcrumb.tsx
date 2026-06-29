import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Breadcrumb {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

const breadcrumbMap: Record<string, Breadcrumb[]> = {
  "/field-manager-admin": [
    { label: "Dashboard", path: "/dashboard", icon: <Home className="w-4 h-4" /> },
    { label: "Field Manager", path: "/field-manager-admin" },
  ],
  "/field-manager-tagging": [
    { label: "Dashboard", path: "/dashboard", icon: <Home className="w-4 h-4" /> },
    { label: "Field Manager", path: "/field-manager-admin" },
    { label: "Tag Management", path: "/field-manager-tagging" },
  ],
  "/dynamic-customer-filtering": [
    { label: "Dashboard", path: "/dashboard", icon: <Home className="w-4 h-4" /> },
    { label: "Field Manager", path: "/field-manager-admin" },
    { label: "Customer Filtering", path: "/dynamic-customer-filtering" },
  ],
};

export default function FieldManagerBreadcrumb() {
  const [location] = useLocation();

  const breadcrumbs = breadcrumbMap[location];

  if (!breadcrumbs) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-3">
      <div className="container mx-auto">
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((breadcrumb, index) => (
            <div key={breadcrumb.path} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="w-4 h-4 text-slate-600" />}
              
              {index === breadcrumbs.length - 1 ? (
                // Current page (not clickable)
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  {breadcrumb.icon && breadcrumb.icon}
                  {breadcrumb.label}
                </span>
              ) : (
                // Previous pages (clickable)
                <Link href={breadcrumb.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-slate-200 h-auto p-0 font-normal hover:bg-transparent"
                  >
                    <span className="flex items-center gap-1">
                      {breadcrumb.icon && breadcrumb.icon}
                      {breadcrumb.label}
                    </span>
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

