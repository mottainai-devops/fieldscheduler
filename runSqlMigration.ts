import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  
  const connection = await mysql.createConnection(databaseUrl);
  
  try {
    const sql = readFileSync('./create_financial_tables.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    console.log(`📝 Executing ${statements.length} SQL statements...\n`);
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        console.log(`Executing: ${trimmed.substring(0, 60)}...`);
        const [results] = await connection.query(trimmed);
        console.log('✅ Success\n');
      }
    }
    
    console.log('🎉 All tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().catch(console.error);
