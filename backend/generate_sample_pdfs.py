import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def create_pdf(filename, title, customer, product, strength, lot, qty, mfg, exp, block, desc):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1E293B'),
        alignment=0,
    )
    
    sub_header_style = ParagraphStyle(
        'SubHeaderStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#2563EB'),
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
    )

    story = []

    # Header
    story.append(Paragraph("PHARMA ASSIST QUALITY ASSURANCE", sub_header_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(title, header_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2563EB'), spaceAfter=15))

    # Summary table
    table_data = [
        [Paragraph("<b>Reporting Institution:</b>", body_style), Paragraph(customer, body_style)],
        [Paragraph("<b>Product Name:</b>", body_style), Paragraph(product, body_style)],
        [Paragraph("<b>Strength / Grade:</b>", body_style), Paragraph(strength, body_style)],
        [Paragraph("<b>Batch / Lot Number:</b>", body_style), Paragraph(lot, body_style)],
        [Paragraph("<b>Affected Quantity:</b>", body_style), Paragraph(qty, body_style)],
        [Paragraph("<b>Manufacturing Date:</b>", body_style), Paragraph(mfg, body_style)],
        [Paragraph("<b>Expiration Date:</b>", body_style), Paragraph(exp, body_style)],
        [Paragraph("<b>Facility Block:</b>", body_style), Paragraph(block, body_style)],
    ]

    t = Table(table_data, colWidths=[150, 380])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F8FAFC')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))

    # Defect Description Section
    story.append(Paragraph("QUALITY INCIDENT & DEFECT DESCRIPTION", section_heading))
    story.append(Paragraph(desc, body_style))
    story.append(Spacer(1, 20))

    # Regulatory Sign-off block
    story.append(Paragraph("REQUIRED IMMEDIATE ACTIONS", section_heading))
    actions_text = "1. Initiate immediate quarantine of affected batch in warehouse.<br/>2. Issue Quality Incident Notification to QA Complaints Committee.<br/>3. Begin root cause investigation pursuant to cGMP SOP-QA-402."
    story.append(Paragraph(actions_text, body_style))
    story.append(Spacer(1, 30))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=15))
    story.append(Paragraph("Confidential Document — Generated for AIVOA Quality Management System", sub_header_style))

    doc.build(story)
    print(f"Generated PDF: {filename}")

if __name__ == "__main__":
    output_dir = r"C:\Users\Rishit\Desktop\pharmassist\sample_complaints"
    
    create_pdf(
        os.path.join(output_dir, "Sample_Complaint_Amoxicillin_Capsules.pdf"),
        "Formal Customer Quality Complaint Report",
        "MetroCare Health System - Pharmacy Dept",
        "Amoxicillin Trihydrate Capsules",
        "500 mg",
        "AMX-500-2409",
        "12 bottles",
        "2024-09-15",
        "2026-09-14",
        "Block A - Solid Dosage",
        "MetroCare Health System Pharmacy received 12 sealed bottles of Amoxicillin Trihydrate Capsules 500 mg (Lot AMX-500-2409) exhibiting severe capsule shell cracking and powder leakage inside primary HDPE bottles. Moisture indicator seals appeared degraded upon opening. Immediate batch quarantine requested."
    )

    create_pdf(
        os.path.join(output_dir, "Sample_Complaint_Metformin_Tablets.pdf"),
        "Formal Customer Quality Complaint Report",
        "Apollo Wholesale Distributors",
        "Metformin HCl Extended Release Tablets",
        "1000 mg",
        "MET-ER-2503",
        "5 cartons",
        "2025-03-01",
        "2028-02-28",
        "Block A - Solid Dosage",
        "Apollo Wholesale Distributors reported a mislabeling defect where outer carton labeling specifies Metformin 500 mg while inner blister foil printing reflects Metformin HCl 1000 mg USP Grade (Lot MET-ER-2503). Potential patient safety risk due to dosing confusion."
    )
