import axios from "axios";
import { INVOICE_STATUS } from '../../shared/constants/invoice-status';

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '';
const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID || '';

// Store refresh token in memory (in production, use database)
// Initialize from environment variable if available
let ZOHO_REFRESH_TOKEN: string | null = process.env.ZOHO_REFRESH_TOKEN || null;
let ZOHO_ACCESS_TOKEN: string | null = null;
let TOKEN_EXPIRY: number = 0;

/**
 * Save tokens to database
 */
async function saveTokensToDatabase(accessToken: string, refreshToken: string, expiresIn: number) {
  try {
    const { getDb } = await import("../db");
    const { zohoTokens } = await import("../../drizzle/schema");
    const db = await getDb();
    
    if (!db) return;
    
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await db.delete(zohoTokens);
    await db.insert(zohoTokens).values({
      accessToken,
      refreshToken,
      expiresAt,
    });
  } catch (error) {
    console.error('[Zoho] Failed to save tokens:', error);
  }
}

console.log('[Zoho] Initialization:');
console.log('[Zoho] ZOHO_CLIENT_ID:', ZOHO_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('[Zoho] ZOHO_CLIENT_SECRET:', ZOHO_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('[Zoho] ZOHO_ORGANIZATION_ID:', ZOHO_ORGANIZATION_ID ? 'SET' : 'NOT SET');
console.log('[Zoho] ZOHO_REFRESH_TOKEN:', ZOHO_REFRESH_TOKEN ? 'SET (length: ' + ZOHO_REFRESH_TOKEN.length + ')' : 'NOT SET');
console.log('[Zoho] process.env.ZOHO_REFRESH_TOKEN:', process.env.ZOHO_REFRESH_TOKEN ? 'SET' : 'NOT SET');

/**
 * Load tokens from database on startup
 */
async function loadTokensFromDatabase() {
  try {
    const { getDb } = await import("../db");
    const { zohoTokens } = await import("../../drizzle/schema");
    const db = await getDb();
    
    if (!db) return;
    
    const tokens = await db.select().from(zohoTokens).limit(1);
    if (tokens.length > 0) {
      const token = tokens[0];
      ZOHO_REFRESH_TOKEN = token.refreshToken;
      ZOHO_ACCESS_TOKEN = token.accessToken;
      TOKEN_EXPIRY = token.expiresAt.getTime();
      console.log('[Zoho] Loaded valid tokens from database');
    }
  } catch (error) {
    console.error('[Zoho] Failed to load tokens from database:', error);
  }
}

// Load tokens from database on startup
loadTokensFromDatabase().catch(e => console.error('[Zoho] Error loading tokens:', e));

const ZOHO_AUTH_URL = "https://accounts.zoho.com/oauth/v2";
const ZOHO_API_URL = "https://www.zohoapis.com/books/v3";

/**
 * Retry utility with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[Zoho] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

export interface ZohoContact {
  contact_id: string;
  contact_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  billing_address?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  custom_fields?: Array<{
    label: string;
    value: string;
  }>;
  cf_latitude?: string;  // Custom field for latitude
  cf_longitude?: string; // Custom field for longitude
  // Standard Zoho Books columns
  customermaf?: string;  // Building ID from CUSTOMERMAF column
  field_manager?: string; // Field manager name from FIELD MANAGER column
  [key: string]: any;    // Allow other fields from Zoho API
}

/**
 * Generate OAuth authorization URL
 */
export function getZohoAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    scope: "ZohoBooks.fullaccess.all",
    client_id: ZOHO_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: redirectUri,
    access_type: "offline",
  });

  return `${ZOHO_AUTH_URL}/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    console.log('[Zoho] Exchanging authorization code for tokens...');
    console.log('[Zoho] Code:', code.substring(0, 20) + '...');
    console.log('[Zoho] Redirect URI:', redirectUri);
    console.log('[Zoho] Client ID:', ZOHO_CLIENT_ID);
    console.log('[Zoho] Client Secret length:', (ZOHO_CLIENT_SECRET || "").length);
    
    const params = new URLSearchParams({
      code,
      client_id: ZOHO_CLIENT_ID || "",
      client_secret: ZOHO_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    
    console.log('[Zoho] Request params:', params.toString().substring(0, 100) + '...');
    
    const response = await axios.post(
      `${ZOHO_AUTH_URL}/token`,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (response.data.access_token && response.data.refresh_token) {
      ZOHO_ACCESS_TOKEN = response.data.access_token;
      ZOHO_REFRESH_TOKEN = response.data.refresh_token;
      TOKEN_EXPIRY = Date.now() + (response.data.expires_in * 1000);
      
      // Save tokens to database for persistence
      await saveTokensToDatabase(response.data.access_token, response.data.refresh_token, response.data.expires_in);

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
      };
    }

    return null;
  } catch (error: any) {
    console.error('[Zoho] Token exchange FAILED');
    console.error('[Zoho] Error message:', error.message);
    console.error('[Zoho] Error response:', error.response?.data);
    if (error.response) {
      console.error('[Zoho] Response status:', error.response.status);
      console.error('[Zoho] Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!ZOHO_REFRESH_TOKEN) {
    console.error("[Zoho] No refresh token available");
    return null;
  }

  try {
    console.log('[Zoho] Attempting token refresh...');
    console.log('[Zoho] Refresh token length:', ZOHO_REFRESH_TOKEN.length);
    console.log('[Zoho] Client ID length:', (ZOHO_CLIENT_ID || "").length);
    console.log('[Zoho] Client Secret length:', (ZOHO_CLIENT_SECRET || "").length);
    
    const response = await axios.post(
      `${ZOHO_AUTH_URL}/token`,
      new URLSearchParams({
        refresh_token: ZOHO_REFRESH_TOKEN,
        client_id: ZOHO_CLIENT_ID || "",
        client_secret: ZOHO_CLIENT_SECRET || "",
        grant_type: "refresh_token",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (response.data.access_token) {
      ZOHO_ACCESS_TOKEN = response.data.access_token;
      TOKEN_EXPIRY = Date.now() + (response.data.expires_in * 1000);
      
      // If we got a new refresh token, save it
      if (response.data.refresh_token) {
        ZOHO_REFRESH_TOKEN = response.data.refresh_token;
        await saveTokensToDatabase(response.data.access_token, response.data.refresh_token, response.data.expires_in);
      }
      
      console.log('[Zoho] Token refreshed successfully, expires in:', response.data.expires_in, 'seconds');
      return response.data.access_token;
    }

    console.error('[Zoho] Token refresh response missing access_token:', response.data);
    return null;
  } catch (error: any) {
    console.error("[Zoho] Token refresh error:", error.message);
    if (error.response) {
      console.error("[Zoho] Response status:", error.response.status);
      console.error("[Zoho] Response data:", JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getAccessToken(): Promise<string | null> {
  // Check if token is expired or about to expire (5 min buffer)
  if (!ZOHO_ACCESS_TOKEN || Date.now() > TOKEN_EXPIRY - 300000) {
    return await refreshAccessToken();
  }

  return ZOHO_ACCESS_TOKEN;
}

/**
 * Set refresh token manually
 */
export function setRefreshToken(token: string): void {
  ZOHO_REFRESH_TOKEN = token;
}

/**
 * Get current OAuth status
 */
export function getOAuthStatus(): {
  isConfigured: boolean;
  hasRefreshToken: boolean;
  hasAccessToken: boolean;
} {
  return {
    isConfigured: !!(ZOHO_CLIENT_ID && ZOHO_CLIENT_SECRET && ZOHO_ORGANIZATION_ID),
    hasRefreshToken: !!ZOHO_REFRESH_TOKEN,
    hasAccessToken: !!ZOHO_ACCESS_TOKEN,
  };
}

/**
 * Fetch all contacts from Zoho Books with pagination
 */
export async function fetchZohoContacts(): Promise<ZohoContact[]> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("No valid access token available. Please authorize the application.");
  }

  try {
    let allContacts: ZohoContact[] = [];
    let page = 1;
    const perPage = 200; // Maximum allowed by Zoho API
    let hasMorePages = true;

    console.log('Starting Zoho contacts fetch with pagination...');

    while (hasMorePages) {
      console.log(`Fetching page ${page}...`);
      
      const response = await axios.get(`${ZOHO_API_URL}/contacts`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID,
          page,
          per_page: perPage,
        },
      });

      const contacts = response.data.contacts || [];
      
      // Log first contact structure for debugging
      if (page === 1 && contacts.length > 0) {
        console.log('[Zoho] First contact structure:', JSON.stringify(contacts[0], null, 2));
      }
      
      allContacts = allContacts.concat(contacts);
      
      console.log(`Page ${page}: Fetched ${contacts.length} contacts. Total so far: ${allContacts.length}`);

      // Check if there are more pages
      const pageContext = response.data.page_context;
      if (pageContext && pageContext.has_more_page) {
        page++;
      } else {
        hasMorePages = false;
      }
    }

    console.log(`Completed! Total contacts fetched: ${allContacts.length}`);
    return allContacts;
  } catch (error: any) {
    if (error.response?.status === 401) {
      // Token expired, try refreshing
      const newToken = await refreshAccessToken();
      if (newToken) {
        return fetchZohoContacts(); // Retry with new token
      }
    }
    console.error("Error fetching Zoho contacts:", error);
    throw error;
  }
}

/**
 * Fetch a single contact by ID
 */
export async function fetchZohoContact(contactId: string): Promise<ZohoContact | null> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("No valid access token available");
  }

  try {
    const response = await axios.get(`${ZOHO_API_URL}/contacts/${contactId}`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      params: {
        organization_id: ZOHO_ORGANIZATION_ID,
      },
    });

    return response.data.contact || null;
  } catch (error) {
    console.error("Error fetching Zoho contact:", error);
    return null;
  }
}

/**
 * Extract latitude and longitude from Zoho custom fields
 */
function extractCoordinates(contact: ZohoContact): { latitude: number | null; longitude: number | null; fieldManager: string | null } {
  let latitude: number | null = null;
  let longitude: number | null = null;
  let fieldManager: string | null = null;

  // Try direct custom field properties first
  if (contact.cf_latitude) {
    const lat = parseFloat(contact.cf_latitude);
    if (!isNaN(lat)) latitude = lat;
  }
  if (contact.cf_longitude) {
    const lng = parseFloat(contact.cf_longitude);
    if (!isNaN(lng)) longitude = lng;
  }
  
  const contactAny = contact as any;
  
  // Check for field_manager from standard Zoho column (FIELD MANAGER)
  if (contact.field_manager && typeof contact.field_manager === 'string') {
    fieldManager = contact.field_manager.trim();
  }
  // Fallback to custom field if not found
  else if (contactAny.cf_field_manager && typeof contactAny.cf_field_manager === 'string') {
    fieldManager = contactAny.cf_field_manager.trim();
  }

  // Fallback to custom_fields array
  if (contact.custom_fields && Array.isArray(contact.custom_fields)) {
    contact.custom_fields.forEach(field => {
      if (field.label.toLowerCase().includes('latitude') && field.value) {
        const lat = parseFloat(field.value);
        if (!isNaN(lat)) latitude = lat;
      }
      if (field.label.toLowerCase().includes('longitude') && field.value) {
        const lng = parseFloat(field.value);
        if (!isNaN(lng)) longitude = lng;
      }
      if (!fieldManager && (field.label.toLowerCase().includes('field manager') || field.label.toLowerCase().includes('field_manager')) && field.value) {
        fieldManager = field.value.trim();
      }
    });
  }

  return { latitude, longitude, fieldManager };
}

/**
 * Sync contacts from Zoho to local database
 * Prioritizes custom Latitude/Longitude fields over address geocoding
 */
export async function syncZohoContacts() {
  try {
    // First, clear customers with numeric-only building IDs
    try {
      const { getDb } = await import("../db");
      const { customers } = await import("../../drizzle/schema");
      const db = await getDb();
      if (db) {
        // Clear customers with numeric building IDs
        // Using raw SQL delete is safer for this pattern
        console.log('[Zoho] Skipping numeric building ID cleanup');
      }
    } catch (error) {
      console.warn('[Zoho] Could not clear numeric building IDs:', error);
    }
    
    const contacts = await fetchZohoContacts();
    const { upsertCustomerFromZoho } = await import("../fieldWorkerDb");
    const { getDb } = await import("../db");
    const { workers, customers } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    
    let syncedCount = 0;
    let errorCount = 0;
    let fieldManagerCount = 0;
    let customermafCount = 0;
    const fieldManagerMap = new Map<string, number>();

    // Rule #64 / T34 Part 1 — Normalize field manager names before map key comparison.
    // Dots, spaces, and case variations in Zoho strings vs DB-stored names cause
    // map lookup misses → spurious INSERT → ER_DUP_ENTRY on workers.email unique constraint.
    // Example: DB stores "Low.low income" (dots from email-gen transform on first insert),
    // Zoho sends "Low low income" (spaces). normalizeName() maps both to "low low income".
    // Email generation transform on new worker INSERT is intentionally unchanged (Rule #64).
    const normalizeName = (s: string): string =>
      s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

    // Rule #31 / Pattern #26 fix — Pre-load fieldManagerMap from existing workers
    // before the contact loop so that workers who already exist in the DB are
    // found by name lookup rather than triggering ER_DUP_ENTRY on re-sync.
    // Without this, every sync after the first fails for any FM whose worker
    // row already exists (duplicate email unique constraint).
    try {
      const dbPreload = await getDb();
      if (dbPreload) {
        const existingWorkers = await dbPreload.select({ id: workers.id, name: workers.name }).from(workers);
        for (const w of existingWorkers) {
          if (w.name) fieldManagerMap.set(normalizeName(w.name), w.id); // Rule #64: normalize key
        }
        console.log(`[Zoho] Pre-loaded ${fieldManagerMap.size} existing workers into fieldManagerMap`);
      }
    } catch (preloadErr) {
      console.warn('[Zoho] Could not pre-load workers into fieldManagerMap:', preloadErr);
    }

    const processedContacts = [];

    for (const contact of contacts) {
      try {
        const { latitude, longitude, fieldManager } = extractCoordinates(contact);
        if (fieldManager) fieldManagerCount++;
        
        const address = contact.billing_address
          ? `${contact.billing_address.address || ''}, ${contact.billing_address.city || ''}, ${contact.billing_address.state || ''}`.trim()
          : undefined;

        // Extract building ID from Zoho CUSTOMERMAF column
        let buildingId: string | null = null;
        const contactAny = contact as any;
        
        // Check for CUSTOMERMAF from standard Zoho column first
        if (contact.customermaf && typeof contact.customermaf === 'string') {
          const maf = contact.customermaf.trim();
          // Only accept alphanumeric format matching pattern like "DIC-413"
          if (maf && /^[A-Z]{2,}-\d{3}$/.test(maf)) {
            buildingId = maf;
            customermafCount++;
          }
        }
        // Fallback to custom field cf_maf if not found
        else if (contactAny.cf_maf && typeof contactAny.cf_maf === 'string') {
          const maf = contactAny.cf_maf.trim();
          // Only accept alphanumeric format matching pattern like "ADK-062"
          if (maf && /^[A-Z]{2,}-\d{3}$/.test(maf)) {
            buildingId = maf;
          }
        }
        // Fallback to custom_fields array
        else if (contact.custom_fields && Array.isArray(contact.custom_fields)) {
          const mafField = contact.custom_fields.find(f => f.label.toLowerCase().includes('customermaf') || f.label.toLowerCase().includes('maf'));
          if (mafField && mafField.value) {
            const maf = mafField.value.trim();
            if (maf && /^[A-Z]{2,}-\d{3}$/.test(maf)) {
              buildingId = maf;
            }
          }
        }
        
        // Skip customers without valid alphanumeric building IDs
        if (!buildingId) {
          errorCount++;
          continue;
        }
        
        // Log first few for debugging
        if (syncedCount < 10) {
          console.log('[Zoho] Syncing contact:', {
            contact_name: contact.contact_name,
            buildingId,
            fieldManager,
            customermaf: contact.customermaf,
            field_manager: contact.field_manager,
          });
        }
        
        // Handle field manager
        let fieldManagerId: number | undefined = undefined;
        if (fieldManager) {
          const normalizedFieldManager = normalizeName(fieldManager); // Rule #64
          if (!fieldManagerMap.has(normalizedFieldManager)) {
            // Create new worker for this field manager
            const db = await getDb();
            if (db) {
              try {
                const workerEmail = fieldManager.toLowerCase().replace(/\s+/g, '.') + '@fieldscheduler.net';
                await db.insert(workers).values({
                  name: fieldManager,
                  email: workerEmail,
                  status: 'active',
                });
                const { eq } = await import("drizzle-orm");
                const createdWorker = await db.select().from(workers)
                  .where(eq(workers.name, fieldManager))
                  .limit(1);
                if (createdWorker && createdWorker.length > 0) {
                  const newWorkerId = createdWorker[0].id;
                  fieldManagerMap.set(normalizedFieldManager, newWorkerId); // Rule #64: normalize key
                  fieldManagerId = newWorkerId;
                  console.log('[Zoho] Created worker:', { name: fieldManager, id: newWorkerId, email: workerEmail });
                }
              } catch (err) {
                console.error('[Zoho] Error creating worker for', fieldManager, ':', err);
              }
            }
          } else {
            fieldManagerId = fieldManagerMap.get(normalizedFieldManager); // Rule #64: normalize key
            console.log('[Zoho] Using existing worker:', { name: fieldManager, id: fieldManagerId });
          }
        } else {
          console.log('[Zoho] No field manager found for contact:', contact.contact_name);
        }
        
        // Extract ArcGIS-native identity fields from Zoho custom fields (cf_arcgis_building_id, cf_unit_code)
        let arcgisBuildingId: string | undefined;
        let unitCode: string | undefined;
        if (contactAny.cf_arcgis_building_id && typeof contactAny.cf_arcgis_building_id === 'string') {
          arcgisBuildingId = contactAny.cf_arcgis_building_id.trim() || undefined;
        } else if (contact.custom_fields && Array.isArray(contact.custom_fields)) {
          const arcgisField = contact.custom_fields.find((f: any) =>
            f.label.toLowerCase().includes('arcgis') || f.label.toLowerCase().includes('building_id')
          );
          if (arcgisField?.value) arcgisBuildingId = arcgisField.value.trim() || undefined;
        }
        if (contactAny.cf_unit_code && typeof contactAny.cf_unit_code === 'string') {
          unitCode = contactAny.cf_unit_code.trim() || undefined;
        } else if (contact.custom_fields && Array.isArray(contact.custom_fields)) {
          const unitField = contact.custom_fields.find((f: any) =>
            f.label.toLowerCase().includes('unit_code') || f.label.toLowerCase() === 'unit code'
          );
          if (unitField?.value) unitCode = unitField.value.trim() || undefined;
        }

        // Save to database
        await upsertCustomerFromZoho({
          zohoContactId: contact.contact_id,
          name: contact.contact_name,
          email: contact.email,
          phone: contact.phone,
          address,
          latitude: latitude?.toString(),
          longitude: longitude?.toString(),
          buildingId,
          arcgisBuildingId,
          unitCode,
        });
        
        // Assign field manager to customer
        if (fieldManagerId) {
          const db = await getDb();
          if (db) {
            try {
              const result = await db.update(customers)
                .set({ fieldManager: fieldManagerId })
                .where(eq(customers.zohoContactId, contact.contact_id));
              console.log('[Zoho] Updated customer fieldManager:', { contactId: contact.contact_id, fieldManagerId });
            } catch (err) {
              console.error('[Zoho] Error updating customer fieldManager:', err);
            }
          }
        }
        
        syncedCount++;
        
        processedContacts.push({
          id: contact.contact_id,
          name: contact.contact_name,
          email: contact.email,
          phone: contact.phone,
          address,
          latitude,
          longitude,
          hasCoordinates: latitude !== null && longitude !== null,
          fieldManager,
        });
      } catch (error) {
        console.error(`Error syncing contact ${contact.contact_id}:`, error);
        errorCount++;
      }
    }

    return {
      success: errorCount === 0,
      synced: syncedCount,
      errors: errorCount,
      fieldManagerCount,
      customermafCount,
      contacts: processedContacts,
    };
  } catch (error) {
    console.error("Error during Zoho sync:", error);
    return {
      success: false,
      synced: 0,
      errors: 1,
      fieldManagerCount: 0,
      customermafCount: 0,
      contacts: [],
    };
  }
}

/***
 * Generate customer statement PDF from Zoho Books JSON data
 * Since Zoho Books API doesn't provide direct PDF download,
 * we fetch the JSON data and generate a PDF ourselves
 */
export async function getCustomerStatement(zohoContactId: string): Promise<any> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("No valid access token available. Please authorize the application.");
  }

  try {
    console.log(`[Zoho] Fetching statement data for contact ${zohoContactId}`);
    
    // Fetch contact info
    const contactResponse = await axios.get(
      `${ZOHO_API_URL}/contacts/${zohoContactId}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID,
        },
      }
    );

    const contact = contactResponse.data.contact;
    console.log(`[Zoho] Fetched contact: ${contact.contact_name}`);

    // Fetch invoices for this contact
    const invoicesResponse = await axios.get(
      `${ZOHO_API_URL}/invoices`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID,
          customer_id: zohoContactId,
        },
      }
    );

    const invoices = invoicesResponse.data.invoices || [];
    console.log(`[Zoho] Fetched ${invoices.length} invoices for contact`);

    // Build statement data object
    const statementData = {
      contact_name: contact.contact_name,
      company_name: contact.company_name,
      email: contact.email,
      invoices: invoices,
    };
    console.log(`[Zoho] Built statement data with ${statementData.invoices?.length || 0} invoices`);
    
    // Calculate financial summary
    // Exclude draft and void invoices from all calculations
    const validInvoices = invoices.filter((inv: any) => inv.status !== INVOICE_STATUS.DRAFT && inv.status !== INVOICE_STATUS.VOID);
    
    // Total (Invoiced Amount) = sum of invoice totals (exclude draft and void)
    const total = validInvoices.reduce((sum: number, inv: any) => sum + (parseFloat(inv.total) || 0), 0);
    
    // Balance Due = sum of invoice balances (unpaid amounts, exclude draft and void)
    // The 'balance' field in Zoho represents the remaining unpaid amount on each invoice
    const balance = validInvoices.reduce((sum: number, inv: any) => sum + (parseFloat(inv.balance) || 0), 0);
    
    // Amount Received = Total - Balance
    const paidAmount = total - balance;
    
    console.log(`[Zoho] Financial summary - Total: ${total}, Paid: ${paidAmount}, Balance: ${balance}`);
    console.log(`[Zoho] Invoice breakdown: Total=${invoices.length}, Draft=${invoices.filter((i: any) => i.status === INVOICE_STATUS.DRAFT).length}, Void=${invoices.filter((i: any) => i.status === INVOICE_STATUS.VOID).length}, Valid=${validInvoices.length}`);
    console.log(`[Zoho] Sample invoice data:`, invoices.slice(0, 2).map((inv: any) => ({ 
      invoice_number: inv.invoice_number, 
      total: inv.total, 
      balance: inv.balance,
      status: inv.status,
      payment_made: inv.payment_made
    })));
    
    // Return statement data immediately without PDF generation
    // PDF will be generated on-demand when user clicks "Export PDF"
    console.log(`[Zoho] Returning statement data: total=${total}, balance=${balance}, invoices=${invoices.length}`);
    return { 
      zohoContactId, 
      total, 
      balance, 
      invoices,
      contact_name: contact.contact_name,
      company_name: contact.company_name,
      email: contact.email
    } as any;
  } catch (error: any) {
    if (error.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return getCustomerStatement(zohoContactId);
      }
    }
    console.error("Error generating customer statement PDF:", error.message);
    return { pdfBase64: null, zohoContactId, total: 0, balance: 0, invoices: [] };
  }
}
/**
 * Get customer invoices from Zoho Books
 */
