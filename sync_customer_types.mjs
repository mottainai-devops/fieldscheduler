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

async function fetchAll() {
  let all = [];
  let page = 1;
  let hasMore = true;
  const token = await getAccessToken();
  
  while (hasMore) {
    const url = 'https://www.zohoapis.com/books/v3/contacts?organization_id=' + process.env.ZOHO_ORGANIZATION_ID + '&page=' + page + '&per_page=200';
    const resp = await fetch(url, { headers: { Authorization: 'Zoho-oauthtoken ' + token } });
    const data = await resp.json();
    
    if (data.contacts && data.contacts.length > 0) {
      all = all.concat(data.contacts);
      console.error('Page ' + page + ': ' + data.contacts.length + ' (total: ' + all.length + ')');
      hasMore = data.page_context && data.page_context.has_more_page;
      page++;
      await new Promise(r => setTimeout(r, 500));
    } else {
      hasMore = false;
    }
  }
  
  return all;
}

const contacts = await fetchAll();
console.error('Generating SQL for ' + contacts.length + ' contacts');

for (const c of contacts) {
  const id = c.contact_id;
  const company = (c.company_name || '').replace(/'/g, "''");
  const type = (c.cf_customer_type || 'Individual').toLowerCase();
  console.log('UPDATE customers SET company_name=\'' + company + '\', customerType=\'' + type + '\' WHERE zohoContactId=\'' + id + '\';');
}
