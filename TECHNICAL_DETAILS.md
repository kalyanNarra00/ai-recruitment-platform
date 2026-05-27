# Technical Details

This document covers every technical decision, schema, API contract, and implementation detail for the AI Recruitment Workflow Automation Platform. It is intended as a reference for evaluation interviews.

---

## 1. Database Schema Design

All models use Mongoose (MongoDB ODM). Relationships are implemented via ObjectId references with `.populate()` for joins.

### 1.1 Users Collection

**File:** `backend/src/models/User.js`

| Field        | Type     | Constraints                        | Description                            |
|--------------|----------|------------------------------------|----------------------------------------|
| email        | String   | required, unique, lowercase        | Login identifier                       |
| passwordHash | String   | required                           | bcrypt-hashed password                 |
| firstName    | String   | optional                           | User's first name                      |
| lastName     | String   | optional                           | User's last name                       |
| role         | String   | enum: [admin, candidate], default: candidate | Access level               |
| company      | String   | optional                           | Company name (for admins)              |
| status       | String   | enum: [active, inactive], default: active | Account status              |
| createdAt    | Date     | default: Date.now                  | Registration timestamp                 |

**Special behavior:**
- Pre-save hook: `userSchema.pre('save')` automatically hashes `passwordHash` with bcryptjs (10 salt rounds) whenever the field is modified. This means the controller stores the raw password into `passwordHash`, and the hook replaces it with the hash before persisting to MongoDB.
- Instance method: `user.comparePassword(password)` uses `bcrypt.compare()` to verify a plain-text password against the stored hash.

**Design rationale:** Only two roles (admin, candidate) are used. The `normalizeRole()` function in authController maps any non-candidate role to admin, keeping the RBAC simple and avoiding unused role complexity.

### 1.2 Jobs Collection

**File:** `backend/src/models/Job.js`

| Field                  | Type       | Constraints                    | Description                              |
|------------------------|------------|--------------------------------|------------------------------------------|
| title                  | String     | required                       | Job title                                |
| description            | String     | required                       | Full job description                     |
| requiredSkills         | [String]   | --                             | List of required technical skills        |
| experience             | Number     | --                             | Years of experience required             |
| salary                 | String     | --                             | Salary range                             |
| location               | String     | --                             | Work location                            |
| interviewLocation      | String     | default: ''                    | Where interviews are held                |
| hrEmail                | String     | required, lowercase            | HR contact for notifications             |
| interviewerName        | String     | default: 'Interview Panel'     | Name of interviewer                      |
| interviewerEmail       | String     | required, lowercase            | Interviewer email for scheduling         |
| shortlistThreshold     | Number     | min: 0, max: 100, default: 75  | Minimum AI score for shortlisting        |
| interviewLeadHours     | Number     | min: 1, default: 48            | Hours before interview is scheduled      |
| meetingDurationMinutes | Number     | min: 15, default: 45           | Interview duration                       |
| createdBy              | ObjectId   | required, ref: User            | Admin who created the job                |
| status                 | String     | enum: [open, closed], default: open | Job availability                   |
| createdAt              | Date       | default: Date.now              | Creation timestamp                       |

**Design rationale:** Interview automation configuration is embedded directly in the Job schema so that each job posting can have its own threshold, interviewer, lead time, and duration. This avoids the need for a separate configuration collection and ensures the automation pipeline has everything it needs from a single Job document.

### 1.3 Applications Collection

**File:** `backend/src/models/Application.js`

| Field             | Type     | Constraints                                                                 | Description                              |
|-------------------|----------|-----------------------------------------------------------------------------|------------------------------------------|
| jobId             | ObjectId | required, ref: Job                                                          | Which job was applied to                 |
| candidateId       | ObjectId | required, ref: User                                                         | Who applied                              |
| resumeUrl         | String   | --                                                                          | Path to uploaded resume file             |
| matchScore        | Number   | min: 0, max: 100                                                            | AI-calculated match score                |
| extractedSkills   | [String] | --                                                                          | Skills extracted from resume by AI       |
| screeningDecision | String   | enum: [pending, shortlisted, rejected], default: pending                    | AI screening outcome                     |
| status            | String   | enum: [applied, interview_scheduled, interview_completed, hr_managerial_round, selected, rejected], default: applied | Pipeline stage |
| emailSent         | Boolean  | default: false                                                              | Whether any email was sent               |
| lastEmailType     | String   | default: 'none'                                                             | Most recent email type sent              |
| createdAt         | Date     | default: Date.now                                                           | Application timestamp                    |

