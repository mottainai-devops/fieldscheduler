import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface RequireAdminProps {
  children: React.ReactNode;
}

/**
 * RequireAdmin — wraps routes that require system_admin or field_manager role.
 * Redirects to /login if unauthenticated, or shows a 403 message if authenticated
 * but lacking the required role.
 */
export default function RequireAdmin({ children }: RequireAdminProps) {
  const [, setLocation] = useLocation();
  const { data: worker, isLoading } = trpc.auth.me.useQuery();

  const isAuthenticated = !!worker;
  const hasAdminRole =
    worker?.role === "system_admin" ||
    worker?.role === "field_manager" ||
    worker?.role === "admin"; // legacy compat

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!hasAdminRole) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-2xl font-bold mb-2">Access Denied</div>
          <div className="text-slate-400 text-sm">
            You do not have permission to access this page.
            <br />
            Contact your administrator if you believe this is an error.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
