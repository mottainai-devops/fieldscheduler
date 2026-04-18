import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Spinner component
export function Spinner({ size = "default", className = "" }: { size?: "sm" | "default" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-8 h-8",
    lg: "w-12 h-12"
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

// Full page loading
export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
      <Spinner size="lg" className="text-blue-500 mb-4" />
      <p className="text-slate-400 text-lg">{message}</p>
    </div>
  );
}

// Inline loading for buttons
export function ButtonLoader() {
  return <Spinner size="sm" className="mr-2" />;
}

// Table skeleton loader
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-12 bg-slate-700/30 rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card skeleton loader
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <div className="h-4 bg-slate-700/50 rounded animate-pulse w-2/3" />
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-slate-700/50 rounded animate-pulse w-1/2 mb-2" />
            <div className="h-3 bg-slate-700/50 rounded animate-pulse w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// List skeleton loader
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
          <div className="w-12 h-12 bg-slate-700/50 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-700/50 rounded animate-pulse w-1/3" />
            <div className="h-3 bg-slate-700/50 rounded animate-pulse w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Centered loading state
export function CenteredLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner size="lg" className="text-blue-500 mb-4" />
      <p className="text-slate-400">{message}</p>
    </div>
  );
}

// Overlay loading (for modals/dialogs)
export function OverlayLoader({ message = "Processing..." }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-50 rounded-lg">
      <Spinner size="lg" className="text-blue-500 mb-4" />
      <p className="text-white font-medium">{message}</p>
    </div>
  );
}

// Progress bar component
export function ProgressBar({ progress, message }: { progress: number; message?: string }) {
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm text-slate-400">
        <span>{message || "Loading..."}</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Empty state component
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon?: React.ComponentType<{ className?: string }>; 
  title: string; 
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="w-16 h-16 text-slate-600 mb-4" />}
      <h3 className="text-xl font-semibold text-slate-300 mb-2">{title}</h3>
      {description && <p className="text-slate-500 mb-4 max-w-md">{description}</p>}
      {action}
    </div>
  );
}