**Design rationale:** Two separate status fields:
- `screeningDecision` captures the one-time AI screening result (shortlisted or rejected).
- `status` tracks the full pipeline progression. An application can be screened as "shortlisted" but later "rejected" after the interview round.

### 1.4 Interviews Collection

**File:** `backend/src/models/Interview.js`

| Field                  | Type     | Constraints                                        | Description                              |
|------------------------|----------|----------------------------------------------------|------------------------------------------|
| applicationId          | ObjectId | required, ref: Application, unique                 | One interview per application            |
| candidate              | ObjectId | required, ref: User                                | Candidate being interviewed              |
| job                    | ObjectId | required, ref: Job                                 | Job the interview is for                 |
| interviewerName        | String   | required                                           | Interviewer's name                       |
| interviewerEmail       | String   | required, lowercase                                | Interviewer's email                      |
| interviewLocation      | String   | required                                           | Interview venue or "Remote"              |
| zoomLink               | String   | required                                           | Zoom meeting URL (or "N/A" for in-person)|
| meetingDurationMinutes | Number   | default: 45                                        | Duration in minutes                      |
| scheduledBy            | ObjectId | required, ref: User                                | Admin/system that scheduled it           |
| scheduledTime          | Date     | required                                           | When the interview is scheduled          |
| status                 | String   | enum: [scheduled, completed, cancelled], default: scheduled | Interview status              |
| feedback               | String   | --                                                 | Interviewer's feedback                   |
| decision               | String   | enum: [pending, hr_managerial_round, rejected], default: pending | Post-interview decision    |
| completedAt            | Date     | --                                                 | When the interview was completed         |
| createdAt              | Date     | auto (timestamps: true)                            | Record creation time                     |
| updatedAt              | Date     | auto (timestamps: true)                            | Last update time                         |

**Design rationale:** The `unique` constraint on `applicationId` enforces one interview per application. The `timestamps: true` option auto-manages `createdAt` and `updatedAt`. Zoom links are auto-generated for remote interviews.

### 1.5 Emails Collection

**File:** `backend/src/models/Email.js`

| Field          | Type     | Constraints                                                        | Description                     |
|----------------|----------|--------------------------------------------------------------------|---------------------------------|
| applicationId  | ObjectId | required, ref: Application                                         | Which application triggered it  |
| recipientEmail | String   | required                                                           | Who received the email          |
| subject        | String   | --                                                                 | Email subject line              |
| body           | String   | --                                                                 | Email body text                 |
| type           | String   | required, enum: [application_received, interview_scheduled, hr_round, rejection] | Email category |
| sentAt         | Date     | default: Date.now                                                  | When the email was sent         |

**Design rationale:** Every automated email is logged here for audit purposes. The `type` enum covers all four email scenarios in the pipeline. Multiple emails can exist per application (e.g., HR notification + candidate interview notification + later rejection).

---

## 2. API Architecture

### 2.1 Authentication Endpoints

**File:** `backend/src/routes/auth.js`, `backend/src/controllers/authController.js`

| Method | Path              | Auth | Description                                |
|--------|-------------------|------|--------------------------------------------|
| POST   | /api/auth/signup  | No   | Register a new user                        |
| POST   | /api/auth/login   | No   | Authenticate and receive JWT               |
| POST   | /api/auth/logout  | No   | Logout (server acknowledges; client clears token) |

**POST /api/auth/signup**

Request:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "role": "candidate",
  "company": "Acme Inc"
}
```

Response (201):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "664a...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "candidate"
  }
}
```

The `normalizeRole()` function maps any role value to either "admin" or "candidate". If the role is "candidate", it stays "candidate"; anything else becomes "admin".

**POST /api/auth/login**

Request:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response (200): Same format as signup response.

Error (401):
```json
{
  "error": "Invalid credentials"
}
```

### 2.2 Job Endpoints

**File:** `backend/src/routes/jobs.js`, `backend/src/controllers/jobController.js`

