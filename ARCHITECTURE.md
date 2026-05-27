# System Architecture

## Overview

The AI Recruitment Workflow Automation Platform is a microservices-based system with three layers: a React SPA frontend, a Node.js/Express REST API backend, and a Python Flask AI service. The backend orchestrates the entire recruitment pipeline -- from resume submission through AI scoring, automated interview scheduling, to final selection decisions -- with automated email notifications at every stage.

## High-Level Architecture

```
+-------------------------------------------------------------------+
|                         CLIENT LAYER                               |
|  React.js SPA (Port 3000) - Component-based UI                    |
|  - Authentication pages (Login / Signup)                           |
|  - Job browsing and application (with resume upload)               |
|  - Application tracking with interview details                     |
|  - Interview management (admin)                                    |
|  - Analytics dashboard (admin)                                     |
+-----------------------------+-------------------------------------+
                              | REST API (native Fetch)
+-----------------------------v-------------------------------------+
|                         API LAYER                                  |
|  Express.js Server (Port 5000) - RESTful API                      |
|  +-- Authentication Routes (/api/auth)                             |
|  +-- Job Management Routes (/api/jobs)                             |
|  +-- Application Routes (/api/applications)                        |
|  +-- Interview Routes (/api/interviews)                            |
|  +-- Analytics Routes (/api/analytics)                             |
+----------+--------------------------+-----------------------------+
           |                          |
           v                          v
+----------------------+   +---------------------------------+
|  DATABASE LAYER      |   | AI SERVICE LAYER                |
|  MongoDB             |   | Flask (Port 8000)               |
|  (Local or Atlas)    |   | Python NLP Processing           |
|  - Collections:      |   | +-- Resume Parser               |
|    * Users           |   | |   (pdfplumber, docx2txt)      |
|    * Jobs            |   | +-- Skill Extraction            |
|    * Applications    |   | |   (regex pattern matching)    |
|    * Interviews      |   | +-- Match Engine                |
|    * Emails          |   |     (TF-IDF + cosine similarity)|
+----------------------+   +---------------------------------+
```

### Communication Patterns

- **Frontend -> Backend**: HTTP REST via native Fetch API with JWT Bearer token in Authorization header.
- **Backend -> AI Service**: HTTP POST via axios to Flask API; falls back to spawning a local Python subprocess (`analyze_resume_cli.py`) if the Flask service is unavailable.
- **Backend -> MongoDB**: Mongoose ODM with schema validation and automatic type casting.
- **Backend -> Email**: Nodemailer with Gmail transport (currently in test/log mode).

## Component Architecture

### Frontend (React.js)

```
frontend/src/
+-- pages/
|   +-- LoginPage.js            # Login form
|   +-- SignupPage.js            # Registration form with role selection
|   +-- HomePage.js              # Role-based landing dashboard
|   +-- JobsPage.js              # Job listing, details, and application
|   +-- CreateJobPage.js         # Admin job creation with interview config
|   +-- ApplicationsPage.js     # Application tracking with interview info
|   +-- DashboardPage.js        # Analytics dashboard (admin only)
+-- components/
|   +-- Navbar.js                # Navigation with role-based links
+-- context/
|   +-- AuthContext.js           # Auth state management (Context API)
+-- hooks/
|   +-- useAuth.js               # Custom hook for accessing auth context
+-- services/
|   +-- api.js                   # Native Fetch API client with auth headers
+-- App.js                       # React Router v7 route definitions
```

**Key Design Patterns:**
- Context API for global auth state management (no Redux)
- Custom `useAuth` hook for consuming auth context
- Native Fetch API client with automatic JWT header injection (no axios on frontend)
- FormData for multipart resume uploads
- Role-based conditional rendering (admin sees management views; candidate sees application views)
- localStorage for JWT token and user persistence

### Backend (Node.js / Express)

```
backend/src/
+-- models/
|   +-- User.js                  # User schema + bcrypt pre-save hook
|   +-- Job.js                   # Job posting with interview automation config
|   +-- Application.js           # Application with AI scoring and pipeline status
|   +-- Interview.js             # Interview scheduling, feedback, and decision
|   +-- Email.js                 # Email audit trail
+-- controllers/
|   +-- authController.js        # Signup, login, logout
|   +-- jobController.js         # Job CRUD operations
|   +-- applicationController.js # Resume submission + automation orchestration
|   +-- analyticsController.js   # Dashboard stats, job analytics, funnel
|   +-- interviewController.js   # Interview listing and outcome recording
+-- routes/
|   +-- auth.js                  # POST /api/auth/signup, login, logout
|   +-- jobs.js                  # CRUD /api/jobs
|   +-- applications.js          # /api/applications (with Multer upload)
|   +-- analytics.js             # GET /api/analytics/*
|   +-- interviews.js            # GET/PUT /api/interviews
+-- middleware/
|   +-- auth.js                  # JWT verification (authMiddleware) + role check (authorize)
|   +-- errorHandler.js          # Global error handler (ValidationError, CastError, generic)
+-- services/
|   +-- emailService.js          # Nodemailer transport (Gmail, currently test mode)
|   +-- resumeAnalysisService.js # AI service client: HTTP -> Flask; fallback -> subprocess
|   +-- recruitmentAutomationService.js  # Full automation pipeline
+-- server.js                    # Express app entry point, middleware, route mounting
```

