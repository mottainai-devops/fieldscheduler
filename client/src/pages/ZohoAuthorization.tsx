import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

interface AuthStatus {
  isConfigured: boolean;
  hasRefreshToken: boolean;
  hasAccessToken: boolean;
}

interface AuthResponse {
  success: boolean;
  status: AuthStatus;
  message: string;
  nextSteps?: string;
}

interface StartAuthResponse {
  success: boolean;
  message: string;
  authUrl: string;
  redirectUri: string;
}

export default function ZohoAuthorization() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingAuth, setStartingAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check current authorization status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/zoho/auth/status");
        const data: AuthResponse = await response.json();
        
        if (data.success) {
          setAuthStatus(data.status);
        } else {
          setError("Failed to check authorization status");
        }
      } catch (err) {
        console.error("Error checking auth status:", err);
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Start the OAuth flow
  const handleStartAuth = async () => {
    try {
      setStartingAuth(true);
      setError(null);
      
      const response = await fetch("/api/zoho/auth/start");
      const data: StartAuthResponse = await response.json();
      
      if (data.success && data.authUrl) {
        setAuthUrl(data.authUrl);
        // Open the auth URL in a new window
        window.open(data.authUrl, "zoho-auth", "width=800,height=600");
      } else {
        setError("Failed to generate authorization URL");
      }
    } catch (err) {
      console.error("Error starting auth:", err);
      setError("Failed to start authorization process");
    } finally {
      setStartingAuth(false);
    }
  };

  // Refresh status after authorization
  const handleRefreshStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/zoho/auth/status");
      const data: AuthResponse = await response.json();
      
      if (data.success) {
        setAuthStatus(data.status);
        if (data.status.hasRefreshToken) {
          setError(null);
        }
      }
    } catch (err) {
      console.error("Error refreshing status:", err);
      setError("Failed to refresh authorization status");
    } finally {
      setLoading(false);
    }
  };

  // Manually refresh the access token
  const handleManualTokenRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/trpc/integrations.refreshZohoToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      if (data.result?.data?.success) {
        // Refresh the status to show the updated token state
        await handleRefreshStatus();
      } else {
        setError("Failed to refresh access token. Please try again.");
      }
    } catch (err) {
      console.error("Error refreshing token:", err);
      setError("Failed to refresh access token");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !authStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
              <span className="ml-2 text-slate-600">Loading authorization status...</span>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Zoho Books Integration</h1>
          <p className="text-slate-600">
            Authorize access to your Zoho Books account to fetch customer statements and financial data
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {authStatus?.hasRefreshToken ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-green-600">Authorized</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="text-amber-600">Not Authorized</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {authStatus?.hasRefreshToken
                ? "Your application is authorized to access Zoho Books"
                : "Your application needs authorization to access Zoho Books"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Configuration Status</span>
                <span className={authStatus?.isConfigured ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {authStatus?.isConfigured ? "✓ Configured" : "✗ Not Configured"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Refresh Token</span>
                <span className={authStatus?.hasRefreshToken ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {authStatus?.hasRefreshToken ? "✓ Available" : "✗ Not Available"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Access Token</span>
                <span className={authStatus?.hasAccessToken ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                  {authStatus?.hasAccessToken ? "✓ Active" : "⚠ Not Active"}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Authorization Button */}
            {!authStatus?.hasRefreshToken && (
              <Button
                onClick={handleStartAuth}
                disabled={startingAuth}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {startingAuth ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Preparing Authorization...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Authorize with Zoho Books
                  </>
                )}
              </Button>
            )}

            {/* Refresh Status Button */}
            {authStatus?.hasRefreshToken && (
              <div className="space-y-2">
                <Button
                  onClick={handleRefreshStatus}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing Status...
                    </>
                  ) : (
                    "Refresh Status"
                  )}
                </Button>
                {!authStatus?.hasAccessToken && (
                  <Button
                    onClick={handleManualTokenRefresh}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Refreshing Token...
                      </>
                    ) : (
                      "Refresh Access Token"
                    )}
                  </Button>
                )}
                <Button
                  onClick={handleStartAuth}
                  disabled={startingAuth}
                  variant="outline"
                  className="w-full text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  {startingAuth ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting Fresh Authorization...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Start Fresh Authorization
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-medium">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">Click Authorize</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Click the "Authorize with Zoho Books" button to start the authorization process
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-medium">
                    2
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">Login to Zoho</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    A new window will open where you can log in to your Zoho Books account
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-medium">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">Grant Permission</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Grant the application permission to access your Zoho Books data
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-medium">
                    4
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">Automatic Setup</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    You'll be redirected back automatically, and the system will store your authorization
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What You Can Do After Authorization</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>View customer statements and payment history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Generate PDF reports with financial data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Track customer invoices and receipts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Monitor payment compliance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Access real-time financial information</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Direct URL Option */}
        {authUrl && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-sm text-blue-900">Direct Authorization Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-blue-800">
                If the popup didn't open, you can use this link:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={authUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-xs bg-white border border-blue-200 rounded text-blue-900 font-mono overflow-hidden"
                />
                <Button
                  onClick={() => window.open(authUrl, "_blank")}
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-100"
                >
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