| Method | Path           | Auth | Role  | Description           |
|--------|----------------|------|-------|-----------------------|
| POST   | /api/jobs      | Yes  | Admin | Create a job posting  |
| GET    | /api/jobs      | No   | --    | List all jobs         |
| GET    | /api/jobs/:id  | No   | --    | Get job by ID         |
| PUT    | /api/jobs/:id  | Yes  | Admin | Update a job          |
| DELETE | /api/jobs/:id  | Yes  | Admin | Delete a job          |

**POST /api/jobs** -- Create Job

Request:
```json
{
  "title": "Full Stack Developer",
  "description": "Build and maintain web applications...",
  "requiredSkills": ["react", "node.js", "mongodb"],
  "experience": 3,
  "salary": "80000-120000",
  "location": "Bangalore",
  "interviewLocation": "Remote",
  "hrEmail": "hr@company.com",
  "interviewerName": "Tech Lead",
  "interviewerEmail": "tech.lead@company.com",
  "shortlistThreshold": 70,
  "interviewLeadHours": 48,
  "meetingDurationMinutes": 60
}
```

Response (201): The created Job document.

PUT and DELETE operations verify that the requesting user is either the job creator or an admin.

### 2.3 Application Endpoints

**File:** `backend/src/routes/applications.js`, `backend/src/controllers/applicationController.js`

| Method | Path                          | Auth | Role      | Description                          |
|--------|-------------------------------|------|-----------|--------------------------------------|
| POST   | /api/applications             | Yes  | Candidate | Submit application with resume       |
| GET    | /api/applications             | Yes  | Any       | List applications (role-filtered)    |
| GET    | /api/applications/:id         | Yes  | Any       | Get single application with interview|
| PUT    | /api/applications/:id/status  | Yes  | Admin     | Manually update status               |

**POST /api/applications** -- Submit Application

Request: `multipart/form-data`
- `jobId` (string): The job's MongoDB ObjectId
- `resume` (file): PDF or DOCX resume file

Response (201):
```json
{
  "application": {
    "_id": "664b...",
    "jobId": { "_id": "664a...", "title": "Full Stack Developer" },
    "candidateId": { "_id": "664a...", "firstName": "John", "lastName": "Doe", "email": "john@example.com" },
    "matchScore": 82,
    "extractedSkills": ["react", "node.js", "mongodb", "javascript"],
    "screeningDecision": "shortlisted",
    "status": "interview_scheduled",
    "interview": {
      "_id": "664b...",
      "scheduledTime": "2026-05-29T10:00:00.000Z",
      "interviewLocation": "Remote",
      "zoomLink": "https://zoom.us/j/1234567890",
      "status": "scheduled"
    }
  },
  "matchScore": 82,
  "shortlistThreshold": 70,
  "decision": "shortlisted"
}
```

This single endpoint triggers the entire automation pipeline:
1. Validates candidate role and file presence
2. Checks for duplicate application
3. Sends resume to AI service for analysis
4. Creates Application record with AI results
5. Notifies HR via email
6. If shortlisted: creates Interview, schedules time, emails candidate + interviewer
7. If rejected: emails candidate with rejection

**GET /api/applications** -- Role-based filtering:
- Candidates see only their own applications (filtered by `candidateId`)
- Admins see all applications
- Each application is returned with its associated Interview (if any), attached via a separate query

### 2.4 Analytics Endpoints

**File:** `backend/src/routes/analytics.js`, `backend/src/controllers/analyticsController.js`

| Method | Path                            | Auth | Role  | Description                    |
|--------|---------------------------------|------|-------|--------------------------------|
| GET    | /api/analytics/dashboard        | Yes  | Admin | Aggregate dashboard statistics |
| GET    | /api/analytics/jobs/:jobId      | Yes  | Admin | Per-job analytics              |
| GET    | /api/analytics/candidates/funnel| Yes  | Admin | Pipeline funnel data           |

**GET /api/analytics/dashboard** response:
```json
{
  "totalApplications": 25,
  "shortlistedCount": 15,
  "rejectedCount": 10,
  "totalJobs": 5,
  "interviewsScheduled": 8,
  "interviewsCompleted": 5,
  "selectedCount": 3,
  "avgMatchScore": 72.4,
  "shortlistRate": "60.00",
  "rejectionRate": "40.00"
}
```

Uses `Promise.all` with 8 parallel MongoDB queries (countDocuments + aggregate) for optimal performance.

**GET /api/analytics/candidates/funnel** response:
```json
{
  "applied": 25,
  "shortlisted": 15,
  "interviewsScheduled": 12,
  "interviewsCompleted": 8,
  "hrRound": 3,
  "rejected": 10
}
```

