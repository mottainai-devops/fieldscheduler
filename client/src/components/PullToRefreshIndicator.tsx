import { Loader2, RefreshCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  shouldTrigger: boolean;
}

export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  pullDistance,
  shouldTrigger,
}: PullToRefreshIndicatorProps) {
  if (!isPulling && !isRefreshing) return null;

  const opacity = Math.min(pullDistance / 80, 1);
  const rotation = pullDistance * 2;

  return (
    <div
      className="fixed top-0 left-0 right-0 flex justify-center items-center z-50 pointer-events-none"
      style={{
        transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
        transition: isRefreshing || !isPulling ? "transform 0.3s ease-out" : "none",
      }}
    >
      <div
        className="bg-slate-800 rounded-full p-3 shadow-lg"
        style={{ opacity: isRefreshing ? 1 : opacity }}
      >
        {isRefreshing ? (
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        ) : (
          <RefreshCw
            className={`w-6 h-6 transition-colors ${
              shouldTrigger ? "text-green-400" : "text-slate-400"
            }`}
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

