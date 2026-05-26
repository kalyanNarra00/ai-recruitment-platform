# System Architecture

## Overview
The AI Recruitment Workflow Automation Platform is a microservices-based system that automates resume screening and candidate recruitment using custom AI matching.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  React.js SPA (Port 3000) - Component-based UI                 │
│  - Authentication pages (Login/Signup)                          │
│  - Job browsing and application                                 │
│  - Application tracking                                         │
│  - Analytics dashboard                                          │
└────────────────────┬────────────────────────────────────────────┘
                     │ REST API (Axios)
┌────────────────────▼────────────────────────────────────────────┐
│                     API LAYER                                   │
│  Express.js Server (Port 5000) - RESTful API                   │
│  ├─ Authentication Routes                                       │
│  ├─ Job Management Routes                                      │
│  ├─ Application Routes                                         │
│  └─ Analytics Routes                                           │
└────────┬──────────────────────────┬──────────────────────────────┘
         │                          │
         ▼                          ▼
┌──────────────────────┐   ┌──────────────────────────┐
│  DATABASE LAYER      │   │ AI SERVICE LAYER         │
│  MongoDB             │   │ Flask (Port 8000)        │
│  (Local/Atlas)       │   │ Python NLP Processing    │
│  - Collections:      │   │ ├─ Resume Parser         │
│    • Users           │   │ ├─ Skill Extraction      │
│    • Jobs            │   │ └─ Match Engine          │
│    • Applications    │   │                          │
│    • Emails          │   │ HTTP API Communication   │
└──────────────────────┘   └──────────────────────────┘
```

## Component Architecture

### Frontend (React.js)
```
src/
├── pages/
│   ├── LoginPage.js          # Authentication
│   ├── SignupPage.js         # User registration
│   ├── HomePage.js           # Role-based dashboard
│   ├── JobsPage.js           # Job listing & application
│   ├── ApplicationsPage.js    # Application status
│   └── DashboardPage.js       # Analytics dashboard
├── components/
│   └── Navbar.js             # Navigation component
├── context/
│   └── AuthContext.js        # Auth state management
├── hooks/
│   └── useAuth.js            # Custom auth hook
├── services/
│   └── api.js                # Axios API client
└── styles/
    ├── auth.css
    ├── main.css
    ├── jobs.css
    ├── applications.css
    └── dashboard.css
```

**Key Design Patterns:**
- Context API for state management
- Custom hooks for code reuse
- Centralized API client with interceptors
- Token-based authentication
- Role-based conditional rendering

### Backend (Node.js/Express)
```
src/
├── models/
│   ├── User.js               # User schema & password hashing
│   ├── Job.js                # Job posting schema
│   ├── Application.js         # Application schema
│   └── Email.js              # Email audit trail
├── controllers/
│   ├── authController.js      # Auth logic (signup/login)
│   ├── jobController.js       # Job CRUD operations
│   ├── applicationController.js # Resume submission & automation
│   └── analyticsController.js # Dashboard stats
├── routes/
│   ├── auth.js               # Auth endpoints
│   ├── jobs.js               # Job endpoints
│   ├── applications.js        # Application endpoints
│   └── analytics.js          # Analytics endpoints
├── middleware/
│   ├── auth.js               # JWT verification & RBAC
│   └── errorHandler.js       # Global error handling
├── services/
│   └── emailService.js       # Nodemailer integration
└── server.js                 # Express app setup
```

**Key Patterns:**
- MVC architecture (Models, Controllers, Routes)
- Middleware for cross-cutting concerns
- Service layer for business logic
- Error handling middleware
- JWT token validation on protected routes

### AI Service (Python/Flask)
```
├── app.py                    # Flask application
├── services/
│   ├── resume_parser.py      # PDF/DOCX text extraction
│   └── match_engine.py       # TF-IDF matching algorithm
├── models/                   # ML model placeholder
└── requirements.txt          # Python dependencies
```

**Key Algorithms:**
- Resume text extraction from PDF/DOCX files
- Skill extraction using keyword matching
- TF-IDF vectorization for text similarity
- Weighted score calculation

## Data Flow Diagram

### Resume Application Flow
```
┌─────────────────────────────────────┐
│ Candidate Uploads Resume (File)     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Backend: applicationController       │
│ - Validate file (PDF/DOCX)          │
│ - Store file temporarily            │
└────────────┬────────────────────────┘
             │ HTTP POST
             ▼