### 2.5 Interview Endpoints

**File:** `backend/src/routes/interviews.js`, `backend/src/controllers/interviewController.js`

| Method | Path                        | Auth | Role  | Description                           |
|--------|-----------------------------|------|-------|---------------------------------------|
| GET    | /api/interviews             | Yes  | Any   | List interviews (role-filtered)       |
| PUT    | /api/interviews/:id/outcome | Yes  | Admin | Record decision + feedback            |

**PUT /api/interviews/:id/outcome**

Request:
```json
{
  "decision": "hr_managerial_round",
  "feedback": "Strong technical skills, good communication"
}
```

Allowed decision values: `hr_managerial_round` or `rejected`.

This triggers `completeInterview()` in the automation service, which:
1. Marks the interview as completed
2. Updates the application status
3. Sends the appropriate email (HR round advancement or rejection)

---

## 3. AI/ML Implementation

### 3.1 File Locations

| Component       | File                                    | Class         |
|-----------------|-----------------------------------------|---------------|
| Resume parser   | `ai-service/services/resume_parser.py`  | ResumeParser  |
| Match engine    | `ai-service/services/match_engine.py`   | MatchEngine   |
| Flask API       | `ai-service/app.py`                     | --            |
| CLI fallback    | `ai-service/analyze_resume_cli.py`      | --            |
| Backend client  | `backend/src/services/resumeAnalysisService.js` | --     |

### 3.2 Resume Parsing

**ResumeParser** (`resume_parser.py`):

**Text extraction:**
- PDF files: uses `pdfplumber.open()` to iterate all pages, extracting text from each
- DOCX files: uses `docx2txt.process()` for full text extraction
- File type detected by extension (`.pdf` or `.docx`)

**Skill extraction:**
- Maintains a curated set of 50+ technical skills (Python, JavaScript, React, Docker, AWS, etc.)
- For each skill in the set, creates a regex pattern with word boundaries: `(?<!\w){skill}(?!\w)`
- Searches the lowercased resume text for each pattern
- Returns deduplicated list of found skills

### 3.3 Match Scoring Algorithm

**MatchEngine** (`match_engine.py`):

**Scoring formula:**
```
Final Score = (Skill Match * 0.7) + (Text Similarity * 0.3)
```

**Skill Match (70% weight) -- `_calculate_skill_match()`:**
```python
required_lower = [skill.lower() for skill in required_skills]
extracted_lower = [skill.lower() for skill in extracted_skills]

matched = count of required skills where:
    req in ext  OR  ext in req  (for any extracted skill)

skill_score = (matched / len(required_skills)) * 100
```

Substring matching in both directions handles cases like "node.js" matching "node" or "react" matching "reactjs".

Edge cases:
- No required skills: returns `min(100, len(extracted_skills) * 10)` -- gives partial credit based on how many skills the candidate has
- No extracted skills: returns 0

**Text Similarity (30% weight) -- `_calculate_text_similarity()`:**
```python
# Normalize whitespace
resume_clean = ' '.join(resume_text.split())
job_clean = ' '.join(job_description.split())

# Create TF-IDF vectors
vectorizer = TfidfVectorizer(lowercase=True, stop_words='english')
tfidf_matrix = vectorizer.fit_transform([resume_clean, job_clean])

# Compute cosine similarity
similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]

# Scale to 0-100
text_score = similarity * 100
```

On error, returns 50 as a neutral fallback.

**Final score** is clamped to [0, 100] via `min(100, max(0, final_score))`.

### 3.4 Integration with Backend

**File:** `backend/src/services/resumeAnalysisService.js`

Two modes of operation:

1. **HTTP mode (primary):** POST to `AI_SERVICE_URL/api/analyze-resume` via axios with 15-second timeout.

2. **CLI fallback (automatic):** If the Flask service is unavailable or `AI_SERVICE_URL` is not set, spawns a Python subprocess:
   ```
   python analyze_resume_cli.py < { resumePath, jobDescription, requiredSkills }
   ```
   The payload is piped to stdin as JSON; the result is read from stdout as JSON.

---

## 4. Authentication Flow

### 4.1 Signup Flow

**File:** `backend/src/controllers/authController.js`

