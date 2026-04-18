import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function ZohoCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing authorization...");

  const utils = trpc.useUtils();
  const exchangeCode = trpc.integrations.exchangeZohoCode.useMutation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Authorization failed: ${error}`);
      setTimeout(() => setLocation("/zoho"), 3000);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received");
      setTimeout(() => setLocation("/zoho"), 3000);
      return;
    }

    // Exchange code for tokens
    const redirectUri = `${window.location.origin}/zoho/callback`;
    
    exchangeCode.mutate(
      { code, redirectUri },
      {
        onSuccess: (data) => {
          if (data) {
            setStatus("success");
            setMessage("Successfully connected to Zoho Books!");
            // Invalidate the Zoho status query so the next page sees the updated status
            utils.integrations.getZohoStatus.invalidate();
            setTimeout(() => setLocation("/zoho"), 2000);
          } else {
            setStatus("error");
            setMessage("Failed to exchange authorization code");
            setTimeout(() => setLocation("/zoho"), 3000);
          }
        },
        onError: (error) => {
          setStatus("error");
          setMessage(`Error: ${error.message}`);
          setTimeout(() => setLocation("/zoho"), 3000);
        },
      }
    );
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <Card className="bg-slate-800/50 border-slate-700 max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            {status === "loading" && (
              <>
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" />
                <h2 className="text-xl font-bold text-white mb-2">Connecting to Zoho Books</h2>
                <p className="text-slate-400">{message}</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                <h2 className="text-xl font-bold text-white mb-2">Success!</h2>
                <p className="text-slate-400">{message}</p>
                <p className="text-sm text-slate-500 mt-2">Redirecting...</p>
              </>
            )}

            {status === "error" && (
              <>
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <h2 className="text-xl font-bold text-white mb-2">Connection Failed</h2>
                <p className="text-slate-400">{message}</p>
                <p className="text-sm text-slate-500 mt-2">Redirecting...</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

