import { trpc } from "@/lib/trpc";

export interface AuthUser {
  id: number;
  name: string | null;
  email: string | null;
  // Four-tier role model (T14 Item 1):
  //   superadmin    → full access, no data scoping (adey, info@mottainai.africa)
  //   admin         → admin UI access, all customers visible (no scoping)
  //   field_manager → admin UI access, scoped to assigned customers
  //   supervisor    → mobile app only, no admin UI access
  //   user          → no admin access
  role: "user" | "admin" | "field_manager" | "superadmin" | "supervisor";
  fieldManagerId: number | null;
}

/**
 * Lightweight auth hook for fieldscheduler pages.
 * Uses trpc.auth.me (reads from DB on every request) instead of /api/user (404).
 * Derives isSuperadmin / isAdmin / isFieldManager from the user's role field.
 *
 * Four-tier model (T14):
 *   isSuperadmin   → role === 'superadmin' (full access, no scoping)
 *   isAdmin        → role ∈ {'superadmin','admin'} (admin UI access, all data)
 *   isFieldManager → role ∈ {'superadmin','admin','field_manager'} (has admin UI access)
 */
export function useAuth() {
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isSuperadmin = user?.role === "superadmin";
  const isAdmin = user?.role === "superadmin" || user?.role === "admin";
  // isFieldManager: true for superadmin, admin, and field_manager (all have admin UI access)
  const isFieldManager =
    user?.role === "superadmin" ||
    user?.role === "admin" ||
    user?.role === "field_manager";
  const fieldManagerId = (user as any)?.fieldManagerId ?? null;

  // Legacy alias — kept so existing components that read isSystemAdmin still compile.
  // Remove after Item 4 frontend guards are applied.
  const isSystemAdmin = isSuperadmin;

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isSuperadmin,
    isSystemAdmin, // legacy alias for isSuperadmin
    isAdmin,
    isFieldManager,
    fieldManagerId,
  };
}
