import { jsPDF } from 'jspdf';

const doc = new jsPDF();
doc.setTextColor(0, 0, 0);
doc.setFontSize(16);
doc.text('STATEMENT OF ACCOUNTS', 105, 20, { align: 'center' });

doc.setFontSize(12);
doc.text('CUSTOMER INFORMATION', 20, 40);

doc.setFontSize(10);
doc.text('Name: Test Customer', 20, 50);
doc.text('Company: Test Company', 20, 60);

const pdfBytes = doc.output('arraybuffer');
const buffer = Buffer.from(pdfBytes);
const base64 = buffer.toString('base64');

console.log('PDF generated successfully');
console.log('Base64 length:', base64.length);
console.log('First 100 chars:', base64.substring(0, 100));
