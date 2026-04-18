import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bell, Trash2, CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "success" | "warning" | "info";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Initialize with sample notifications
  useEffect(() => {
    const sampleNotifications: Notification[] = [
      {
        id: "1",
        type: "success",
        title: "Route Created",
        message: "Morning Route for Bukola has been created with 5 customers",
        timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
        read: false,
      },
      {
        id: "2",
        type: "info",
        title: "Tag Assignment",
        message: "Halleluyah has been assigned 6 new building IDs",
        timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
        read: false,
      },
      {
        id: "3",
        type: "warning",
        title: "Route Status",
        message: "Afternoon Route is approaching deadline - 2 hours remaining",
        timestamp: new Date(Date.now() - 2 * 60 * 60000), // 2 hours ago
        read: true,
      },
      {
        id: "4",
        type: "success",
        title: "Route Completed",
        message: "Juwon completed route with 100% customer coverage",
        timestamp: new Date(Date.now() - 4 * 60 * 60000), // 4 hours ago
        read: true,
      },
    ];
    setNotifications(sampleNotifications);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
    toast.success("All notifications cleared");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-400" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-900/20 border-green-700";
      case "warning":
        return "bg-yellow-900/20 border-yellow-700";
      case "info":
        return "bg-blue-900/20 border-blue-700";
      default:
        return "bg-slate-700/20 border-slate-600";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative text-slate-300 hover:text-white hover:bg-slate-700 h-auto p-2">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center p-0">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md max-h-[600px] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white">Notifications</DialogTitle>
              <DialogDescription>
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up!"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bell className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-slate-400 text-center">No notifications yet</p>
          </div>
        ) : (
          <>
            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border transition ${getTypeColor(
                    notification.type
                  )} ${!notification.read ? "bg-opacity-40" : "bg-opacity-20"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white text-sm">{notification.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{notification.message}</p>
                          <p className="text-xs text-slate-500 mt-2">{formatTime(notification.timestamp)}</p>
                        </div>
                        {!notification.read && (
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-red-400 h-auto p-1"
                      onClick={() => handleDeleteNotification(notification.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {!notification.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-blue-400 hover:text-blue-300 mt-2 h-auto p-0"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="border-t border-slate-700 pt-3 mt-3 flex gap-2">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 text-xs"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 text-xs"
                onClick={handleClearAll}
              >
                Clear all
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

