import { useQuery } from "@tanstack/react-query";

export interface AuthUser {
  id: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin" | "field_manager";
  fieldManagerId: number | null;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const isAdmin = user?.role === "admin";
  const isFieldManager = user?.role === "field_manager";
  const fieldManagerId = user?.fieldManagerId;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    isFieldManager,
    fieldManagerId,
  };
}
