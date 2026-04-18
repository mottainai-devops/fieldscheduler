export function RouteCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
        <div className="h-6 w-16 bg-slate-700 rounded-full"></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="h-4 bg-slate-700 rounded"></div>
        <div className="h-4 bg-slate-700 rounded"></div>
      </div>
      <div className="h-10 bg-slate-700 rounded"></div>
    </div>
  );
}

export function CustomerCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-700 rounded"></div>
        <div className="h-4 bg-slate-700 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function WorkerCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-slate-700 rounded w-2/3"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
      <p className="mt-4 text-slate-400 text-sm">{text}</p>
    </div>
  );
}