1. Extract `{ email, password, firstName, lastName, role, company }` from request body
2. Normalize role: candidate stays candidate; everything else becomes admin
3. Check if email already exists in database
4. Create User document with `passwordHash: password` (raw password)
5. Mongoose pre-save hook fires: `bcrypt.hash(this.passwordHash, 10)` replaces raw password with hash
6. Generate JWT: `jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '7d' })`
7. Return token + user object (without password)

### 4.2 Login Flow

1. Find user by email
2. Call `user.comparePassword(password)` which runs `bcrypt.compare(password, storedHash)`
3. If match: generate JWT and return token + user
4. If no match: return 401 "Invalid credentials"

### 4.3 Token Verification Middleware

**File:** `backend/src/middleware/auth.js`

**authMiddleware:**
1. Extract token from `Authorization: Bearer <token>` header
2. `jwt.verify(token, JWT_SECRET)` -- throws on invalid or expired token
3. Attach decoded payload `{ id, email, role }` to `req.user`

**authorize(...roles):**
1. Check if `req.user.role` is in the allowed roles array
2. If not: return 403 "Insufficient permissions"

### 4.4 Frontend Auth State

**File:** `frontend/src/context/AuthContext.js`

- `AuthProvider` wraps the app, providing `{ user, loading, error, signup, login, logout }`
- On mount: checks localStorage for existing token and user; if found, restores the auth state
- `signup()` and `login()`: call the API, store token + user JSON in localStorage, update state
- `logout()`: removes token + user from localStorage, sets user state to null
- Custom `useAuth()` hook at `frontend/src/hooks/useAuth.js` provides access to the context

---

## 5. Automation Workflow

**File:** `backend/src/services/recruitmentAutomationService.js`

### 5.1 Complete Pipeline (triggered by application submission)

```
Application submitted (POST /api/applications)
    |
    v
[1] AI Analysis (resumeAnalysisService.analyzeResume)
    - Extract text from PDF/DOCX
    - Extract skills via regex
    - Compute TF-IDF match score
    - Return: { matchScore, extractedSkills }
    |
    v
[2] Create Application Record
    - Store matchScore, extractedSkills
    - Set screeningDecision: shortlisted (score >= threshold) or rejected
    |
    v
[3] Notify HR (notifyHrOnApplication)
    - Email to job.hrEmail with candidate details, score, and skills
    - Log email as type: 'application_received'
    |
    v
[4] Score Threshold Check
    - Compare matchScore against job.shortlistThreshold (default 75)
    |
    +--- score >= threshold ---+
    |                          |
    v                          v
[5a] SHORTLISTED            [5b] REJECTED
    |                          |
    v                          v
[6a] Schedule Interview      [6b] Send Rejection Email
    (scheduleInterview-          (sendRejectionEmail)
     ForShortlisted-             - Email candidate
     Candidate)                  - Log email type: 'rejection'
    |                            - Set status: 'rejected'
    v
[7a] Create Interview Record
    - scheduledTime = now + interviewLeadHours
    - Detect remote vs in-person from interviewLocation
    - Generate Zoom link for remote (based on applicationId)
    |
    v
[8a] Email Interviewer
    - Interview details, candidate info, time, Zoom link
    - Log email type: 'interview_scheduled'
    |
    v
[9a] Email Candidate
    - Interview details, interviewer name, time, location/Zoom
    - Log email type: 'interview_scheduled'
    |
    v
[10a] Update Application
    - status: 'interview_scheduled'
    - emailSent: true
    - lastEmailType: 'interview_scheduled'
```

### 5.2 Interview Completion (triggered by PUT /api/interviews/:id/outcome)

```
Admin submits decision + feedback
    |
    v
[1] completeInterview()
    - Find interview (populate candidate and job)
    - Find associated application
    - Set interview.status = 'completed'
    - Set interview.decision = decision
    - Set interview.feedback = feedback
    - Set interview.completedAt = now
    - Set application.status = 'interview_completed'
    |
    v
[2] Decision Branch
    |
    +--- hr_managerial_round ---+--- rejected ---+
    |                                             |
    v                                             v
[3a] sendHrRoundEmail                   [3b] sendRejectionEmail
    - Email candidate about                 - Email candidate with
      advancing to HR round                   rejection + feedback
    - application.status =                  - application.status =
      'hr_managerial_round'                   'rejected'
    - Log type: 'hr_round'                  - Log type: 'rejection'
```

