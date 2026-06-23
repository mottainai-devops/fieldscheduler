import { trpc } from "@/lib/trpc";

export interface AuthUser {
  id: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin" | "field_manager";
  fieldManagerId: number | null;
}

/**
 * Lightweight auth hook for fieldscheduler pages.
 * Uses trpc.auth.me (reads from DB on every request) instead of /api/user (404).
 * Derives isAdmin / isFieldManager from the user's role field.
 */
export function useAuth() {
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isAdmin = user?.role === "admin";
  const isFieldManager = user?.role === "field_manager";
  const fieldManagerId = (user as any)?.fieldManagerId ?? null;

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    isFieldManager,
    fieldManagerId,
  };
}
