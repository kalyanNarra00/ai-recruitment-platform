# AI-Powered Recruitment Workflow Automation Platform

A custom-built, full-stack recruitment automation platform that uses AI/ML-based resume screening to automate the entire hiring pipeline -- from application submission through interview scheduling to final selection. Role-based access (Admin/Candidate) ensures each user sees only what they need.

This is **not** a template or boilerplate. The AI matching algorithm (TF-IDF + cosine similarity), the automation workflow, and all business logic were designed and implemented from scratch.

## Tech Stack

| Layer          | Technology                                                        |
|----------------|-------------------------------------------------------------------|
| Frontend       | React.js 19, React Router v7, Context API, native Fetch API      |
| Backend        | Node.js, Express 5, Mongoose 9, Multer (file uploads)            |
| Database       | MongoDB (local or Atlas)                                          |
| AI Service     | Python 3, Flask, scikit-learn (TF-IDF + cosine similarity)       |
| NLP / Parsing  | pdfplumber (PDF), docx2txt (DOCX), regex skill extraction        |
| Authentication | JWT (jsonwebtoken) with bcryptjs password hashing                |
| Email          | Nodemailer (Gmail transport, currently in test/log mode)         |

## Architecture

```
Frontend (React :3000)  -->  Backend API (Express :5000)  -->  MongoDB
                                       |
                                       v
                             Python AI Service (:8000)
                             (Resume parsing + TF-IDF matching)
```

The backend communicates with the AI service in two ways:
1. **HTTP mode** -- calls the Flask API at `AI_SERVICE_URL` when the service is running.
2. **CLI fallback** -- spawns a local Python subprocess (`analyze_resume_cli.py`) when the Flask service is unavailable.

## Features

### 1. Authentication and Authorization
- JWT-based signup and login with 7-day token expiry
- bcryptjs password hashing via Mongoose pre-save hook
- Two roles: **admin** (manages jobs, views all applications, analytics, interviews) and **candidate** (browses jobs, applies, tracks own applications)
- Role-based route protection on both backend middleware and frontend rendering

### 2. Job Management
- Admin CRUD for job postings (title, description, required skills, salary, location, experience)
- Interview automation configuration per job: shortlist threshold, interviewer details, HR email, interview lead time, meeting duration, interview location
- Open/closed job status

### 3. AI Resume Screening
- Candidate uploads PDF or DOCX resume
- Python NLP service extracts text (pdfplumber / docx2txt)
- Skill extraction via regex pattern matching against a curated set of 50+ technical skills
- TF-IDF cosine similarity scoring: `Final Score = (Skill Match * 0.7) + (Text Similarity * 0.3)`
- Score compared against the job's configurable shortlist threshold (default 75%)
- Automatic shortlist or reject decision

### 4. Automated Recruitment Pipeline
On every application submission, the system automatically:
1. Sends the resume to the AI service for scoring
2. Compares the score against the job's shortlist threshold
3. If shortlisted: creates an Interview record, schedules the interview, emails both the candidate and interviewer
4. If rejected: emails the candidate with a rejection notice
5. Notifies HR via email with match details for every application
6. Logs all emails in the audit trail (Emails collection)

### 5. Interview Management
- Auto-scheduled interviews with configurable lead time and duration
- Remote interviews get auto-generated Zoom links; in-person interviews show the location
- Admin can complete an interview and decide: advance to HR/managerial round or reject
- Each decision triggers automated emails to the candidate
- Interview status tracking: scheduled, completed, cancelled

### 6. Analytics Dashboard (Admin Only)
- Real-time pipeline statistics: total applications, shortlist count, rejection count, open jobs
- Interview metrics: scheduled, completed, selected counts
- Average match score across all applications
- Shortlist and rejection rate percentages
- Per-job analytics: applications, scores, interview status
- Candidate funnel: applied -> shortlisted -> interview scheduled -> interview completed -> HR round -> rejected

### 7. Email Automation
- Nodemailer-based email at every pipeline stage:
  - `application_received` -- HR notification when a candidate applies
  - `interview_scheduled` -- candidate and interviewer notification with time, location, Zoom link
  - `hr_round` -- candidate notification when advanced to HR/managerial round
  - `rejection` -- candidate notification on rejection (at screening or after interview)
- Full audit trail in the Emails collection
- Currently runs in test/log mode (emails logged to console); toggle real sending in `emailService.js`

## Setup Instructions