┌─────────────────────────────────────┐
│ AI Service: /api/analyze-resume     │
│ - Extract text from file            │
│ - Parse resume for skills           │
│ - Compare with job requirements     │
│ - Calculate match score (TF-IDF)    │
└────────────┬────────────────────────┘
             │ JSON Response
             ▼
┌─────────────────────────────────────┐
│ Backend: Create Application Record  │
│ - Save match score                  │
│ - Store extracted skills            │
│ - Determine status (shortlist/reject)
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Automation: Send Email              │
│ - If score > 75%: Shortlist email   │
│ - If score ≤ 75%: Rejection email   │
│ - Log email in audit trail          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Update UI: Application Status       │
│ - Show match score to candidate     │
│ - Display decision                  │
│ - Confirm email sent                │
└─────────────────────────────────────┘
```

## Database Schema Relationships

```
User (1) ──── (many) Job
  │                    │
  │                    │ (1)
  │                    │
  (1)                  (many)
  │                Application (many) ──── (1) Email
  (many)
  │
  Applications
```

### Collections Structure

**Users Collection**
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  passwordHash: String (bcrypt hashed),
  firstName: String,
  lastName: String,
  role: String (enum),
  company: String,
  createdAt: Date (indexed for sorting),
  status: String
}
```

**Jobs Collection**
```javascript
{
  _id: ObjectId,
  title: String (indexed for search),
  description: String,
  requiredSkills: [String],
  experience: Number,
  salary: String,
  location: String,
  createdBy: ObjectId (indexed, ref: User),
  status: String,
  createdAt: Date
}
```

**Applications Collection**
```javascript
{
  _id: ObjectId,
  jobId: ObjectId (indexed, ref: Job),
  candidateId: ObjectId (indexed, ref: User),
  resumeUrl: String,
  matchScore: Number (indexed for filtering),
  extractedSkills: [String],
  status: String (indexed),
  emailSent: Boolean,
  createdAt: Date
}
```

**Emails Collection**
```javascript
{
  _id: ObjectId,
  applicationId: ObjectId (indexed, ref: Application),
  recipientEmail: String,
  subject: String,
  body: String,
  type: String,
  sentAt: Date
}
```

## Authentication & Authorization

### Flow
```
1. User submits email + password
   ↓
2. Backend hashes password with bcryptjs
   ↓
3. Compares with stored hash
   ↓
4. If match: Generate JWT token (7 days expiry)
   ↓
5. Return token to frontend
   ↓
6. Frontend stores token in localStorage
   ↓
7. All API requests include Authorization header:
   `Authorization: Bearer {token}`
   ↓
8. Backend authMiddleware verifies token
   ↓
9. If valid: Attach user info to req.user
   ↓
10. Route handler checks RBAC (role-based access)
```

### Token Structure (JWT)
```javascript
{
  header: { alg: "HS256", typ: "JWT" },
  payload: {
    id: ObjectId,
    email: String,
    role: String,
    iat: timestamp,
    exp: timestamp
  },
  signature: HMAC(header.payload, JWT_SECRET)
}
```

## API Design

### Response Format (Consistent)
```javascript
// Success Response
{
  data: { /* actual data */ },
  message: "Operation successful",
  status: 200
}

// Error Response
{
  error: "Error message",
  status: 400,
  details: {} // Optional
}
```

### Rate Limiting
- Not yet implemented
- Future: Add `express-rate-limit` middleware
- Suggested: 100 requests per 15 minutes per IP

## Matching Algorithm Deep Dive

### TF-IDF + Cosine Similarity

**Input:**
- Resume extracted skills: [React, Node.js, MongoDB, ...]
- Job required skills: [React, Node.js, MongoDB, PostgreSQL, ...]
- Resume full text
- Job description full text

**Process:**

1. **Skill Matching (70% weight)**
   ```
   matched_skills = count of skills found in both lists
   skill_score = (matched_skills / total_required_skills) * 100
   
   Example:
   Matched: React, Node.js, MongoDB (3)
   Required: React, Node.js, MongoDB, PostgreSQL (4)
   Score: (3/4) * 100 = 75%
   ```