### 5.3 Helper Functions

- `scheduleInterviewTime(leadHours)`: Calculates `Date.now() + leadHours * 3600000`, rounds to the nearest hour.
- `buildZoomLink(applicationId)`: Extracts digits from the ObjectId string, uses the last 10 digits as the Zoom meeting ID.
- `isRemoteInterview(location)`: Tests if the location string contains "remote" (case-insensitive regex).
- `persistEmailRecord(...)`: Sends email via emailService, then creates an Email document for audit.

---

## 6. Frontend Architecture

### 6.1 State Management

- **AuthContext** (`frontend/src/context/AuthContext.js`): Provides `user`, `loading`, `error`, `signup`, `login`, `logout` to the entire component tree.
- **useAuth hook** (`frontend/src/hooks/useAuth.js`): `useContext(AuthContext)` wrapper.
- No external state management library (no Redux, no Zustand).

### 6.2 API Client

**File:** `frontend/src/services/api.js`

- Uses native `fetch` API (no axios on frontend).
- `getAuthHeaders()`: reads JWT from localStorage, returns `{ Authorization: 'Bearer <token>' }`.
- `request()`: Generic request handler that auto-attaches auth headers, auto-sets `Content-Type: application/json` (skipped for FormData), parses JSON/text responses, and throws structured errors.
- Exported service objects:
  - `authAPI`: signup, login, logout
  - `jobAPI`: getJobs, getJobById, createJob, updateJob, deleteJob
  - `applicationAPI`: submitApplication (multipart), getApplications, getApplicationById, updateApplicationStatus
  - `analyticsAPI`: getDashboardStats, getJobAnalytics, getCandidateFunnel
  - `interviewAPI`: getInterviews, updateOutcome

### 6.3 Routing

**File:** `frontend/src/App.js`

Uses React Router v7 (`react-router-dom`). Routes include:
- `/login`, `/signup` -- public auth pages
- `/` -- role-based home page
- `/jobs` -- job listing with details and apply
- `/jobs/create` -- admin job creation form
- `/applications` -- application tracking
- `/dashboard` -- admin analytics dashboard

### 6.4 Role-Based Rendering

- Navbar shows different links based on `user.role`
- Admin sees: Jobs, Create Job, Applications, Dashboard
- Candidate sees: Jobs, My Applications
- Pages check role and conditionally render admin controls (e.g., interview outcome buttons only visible to admins)

---

## 7. Key File Locations

| Feature                     | File Path                                                    |
|-----------------------------|--------------------------------------------------------------|
| Express server entry        | `backend/src/server.js`                                      |
| User model + bcrypt         | `backend/src/models/User.js`                                 |
| Job model                   | `backend/src/models/Job.js`                                  |
| Application model           | `backend/src/models/Application.js`                          |
| Interview model             | `backend/src/models/Interview.js`                            |
| Email model                 | `backend/src/models/Email.js`                                |
| Auth controller             | `backend/src/controllers/authController.js`                  |
| Job controller              | `backend/src/controllers/jobController.js`                   |
| Application controller      | `backend/src/controllers/applicationController.js`           |
| Interview controller        | `backend/src/controllers/interviewController.js`             |
| Analytics controller        | `backend/src/controllers/analyticsController.js`             |
| JWT + role middleware        | `backend/src/middleware/auth.js`                             |
| Error handler middleware     | `backend/src/middleware/errorHandler.js`                     |
| Email service (Nodemailer)   | `backend/src/services/emailService.js`                      |
| AI service client            | `backend/src/services/resumeAnalysisService.js`             |
| Automation pipeline          | `backend/src/services/recruitmentAutomationService.js`      |
| Resume file upload config    | `backend/src/routes/applications.js` (Multer config)        |
| Flask AI API                 | `ai-service/app.py`                                         |
| Resume parser (Python)       | `ai-service/services/resume_parser.py`                      |
| Match engine (Python)        | `ai-service/services/match_engine.py`                       |
| CLI fallback script          | `ai-service/analyze_resume_cli.py`                          |
| React app entry              | `frontend/src/App.js`                                        |
| Auth context                 | `frontend/src/context/AuthContext.js`                        |
| API client                   | `frontend/src/services/api.js`                               |
| Test data generator          | `backend/src/utils/testDataGenerator.js`                    |

---

