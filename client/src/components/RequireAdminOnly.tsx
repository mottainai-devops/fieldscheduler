import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface RequireAdminOnlyProps {
  children: React.ReactNode;
}

/**
 * RequireAdminOnly — wraps routes that require admin or superadmin role.
 * Field managers are redirected to /field-manager/dashboard (their dedicated view).
 * Unauthenticated users are redirected to /admin/login.
 *
 * T26 Fix 2: Restricts /dashboard to admin/superadmin only.
 * Contrast with RequireFieldManager (allows field_manager+) and
 * RequireAdmin (also allows field_manager — kept for backward compat on other routes).
 */
export default function RequireAdminOnly({ children }: RequireAdminOnlyProps) {
  const [, setLocation] = useLocation();
  const { data: worker, isLoading } = trpc.auth.me.useQuery();

  const isAuthenticated = !!worker;
  const isAdminOrAbove =
    worker?.role === "superadmin" || worker?.role === "admin";
  const isFieldManager = worker?.role === "field_manager";

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/admin/login");
      return;
    }
    // T26 Fix 2: field managers have their own dashboard — redirect them there
    if (isFieldManager) {
      setLocation("/field-manager/dashboard");
    }
  }, [isAuthenticated, isFieldManager, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || isFieldManager) {
    return null;
  }

  if (!isAdminOrAbove) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-2xl font-bold mb-2">Access Denied</div>
          <div className="text-slate-400 text-sm">
            This page requires admin access.
            <br />
            Contact your administrator if you believe this is an error.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
