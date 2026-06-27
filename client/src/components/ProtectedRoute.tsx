import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        // If response is not JSON, user is not authenticated
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          setIsAuthenticated(false);
          setLocation('/admin/login');
          return;
        }

        if (response.ok) {
          const user = await response.json();
          // Four-tier model (T14): superadmin, admin, and field_manager have admin UI access
          const hasAdminAccess = user && (
            user.role === 'superadmin' ||
            user.role === 'admin' ||
            user.role === 'field_manager'
          );
          if (hasAdminAccess) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            setLocation('/admin/login');
          }
        } else {
          setIsAuthenticated(false);
          setLocation('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setLocation('/admin/login');
      }
    };

    checkAuth();
  }, [setLocation]);

  if (isAuthenticated === null) {
    // Loading state
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