## 8. How to Verify Each Feature (Demo Script)

### Step 1: Admin Setup

1. Start all three services (backend, frontend, AI service or just backend + frontend with CLI fallback).
2. Open `http://localhost:3000` in browser.
3. Click "Sign Up" and register as admin:
   - Email: `admin@company.com`, Password: `password123`, Role: Admin
4. After signup, you are auto-logged-in and redirected to the home page.

### Step 2: Create a Job Posting (Admin)

1. Navigate to "Create Job" page.
2. Fill in job details:
   - Title: "Full Stack Developer"
   - Description: "We need a developer with React, Node.js, and MongoDB experience..."
   - Required Skills: react, node.js, mongodb, javascript
   - HR Email: `hr@company.com`
   - Interviewer Name: "Tech Lead"
   - Interviewer Email: `techlead@company.com`
   - Shortlist Threshold: 70
   - Interview Location: "Remote"
3. Submit. Job appears in the jobs list.

### Step 3: Candidate Application

1. Logout from admin account.
2. Sign up as candidate:
   - Email: `rahul@gmail.com`, Password: `password123`, Role: Candidate
3. Navigate to "Jobs" page, select the job created above.
4. Upload a resume (PDF or DOCX) containing relevant skills and click Apply.
5. Observe the response showing: match score, extracted skills, screening decision, and (if shortlisted) interview details.

### Step 4: Verify AI Scoring

1. Check the backend console for email logs showing:
   - HR notification email with match score and extracted skills
   - If shortlisted: interviewer email + candidate email with interview schedule and Zoom link
   - If rejected: candidate rejection email
2. In the candidate's "My Applications" view, see the match score, status, and interview (if any).

### Step 5: Admin Interview Management

1. Logout and log back in as admin.
2. Navigate to "Applications" page -- see all applications with scores and statuses.
3. For a shortlisted candidate with a scheduled interview:
   - Click to view interview details
   - Record outcome: choose "Advance to HR Round" or "Reject" with feedback
4. Check backend console for the email triggered by the decision.

### Step 6: Analytics Dashboard

1. As admin, navigate to "Dashboard".
2. Verify statistics:
   - Total applications, shortlisted count, rejected count
   - Interviews scheduled and completed
   - Average match score
   - Shortlist and rejection rates
   - Candidate funnel showing progression through pipeline stages

---

## 9. Security Measures

| Measure                      | Implementation                                                                 |
|------------------------------|--------------------------------------------------------------------------------|
| Password hashing             | bcryptjs with 10 salt rounds, auto via Mongoose pre-save hook                 |
| JWT token expiry             | Configurable via JWT_EXPIRE env var (default 7 days)                          |
| Token verification           | `jwt.verify()` in authMiddleware on every protected route                     |
| Role-based authorization     | `authorize(...roles)` middleware checks `req.user.role`                       |
| Input validation             | Mongoose schema enforcement: required fields, enums, min/max constraints      |
| Duplicate prevention         | Unique constraint on User.email; duplicate application check in controller    |
| File upload control          | Multer with disk storage, timestamped filenames                               |
| Error handling               | Global errorHandler middleware catches ValidationError, CastError, generic    |
| Secret management            | All secrets in .env files (JWT_SECRET, MONGODB_URI, email credentials)        |
| CORS                         | Enabled via cors() middleware                                                 |
| Authorization checks         | Controllers verify ownership (e.g., job creator or admin for updates/deletes) |

---

## 10. Scalability Considerations

| Aspect                        | Current Implementation                                                        |
|-------------------------------|-------------------------------------------------------------------------------|
| Stateless authentication      | JWT tokens -- no server-side sessions; any server instance can verify         |
| Database connection pooling   | Mongoose default connection pool handles concurrent requests                  |
| Separate AI microservice      | Python AI service runs independently; can be scaled or replaced separately    |
| CLI fallback                  | Backend works without the Flask service by spawning local Python processes    |
| Modular services              | Email, AI analysis, and automation logic in separate service files            |
| Async I/O                     | async/await throughout backend; Promise.all for parallel DB queries           |
| Configurable thresholds       | Per-job shortlist threshold, lead time, duration -- no hardcoded values       |
| Parallel analytics queries    | Dashboard uses Promise.all with 8 simultaneous MongoDB queries               |
| Schema indexes                | Unique constraints on email, applicationId provide natural indexes            |
