import { AlertCircle, RefreshCw, WifiOff, ServerCrash, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Error types
export type ErrorType = 'network' | 'server' | 'notfound' | 'unauthorized' | 'validation' | 'unknown';

interface ErrorInfo {
  type: ErrorType;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  suggestion: string;
}

const ERROR_INFO: Record<ErrorType, ErrorInfo> = {
  network: {
    type: 'network',
    message: 'Network Connection Error',
    icon: WifiOff,
    color: 'text-orange-400',
    suggestion: 'Please check your internet connection and try again.'
  },
  server: {
    type: 'server',
    message: 'Server Error',
    icon: ServerCrash,
    color: 'text-red-400',
    suggestion: 'Our servers are experiencing issues. Please try again in a moment.'
  },
  notfound: {
    type: 'notfound',
    message: 'Not Found',
    icon: XCircle,
    color: 'text-slate-400',
    suggestion: 'The requested resource could not be found.'
  },
  unauthorized: {
    type: 'unauthorized',
    message: 'Unauthorized Access',
    icon: AlertCircle,
    color: 'text-yellow-400',
    suggestion: 'You do not have permission to access this resource.'
  },
  validation: {
    type: 'validation',
    message: 'Validation Error',
    icon: AlertCircle,
    color: 'text-yellow-400',
    suggestion: 'Please check your input and try again.'
  },
  unknown: {
    type: 'unknown',
    message: 'Something Went Wrong',
    icon: AlertCircle,
    color: 'text-red-400',
    suggestion: 'An unexpected error occurred. Please try again.'
  }
};

// Detect error type from error object
export function detectErrorType(error: any): ErrorType {
  if (!error) return 'unknown';
  
  const message = error.message?.toLowerCase() || '';
  const status = error.data?.httpStatus || error.status;
  
  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  
  // HTTP status codes
  if (status === 404) return 'notfound';
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  
  return 'unknown';
}

// Inline error alert
export function ErrorAlert({ 
  error, 
  onRetry,
  className = ""
}: { 
  error: any; 
  onRetry?: () => void;
  className?: string;
}) {
  const errorType = detectErrorType(error);
  const errorInfo = ERROR_INFO[errorType];
  const Icon = errorInfo.icon;

  return (
    <Alert className={`bg-red-900/20 border-red-700/50 ${className}`}>
      <Icon className="h-4 w-4 text-red-400" />
      <AlertTitle className="text-red-300">{errorInfo.message}</AlertTitle>
      <AlertDescription className="text-red-200/80">
        {error.message || errorInfo.suggestion}
        {onRetry && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            className="ml-4 text-red-300 hover:text-red-200 hover:bg-red-800/30"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Full page error state
export function ErrorPage({ 
  error, 
  onRetry,
  title = "Oops! Something went wrong"
}: { 
  error: any; 
  onRetry?: () => void;
  title?: string;
}) {
  const errorType = detectErrorType(error);
  const errorInfo = ERROR_INFO[errorType];
  const Icon = errorInfo.icon;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <Card className="bg-slate-800/50 border-slate-700 max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <Icon className={`w-8 h-8 ${errorInfo.color}`} />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-slate-300">{errorInfo.message}</p>
            <p className="text-sm text-slate-400">{errorInfo.suggestion}</p>
          </div>
          
          {error.message && (
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 font-mono break-all">{error.message}</p>
            </div>
          )}

          {onRetry && (
            <Button 
              onClick={onRetry}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Inline error state (for cards/sections)
export function ErrorState({ 
  error, 
  onRetry,
  compact = false
}: { 
  error: any; 
  onRetry?: () => void;
  compact?: boolean;
}) {
  const errorType = detectErrorType(error);
  const errorInfo = ERROR_INFO[errorType];
  const Icon = errorInfo.icon;

  if (compact) {
    return (
      <div className="flex items-center justify-center py-8 text-center">
        <div className="space-y-3">
          <Icon className={`w-8 h-8 ${errorInfo.color} mx-auto`} />
          <div>
            <p className="text-sm font-medium text-slate-300">{errorInfo.message}</p>
            <p className="text-xs text-slate-500 mt-1">{error.message || errorInfo.suggestion}</p>
          </div>
          {onRetry && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={onRetry}
              className="mt-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
        <Icon className={`w-8 h-8 ${errorInfo.color}`} />
      </div>
      <h3 className="text-lg font-semibold text-slate-300 mb-2">{errorInfo.message}</h3>
      <p className="text-sm text-slate-500 mb-1">{errorInfo.suggestion}</p>
      {error.message && (
        <p className="text-xs text-slate-600 mt-2 max-w-md">{error.message}</p>
      )}
      {onRetry && (
        <Button 
          onClick={onRetry}
          className="mt-4 bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

// Error boundary fallback
export function ErrorBoundaryFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) {
  return (
    <ErrorPage 
      error={error}
      onRetry={resetErrorBoundary}
      title="Application Error"
    />
  );
}

// Query error wrapper - automatically handles loading and error states
export function QueryWrapper({
  isLoading,
  error,
  onRetry,
  loadingComponent,
  children,
  compact = false
}: {
  isLoading: boolean;
  error: any;
  onRetry?: () => void;
  loadingComponent: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
}) {
  if (isLoading) return <>{loadingComponent}</>;
  if (error) return <ErrorState error={error} onRetry={onRetry} compact={compact} />;
  return <>{children}</>;
}

