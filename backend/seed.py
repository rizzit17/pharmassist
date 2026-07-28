"""
Seed script — populates the database with demo user and 20 realistic pharmaceutical complaints.
Run: python seed.py
Or via Docker: docker compose exec backend python seed.py
"""
import asyncio
import uuid
from datetime import datetime, timezone, date, timedelta

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.models.user import User
from app.models.complaint import Complaint
from app.models.ai_analysis import AIAnalysis
from app.models.chat_history import ChatHistory
from app.models.audit_log import AuditLog

from app.db.session import engine, AsyncSessionLocal


DEMO_COMPLAINTS = [
    {
        "complaint_number": "CC-2026-00001",
        "source": "Hospital",
        "customer_name": "City General Hospital",
        "product_name": "Metformin HCl Tablets",
        "product_strength": "500mg",
        "batch_lot_number": "MET-2026-001A",
        "affected_quantity": "5,000 units",
        "manufacturing_date": date(2026, 1, 15),
        "expiry_date": date(2027, 1, 14),
        "originating_site_block": "Block A - Solid Dosage",
        "impacted_npm": "HDPE bottles, induction seals",
        "complaint_category": "Product Defect - Discoloration",
        "complaint_description": "A formal complaint has been received from City General Hospital regarding Metformin HCl Tablets 500mg, Batch No. MET-2026-001A, wherein 5,000 units were reported to exhibit visible yellowing and discoloration inconsistent with the approved product specification. The complainant indicates the issue was identified upon routine inspection of incoming stock on 2026-03-10. This complaint has been classified under Product Defect - Discoloration and has been assigned for immediate QA review and investigation pursuant to 21 CFR Part 211 requirements.",
        "status": "under_investigation",
        "severity": "Major",
        "suggested_next_action": "Initiate batch quarantine, conduct root cause analysis of manufacturing process, issue replacement shipment after QA confirmation",
        "risk_assessment": "Discoloration may indicate degradation due to temperature excursion or oxidation. Regulatory reportability assessment required under 21 CFR 314.81. Batch recall evaluation recommended.",
        "regulatory_reportable": True,
    },
    {
        "complaint_number": "CC-2026-00002",
        "source": "Pharmacy",
        "customer_name": "MedPlus Pharmacy Chain",
        "product_name": "Amlodipine Besylate Tablets",
        "product_strength": "5mg",
        "batch_lot_number": "AML-2026-002B",
        "affected_quantity": "200 units (2 bottles)",
        "manufacturing_date": date(2026, 2, 1),
        "expiry_date": date(2028, 1, 31),
        "originating_site_block": "Block B - Tablet Manufacturing",
        "impacted_npm": "Blister packaging - PVC/Aluminium",
        "complaint_category": "Packaging Failure - Seal Integrity",
        "complaint_description": "Formal complaint received from MedPlus Pharmacy Chain regarding Amlodipine Besylate 5mg, Batch AML-2026-002B. Two blister packs were reported with compromised seal integrity, potentially exposing tablets to ambient humidity. Investigation initiated for packaging line qualification and seal integrity testing.",
        "status": "capa_assigned",
        "severity": "Major",
        "suggested_next_action": "Quarantine remaining stock from batch, inspect packaging line sealing equipment, enhance QC seal integrity testing",
        "risk_assessment": "Compromised packaging seal may accelerate tablet degradation due to moisture ingress, potentially reducing therapeutic efficacy. No immediate patient safety risk identified at this stage.",
        "regulatory_reportable": False,
    },
    {
        "complaint_number": "CC-2026-00003",
        "source": "Direct Customer",
        "customer_name": "BioPharm API Procurement",
        "product_name": "Atorvastatin Calcium API",
        "product_strength": "USP Grade",
        "batch_lot_number": "ATV-API-2026-003",
        "affected_quantity": "25 kg",
        "manufacturing_date": date(2026, 1, 20),
        "expiry_date": date(2028, 1, 19),
        "originating_site_block": "Block C - API Synthesis",
        "impacted_npm": "HDPE drums, desiccant packs",
        "complaint_category": "Contamination - Foreign Matter",
        "complaint_description": "Complaint received from BioPharm API Procurement regarding Atorvastatin Calcium API, Batch ATV-API-2026-003, wherein black particulate matter was identified during incoming quality inspection. The contaminant is suspected to be equipment-derived. Batch quarantine initiated and regulatory assessment in progress.",
        "status": "committed",
        "severity": "Critical",
        "suggested_next_action": "Immediate batch quarantine, 100% inspection of remaining stock, root cause investigation, FDA Field Alert Report evaluation",
        "risk_assessment": "Foreign matter contamination in API batch is a critical quality event. If contaminant is metallic or toxic, patient safety implications are severe. MHRA/FDA notification may be required under applicable regulations.",
        "regulatory_reportable": True,
    },
    {
        "complaint_number": "CC-2026-00004",
        "source": "Distributor",
        "customer_name": "PharmaLogix Distribution",
        "product_name": "Amoxicillin Trihydrate Capsules",
        "product_strength": "250mg",
        "batch_lot_number": "AMX-2026-004C",
        "affected_quantity": "1,200 capsules",
        "manufacturing_date": date(2025, 11, 10),
        "expiry_date": date(2027, 11, 9),
        "originating_site_block": "Block A - Solid Dosage",
        "impacted_npm": "Gelatin capsule shells, carton",
        "complaint_category": "Short Fill",
        "complaint_description": "Complaint received from PharmaLogix Distribution regarding Amoxicillin Trihydrate Capsules 250mg, Batch AMX-2026-004C. A random sample of 50 units revealed 8 capsules with fill weight below the lower specification limit. Investigation of capsule filling machine calibration and weight-monitoring system initiated.",
        "status": "closed",
        "severity": "Minor",
        "suggested_next_action": "Review capsule filling machine calibration records, enhance in-process weight monitoring frequency",
        "risk_assessment": "Short fill may result in sub-therapeutic dosing in affected units. No patient safety incident reported. CAPA focused on equipment calibration and process monitoring improvement.",
        "regulatory_reportable": False,
    },
    {
        "complaint_number": "CC-2026-00005",
        "source": "Regulatory Body",
        "customer_name": "MHRA Inspection Team",
        "product_name": "Lisinopril Tablets",
        "product_strength": "10mg",
        "batch_lot_number": "LIS-2026-005D",
        "affected_quantity": "50,000 units",
        "manufacturing_date": date(2026, 3, 5),
        "expiry_date": date(2028, 3, 4),
        "originating_site_block": "Block B - Tablet Manufacturing",
        "impacted_npm": "Primary packaging - blister packs",
        "complaint_category": "Mislabeling",
        "complaint_description": "Regulatory complaint received from MHRA inspection team regarding Lisinopril Tablets 10mg, Batch LIS-2026-005D. An inspection identified incorrect expiry date printed on 500 cartons (2027 printed instead of 2028). Immediate corrective action required; market withdrawal assessment underway.",
        "status": "committed",
        "severity": "Critical",
        "suggested_next_action": "Initiate voluntary recall of incorrectly labeled cartons, correct labeling system, notify MHRA within required timeframe",
        "risk_assessment": "Mislabeling of expiry date presents significant patient risk — patients may receive expired product believing it is within shelf life. MHRA notification mandatory. Immediate market withdrawal of affected lots recommended.",
        "regulatory_reportable": True,
    },
    {
        "complaint_number": "CC-2026-00006",
        "source": "Email",
        "customer_name": "Sunrise Healthcare Ltd",
        "product_name": "Pantoprazole Sodium Tablets",
        "product_strength": "40mg",
        "batch_lot_number": "PAN-2026-006E",
        "affected_quantity": "300 units",
        "manufacturing_date": date(2026, 2, 20),
        "expiry_date": date(2027, 2, 19),
        "originating_site_block": "Block A - Solid Dosage",
        "impacted_npm": "Moisture-barrier blister foil",
        "complaint_category": "Product Defect - Physical",
        "complaint_description": "Complaint submitted via email from Sunrise Healthcare Ltd regarding Pantoprazole Sodium 40mg, Batch PAN-2026-006E. Tablets reported to exhibit capping/lamination defects affecting approximately 15% of sampled units. Investigation of tablet compression parameters and granulation process initiated.",
        "status": "pending_triage",
        "severity": "Minor",
        "suggested_next_action": "Review compression machine settings, evaluate granulation moisture content, conduct enhanced stability assessment",
        "risk_assessment": "Tablet capping/lamination may affect dissolution profile and bioavailability. Product efficacy may be compromised in affected units. Enhanced monitoring recommended.",
        "regulatory_reportable": False,
    },
    {
        "complaint_number": "CC-2026-00007",
        "source": "Hospital",
        "customer_name": "Metro Children's Hospital",
        "product_name": "Paediatric Amoxicillin Suspension",
        "product_strength": "125mg/5mL",
        "batch_lot_number": "PAM-2026-007F",
        "affected_quantity": "50 bottles",
        "manufacturing_date": date(2026, 4, 1),
        "expiry_date": date(2026, 10, 31),
        "originating_site_block": "Block D - Liquid Dosage",
        "impacted_npm": "HDPE amber bottles, child-resistant caps",
        "complaint_category": "Contamination - Microbiological",
        "complaint_description": "Critical complaint received from Metro Children's Hospital regarding Paediatric Amoxicillin Suspension 125mg/5mL, Batch PAM-2026-007F. Microbiological contamination suspected following adverse patient reactions reported in three paediatric patients. Immediate quarantine and health authority notification initiated.",
        "status": "committed",
        "severity": "Critical",
        "suggested_next_action": "Immediate batch recall, retain samples for microbiological testing, notify FDA/health authorities, investigate manufacturing process sterility",
        "risk_assessment": "Microbiological contamination in paediatric suspension is a life-threatening quality event. Three adverse reactions reported. Mandatory immediate recall and health authority notification. Patient follow-up required.",
        "regulatory_reportable": True,
    },
    {
        "complaint_number": "CC-2026-00008",
        "source": "Distributor",
        "customer_name": "Global Pharma Wholesale",
        "product_name": "Metoprolol Succinate Extended Release",
        "product_strength": "50mg",
        "batch_lot_number": "MET-ER-2026-008",
        "affected_quantity": "10,000 units",
        "manufacturing_date": date(2025, 12, 1),
        "expiry_date": date(2027, 11, 30),
        "originating_site_block": "Block B - Tablet Manufacturing",
        "impacted_npm": "PVC/PVDC blister, outer carton",
        "complaint_category": "Product Defect - Dissolution",
        "complaint_description": "Complaint from Global Pharma Wholesale regarding Metoprolol Succinate ER 50mg, Batch MET-ER-2026-008. Dissolution testing at customer site showed Q-30 results below specification (60% vs. ≥80% required). Extended-release polymer coating investigation initiated.",
        "status": "under_investigation",
        "severity": "Major",
        "suggested_next_action": "Retain samples for confirmatory dissolution testing, review coating process parameters, assess patient safety impact",
        "risk_assessment": "Dissolution failure in extended-release formulation may result in rapid drug release (dose dumping) or inadequate blood level control, potentially causing cardiovascular adverse events.",
        "regulatory_reportable": True,
    },
    {
        "complaint_number": "CC-2026-00009",
        "source": "Pharmacy",
        "customer_name": "QuickCare Pharmacy",
        "product_name": "Ibuprofen Tablets",
        "product_strength": "400mg",
        "batch_lot_number": "IBU-2026-009G",
        "affected_quantity": "500 units",
        "manufacturing_date": date(2026, 3, 15),
        "expiry_date": date(2028, 3, 14),
        "originating_site_block": "Block A - Solid Dosage",
        "impacted_npm": "Aluminium blister foil",
        "complaint_category": "Product Defect - Odour",
        "complaint_description": "Complaint from QuickCare Pharmacy regarding Ibuprofen Tablets 400mg, Batch IBU-2026-009G. Unusual musty odour reported upon opening blister packs. Investigation of excipient quality and moisture control during manufacturing initiated.",
        "status": "committed",
        "severity": "Minor",
        "suggested_next_action": "Retain samples for organoleptic and stability testing, review excipient certificates, check storage conditions",
        "risk_assessment": "Unusual odour may indicate excipient degradation or environmental contamination during packaging. No immediate safety risk identified. Stability impact assessment required.",
        "regulatory_reportable": False,
    },
    {
        "complaint_number": "CC-2026-00010",
        "source": "Direct Customer",
        "customer_name": "NeuroPharma Research",
        "product_name": "Gabapentin API",
        "product_strength": "USP Grade",
        "batch_lot_number": "GAB-API-2026-010",
        "affected_quantity": "100 kg",
        "manufacturing_date": date(2026, 1, 5),
        "expiry_date": date(2028, 12, 31),
        "originating_site_block": "Block C - API Synthesis",
        "impacted_npm": "HDPE drums with polyethylene liner",
        "complaint_category": "Out of Specification - Purity",
        "complaint_description": "Complaint from NeuroPharma Research regarding Gabapentin API, Batch GAB-API-2026-010, wherein in-house testing revealed purity of 98.2% against specification ≥99.0%. OOS investigation initiated per ICH Q6A guidelines.",
        "status": "committed",
        "severity": "Major",
        "suggested_next_action": "Initiate OOS investigation per SOPs, review synthesis batch records, conduct Phase I and Phase II investigation",
        "risk_assessment": "OOS purity may indicate synthesis issue or degradation. If used in finished product, therapeutic efficacy may be compromised. FDA notification assessment required.",
        "regulatory_reportable": False,
    },
    {
        "complaint_number": "CC-2026-00011",
        "source": "Hospital",
        "customer_name": "St. Mary's Medical Center",
        "product_name": "Ondansetron Injection",
        "product_strength": "4mg/2mL",
        "batch_lot_number": "OND-INJ-2026-011",
        "affected_quantity": "20 vials",
        "manufacturing_date": date(2026, 2, 28),
        "expiry_date": date(2027, 2, 27),
        "originating_site_block": "Block E - Sterile Manufacturing",
        "impacted_npm": "Glass Type I vials, rubber stoppers",
        "complaint_category": "Contamination - Particulate Matter",
        "complaint_description": "Complaint from St. Mary's Medical Center regarding Ondansetron Injection 4mg/2mL, Batch OND-INJ-2026-011. Visible particulate matter observed in 3 of 20 vials upon inspection. Parenteral product particulate contamination is classified as a critical defect. Batch recall initiated.",
        "status": "committed",
        "severity": "Critical",
        "suggested_next_action": "Immediate voluntary recall, report to FDA within 3 days, investigate aseptic manufacturing process and vial inspection system",
        "risk_assessment": "Visible particulate matter in injectable product poses direct patient risk including embolism and adverse injection reactions. Critical GMP deviation. FDA notification mandatory.",
        "regulatory_reportable": True,
    },
    {
        "complaint_number": "CC-2026-00012",
        "source": "Email",
        "customer_name": "Regional Health Services",
        "product_name": "Salbutamol Inhaler",
        "product_strength": "100mcg/actuation",
        "batch_lot_number": "SAL-MDI-2026-012",
        "affected_quantity": "150 units",
        "manufacturing_date": date(2026, 1, 30),
        "expiry_date": date(2028, 1, 29),
        "originating_site_block": "Block F - Inhaler Manufacturing",
        "impacted_npm": "Aluminium canister, actuator",
        "complaint_category": "Device Malfunction - Delivery Failure",
        "complaint_description": "Complaint from Regional Health Services regarding Salbutamol Inhaler 100mcg, Batch SAL-MDI-2026-012. Patients reported inconsistent dose delivery and actuator failure in approximately 10% of units. Investigation of canister valve integrity and actuator dimensions initiated.",
        "status": "under_investigation",
        "severity": "Major",
        "suggested_next_action": "Conduct enhanced dose content uniformity testing, inspect actuator tooling, issue advisory to healthcare providers",
        "risk_assessment": "Inconsistent dose delivery in respiratory rescue inhaler presents significant patient safety risk — acute bronchospasm patients may not receive adequate medication.",
        "regulatory_reportable": True,
    },
    {
        "complaint_number": "CC-2026-00013",
        "source": "Distributor",
        "customer_name": "EuroPharma Distribution GmbH",
        "product_name": "Omeprazole Capsules",
        "product_strength": "20mg",
        "batch_lot_number": "OMP-2026-013H",
        "affected_quantity": "2,000 units",
        "manufacturing_date": date(2025, 10, 15),
        "expiry_date": date(2027, 10, 14),
        "originating_site_block": "Block A - Solid Dosage",
        "impacted_npm": "Blister packaging",
        "complaint_category": "Product Defect - Appearance",
        "complaint_description": "Complaint from EuroPharma Distribution GmbH regarding Omeprazole Capsules 20mg, Batch OMP-2026-013H. Capsule shells exhibiting surface cracks and deformation observed in approximately 5% of units. Investigation of humidity control during packaging and storage initiated.",
        "status": "capa_assigned",
        "severity": "Minor",
        "suggested_next_action": "Review humidity control during packaging, enhance visual inspection at QC, evaluate storage conditions at distributor",
        "risk_assessment": "Cracked capsule shells may affect enteric coating integrity, potentially causing premature drug release in gastric environment. Efficacy impact assessment required.",
        "regulatory_reportable": False,
    },
    {
        "complaint_number": "CC-2026-00014",
        "source": "Hospital",
        "customer_name": "University Teaching Hospital",
        "product_name": "Morphine Sulfate Injection",
        "product_strength": "10mg/mL",
        "batch_lot_number": "MOR-INJ-2026-014",
        "affected_quantity": "50 ampoules",
        "manufacturing_date": date(2026, 3, 1),
        "expiry_date": date(2027, 2, 28),
        "originating_site_block": "Block E - Sterile Manufacturing",
        "impacted_npm": "Glass ampoules Type I",
        "complaint_category": "Labeling Error - Strength",
        "complaint_description": "Critical complaint from University Teaching Hospital regarding Morphine Sulfate Injection. Ampoules labeled as 10mg/mL were found to contain 1mg/mL concentration following pharmacist verification. This represents a 10-fold labeling error with severe patient safety implications.",
        "status": "committed",
        "severity": "Critical",
        "suggested_next_action": "Immediate product recall, FDA/MHRA emergency notification, patient impact assessment, halt distribution, investigate labeling system",
        "risk_assessment": "10-fold labeling concentration error in opioid injectable is a life-threatening quality event. Risk of fatal overdose if full prescribed dose administered believing 10mg/mL concentration. Immediate recall and health authority notification mandatory.",
        "regulatory_reportable": True,
    },
    {
        "complaint_number": "CC-2026-00015",
        "source": "Pharmacy",
        "customer_name": "Community Pharmacy Network",
        "product_name": "Cetirizine Tablets",
        "product_strength": "10mg",
        "batch_lot_number": "CET-2026-015I",
        "affected_quantity": "300 units",
        "manufacturing_date": date(2026, 4, 10),
        "expiry_date": date(2028, 4, 9),
        "originating_site_block": "Block A - Solid Dosage",
        "impacted_npm": "Aluminium-Aluminium blister",
        "complaint_category": "Product Defect - Hardness",
        "complaint_description": "Complaint from Community Pharmacy Network regarding Cetirizine Tablets 10mg, Batch CET-2026-015I. Tablets reported to crumble upon removal from blister pack, with friability exceeding 1% per USP specification. Review of compression and lubrication process parameters initiated.",
        "status": "committed",
        "severity": "Minor",
        "suggested_next_action": "Conduct friability testing on retained samples, review compression parameters, enhance QC testing frequency",
        "risk_assessment": "High friability affects dose accuracy and patient acceptability. No direct safety risk. Process parameter review and CAPA required.",
        "regulatory_reportable": False,
    },
]


