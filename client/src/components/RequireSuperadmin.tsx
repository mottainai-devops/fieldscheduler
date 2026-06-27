import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface RequireSuperadminProps {
  children: React.ReactNode;
}

/**
 * RequireSuperadmin — wraps routes that require superadmin role only.
 * Redirects to /login if unauthenticated, or shows a 403 message if authenticated
 * but lacking the required role.
 *
 * T14 Item 4: Part of the four-tier frontend guard model.
 * Allowed: superadmin only
 * Blocked: admin, field_manager, supervisor, user
 */
export default function RequireSuperadmin({ children }: RequireSuperadminProps) {
  const [, setLocation] = useLocation();
  const { data: worker, isLoading } = trpc.auth.me.useQuery();

  const isAuthenticated = !!worker;
  const hasSuperadminRole = worker?.role === "superadmin";

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

  if (!hasSuperadminRole) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-2xl font-bold mb-2">Access Denied</div>
          <div className="text-slate-400 text-sm">
            This page requires Superadmin access.
            <br />
            Contact your administrator if you believe this is an error.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