export async function getCustomerInvoices(zohoContactId: string): Promise<any[]> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("No valid access token available. Please authorize the application.");
  }

  try {
    const response = await axios.get(`${ZOHO_API_URL}/invoices`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      params: {
        customer_id: zohoContactId,
        organization_id: ZOHO_ORGANIZATION_ID,
      },
    });

    return response.data.invoices || [];
  } catch (error: any) {
    if (error.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return getCustomerInvoices(zohoContactId);
      }
    }
    console.error("Error fetching customer invoices:", error);
    throw error;
  }
}

/**
 * Get customer payment history from Zoho Books
 */
export async function getCustomerPayments(zohoContactId: string): Promise<any[]> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("No valid access token available. Please authorize the application.");
  }

  try {
    const response = await axios.get(`${ZOHO_API_URL}/customerpayments`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      params: {
        customer_id: zohoContactId,
        organization_id: ZOHO_ORGANIZATION_ID,
      },
    });

    return response.data.customerpayments || [];
  } catch (error: any) {
    if (error.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return getCustomerPayments(zohoContactId);
      }
    }
    console.error("Error fetching customer payments:", error);
    throw error;
  }
}




/**
 * Fetch customer statements from Zoho Books
 */
export async function fetchCustomerStatements(contactId: string) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("No valid access token available");
  }

  try {
    const response = await axios.get(`${ZOHO_API_URL}/contacts/${contactId}/statements`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      params: {
        organization_id: ZOHO_ORGANIZATION_ID,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching customer statements:", error);
    return null;
  }
}



/**
 * Generate HTML for customer statement
 */
function generateStatementHTML(data: any): string {
  const invoices = data.invoices || [];
  const totalAmount = invoices.reduce((sum: number, inv: any) => sum + (parseFloat(inv.total) || 0), 0);
  const paidAmount = invoices.filter((inv: any) => inv.status === INVOICE_STATUS.PAID).reduce((sum: number, inv: any) => sum + (parseFloat(inv.total) || 0), 0);
  const balance = totalAmount - paidAmount;

  const invoiceRows = invoices.map((inv: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${inv.invoice_number || '-'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${inv.date || '-'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${inv.due_date || '-'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${parseFloat(inv.total || 0).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${inv.status || '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
        .header h1 { color: #007bff; margin: 0; }
        .section { margin-bottom: 30px; }
        .section-title { font-weight: bold; font-size: 14px; background-color: #f5f5f5; padding: 10px; margin-bottom: 10px; }
        .info-row { display: flex; margin-bottom: 8px; }
        .info-label { font-weight: bold; width: 150px; }
        .info-value { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: #007bff; color: white; padding: 10px; text-align: left; }
        .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #007bff; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .summary-label { font-weight: bold; }
        .summary-value { text-align: right; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>STATEMENT OF ACCOUNTS</h1>
        <p style="margin: 5px 0; color: #666;">Customer Account Statement</p>
      </div>

      <div class="section">
        <div class="section-title">CUSTOMER INFORMATION</div>
        <div class="info-row">
          <div class="info-label">Name:</div>
          <div class="info-value">${data.contact_name || '-'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Company:</div>
          <div class="info-value">${data.company_name || '-'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Email:</div>
          <div class="info-value">${data.email || '-'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">INVOICES</div>
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Due Date</th>
              <th style="text-align: right;">Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceRows}
          </tbody>
        </table>
      </div>

      <div class="summary">
        <div class="summary-row">
          <div class="summary-label">Total Amount:</div>
          <div class="summary-value">${totalAmount.toFixed(2)}</div>
        </div>
        <div class="summary-row">
          <div class="summary-label">Paid Amount:</div>
          <div class="summary-value">${paidAmount.toFixed(2)}</div>
        </div>
        <div class="summary-row" style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
          <div class="summary-label">Balance Due:</div>
          <div class="summary-value" style="font-weight: bold; color: #007bff;">${balance.toFixed(2)}</div>
        </div>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
        <p>This statement was generated on ${new Date().toLocaleDateString()}. Please contact us if you have any questions.</p>
      </div>
    </body>
    </html>
  `;
}

