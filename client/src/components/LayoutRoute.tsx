import { ComponentType } from "react";
import { Route, RouteProps } from "wouter";
import MainLayout from "./MainLayout";
import RequireAuth from "./RequireAuth";
import RequireAdmin from "./RequireAdmin";
import RequireSuperadmin from "./RequireSuperadmin";
import RequireFieldManager from "./RequireFieldManager";

interface LayoutRouteProps extends Omit<RouteProps, "component"> {
  component: ComponentType<any>;
  requireAuth?: boolean;
  /** requireFieldManager: superadmin + admin + field_manager (T14 Item 4) */
  requireFieldManager?: boolean;
  /** requireAdmin: superadmin + admin (T14 Item 4) */
  requireAdmin?: boolean;
  /** requireSuperadmin: superadmin only (T14 Item 4) */
  requireSuperadmin?: boolean;
}

/**
 * LayoutRoute — wraps a page component in MainLayout and an optional auth guard.
 *
 * Guard hierarchy (T14 Item 4 four-tier model):
 *   requireSuperadmin  → superadmin only
 *   requireAdmin       → superadmin + admin
 *   requireFieldManager → superadmin + admin + field_manager
 *   requireAuth        → any authenticated user
 *   (none)             → public
 *
 * Only one guard prop should be set per route. If multiple are set,
 * the most restrictive wins (superadmin > admin > fieldManager > auth).
 */
export default function LayoutRoute({
  component: Component,
  requireAuth = false,
  requireFieldManager = false,
  requireAdmin = false,
  requireSuperadmin = false,
  ...props
}: LayoutRouteProps) {
  const content = (
    <MainLayout>
      <Component />
    </MainLayout>
  );

  const guarded = requireSuperadmin
    ? <RequireSuperadmin>{content}</RequireSuperadmin>
    : requireAdmin
    ? <RequireAdmin>{content}</RequireAdmin>
    : requireFieldManager
    ? <RequireFieldManager>{content}</RequireFieldManager>
    : requireAuth
    ? <RequireAuth>{content}</RequireAuth>
    : content;

  return (
    <Route {...props}>
      {guarded}
    </Route>
  );
}
