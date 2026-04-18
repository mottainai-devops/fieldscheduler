import { useState, useRef, useEffect } from "react";
import { Bell, X, Check, CheckCheck, AlertTriangle, Gavel, TrendingUp, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: number;
  createdAt: string;
  relatedId?: number;
}

function getNotificationIcon(type: string) {
  switch (type?.toLowerCase()) {
    case "violation":
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case "notice":
      return <Gavel className="w-4 h-4 text-red-400" />;
    case "compliance":
      return <Check className="w-4 h-4 text-green-400" />;
    case "escalation":
      return <ShieldAlert className="w-4 h-4 text-orange-400" />;
    default:
      return <TrendingUp className="w-4 h-4 text-blue-400" />;
  }
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface AdminNotificationBellProps {
  isCollapsed: boolean;
}

export default function AdminNotificationBell({ isCollapsed }: AdminNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: countData, refetch: refetchCount } = trpc.adminNotifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const { data: notifications = [], refetch: refetchAll } = trpc.adminNotifications.getAll.useQuery(undefined, {
    enabled: isOpen,
    refetchInterval: isOpen ? 15000 : false,
  });

  const markAsRead = trpc.adminNotifications.markAsRead.useMutation({
    onSuccess: () => {
      refetchCount();
      refetchAll();
    },
  });

  const markAllAsRead = trpc.adminNotifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchCount();
      refetchAll();
    },
  });

  const unreadCount = countData?.count ?? 0;

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors",
          "hover:bg-slate-800",
          isCollapsed && "justify-center",
          isOpen && "bg-slate-800"
        )}
        title={isCollapsed ? `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}` : undefined}
      >
        <div className="relative flex-shrink-0">
          <Bell className="w-5 h-5 text-slate-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <span className="text-sm text-slate-300 flex-1 text-left">Notifications</span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          className={cn(
            "absolute bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col",
            isCollapsed ? "left-full ml-2 w-80" : "left-0 w-80"
          )}
          style={{ maxHeight: "420px" }}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4 text-slate-400 hover:text-green-400" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No notifications</p>
                <p className="text-xs text-slate-500 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {(notifications as Notification[]).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markAsRead.mutate({ id: n.id });
                    }}
                    className={cn(
                      "flex gap-3 px-4 py-3 cursor-pointer transition-colors",
                      n.isRead
                        ? "hover:bg-slate-700/30"
                        : "bg-blue-900/10 hover:bg-blue-900/20"
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={cn(
                          "text-sm leading-tight",
                          n.isRead ? "text-slate-300 font-normal" : "text-white font-semibold"
                        )}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      {n.message && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
