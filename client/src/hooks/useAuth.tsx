import { trpc } from "@/lib/trpc";

export interface AuthUser {
  id: number;
  name: string | null;
  email: string | null;
  // Three-tier role model:
  //   system_admin  → full access, no data scoping (adey, info@mottainai.africa)
  //   field_manager → admin UI access, scoped to assigned customers
  //   user          → no admin access
  //   admin         → legacy value (kept for backward compat, treated as field_manager)
  role: "user" | "admin" | "field_manager" | "system_admin";
  fieldManagerId: number | null;
}

/**
 * Lightweight auth hook for fieldscheduler pages.
 * Uses trpc.auth.me (reads from DB on every request) instead of /api/user (404).
 * Derives isAdmin / isFieldManager / isSystemAdmin from the user's role field.
 *
 * Three-tier model:
 *   isSystemAdmin  → role === 'system_admin' (full access, no scoping)
 *   isAdmin        → role === 'system_admin' || role === 'field_manager' (has admin UI access)
 *   isFieldManager → role === 'field_manager' (scoped field manager)
 */
export function useAuth() {
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isSystemAdmin = user?.role === "system_admin";
  // isAdmin: true for both system_admin and field_manager (both have admin UI access)
  const isAdmin = user?.role === "system_admin" || user?.role === "field_manager" || user?.role === "admin";
  const isFieldManager = user?.role === "field_manager";
  const fieldManagerId = (user as any)?.fieldManagerId ?? null;

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isSystemAdmin,
    isAdmin,
    isFieldManager,
    fieldManagerId,
  };
}
