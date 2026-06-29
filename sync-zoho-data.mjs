import mysql from 'mysql2/promise';

const ZOHO_CLIENT_ID = '1000.5ID88NTRSOGZNY5UD9EVARPHMJYSXI';
const ZOHO_CLIENT_SECRET = '1525e4e864c1cae58635a7e6213bd528dcfe88fd74';
const ZOHO_REFRESH_TOKEN = '1000.7fa40121aa94aabc9a53e4473cf73c29.ac4567ffe56740d16ce37dfb537c8a55';
const ZOHO_ORG_ID = '854644244';

// Get access token
async function getAccessToken() {
  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: ZOHO_REFRESH_TOKEN,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  });
  const data = await response.json();
  if (!data.access_token) throw new Error(`Failed to get token: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Fetch contacts from Zoho
async function fetchZohoContacts(accessToken) {
  const response = await fetch(
    `https://www.zohoapis.com/books/v3/contacts?organization_id=${ZOHO_ORG_ID}&page=1&per_page=200`,
    { headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` } }
  );
  const data = await response.json();
  return data.contacts || [];
}

// T17 Item 2: Name normalization for workerMap lookup (Rule 31 carry-forward)
// Normalizes a name string for matching: trim, lowercase, collapse internal whitespace.
// Applied to BOTH the workers table key and the Zoho-sourced name at lookup time.
// Persisted data is never modified — normalization is purely for the match operation.
function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Main sync
async function syncData() {
  console.log('🔄 Starting Zoho sync...');
  
  // Get access token
  console.log('📝 Getting Zoho access token...');
  const accessToken = await getAccessToken();
  console.log('✅ Token acquired');
  
  // Fetch contacts
  console.log('📥 Fetching contacts from Zoho...');
  const contacts = await fetchZohoContacts(accessToken);
  console.log(`✅ Fetched ${contacts.length} contacts`);
  
  // Connect to database
  const db = await mysql.createConnection({
    host: 'gateway02.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'TEKZ5J1LhZRsb4n.e44398312388',
    password: 'ds3tI0amgqc4l6aaK40N',
    database: 'WLXvxD3KZrDSqjCVfXw3HU',
    ssl: { rejectUnauthorized: true }
  });
  
  // Extract field managers
  const fieldManagers = new Set();
  const customersData = [];
  
  for (const contact of contacts) {
    const customField = contact.custom_fields?.find(f => f.label === 'CustomerMAF');
    const fieldManagerField = contact.custom_fields?.find(f => f.label === 'Field Manager');
    
    if (fieldManagerField?.value) {
      fieldManagers.add(fieldManagerField.value);
    }
    
    if (customField?.value) {
      customersData.push({
        name: contact.contact_name,
        email: contact.email,
        phone: contact.phone,
        customermaf: customField.value,
        fieldManager: fieldManagerField?.value || null,
        zohoContactId: contact.contact_id
      });
    }
  }
  
  console.log(`\n📊 Data extracted:`);
  console.log(`  Field Managers: ${Array.from(fieldManagers).join(', ')}`);
  console.log(`  Customers with CUSTOMERMAF: ${customersData.length}`);
  
  // Insert field managers
  console.log('\n💾 Inserting field managers...');
  for (const name of fieldManagers) {
    try {
      const escapedName = name.replace(/'/g, "''");
      await db.execute(`INSERT INTO workers (name) VALUES ('${escapedName}') ON DUPLICATE KEY UPDATE name='${escapedName}'`);
    } catch (error) {
      console.error(`  ❌ Failed to insert ${name}:`, error.message);
    }
  }
  console.log(`✅ Field managers inserted`);
  
  // Get worker IDs
  // T17 Item 2: Build workerMap with normalized keys so lookup is whitespace/case-insensitive
  const [workers] = await db.execute('SELECT id, name FROM workers WHERE name IN (?)', [Array.from(fieldManagers)]);
  const workerMap = Object.fromEntries(workers.map(w => [normalizeName(w.name), w.id]));
  
  // Clear existing customers
  console.log('\n🗑️  Clearing existing customers...');
  await db.execute('DELETE FROM customers');
  
  // Insert customers
  console.log('💾 Inserting customers...');
  let inserted = 0;
  for (const customer of customersData) {
    try {
      // T17 Item 2: Normalize Zoho-sourced name before lookup
      let workerId = null;
      if (customer.fieldManager) {
        const normalizedZohoName = normalizeName(customer.fieldManager);
        workerId = workerMap[normalizedZohoName] ?? null;
        // Debug log when normalization actually changed the string (catches real variations)
        if (workerId !== null && normalizedZohoName !== customer.fieldManager) {
          console.log(`[sync-zoho-data] normalized match: zoho='${customer.fieldManager}' → worker='${workers.find(w => normalizeName(w.name) === normalizedZohoName)?.name ?? '?'}' (normalized: '${normalizedZohoName}')`);
        }
      }
      const status = workerId ? 'assigned' : 'unassigned';
      
      await db.execute(
        'INSERT INTO customers (name, customermaf, fieldManager, assignmentStatus) VALUES (?, ?, ?, ?)',
        [customer.name, customer.customermaf, workerId, status]
      );
      inserted++;
    } catch (error) {
      console.error(`  ❌ Failed to insert ${customer.name}:`, error.message);
    }
  }
  console.log(`✅ Inserted ${inserted} customers`);
  
  await db.end();
  console.log('\n✅ Sync complete!');
}

syncData().catch(error => {
  console.error('❌ Sync failed:', error.message);
  process.exit(1);
});
