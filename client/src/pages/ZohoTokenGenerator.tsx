import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle2, AlertCircle } from "lucide-react";

export default function ZohoTokenGenerator() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const redirectUri = `${window.location.origin}/zoho/callback`;
  
  const authUrl = clientId 
    ? `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.fullaccess.all&client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&access_type=offline&prompt=consent`
    : "";

  const generateToken = async () => {
    if (!clientId || !clientSecret || !authCode) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code: authCode,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const data = await response.json();
      
      if (data.refresh_token) {
        setRefreshToken(data.refresh_token);
        setError("");
      } else {
        setError(data.error || "Failed to generate refresh token");
      }
    } catch (err) {
      setError("Network error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(refreshToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(authUrl);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-4"
          >
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-white">Zoho Refresh Token Generator</h1>
          <p className="text-slate-400 mt-2">
            Generate a permanent refresh token for Zoho Books API access
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Step 1: Enter Your Zoho Credentials</CardTitle>
            <CardDescription>
              Enter your Zoho Client ID and Client Secret from the Zoho Developer Console
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clientId" className="text-slate-300">Client ID</Label>
              <Input
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="1000.XXXXXXXXXXXXXXXXXXXXXX"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="clientSecret" className="text-slate-300">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Enter your client secret"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {clientId && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Step 2: Authorize the Application</CardTitle>
              <CardDescription>
                Click the button below to authorize Field Worker Scheduler to access your Zoho Books data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-slate-800 border-slate-700">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-slate-300">
                  Make sure this redirect URI is added to your Zoho Developer Console:
                  <code className="block mt-2 p-2 bg-slate-950 rounded text-sm text-blue-400">
                    {redirectUri}
                  </code>
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(authUrl, "_blank")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Authorize Zoho Books
                </Button>
                <Button
                  variant="outline"
                  onClick={copyUrl}
                  className="border-slate-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Step 3: Enter Authorization Code</CardTitle>
            <CardDescription>
              After authorizing, you'll be redirected back. Copy the "code" parameter from the URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="authCode" className="text-slate-300">Authorization Code</Label>
              <Input
                id="authCode"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Paste the authorization code from the redirect URL"
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-sm text-slate-500 mt-2">
                Look for <code className="text-blue-400">?code=XXXXXXXXX</code> in the URL after redirect
              </p>
            </div>

            <Button
              onClick={generateToken}
              disabled={loading || !clientId || !clientSecret || !authCode}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Generating..." : "Generate Refresh Token"}
            </Button>

            {error && (
              <Alert className="bg-red-900/20 border-red-800">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {refreshToken && (
          <Card className="bg-slate-900 border-green-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Success! Your Refresh Token
              </CardTitle>
              <CardDescription>
                Save this token securely. You'll need to add it to your application secrets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-950 rounded border border-green-800">
                <code className="text-green-400 break-all text-sm">{refreshToken}</code>
              </div>
              
              <Button
                onClick={copyToken}
                className="bg-green-600 hover:bg-green-700"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Refresh Token
                  </>
                )}
              </Button>

              <Alert className="bg-blue-900/20 border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-300">
                  <strong>Next Step:</strong> Add this refresh token to your application's environment variables as <code className="text-blue-400">ZOHO_REFRESH_TOKEN</code>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

