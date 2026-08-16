# PharmAssist: AI-Powered Customer Complaint Management System (QMS)

> **PharmAssist Internship Assessment Task**  
> An enterprise-grade, AI-driven Quality Management System (QMS) module designed for Pharmaceutical API (Active Pharmaceutical Ingredients) & FDF (Finished Dosage Form) Manufacturers. Features an interactive **LangGraph Multi-Node AI Copilot** that extracts, validates, risk-assesses, and deduplicates customer complaints in compliance with GxP and regulatory standards (USFDA / MHRA / WHO-GMP).

---

## Key Highlights & Features

* **Branded Initialization**: 5-second branded splash loading screen with session-gating.
* **Enterprise Light Mode First**: Light-mode-first design system with dark navy sidebar chrome (`#0F0E17`) and dark mode toggle.
* **LangGraph AI Copilot**: Automated complaint extraction, defect classification, missing-field identification, and duplicate detection.
* **Amber/Red/Green Traffic Light Risk Matrix**: Standardized severity tokens (**Critical** = Red, **Major** = Amber, **Minor** = Green) synced across donut charts, complaint tables, and risk assessment cards.
* **21 CFR Part 11 Audit Trail**: Immutable field-level change history tracking human vs. AI actions.

---

## Architecture & Technology Stack

### **Frontend System**
* **Framework**: React 18 + Vite (TypeScript)
* **State Management**: Redux Toolkit & LocalStorage Persistence
* **Styling & Motion**: Custom CSS Design Tokens, Tailwind CSS, Framer Motion
* **Visualizations**: Recharts (Severity & Category Distributions)
* **Icons & UI**: Lucide React, Glassmorphism Cards, Micro-animations

### **Backend System**
* **Framework**: Python 3.11 + FastAPI (Asynchronous ASGI)
* **Database & ORM**: SQLite (`aiosqlite`) / Async SQLAlchemy 2.0
* **AI Orchestration**: LangGraph / LangChain Multi-Node Graph Architecture
* **LLM Provider**: Groq API Engine (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`)
* **Data Validation**: Pydantic v2 Schemas & Custom Model-Routing Middleware

### **CI/CD & DevOps**
* **Pipeline**: GitHub Actions (`.github/workflows/ci.yml`) for automated frontend compilation and backend import checks on every push.

---

## Core Functionalities

### 1. **Automated Complaint Extraction & Triage**
- Upload complaint documents (`.pdf`, `.eml`, `.txt`) or paste raw unstructured text into the **PharmAssist Copilot**.
- Extracts critical GxP fields automatically: *Customer Name, Source, Product Name/Grade, Batch/Lot Number, Affected Quantity, Manufacturing Date, Expiry Date, Site Block, and NPM Impact*.

### 2. **AI Risk Assessment & Severity Classification**
- Computes initial risk level (`Critical`, `Major`, `Minor`) and regulatory notification advice (e.g. MHRA/USFDA reportability).
- Generates suggested next actions for QA triage officers.

### 3. **Duplicate Detection Engine**
- Pre-filters historical QMS records using structured batch matching and text similarity algorithms to prevent duplicate complaint logging.

### 4. **Multi-Model AI Switching**
- Dynamic model selection headers (`X-Primary-Model`, `X-Secondary-Model`) configured via Settings for flexible Groq model routing.

---

## Repository Structure

```
pharmassist/
├── frontend/                     # React + Vite Enterprise Single Page App
│   ├── public/                   # Static assets & brand logo (logo.png)
│   ├── src/
│   │   ├── app/                  # Redux store & custom hooks
│   │   ├── components/           # UI components (Button, Modal, DonutChart, etc.)
│   │   ├── features/             # Feature slices (complaints, copilot, settings, theme)
│   │   ├── pages/                # Dashboard, Complaints, Copilot, Settings, SplashScreen
│   │   ├── routes/               # AppShell navigation & router gate
│   │   └── types/                # TypeScript interfaces
│   └── vite.config.ts
├── backend/                      # FastAPI Python Service
│   ├── app/
│   │   ├── api/                  # REST endpoints (auth, complaints, copilot, dashboard, health)
│   │   ├── graph/                # LangGraph state graph nodes & workflow
│   │   ├── models/               # SQLAlchemy ORM entities (Complaint, AIAnalysis, AuditLog)
│   │   ├── repositories/         # Database access layer
│   │   ├── schemas/              # Pydantic data schemas
│   │   └── services/             # QMS business logic
│   ├── main.py                   # FastAPI application entrypoint
│   └── requirements.txt          # Python dependencies
├── .github/workflows/ci.yml      # GitHub Actions CI build & verification workflow
└── DESIGN_SYSTEM.md              # PharmAssist Enterprise Design Guidelines
```

---

## Quickstart & Local Setup

### **Prerequisites**
* Node.js (v18+) & npm
* Python (v3.10+)
* Groq API Key (Optional for live LLM extraction; mock mode supported)

---

### 1. **Backend Setup**

```bash
# Navigate to backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your Groq API key
cp .env.example .env

# Run the FastAPI server
uvicorn app.main:app --reload --port 8000
```
> The API server will run at `http://localhost:8000` (Interactive Swagger Docs at `http://localhost:8000/docs`).

---

### 2. **Frontend Setup**

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
> The web application will launch at `http://localhost:5173`.

---

## Authentication & Demo Access

- Click **"Continue as Demo User"** on the login screen to sign in instantly with pre-seeded QA Officer credentials.
- Pre-loaded mock datasets demonstrate real-time complaint analytics, audit trails, and risk donut charts out of the box.

---

## Compliance & Standards

Designed with reference to:
- **USFDA 21 CFR Part 211** (Current Good Manufacturing Practice for Finished Pharmaceuticals)
- **EU GMP Annex 11** & **21 CFR Part 11** (Electronic Records & Signatures)
- **ICH Q9** (Quality Risk Management Guidelines)

---

<p align="center">
Developed for the <b>PharmAssist Technical Internship Assessment</b>.
</p>
