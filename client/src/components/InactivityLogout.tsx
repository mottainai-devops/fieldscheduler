import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

export default function InactivityLogout() {
  const [, setLocation] = useLocation();
  const logoutMutation = trpc.workerAuth.logout.useMutation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      // Auto logout after 3 minutes of inactivity
      logoutMutation.mutate(undefined, {
        onSuccess: () => {
          toast.info("You've been logged out due to inactivity");
          // Check if user is on worker-mobile page
          const isWorkerMobile = window.location.pathname.startsWith('/worker-mobile');
          window.location.href = isWorkerMobile ? "/worker-mobile" : "/login";
        },
      });
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    // Events that indicate user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    // Reset timer on any user activity
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  return null; // This component doesn't render anything
}