async def seed():
    print("[+] Starting database seed...")

    async with engine.begin() as conn:
        from app.models import user, complaint, ai_analysis, chat_history, audit_log, duplicate_flag  # noqa
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        from sqlalchemy import select, func
        result = await session.execute(select(func.count()).select_from(User))
        user_count = result.scalar()
        if user_count and user_count > 0:
            print("[OK] Database already seeded. Skipping.")
            return

        # Create demo user
        demo_user = User(
            id=str(uuid.uuid4()),
            email="demo@aivoa.com",
            name="Demo QA Officer",
            hashed_password=hash_password("demo1234"),
            role="qa_officer",
        )
        admin_user = User(
            id=str(uuid.uuid4()),
            email="admin@aivoa.com",
            name="QA Manager Admin",
            hashed_password=hash_password("admin1234"),
            role="qa_manager",
        )
        session.add_all([demo_user, admin_user])
        await session.flush()
        print(f"[OK] Created users: {demo_user.email}, {admin_user.email}")

        # Create complaints
        for i, data in enumerate(DEMO_COMPLAINTS):
            severity = data.pop("severity")
            next_action = data.pop("suggested_next_action")
            risk = data.pop("risk_assessment")
            reg_rep = data.pop("regulatory_reportable")

            complaint_obj = Complaint(
                id=str(uuid.uuid4()),
                created_by=demo_user.id,
                **data,
            )
            session.add(complaint_obj)
            await session.flush()

            # Create AI analysis
            analysis = AIAnalysis(
                id=str(uuid.uuid4()),
                complaint_id=complaint_obj.id,
                severity=severity,
                suggested_next_action=next_action,
                initial_risk_assessment=risk,
                regulatory_reportable=reg_rep,
                root_cause_suggestions=[
                    "Equipment calibration drift",
                    "Raw material quality deviation",
                    "Environmental control failure",
                ],
                capa_suggestions=[
                    f"Quarantine batch {data['batch_lot_number']}",
                    "Conduct root cause analysis (Ishikawa diagram)",
                    "Review batch manufacturing records",
                    "Implement enhanced monitoring controls",
                ],
                confidence_scores={
                    "product_name": 0.98,
                    "batch_lot_number": 0.95,
                    "complaint_category": 0.92,
                    "severity": 0.88,
                },
                model_used="llama-3.1-8b-instant",
            )
            session.add(analysis)

            # Create audit log
            audit = AuditLog(
                id=str(uuid.uuid4()),
                complaint_id=complaint_obj.id,
                actor="ai",
                actor_name="AIVOA Copilot",
                action_type="ai_extraction",
                field_name="all_fields",
                new_value="Initial extraction complete",
            )
            session.add(audit)

            commit_audit = AuditLog(
                id=str(uuid.uuid4()),
                complaint_id=complaint_obj.id,
                actor="human",
                actor_name="Demo QA Officer",
                action_type="commit",
            )
            session.add(commit_audit)

        await session.commit()
        print(f"[OK] Created {len(DEMO_COMPLAINTS)} complaints with AI analyses and audit logs")
        print("\n--- Seed Complete ---")
        print("   Demo user:  demo@aivoa.com / demo1234")
        print("   Admin user: admin@aivoa.com / admin1234")


if __name__ == "__main__":
    asyncio.run(seed())
