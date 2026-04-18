import { ComponentType } from "react";
import { Route, RouteProps } from "wouter";
import MainLayout from "./MainLayout";
import RequireAuth from "./RequireAuth";

interface LayoutRouteProps extends Omit<RouteProps, "component"> {
  component: ComponentType<any>;
  requireAuth?: boolean;
}

export default function LayoutRoute({ component: Component, requireAuth = false, ...props }: LayoutRouteProps) {
  const content = (
    <MainLayout>
      <Component />
    </MainLayout>
  );

  return (
    <Route {...props}>
      {requireAuth ? <RequireAuth>{content}</RequireAuth> : content}
    </Route>
  );
}
