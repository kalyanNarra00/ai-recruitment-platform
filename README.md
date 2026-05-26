# AI Recruitment Workflow Automation Platform

A custom-built full-stack application for automating resume screening and candidate recruitment using AI-powered resume analysis.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐
│  React Frontend │────▶│  Node.js Backend │────▶│   MongoDB     │
│  (Port 3000)    │     │  (Port 5000)     │     │   Database    │
└─────────────────┘     └──────────────────┘     └───────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │ Python AI Service│
                        │  (Port 8000)     │
                        │ - Resume Parser  │
                        │ - Match Engine   │
                        │ - Email Trigger  │
                        └──────────────────┘
```

## Features

### 1. Authentication & RBAC
- User signup/login with JWT tokens
- Role-based access control: Admin, HR Manager, Recruiter, Candidate
- Secure password hashing with bcryptjs

### 2. Job Management
- HR managers can create, read, update, delete job postings
- Required skills specification
- Open/closed job status

### 3. Resume Analysis & Matching
- PDF and DOCX resume parsing
- Automatic skill extraction
- TF-IDF + Cosine Similarity matching algorithm
- Match score calculation (0-100)

### 4. Automation Workflow
- Automatic resume analysis on application submission
- Conditional email triggering based on match score:
  - Score > 75%: Shortlist email sent
  - Score ≤ 75%: Rejection email sent
- Email audit trail tracking

### 5. Analytics Dashboard
- Total applications count
- Shortlist/rejection statistics
- Average match score
- Candidate funnel visualization
- Job-specific analytics

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + React Router + Axios |
| Backend | Node.js + Express.js + Mongoose |
| Database | MongoDB |
| AI Service | Python + Flask + scikit-learn |
| Authentication | JWT |
| Email | Nodemailer (test mode) |

## Setup Instructions

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- MongoDB (local or Atlas)

### 1. Clone & Navigate
```bash
cd ai-recruitment-platform
```

### 2. Backend Setup
```bash
cd backend
npm install
# Create .env file with MongoDB URI and other configs
npm start
```

Backend runs on `http://localhost:5000`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

### 4. AI Service Setup
```bash
cd ai-service
# Activate virtual environment (Windows)
venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run the service
python app.py
```

AI Service runs on `http://localhost:8000`

## Database Schema

### Users
```javascript
{
  email: String (unique),
  passwordHash: String,
  firstName: String,
  lastName: String,
  role: Enum ['admin', 'hr_manager', 'recruiter', 'candidate'],
  company: String,
  createdAt: Date
}
```

### Jobs
```javascript
{
  title: String,
  description: String,
  requiredSkills: [String],
  experience: Number,
  salary: String,
  location: String,
  createdBy: ObjectId (User),
  status: Enum ['open', 'closed'],
  createdAt: Date
}
```

### Applications
```javascript
{
  jobId: ObjectId,
  candidateId: ObjectId,
  resumeUrl: String,
  matchScore: Number (0-100),
  extractedSkills: [String],
  status: Enum ['received', 'shortlisted', 'rejected'],
  emailSent: Boolean,
  createdAt: Date
}
```

### Emails
```javascript
{
  applicationId: ObjectId,
  recipientEmail: String,
  subject: String,
  body: String,
  type: Enum ['shortlist', 'rejection'],
  sentAt: Date
}
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Jobs
- `POST /api/jobs` - Create job (HR Manager/Admin)
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Applications
- `POST /api/applications` - Submit application with resume
- `GET /api/applications` - List applications (filtered by role)
- `GET /api/applications/:id` - Get application details
- `PUT /api/applications/:id/status` - Update application status

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/jobs/:jobId` - Job-specific analytics
- `GET /api/analytics/candidates/funnel` - Candidate funnel data

## AI Matching Algorithm

The match score is calculated using a weighted combination:

```
Final Score = (Skill Match * 0.7) + (Text Similarity * 0.3)

Where:
- Skill Match: Percentage of required skills found in resume
- Text Similarity: TF-IDF cosine similarity between resume and job description
```

### Example
```
Resume Skills: React, Node.js, MongoDB, Docker
Required Skills: React, Node.js, MongoDB, PostgreSQL
Skill Match Score: 75% (3 out of 4)

Text Similarity (TF-IDF): 82%

Final Score = (75 * 0.7) + (82 * 0.3) = 52.5 + 24.6 = 77.1%
→ Candidate shortlisted (>75%)
```

## User Flows

### Candidate Flow
1. Signup as Candidate
2. Browse available jobs
3. Upload resume and apply
4. Receive automated email with decision
5. Track application status

### HR Manager Flow
1. Signup as HR Manager
2. Create job postings with required skills
3. View all applications
4. See analytics and hiring insights
5. Manage candidate pipeline

### Recruiter Flow
1. Signup as Recruiter
2. View applications sorted by match score
3. Shortlist/reject candidates
4. Track hiring progress
5. Generate reports

## Automation Highlights

### Resume Processing Pipeline
1. Application submitted with resume file
2. Backend stores file temporarily
3. AI Service extracts text from PDF/DOCX
4. Skills extracted from resume
5. Match score calculated via TF-IDF
6. Application saved with score
7. Automated email triggered
8. Email logged in audit trail

### Match Score Decision
```python
if match_score > 75:
    decision = "SHORTLIST"
    send_shortlist_email()
else:
    decision = "REJECT"
    send_rejection_email()
```

## Quality Metrics

✅ Custom architecture (no templates)
✅ TF-IDF + Cosine similarity algorithm (explainable)
✅ Full RBAC implementation
✅ Automation workflow (resume→score→email)
✅ Analytics dashboard
✅ Email audit trail
✅ Clean code structure
✅ Error handling & validation
✅ Security (JWT, password hashing, CORS)
✅ Production-ready structure

## Testing

### Manual Testing Checklist
- [ ] Signup with different roles
- [ ] Login and token validation
- [ ] Create job posting
- [ ] Upload resume and apply
- [ ] Verify match score calculation
- [ ] Check automated email sending
- [ ] View applications list
- [ ] Check analytics dashboard
- [ ] Verify role-based access

### Sample Test Resume
Create a resume with skills: Python, JavaScript, React, Node.js, MongoDB, Docker, AWS

Apply to job with requirements: Python, JavaScript, React, Node.js

Expected: Match Score > 80%, Shortlist email sent

## Deployment

### Backend
- Deploy to Heroku/AWS/DigitalOcean
- Set environment variables (MongoDB URI, JWT Secret, etc.)
- Run `npm start`

### Frontend
- Build: `npm run build`
- Deploy to Vercel/Netlify/AWS S3

### AI Service
- Deploy to Heroku/AWS Lambda
- Install dependencies from requirements.txt
- Run `python app.py`

## Performance Optimizations

- MongoDB query indexing on jobId, candidateId
- JWT token caching on frontend
- Async/await for I/O operations
- Lazy loading in React components
- File upload size limits

## Security Features

- JWT token validation on all protected routes
- Bcrypt password hashing
- CORS configuration
- Input validation with MongoDB schema
- File upload validation (PDF/DOCX only)
- Environment variable protection

## Future Enhancements

- Advanced NLP for better skill extraction
- Candidate profile creation
- Interview scheduling module
- Multiple resume format support
- Custom matching weights per company
- API rate limiting
- Email template customization
- Multi-language support

## Code Quality

- ESLint + Prettier for code consistency
- Clear separation of concerns (controllers, services, models)
- Reusable API response format
- Meaningful variable names
- Error handling throughout
- Clean git commit history

## License
MIT

## Author
Kalyan - Technical Evaluation Project