**Key Patterns:**
- MVC architecture: Models define data shape, Controllers handle logic, Routes define endpoints
- Service layer for cross-cutting business logic (email, AI analysis, recruitment automation)
- Middleware chain: CORS -> JSON parser -> request logger -> route handler -> error handler
- Multer for multipart file uploads (resumes stored to `ai-service/uploads/`)
- Mongoose population for joining related documents

### AI Service (Python / Flask)

```
ai-service/
+-- app.py                       # Flask API with /api/analyze-resume and /health endpoints
+-- analyze_resume_cli.py        # CLI entry point for subprocess fallback mode
+-- services/
|   +-- resume_parser.py         # ResumeParser class: PDF/DOCX text extraction + skill extraction
|   +-- match_engine.py          # MatchEngine class: TF-IDF vectorization + cosine similarity
+-- requirements.txt             # Flask, pdfplumber, docx2txt, scikit-learn, numpy
```

**Key Algorithms:**
- Resume text extraction: pdfplumber for PDF, docx2txt for DOCX
- Skill extraction: regex word-boundary matching against a curated set of 50+ technical skills
- TF-IDF vectorization using scikit-learn's `TfidfVectorizer` (lowercase, English stop words removed)
- Cosine similarity via `sklearn.metrics.pairwise.cosine_similarity`
- Weighted final score: 70% skill match + 30% text similarity

## Data Flow: Application Submission Pipeline

```
+------------------------------------------+
| 1. Candidate uploads resume (PDF/DOCX)   |
|    POST /api/applications (multipart)     |
+-------------------+----------------------+
                    |
                    v
+------------------------------------------+
| 2. Backend: applicationController         |
|    - Validate role (candidate only)       |
|    - Validate file exists                 |
|    - Check for duplicate application      |
|    - Multer saves file to ai-service/     |
+-------------------+----------------------+
                    |
                    v
+------------------------------------------+
| 3. resumeAnalysisService                  |
|    - Try HTTP POST to Flask AI service    |
|    - If unavailable: spawn Python CLI     |
+-------------------+----------------------+
                    |
                    v
+------------------------------------------+
| 4. AI Service: analyze_resume             |
|    - Extract text (pdfplumber/docx2txt)   |
|    - Extract skills (regex matching)      |
|    - Compute TF-IDF cosine similarity     |
|    - Return: matchScore, extractedSkills  |
+-------------------+----------------------+
                    |
                    v
+------------------------------------------+
| 5. Backend: Create Application Record     |
|    - Save matchScore, extractedSkills     |
|    - Compare score vs shortlistThreshold  |
|    - Set screeningDecision + status       |
+-------------------+----------------------+
                    |
          +---------+---------+
          |                   |
          v                   v
+-----------------+  +--------------------+
| 6a. SHORTLISTED |  | 6b. REJECTED       |
| - Create        |  | - Send rejection   |
|   Interview     |  |   email to         |
| - Schedule time |  |   candidate        |
| - Generate Zoom |  | - Log in Emails    |
|   link (remote) |  |   collection       |
| - Email         |  +--------------------+
|   candidate     |
| - Email         |
|   interviewer   |
| - Log emails    |
+-----------------+
          |
          v
+-----------------+
| 7. HR notified  |
|    via email for |
|    all cases     |
+-----------------+
```

## Data Flow: Interview Completion

```
+------------------------------------------+
| Admin records interview outcome           |
| PUT /api/interviews/:id/outcome           |
| Body: { decision, feedback }              |
+-------------------+----------------------+
                    |
                    v
+------------------------------------------+
| recruitmentAutomationService.             |
| completeInterview()                       |
| - Mark interview as completed             |
| - Update application status               |
+-------------------+----------------------+
                    |
          +---------+---------+
          |                   |
          v                   v
+-------------------+ +--------------------+
| HR_MANAGERIAL     | | REJECTED           |
| - Email candidate | | - Email candidate  |
|   about next step | |   with rejection   |
| - Update app to   | | - Update app to    |
|   hr_managerial   | |   rejected         |
+-------------------+ +--------------------+
```

## Database Schema Relationships

```
User (1) ---creates---> (many) Job
  |                              |
  | (1)                          | (1)
  |                              |
  (many)                     (many)
  |                              |
  Applications                Applications
  |                              |
  | (1)                          |
  +---<--- Application (1) ---creates---> (1) Interview
                |
                | (1)
                |
                (many) Emails
```

### Collections

**Users** -- `email` (unique, indexed, lowercase), `passwordHash` (bcrypt), `firstName`, `lastName`, `role` (enum: admin, candidate), `company`, `status` (enum: active, inactive), `createdAt`

