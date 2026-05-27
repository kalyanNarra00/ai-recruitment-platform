import unittest
from unittest.mock import patch

import app as app_module


class FlaskAppTests(unittest.TestCase):
    def setUp(self):
        self.client = app_module.app.test_client()

    def test_health_endpoint_reports_healthy(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "healthy"})

    def test_analyze_resume_requires_resume_and_job_description(self):
        response = self.client.post("/api/analyze-resume", json={"requiredSkills": ["React"]})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json(), {"error": "Missing required fields"})

    def test_analyze_resume_returns_score_and_skills(self):
        with patch.object(app_module.resume_parser, "extract_text", return_value="React and Node.js"), patch.object(
            app_module.resume_parser, "extract_skills", return_value=["react", "node.js"]
        ), patch.object(app_module.match_engine, "calculate_match_score", return_value=87):
            response = self.client.post(
                "/api/analyze-resume",
                json={
                    "resumePath": "resume.pdf",
                    "jobDescription": "Looking for React and Node.js experience",
                    "requiredSkills": ["React", "Node.js"],
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {
                "matchScore": 87,
                "extractedSkills": ["react", "node.js"],
                "resumeText": "React and Node.js",
            },
        )


if __name__ == "__main__":
    unittest.main()
