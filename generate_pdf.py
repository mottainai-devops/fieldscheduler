#!/usr/bin/env python3
import json
import sys
import base64
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from io import BytesIO

def generate_pdf(statement_data):
    """Generate a PDF from statement data"""
    buffer = BytesIO()
    
    # Create PDF
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                          rightMargin=0.5*inch,
                          leftMargin=0.5*inch,
                          topMargin=0.75*inch,
                          bottomMargin=0.75*inch)
    
    # Container for PDF elements
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.black,
        spaceAfter=30,
        alignment=1  # Center
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.black,
        spaceAfter=12,
        spaceBefore=12
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        spaceAfter=6
    )
    
    # Title
    elements.append(Paragraph("STATEMENT OF ACCOUNTS", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Customer Information
    elements.append(Paragraph("CUSTOMER INFORMATION", heading_style))
    
    if statement_data.get('contact_name'):
        elements.append(Paragraph(f"<b>Name:</b> {statement_data['contact_name']}", normal_style))
    
    if statement_data.get('company_name'):
        elements.append(Paragraph(f"<b>Company:</b> {statement_data['company_name']}", normal_style))
    
    if statement_data.get('billing_address'):
        addr = statement_data['billing_address']
        address_text = f"<b>Address:</b> {addr.get('address', '')}"
        if addr.get('street2'):
            address_text += f", {addr['street2']}"
        address_text += f", {addr.get('city', '')}, {addr.get('state', '')} {addr.get('zip', '')}"
        if addr.get('country'):
            address_text += f", {addr['country']}"
        elements.append(Paragraph(address_text, normal_style))
    
    elements.append(Spacer(1, 0.2*inch))
    
    # Invoices Table
    if statement_data.get('invoices'):
        elements.append(Paragraph("INVOICES", heading_style))
        
        # Prepare table data
        table_data = [['Invoice #', 'Date', 'Due Date', 'Amount', 'Status']]
        
        for invoice in statement_data['invoices']:
            table_data.append([
                invoice.get('invoice_number', ''),
                invoice.get('date', ''),
                invoice.get('due_date', ''),
                f"₦{invoice.get('total', 0):,.2f}",
                invoice.get('status', '')
            ])
        
        # Create table
        table = Table(table_data, colWidths=[1.2*inch, 1*inch, 1*inch, 1.2*inch, 0.8*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        elements.append(table)
    
    # Build PDF
    doc.build(elements)
    
    # Get PDF bytes and convert to base64
    pdf_bytes = buffer.getvalue()
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    
    return pdf_base64

if __name__ == '__main__':
    # Read JSON from stdin
    input_data = sys.stdin.read()
    statement_data = json.loads(input_data)
    
    # Generate PDF
    pdf_base64 = generate_pdf(statement_data)
    
    # Output base64
    print(pdf_base64)
