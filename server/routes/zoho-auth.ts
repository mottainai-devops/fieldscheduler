import express, { Request, Response } from "express";
import { getZohoAuthUrl, exchangeCodeForTokens, setRefreshToken, getOAuthStatus } from "../services/zoho";

export const zohoAuthRouter = express.Router();

/**
 * Step 1: Initiate Zoho OAuth flow
 * GET /api/zoho/auth/start
 * 
 * Returns the authorization URL that user should visit
 */
zohoAuthRouter.get("/zoho/auth/start", (req: Request, res: Response) => {
  try {
    // Get the redirect URI from the request or use a default
    // Use https if behind a proxy (X-Forwarded-Proto header)
    
    
    const redirectUri = process.env.ZOHO_REDIRECT_URI || `https://${req.get("host")}/zoho/callback`;

    const authUrl = getZohoAuthUrl(redirectUri);

    res.json({
      success: true,
      message: "Visit this URL to authorize Zoho Books access",
      authUrl,
      redirectUri,
    });
  } catch (err: any) {
    console.error("[Zoho Auth] Start error:", err?.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate authorization URL",
      details: err?.message,
    });
  }
});

/**
 * Step 2: Handle OAuth callback from Zoho
 * GET /api/zoho/auth/callback?code=...&state=...
 * 
 * Exchanges the authorization code for access and refresh tokens
 */
zohoAuthRouter.get("/zoho/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Missing authorization code",
      });
    }

    // Get the redirect URI (must match the one used in the start request)
    // Use https if behind a proxy (X-Forwarded-Proto header)
    
    
    const redirectUri = process.env.ZOHO_REDIRECT_URI || `https://${req.get("host")}/zoho/callback`;

    console.log(`[Zoho Auth] Exchanging code for tokens (redirectUri: ${redirectUri})`);

    // Exchange the authorization code for tokens
    const tokens = await exchangeCodeForTokens(code as string, redirectUri);

    if (!tokens) {
      return res.status(400).json({
        success: false,
        error: "Failed to exchange authorization code for tokens",
        hint: "Check that the authorization code is valid and hasn't expired",
      });
    }

    // Store the refresh token for future use
    setRefreshToken(tokens.refresh_token);

    console.log("[Zoho Auth] Successfully obtained tokens");
    console.log("[Zoho Auth] Refresh token:", tokens.refresh_token.substring(0, 20) + "...");

    // Return success page with instructions
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zoho Authorization Successful</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .info {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            color: #004085;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .code {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 10px;
            border-radius: 3px;
            font-family: monospace;
            word-break: break-all;
            margin: 10px 0;
          }
          h1 { color: #333; }
          h2 { color: #666; font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>✓ Authorization Successful!</h1>
        
        <div class="success">
          <strong>Zoho Books integration is now authorized.</strong>
          <p>The refresh token has been stored and will be used to access your Zoho Books data.</p>
        </div>

        <div class="info">
          <h2>Important: Save Your Refresh Token</h2>
          <p>For production use, save this refresh token as an environment variable:</p>
          <div class="code">${tokens.refresh_token}</div>
          <p>Set it as: <code>ZOHO_REFRESH_TOKEN=${tokens.refresh_token}</code></p>
        </div>

        <h2>Next Steps:</h2>
        <ol>
          <li>The application will now be able to fetch Zoho Books data</li>
          <li>Customer statements and invoices will be accessible</li>
          <li>PDF generation for statements is now enabled</li>
        </ol>

        <p style="margin-top: 30px; color: #666;">
          <a href="/" style="color: #0066cc;">← Return to Dashboard</a>
        </p>
      </body>
      </html>
    `;

    res.type("html").send(html);
  } catch (err: any) {
    console.error("[Zoho Auth] Callback error:", err?.message);
    console.error("[Zoho Auth] Stack:", err?.stack);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Failed</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .code {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 10px;
            border-radius: 3px;
            font-family: monospace;
            word-break: break-all;
            margin: 10px 0;
          }
          h1 { color: #721c24; }
        </style>
      </head>
      <body>
        <h1>✗ Authorization Failed</h1>
        
        <div class="error">
          <strong>Error:</strong> ${err?.message || "Unknown error"}
        </div>

        <h2>Troubleshooting:</h2>
        <ol>
          <li>Check that your Zoho Client ID and Client Secret are correct</li>
          <li>Verify that the redirect URI matches in your Zoho app settings</li>
          <li>Make sure you have the correct Zoho Books organization</li>
          <li>Try again with a fresh authorization request</li>
        </ol>

        <p style="margin-top: 30px; color: #666;">
          <a href="/api/zoho/auth/start" style="color: #0066cc;">← Try Again</a>
        </p>
      </body>
      </html>
    `;

    res.type("html").status(500).send(html);
  }
});

/**
 * Check OAuth status
 * GET /api/zoho/auth/status
 * 
 * Returns the current OAuth authorization status
 */
zohoAuthRouter.get("/zoho/auth/status", (req: Request, res: Response) => {
  try {
    const status = getOAuthStatus();

    res.json({
      success: true,
      status,
      message: status.hasRefreshToken
        ? "Zoho Books is authorized and ready to use"
        : "Zoho Books is not authorized. Please complete the authorization flow.",
      nextSteps: !status.hasRefreshToken
        ? "Visit /api/zoho/auth/start to authorize"
        : undefined,
    });
  } catch (err: any) {
    console.error("[Zoho Auth] Status check error:", err?.message);
    res.status(500).json({
      success: false,
      error: "Failed to check authorization status",
      details: err?.message,
    });
  }
});

export default zohoAuthRouter;