2. **Text Similarity (30% weight)**
   ```
   1. Vectorize both texts using TF-IDF
   2. Calculate cosine similarity between vectors
   3. Convert to 0-100 scale
   
   TF-IDF measures how relevant terms are across documents
   Cosine similarity measures angle between vectors (0-1)
   ```

3. **Final Score Calculation**
   ```
   Final Score = (Skill Match * 0.7) + (Text Similarity * 0.3)
   
   Example:
   = (75 * 0.7) + (82 * 0.3)
   = 52.5 + 24.6
   = 77.1%
   → Threshold: > 75% = Shortlist
   ```

### Why This Approach?

✅ **Skill Match (70%):**
- Direct requirement matching
- Most important factor
- Candidate must have core skills

✅ **Text Similarity (30%):**
- Contextual understanding
- Experience level matching
- Industry keywords
- Soft skills (communication, leadership, etc.)

✅ **TF-IDF Choice:**
- No heavy ML models needed
- Fast computation
- Explainable results
- Works with any text length
- No training data required

## Security Considerations

### Implemented
- [x] Password hashing (bcryptjs)
- [x] JWT token validation
- [x] CORS configuration
- [x] Input validation (Mongoose schema)
- [x] Environment variables for secrets
- [x] File upload validation (MIME type)

### TODO for Production
- [ ] HTTPS/TLS encryption
- [ ] Rate limiting
- [ ] SQL injection prevention (using ORM)
- [ ] XSS protection (React automatically escapes)
- [ ] CSRF tokens
- [ ] Helmet.js for HTTP headers
- [ ] Dependency scanning
- [ ] API key rotation

## Performance Optimizations

### Database
- [x] Indexed queries on frequently searched fields
- [x] Lean queries (select specific fields)
- [ ] Connection pooling (todo)
- [ ] Query caching (todo)

### Backend
- [x] Async/await for non-blocking I/O
- [x] Error handling to prevent crashes
- [ ] Compression middleware (todo)
- [ ] Response caching (todo)

### Frontend
- [x] Lazy component loading
- [x] Conditional rendering
- [ ] Code splitting (todo)
- [ ] Image optimization (todo)

### AI Service
- [x] Vectorizer initialization once
- [x] Async processing
- [x] File cleanup

## Deployment Architecture

### Local Development
```
Client (Port 3000) → Backend (Port 5000) → MongoDB
                  → AI Service (Port 8000)
```

### Production Suggestions
```
CDN (Static Assets)
   ↓
Load Balancer
   ├─ Backend Instance 1 (Docker)
   ├─ Backend Instance 2 (Docker)
   └─ Backend Instance 3 (Docker)
        ↓
   MongoDB Cluster (Atlas)
   
Separate:
AI Service (Lambda/Container)
```

## Monitoring & Logging (TODO)

- [ ] Structured logging (Winston)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic)
- [ ] Database profiling
- [ ] API usage analytics

## Future Architecture Enhancements

1. **Microservices Evolution**
   - Separate auth service
   - Job service
   - Application service
   - Notification service

2. **Message Queue**
   - RabbitMQ/Kafka for async processing
   - Resume analysis jobs queue
   - Email sending queue

3. **Caching Layer**
   - Redis for job listings
   - Token blacklist for logout
   - Skill autocomplete

4. **Advanced AI**
   - BERT/GPT embeddings for better matching
   - Machine learning model training
   - Candidate ranking algorithms

5. **Analytics**
   - Data warehouse (BigQuery)
   - Real-time dashboards (Tableau)
   - Hiring trends analysis

## Technology Decision Rationale

| Component | Choice | Why |
|-----------|--------|-----|
| Frontend | React | Component-based, large ecosystem, SEO-friendly with SSR option |
| Backend | Express | Lightweight, Node.js familiar, great middleware support |
| Database | MongoDB | Flexible schema, scalable, Atlas cloud option |
| AI Service | Flask | Python for NLP, minimal overhead, easy to extend |
| Auth | JWT | Stateless, scalable, no session storage needed |
| Email | Nodemailer | Simple, no paid service needed initially, test mode available |
| Matching | TF-IDF | Fast, no training required, explainable, proven for document matching |