**Jobs** -- `title`, `description`, `requiredSkills[]`, `experience`, `salary`, `location`, `interviewLocation`, `hrEmail`, `interviewerName`, `interviewerEmail`, `shortlistThreshold` (0-100, default 75), `interviewLeadHours` (default 48), `meetingDurationMinutes` (default 45), `createdBy` (ref User), `status` (enum: open, closed), `createdAt`

**Applications** -- `jobId` (ref Job), `candidateId` (ref User), `resumeUrl`, `matchScore` (0-100), `extractedSkills[]`, `screeningDecision` (enum: pending, shortlisted, rejected), `status` (enum: applied, interview_scheduled, interview_completed, hr_managerial_round, selected, rejected), `emailSent`, `lastEmailType`, `createdAt`

**Interviews** -- `applicationId` (ref Application, unique), `candidate` (ref User), `job` (ref Job), `interviewerName`, `interviewerEmail`, `interviewLocation`, `zoomLink`, `meetingDurationMinutes`, `scheduledBy` (ref User), `scheduledTime`, `status` (enum: scheduled, completed, cancelled), `feedback`, `decision` (enum: pending, hr_managerial_round, rejected), `completedAt`, `createdAt`, `updatedAt` (auto via timestamps)

**Emails** -- `applicationId` (ref Application), `recipientEmail`, `subject`, `body`, `type` (enum: application_received, interview_scheduled, hr_round, rejection), `sentAt`

## Authentication and Authorization Flow

```
1. User submits email + password
   |
   v
2. Signup: password stored as passwordHash; Mongoose pre-save hook
   auto-hashes with bcryptjs (salt rounds = 10)
   Login: bcrypt.compare(password, storedHash)
   |
   v
3. On success: generate JWT with payload { id, email, role }
   Expiry: 7 days (configurable via JWT_EXPIRE env var)
   |
   v
4. Token returned to frontend
   |
   v
5. Frontend stores token + user in localStorage
   |
   v
6. All API requests include: Authorization: Bearer <token>
   |
   v
7. authMiddleware extracts and verifies token via jwt.verify()
   Attaches decoded { id, email, role } to req.user
   |
   v
8. authorize(...roles) middleware checks req.user.role against allowed roles
   Returns 403 if role not permitted
```

### JWT Token Payload
```javascript
{
  id: ObjectId,       // User._id
  email: String,      // User email
  role: String,       // "admin" or "candidate"
  iat: Number,        // Issued at timestamp
  exp: Number         // Expiry timestamp
}
```

## Matching Algorithm: TF-IDF + Cosine Similarity

### Input
- Extracted skills from resume (via regex pattern matching)
- Required skills from job posting
- Full resume text
- Full job description text

### Process

**Step 1: Skill Matching (70% weight)**
```
matched_skills = count of required skills found in extracted skills
skill_score = (matched_skills / total_required_skills) * 100

Matching uses substring containment in both directions:
  req in ext  OR  ext in req  (case-insensitive)
```

**Step 2: Text Similarity (30% weight)**
```
1. Clean both texts (normalize whitespace)
2. Vectorize using TfidfVectorizer (lowercase, English stop words removed)
3. Compute cosine_similarity between the two TF-IDF vectors
4. Scale from 0-1 to 0-100
```

**Step 3: Final Score**
```
Final Score = (Skill Match * 0.7) + (Text Similarity * 0.3)
Clamped to range [0, 100]

Decision: score >= shortlistThreshold ? "shortlisted" : "rejected"
```

### Why TF-IDF?
- No training data required -- works out of the box on any resume and job description
- Fast computation -- suitable for real-time scoring during application submission
- Explainable results -- each component (skill match, text similarity) is independently interpretable
- Proven effectiveness for document similarity tasks
- Lightweight -- no GPU or large model downloads needed

## Security Measures

### Implemented
- Password hashing with bcryptjs (10 salt rounds, auto via pre-save hook)
- JWT token validation on all protected routes
- Role-based authorization middleware
- CORS enabled via cors middleware
- Input validation through Mongoose schema definitions and enum constraints
- File upload handling via Multer (disk storage with timestamped filenames)
- Global error handler prevents stack trace leakage to clients
- Environment variables for all secrets (JWT_SECRET, MONGODB_URI, email credentials)

## Error Handling

The global error handler (`middleware/errorHandler.js`) catches:
- `ValidationError` (Mongoose schema validation) -- returns 400 with details
- `CastError` (invalid MongoDB ObjectId) -- returns 400 with "Invalid ID"
- Generic errors -- returns the error's status code or 500 with the error message

Controllers use try/catch with specific HTTP status codes (400, 401, 403, 404, 500).

## Scalability Considerations

- **Stateless JWT auth** -- no server-side session storage; any backend instance can verify tokens
- **Separate AI microservice** -- can be scaled independently from the API server
- **CLI fallback mode** -- AI analysis works even without the Flask service running
- **Mongoose connection pooling** -- default MongoDB connection pool handles concurrent requests
- **Modular service architecture** -- email, AI analysis, and automation logic are in separate service files
- **Async/await throughout** -- non-blocking I/O for all database and external service calls
