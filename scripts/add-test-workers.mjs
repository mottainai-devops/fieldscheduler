#!/usr/bin/env node

import mysql from 'mysql2/promise';

const testWorkers = [
  {
    name: 'John Smith',
    email: 'john@fieldscheduler.net',
    phone: '+234-801-234-5678',
    pin: '1234',
    skills: 'Installation, Maintenance',
    status: 'active',
    shiftStart: '08:00',
    shiftEnd: '17:00',
  },
  {
    name: 'Mary Johnson',
    email: 'mary@fieldscheduler.net',
    phone: '+234-802-345-6789',
    pin: '5678',
    skills: 'Repair, Troubleshooting',
    status: 'active',
    shiftStart: '08:00',
    shiftEnd: '17:00',
  },
  {
    name: 'Peter Williams',
    email: 'peter@fieldscheduler.net',
    phone: '+234-803-456-7890',
    pin: '9012',
    skills: 'Installation, Support',
    status: 'active',
    shiftStart: '08:00',
    shiftEnd: '17:00',
  },
  {
    name: 'Sarah Davis',
    email: 'sarah@fieldscheduler.net',
    phone: '+234-804-567-8901',
    pin: '3456',
    skills: 'Maintenance, Training',
    status: 'active',
    shiftStart: '08:00',
    shiftEnd: '17:00',
  },
];

async function addTestWorkers() {
  let connection;
  try {
    // Get database config from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    // Parse MySQL connection string
    // Format: mysql://user:password@host:port/database
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:/?]+):(\d+)\/([^?]+)/);
    if (!match) {
      throw new Error('Invalid DATABASE_URL format');
    }

    const [, user, password, host, port, database] = match;

    console.log(`Connecting to MySQL at ${host}:${port}/${database}...`);

    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      ssl: {
        rejectUnauthorized: false,
      },
      enableKeepAlive: true,
    });

    console.log('Connected to database!');

    // Add test workers
    for (const worker of testWorkers) {
      try {
        const query = `
          INSERT INTO workers (name, email, phone, pin, skills, status, shiftStart, shiftEnd)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            phone = VALUES(phone),
            pin = VALUES(pin),
            skills = VALUES(skills),
            status = VALUES(status),
            shiftStart = VALUES(shiftStart),
            shiftEnd = VALUES(shiftEnd)
        `;

        const [result] = await connection.execute(query, [
          worker.name,
          worker.email,
          worker.phone,
          worker.pin,
          worker.skills,
          worker.status,
          worker.shiftStart,
          worker.shiftEnd,
        ]);

        console.log(`✓ Added/Updated worker: ${worker.name} (${worker.email})`);
        console.log(`  PIN: ${worker.pin}`);
      } catch (error) {
        console.error(`✗ Failed to add worker ${worker.name}:`, error.message);
      }
    }

    console.log('\n✓ Test workers added successfully!');
    console.log('\nYou can now log in with:');
    testWorkers.forEach(w => {
      console.log(`  Email: ${w.email}`);
      console.log(`  PIN: ${w.pin}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addTestWorkers();