### Prerequisites
- Node.js v18+
- Python 3.10+
- MongoDB (local install or MongoDB Atlas)

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:
```
MONGODB_URI=mongodb://localhost:27017/recruitment
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
PORT=5000
AI_SERVICE_URL=http://localhost:8000
NODEMAILER_EMAIL=your_email@gmail.com
NODEMAILER_PASSWORD=your_app_password
PYTHON_EXECUTABLE=python
```

Start the backend:
```bash
npm start
```

Backend runs on `http://localhost:5000`.

### 2. Frontend

```bash
cd frontend
npm install
```

Optionally create `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm start
```

Frontend runs on `http://localhost:3000`.

### 3. AI Service

```bash
cd ai-service
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

AI Service runs on `http://localhost:8000`.

> **Note:** The AI service is optional at runtime. If the Flask service is not running, the backend automatically falls back to spawning a local Python subprocess for resume analysis.

## Demo Credentials

| Role      | Email              | Password    |
|-----------|--------------------|-------------|
| Admin     | admin@company.com  | password123 |
| Candidate | rahul@gmail.com    | password123 |

> These are seeded via manual signup or the test data generator at `backend/src/utils/testDataGenerator.js`.

## API Endpoints

### Authentication
| Method | Path              | Auth | Role | Description                    |
|--------|-------------------|------|------|--------------------------------|
| POST   | /api/auth/signup  | No   | --   | Register a new user            |
| POST   | /api/auth/login   | No   | --   | Login and receive JWT token    |
| POST   | /api/auth/logout  | No   | --   | Logout (client-side token removal) |

### Jobs
| Method | Path           | Auth | Role  | Description           |
|--------|----------------|------|-------|-----------------------|
| POST   | /api/jobs      | Yes  | Admin | Create a job posting  |
| GET    | /api/jobs      | No   | --    | List all jobs         |
| GET    | /api/jobs/:id  | No   | --    | Get job details       |
| PUT    | /api/jobs/:id  | Yes  | Admin | Update a job posting  |
| DELETE | /api/jobs/:id  | Yes  | Admin | Delete a job posting  |

### Applications
| Method | Path                          | Auth | Role      | Description                          |
|--------|-------------------------------|------|-----------|--------------------------------------|
| POST   | /api/applications             | Yes  | Candidate | Submit application with resume file  |
| GET    | /api/applications             | Yes  | Any       | List applications (filtered by role) |
| GET    | /api/applications/:id         | Yes  | Any       | Get application details              |
| PUT    | /api/applications/:id/status  | Yes  | Admin     | Update application status            |

### Analytics
| Method | Path                           | Auth | Role  | Description                     |
|--------|--------------------------------|------|-------|---------------------------------|
| GET    | /api/analytics/dashboard       | Yes  | Admin | Dashboard statistics            |
| GET    | /api/analytics/jobs/:jobId     | Yes  | Admin | Per-job analytics               |
| GET    | /api/analytics/candidates/funnel | Yes | Admin | Candidate pipeline funnel data  |

### Interviews
| Method | Path                          | Auth | Role  | Description                               |
|--------|-------------------------------|------|-------|-------------------------------------------|
| GET    | /api/interviews               | Yes  | Any   | List interviews (filtered by role)        |
| PUT    | /api/interviews/:id/outcome   | Yes  | Admin | Record interview decision and feedback    |

## Project Structure

