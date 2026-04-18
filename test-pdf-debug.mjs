import { jsPDF } from 'jspdf';
import fs from 'fs';

const doc = new jsPDF();

// Test 1: Simple text
doc.setTextColor(0, 0, 0);
doc.setFontSize(16);
doc.text('STATEMENT OF ACCOUNTS', 105, 20, { align: 'center' });

// Test 2: More text
doc.setFontSize(12);
doc.text('CUSTOMER INFORMATION', 20, 40);

// Test 3: Even more text
doc.setFontSize(10);
doc.text('Name: Test Customer', 20, 50);
doc.text('Company: Test Company', 20, 60);
doc.text('Address: 123 Main St', 20, 70);

// Test 4: Table-like content
doc.text('Invoice #', 20, 90);
doc.text('Date', 60, 90);
doc.text('Amount', 140, 90);

doc.line(20, 92, 200, 92);

doc.text('INV-001', 20, 100);
doc.text('2025-01-01', 60, 100);
doc.text('N5000', 140, 100);

// Get PDF and save to file
const pdfBytes = doc.output('arraybuffer');
const buffer = Buffer.from(pdfBytes);

// Save to file for inspection
fs.writeFileSync('/tmp/test-pdf.pdf', buffer);
console.log('PDF saved to /tmp/test-pdf.pdf');
console.log('PDF size:', buffer.length, 'bytes');

// Also output base64
const base64 = buffer.toString('base64');
console.log('Base64 length:', base64.length);
console.log('First 100 chars:', base64.substring(0, 100));
