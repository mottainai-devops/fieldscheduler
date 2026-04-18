import mysql from 'mysql2/promise';

async function test() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'fieldworker',
    password: 'FieldWorker2024Secure',
    database: 'fieldworker_db'
  });

  console.log('Testing invoice queries...\n');

  // Test 1: Count all invoices
  const [count] = await connection.query('SELECT COUNT(*) as total FROM invoices');
  console.log('Total invoices in DB:', count[0].total);

  // Test 2: Count invoices with fieldManagerId
  const [withFM] = await connection.query('SELECT COUNT(*) as total FROM invoices WHERE fieldManagerId IS NOT NULL');
  console.log('Invoices with fieldManagerId:', withFM[0].total);

  // Test 3: Sample invoice data
  const [sample] = await connection.query('SELECT id, invoiceNumber, total, balance, fieldManagerId, maf FROM invoices LIMIT 3');
  console.log('\nSample invoices:');
  console.log(sample);

  // Test 4: Aggregate query (like the financial router does)
  const [metrics] = await connection.query(`
    SELECT 
      COALESCE(SUM(total), 0) as total,
      COALESCE(SUM(balance), 0) as outstanding,
      COUNT(*) as count
    FROM invoices
  `);
  console.log('\nAggregate metrics:');
  console.log(metrics[0]);

  await connection.end();
}

test().catch(console.error);
