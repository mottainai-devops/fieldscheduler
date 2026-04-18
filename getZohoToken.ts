/**
 * Get Zoho access token from refresh token
 */
import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables first
config();

async function getAccessToken() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ Missing Zoho credentials in environment');
    console.error(`Client ID: ${clientId ? 'SET' : 'MISSING'}`);
    console.error(`Client Secret: ${clientSecret ? 'SET' : 'MISSING'}`);
    console.error(`Refresh Token: ${refreshToken ? 'SET' : 'MISSING'}`);
    throw new Error('Missing Zoho credentials in environment');
  }

  try {
    const response = await axios.post(
      'https://accounts.zoho.com/oauth/v2/token',
      null,
      {
        params: {
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        },
      }
    );

    const accessToken = response.data.access_token;
    const expiresIn = response.data.expires_in;
    
    // Output just the token for easy capture
    console.log(accessToken);
    
    return accessToken;
  } catch (error: any) {
    console.error('❌ Error getting access token:', error.response?.data || error.message);
    throw error;
  }
}

getAccessToken()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