```
ai-recruitment-platform/
|-- frontend/                         # React SPA
|   |-- src/
|   |   |-- pages/
|   |   |   |-- LoginPage.js          # Login form
|   |   |   |-- SignupPage.js         # Registration form
|   |   |   |-- HomePage.js           # Role-based landing page
|   |   |   |-- JobsPage.js           # Job listing and application
|   |   |   |-- CreateJobPage.js      # Admin job creation form
|   |   |   |-- ApplicationsPage.js   # Application tracking
|   |   |   |-- DashboardPage.js      # Analytics dashboard (admin)
|   |   |-- components/
|   |   |   |-- Navbar.js             # Navigation bar
|   |   |-- context/
|   |   |   |-- AuthContext.js        # Auth state (Context API)
|   |   |-- hooks/
|   |   |   |-- useAuth.js            # Custom auth hook
|   |   |-- services/
|   |   |   |-- api.js                # Native fetch API client
|   |   |-- App.js                    # Router setup
|   |-- package.json
|
|-- backend/                          # Express API server
|   |-- src/
|   |   |-- models/
|   |   |   |-- User.js              # User schema + bcrypt hooks
|   |   |   |-- Job.js               # Job posting schema
|   |   |   |-- Application.js       # Application schema
|   |   |   |-- Interview.js         # Interview schema
|   |   |   |-- Email.js             # Email audit trail schema
|   |   |-- controllers/
|   |   |   |-- authController.js     # Signup, login, logout
|   |   |   |-- jobController.js      # Job CRUD
|   |   |   |-- applicationController.js  # Application submission + automation
|   |   |   |-- analyticsController.js    # Dashboard and funnel stats
|   |   |   |-- interviewController.js    # Interview outcomes
|   |   |-- routes/
|   |   |   |-- auth.js              # /api/auth/*
|   |   |   |-- jobs.js              # /api/jobs/*
|   |   |   |-- applications.js      # /api/applications/*
|   |   |   |-- analytics.js         # /api/analytics/*
|   |   |   |-- interviews.js        # /api/interviews/*
|   |   |-- middleware/
|   |   |   |-- auth.js              # JWT verification + role authorization
|   |   |   |-- errorHandler.js      # Global error handler
|   |   |-- services/
|   |   |   |-- emailService.js               # Nodemailer integration
|   |   |   |-- resumeAnalysisService.js      # AI service client (HTTP + CLI fallback)
|   |   |   |-- recruitmentAutomationService.js  # Full automation pipeline
|   |   |-- server.js                # Express app entry point
|   |-- package.json
|
|-- ai-service/                       # Python AI/ML microservice
|   |-- app.py                        # Flask API server
|   |-- analyze_resume_cli.py         # CLI entry point (subprocess fallback)
|   |-- services/
|   |   |-- resume_parser.py          # PDF/DOCX text extraction + skill extraction
|   |   |-- match_engine.py           # TF-IDF vectorizer + cosine similarity scoring
|   |-- requirements.txt
|
|-- ARCHITECTURE.md                   # System architecture documentation
|-- TECHNICAL_DETAILS.md              # Detailed technical documentation
|-- README.md                         # This file
```

## Database Schema

### Users
Stores all user accounts. Passwords are auto-hashed via a Mongoose pre-save hook using bcryptjs.
- Fields: email (unique), passwordHash, firstName, lastName, role (admin/candidate), company, status, createdAt

### Jobs
Job postings created by admins, with interview automation configuration baked in.
- Fields: title, description, requiredSkills[], experience, salary, location, interviewLocation, hrEmail, interviewerName, interviewerEmail, shortlistThreshold, interviewLeadHours, meetingDurationMinutes, createdBy (ref User), status, createdAt

### Applications
Tracks every candidate application with AI scoring results and pipeline status.
- Fields: jobId (ref Job), candidateId (ref User), resumeUrl, matchScore, extractedSkills[], screeningDecision (pending/shortlisted/rejected), status (applied/interview_scheduled/interview_completed/hr_managerial_round/selected/rejected), emailSent, lastEmailType, createdAt

### Interviews
Auto-created when a candidate is shortlisted. Tracks scheduling, completion, and outcome.
- Fields: applicationId (ref Application, unique), candidate (ref User), job (ref Job), interviewerName, interviewerEmail, interviewLocation, zoomLink, meetingDurationMinutes, scheduledBy (ref User), scheduledTime, status (scheduled/completed/cancelled), feedback, decision (pending/hr_managerial_round/rejected), completedAt

### Emails
Audit trail for every automated email sent through the pipeline.
- Fields: applicationId (ref Application), recipientEmail, subject, body, type (application_received/interview_scheduled/hr_round/rejection), sentAt

## AI Matching Algorithm

```
Final Score = (Skill Match * 0.7) + (Text Similarity * 0.3)

Skill Match:  (matched skills / required skills) * 100
Text Similarity:  TF-IDF cosine similarity * 100
```

1. **Resume Parsing** -- pdfplumber extracts text from PDF; docx2txt extracts text from DOCX.
2. **Skill Extraction** -- regex word-boundary matching against a curated set of 50+ technical skills.
3. **Skill Match (70% weight)** -- counts how many required job skills appear in the extracted skills.
4. **Text Similarity (30% weight)** -- TF-IDF vectorizes the full resume text and job description, then computes cosine similarity.
5. **Decision** -- if the final score meets or exceeds the job's shortlist threshold (default 75%), the candidate is shortlisted; otherwise rejected.

## Security

- JWT tokens with configurable expiry (default 7 days)
- bcryptjs password hashing with salt rounds of 10, applied automatically via Mongoose pre-save hook
- Role-based authorization middleware on all protected routes
- File upload validation (Multer with disk storage)
- CORS enabled
- Environment variables for all secrets (JWT_SECRET, MONGODB_URI, email credentials)
- Global error handler middleware to prevent stack trace leakage

## License

MIT

## Author

Kalyan
