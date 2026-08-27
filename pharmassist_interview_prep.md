# PharmAssist Interview Preparation Guide

This guide is designed to help you confidently explain your PharmAssist Customer Complaint Management System project in an interview setting, bridging deep technical architecture with layman-friendly business value.

## 1. The "Elevator Pitch" (What the project does in layman's terms)

**If they ask: "Tell me about this project."**

*“PharmAssist is an AI-powered quality management tool built for pharmaceutical manufacturing. Normally, when a pharmacy or hospital reports a defective drug (like a broken pill or wrong label), a QA officer has to spend hours manually typing out a massive, highly-regulated complaint form. I built a system that completely automates this data entry. A user can just drag-and-drop a customer email or PDF into an AI Copilot chat, and the AI will read it, extract all the important details (like batch numbers and product names), and instantly fill out the form. It also automatically calculates the risk level (Minor, Major, Critical) and checks if the complaint is a duplicate. Most importantly, it keeps a human in the loop—the user can chat with the AI to make corrections before saving it to the official database.”*

---

## 2. How You Built It (The Architecture)

**If they ask: "Walk me through how this actually works under the hood."**

The system is built on a **two-pane architecture** that stays perfectly in sync:
1. **The User Interface (React/Redux):** The left side is the official form, the right side is the AI Chat. Redux acts as the single source of truth. If the AI updates a field, Redux updates the form instantly and highlights it in green.
2. **The Backend Orchestrator (FastAPI):** When a user sends a message or file, the backend receives it.
3. **The AI Brain (LangGraph):** Instead of just sending one massive prompt to an AI, I built a "Graph" (a state machine) where the AI does focused micro-tasks:
   - *Node 1:* Figures out what the user wants (Intent detection).
   - *Node 2:* Extracts the data into strict JSON.
   - *Node 3:* Checks for missing information.
   - *Node 4:* Checks the database for duplicates.
   - *Node 5:* Analyzes the risk severity.
4. **The Database (PostgreSQL):** Once the human approves, the complaint, the AI's analysis, and a strict audit trail are saved permanently.

---

## 3. The Tech Stack & "Why" You Chose It

**If they ask: "Why did you choose this specific tech stack?"**

* **Frontend: React & Redux Toolkit**
  * *Why:* Because the AI Chat and the Complaint Form must be in perfect sync. If the AI extracts a batch number, the form needs to update instantly without the user refreshing. Redux provides a strict, predictable "single source of truth" to prevent the UI from glitching.
* **Backend: Python & FastAPI**
  * *Why:* Python is the undisputed king of AI integration. I chose FastAPI because it is extremely fast, asynchronous (meaning it can handle multiple users while waiting for the AI to respond), and it natively uses Pydantic, which is perfect for forcing the AI to output strict, validated JSON instead of messy text.
* **AI Orchestration: LangGraph & Groq (Llama/Gemma models)**
  * *Why:* A single LLM prompt is brittle and unpredictable. LangGraph allowed me to break the AI's job into a multi-step pipeline (Extract -> Validate -> Deduplicate -> Risk Assess). If one step fails, I can retry just that step. Groq was used because its inference speed is lightning-fast, making the chat feel instantaneous.

### The Database Question: Why PostgreSQL over NoSQL (MongoDB) or MySQL?

**If they ask: "Why did you use PostgreSQL? Why not a NoSQL database like MongoDB?"**

*“Because this is a pharmaceutical Quality Management System (QMS). In pharma, data integrity is regulated by law (like FDA 21 CFR Part 11). NoSQL databases (like MongoDB) are schema-less and great for flexible data, but in highly-regulated environments, you need strict relational integrity. You need to guarantee that an Audit Log row is permanently attached to a Complaint row.*

*I chose PostgreSQL specifically (over MySQL) because of its superior **JSONB support**. While the core complaint data is highly structured (columns for Batch Number, Product, etc.), the AI analysis (like confidence scores, root cause suggestions, and CAPA recommendations) is dynamic and tree-like. Postgres allows me to have strict relational tables for compliance, while safely storing the AI’s complex outputs in highly-queryable JSONB columns.”*

---

## 4. Anticipated Interview Questions & How to Answer Them

> [!IMPORTANT]
> Use these responses as a framework, but inject your own voice and experiences into them.

**Q: How do you handle AI "Hallucinations" (making things up)?**
**A:** "In a regulated industry, AI can't make the final call. First, I use **Pydantic schemas** to force the LLM to output strict JSON types (it can't put text in a date field). Second, the AI calculates a **Confidence Score** for its extractions. Finally, the system is designed as a 'Copilot'—it never writes directly to the database. It only populates a draft form on the screen for the QA officer (the human-in-the-loop) to review, correct via chat, and manually 'Commit'."

**Q: What was the hardest technical challenge you faced?**
**A:** "State synchronization between the AI and the frontend. If a user uploads a document, the AI fills 10 fields. If the user then types *'Actually, the batch number is 12345'*, the AI needs to update *only* the batch number without wiping out the other 9 fields. I solved this by passing the current Redux form state back to the LangGraph engine on every chat message. The AI receives the current state, edits what it needs to, and returns a 'delta' (only the updated fields), which Redux then merges safely."

**Q: How do you ensure this system is secure and compliant?**
**A:** "I implemented a strict **Audit Trail**. Because of FDA 21 CFR Part 11 requirements, every single time a field changes, an immutable record is created tracking the old value, the new value, and the *actor* (whether a human typed it, or the AI extracted it). I also mitigated prompt injection by strictly separating user input (treated as inert data) from system instructions."

**Q: If you had more time, how would you scale or improve this?**
**A:** "I would implement RAG (Retrieval-Augmented Generation). Right now, the AI assesses risk based on its general knowledge. With RAG, I could hook the AI up to the company's actual historical CAPA (Corrective and Preventive Action) database. That way, if a complaint comes in about 'discolored API', the AI can search the database and say, *'We had this exact same issue two years ago, here is how we fixed it last time.'*"

**Q: What happens if the AI API goes down or is slow?**
**A:** "The backend wraps all AI calls in timeouts and a retry-with-backoff mechanism using the Python `tenacity` library. If the AI completely fails, the backend gracefully catches the error and sends a clean fallback message to the frontend, so the application doesn't crash and the user can still manually fill out the form."
