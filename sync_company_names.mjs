import mysql from 'mysql2/promise';

async function getAccessToken() {
  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  });
  return (await response.json()).access_token;
}

async function fetchAllContacts(accessToken) {
  let allContacts = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const resp = await fetch(
      `https://www.zohoapis.com/books/v3/contacts?organization_id=${process.env.ZOHO_ORGANIZATION_ID}&page=${page}&per_page=200`,
      { headers: { Authorization: 'Zoho-oauthtoken ' + accessToken } }
    );
    const data = await resp.json();
    
    if (data.contacts && data.contacts.length > 0) {
      allContacts = allContacts.concat(data.contacts);
      console.log(`Fetched page ${page}: ${data.contacts.length} contacts (total: ${allContacts.length})`);
      hasMore = data.page_context && data.page_context.has_more_page;
      page++;
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      hasMore = false;
    }
  }
  
  return allContacts;
}

async function updateDatabase(contacts) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Newpassword1!',
    database: 'fieldworker_db'
  });
  
  let updated = 0;
  let notFound = 0;
  
  for (const contact of contacts) {
    const contactId = contact.contact_id;
    const companyName = contact.company_name || null;
    
    const [result] = await connection.execute(
      'UPDATE customers SET company_name = ? WHERE zohoContactId = ?',
      [companyName, contactId]
    );
    
    if (result.affectedRows > 0) {
      updated++;
    } else {
      notFound++;
    }
  }
  
  await connection.end();
  
  return { updated, notFound };
}

async function main() {
  console.log('=== Starting Company Name Sync ===\n');
  
  const token = await getAccessToken();
  console.log('✓ Got access token\n');
  
  const contacts = await fetchAllContacts(token);
  console.log(`\n✓ Fetched ${contacts.length} total contacts\n`);
  
  const stats = await updateDatabase(contacts);
  console.log(`\n=== Sync Complete ===`);
  console.log(`Updated: ${stats.updated} customers`);
  console.log(`Not found: ${stats.notFound} contacts`);
}

main().catch(console.error);
