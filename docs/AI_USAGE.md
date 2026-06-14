# AI_USAGE.md — AI Tools and Usage Log

## AI Tools Used

| Tool | Purpose |
|------|---------|
| Google Gemini (Antigravity IDE) | Primary development collaborator — architecture, code generation, debugging |

## Key Prompts

1. **"Analyze the CSV and PDF, identify all data anomalies, and create a complete implementation plan"**
   - Generated the anomaly catalog and system design
   - I reviewed every anomaly against the CSV data to verify accuracy

2. **"Build the complete backend with Express, Prisma, PostgreSQL — all controllers, routes, services"**
   - Generated the project structure and backend code
   - I reviewed all business logic, especially the balance calculation and import engine

3. **"Create the React frontend with all pages — dashboard, groups, import flow with anomaly review"**
   - Generated the UI components and page layouts
   - I verified the API integration and user flow logic

## Cases Where AI Produced Something Wrong

### Case 1: Initial Database Choice — MongoDB
**What happened:** The AI initially planned to use MongoDB with Mongoose based on my initial prompt template.  
**How I caught it:** Reading the assignment PDF carefully — it explicitly states "Use relational DBs only."  
**What I changed:** Switched to PostgreSQL with Prisma ORM. Redesigned all schemas as relational tables with foreign keys and proper constraints instead of document collections.

### Case 2: Exchange Rate Approach
**What happened:** The AI initially suggested using a live exchange rate API for USD→INR conversion.  
**How I caught it:** Realized that live rates would make balance calculations non-deterministic — different results every page load, and impossible to verify by hand during the live interview.  
**What I changed:** Switched to a fixed configurable rate (₹83/$1) stored as an environment variable. This makes calculations reproducible and explainable.

### Case 3: PDF Parsing Library Issues
**What happened:** The AI tried multiple approaches to extract text from the PDF file — raw buffer parsing, `pdf-parse` library with wrong API calls (`loadPDF` instead of `load`), and `pdfjs-dist`. Multiple attempts failed due to incorrect API usage.  
**How I caught it:** Each attempt produced errors or garbled output. The `pdf-parse` library had a non-standard API that the AI didn't know correctly.  
**What I changed:** Instead of continuing to fight with PDF parsing, I manually read the PDF and pasted the content directly into the conversation. Practical problem-solving over tool-chaining.

### Case 4: Balance Calculation Edge Cases  
**What happened:** Initial balance calculation didn't account for temporal membership — it included all group members in all expenses regardless of join/leave dates.  
**How I caught it:** Sam's requirement ("Why would March electricity affect my balance?") made it clear that membership dates must be respected.  
**What I changed:** Added `joined_at` and `left_at` fields to group_members, and the balance service filters expenses based on whether a member was active on the expense date.

## Lessons Learned

1. **Always verify AI output against primary sources** — the assignment PDF was the source of truth, not the AI's assumptions from a generic prompt template
2. **AI is great at scaffolding but needs careful review for business logic** — the anomaly detection and balance calculation required manual verification
3. **When an AI tool fails, pivot fast** — spent too long trying to make PDF parsing work instead of just reading it manually
4. **AI-generated code must be code you understand** — every line in this repository was reviewed and I can explain why it exists
