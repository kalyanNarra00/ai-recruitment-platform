# Quick Start Guide

## Prerequisites
- MongoDB running (local or Atlas)
- Node.js v14+
- Python 3.8+

## Terminal 1: Start MongoDB
```bash
# If using local MongoDB
mongod
```

## Terminal 2: Start Backend Server
```bash
cd backend
npm start
# Server runs on http://localhost:5000
```

## Terminal 3: Start AI Service
```bash
cd ai-service
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

python app.py
# Service runs on http://localhost:8000
```

## Terminal 4: Start Frontend
```bash
cd frontend
npm start
# App opens on http://localhost:3000
```

## Test Workflow

### 1. Signup
- Go to http://localhost:3000/signup
- Create account as `hr_manager` or `candidate`

### 2. Create Job (as HR Manager)
- Navigate to "Create Job"
- Add job with skills: React, Node.js, MongoDB, Docker, AWS

### 3. Apply (as Candidate)
- Signup as `candidate`
- Go to Jobs
- Create a sample resume with skills: React, Node.js, MongoDB, Python, Docker
- Upload and apply
- Check console for automated email log

### 4. View Analytics (as HR Manager)
- Go to Dashboard
- See match score (should be ~75-80% for the sample)
- View candidate funnel

## Endpoints to Test

### Auth
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "candidate"
  }'
```

### Create Job
```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "title": "Software Engineer",
    "description": "Looking for experienced developer",
    "requiredSkills": ["React", "Node.js", "MongoDB"],
    "experience": 3,
    "salary": "100K-120K",
    "location": "Remote"
  }'
```

### List Jobs
```bash
curl http://localhost:5000/api/jobs
```

### Get Analytics
```bash
curl -H "Authorization: Bearer {TOKEN}" \
  http://localhost:5000/api/analytics/dashboard
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in backend/.env

### AI Service Error
- Ensure Flask is running on port 8000
- Check Python dependencies: `pip install -r requirements.txt`

### Frontend API Errors
- Check backend is running on port 5000
- Verify CORS is enabled
- Check browser console for errors

### Email Not Sending
- Currently in test mode (logs to console)
- Configure Gmail credentials in .env to enable real emails

## Demo Scenario

1. **Create HR Manager Account**
   - Email: hr@company.com
   - Role: hr_manager

2. **Create Job Posting**
   - Title: Full Stack Developer
   - Skills: React, Node.js, MongoDB, PostgreSQL, Docker
   - Experience: 2 years

3. **Create Candidate Account**
   - Email: candidate@example.com
   - Role: candidate

4. **Apply with Resume**
   - Create resume file with: React, Node.js, MongoDB, Express, AWS, Docker
   - Upload and apply
   - System calculates: ~85% match (5 out of 5 core skills)

5. **Receive Automation**
   - Email logged to console
   - Application marked as "shortlisted"
   - Status visible in HR dashboard

6. **Check Analytics**
   - Dashboard shows: 1 application, 1 shortlisted
   - Average match score: 85%
   - Shortlist rate: 100%

## Performance Notes

- First AI analysis may take 2-3 seconds (NLP initialization)
- Subsequent analyses are faster
- File upload limited to 50MB

## Next Steps for Production

1. [ ] Enable real email sending (configure Gmail/SendGrid)
2. [ ] Add MongoDB Atlas connection
3. [ ] Setup HTTPS/TLS
4. [ ] Configure rate limiting
5. [ ] Add input validation
6. [ ] Setup error logging (Sentry/LogRocket)
7. [ ] Deploy to cloud platform
