import { ReactNode } from "react";
import SidebarNavigation from "./SidebarNavigation";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNavigation />
      <main className="flex-1 ml-16 lg:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
