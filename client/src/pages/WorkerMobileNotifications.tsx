import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, BellOff, CheckCheck, ArrowLeft, MapPin, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function WorkerMobileNotifications() {
  const [, setLocation] = useLocation();
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

  useEffect(() => {
    const workerId = localStorage.getItem('selectedWorkerId');
    if (workerId) {
      setSelectedWorkerId(parseInt(workerId));
    } else {
      setLocation('/worker-mobile');
    }
  }, [setLocation]);

  const { data: notifications = [], refetch } = trpc.workerNotifications.getWorkerNotifications.useQuery(
    { workerId: selectedWorkerId || 0 },
    { enabled: !!selectedWorkerId }
  );

  const markAsReadMutation = trpc.workerNotifications.markAsRead.useMutation();
  const markAllAsReadMutation = trpc.workerNotifications.markAllAsRead.useMutation();

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsReadMutation.mutateAsync({ id });
      await refetch();
    } catch (error: any) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!selectedWorkerId) return;
    
    try {
      await markAllAsReadMutation.mutateAsync({ workerId: selectedWorkerId });
      await refetch();
      toast.success("All notifications marked as read");
    } catch (error: any) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate to related route if applicable
    if (notification.type === 'route_assigned' && notification.relatedId) {
      setLocation(`/worker-mobile/route/${notification.relatedId}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setLocation('/worker-mobile')}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              size="sm"
              variant="outline"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30"
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark All Read
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-white/80 text-sm">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <BellOff className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No notifications yet</p>
              <p className="text-slate-500 text-sm mt-2">
                You'll be notified when routes are assigned to you
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`border-slate-700 cursor-pointer transition-all hover:scale-[1.02] ${
                notification.isRead 
                  ? 'bg-slate-800' 
                  : 'bg-blue-900/30 border-blue-600'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.isRead ? 'bg-slate-700' : 'bg-blue-600'
                  }`}>
                    {notification.type === 'route_assigned' ? (
                      <MapPin className="w-5 h-5 text-white" />
                    ) : (
                      <Bell className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-semibold ${
                        notification.isRead ? 'text-slate-300' : 'text-white'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>
                      )}
                    </div>

                    <p className={`text-sm mb-2 ${
                      notification.isRead ? 'text-slate-400' : 'text-slate-300'
                    }`}>
                      {notification.message}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {notification.type === 'route_assigned' && notification.relatedId && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotificationClick(notification);
                      }}
                    >
                      View Route
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

