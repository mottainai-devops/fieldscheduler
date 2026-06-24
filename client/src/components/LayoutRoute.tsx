import { ComponentType } from "react";
import { Route, RouteProps } from "wouter";
import MainLayout from "./MainLayout";
import RequireAuth from "./RequireAuth";
import RequireAdmin from "./RequireAdmin";

interface LayoutRouteProps extends Omit<RouteProps, "component"> {
  component: ComponentType<any>;
  requireAuth?: boolean;
  /** requireAdmin implies requireAuth — only system_admin / field_manager / admin roles */
  requireAdmin?: boolean;
}

export default function LayoutRoute({
  component: Component,
  requireAuth = false,
  requireAdmin = false,
  ...props
}: LayoutRouteProps) {
  const content = (
    <MainLayout>
      <Component />
    </MainLayout>
  );

  const guarded = requireAdmin
    ? <RequireAdmin>{content}</RequireAdmin>
    : requireAuth
    ? <RequireAuth>{content}</RequireAuth>
    : content;

  return (
    <Route {...props}>
      {guarded}
    </Route>
  );
}
