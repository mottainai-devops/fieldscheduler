import { getDb } from './server/db.js';
import { invoices, customers } from './drizzle/schema.js';
import { isNotNull, sql } from 'drizzle-orm';

const db = await getDb();

const invoiceCount = await db.select({ count: sql`COUNT(*)` }).from(invoices);
const customersWithZoho = await db.select({ count: sql`COUNT(*)` }).from(customers).where(isNotNull(customers.zohoContactId));
const sampleInvoices = await db.select().from(invoices).limit(3);

console.log('Total invoices:', invoiceCount[0].count);
console.log('Customers with zohoContactId:', customersWithZoho[0].count);
console.log('Sample invoices:', JSON.stringify(sampleInvoices, null, 2));

process.exit(0);
