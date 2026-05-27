import io
import json
import unittest
from unittest.mock import patch

import analyze_resume_cli


class AnalyzeResumeCliTests(unittest.TestCase):
    def test_main_prints_serialized_analysis_results(self):
        payload = {
            "resumePath": "resume.pdf",
            "jobDescription": "Need React engineers",
            "requiredSkills": ["React"],
        }
        stdout = io.StringIO()

        with patch("sys.stdin.read", return_value=json.dumps(payload)), patch(
            "sys.stdout", stdout
        ), patch("analyze_resume_cli.ResumeParser") as parser_class, patch(
            "analyze_resume_cli.MatchEngine"
        ) as engine_class:
            parser = parser_class.return_value
            parser.extract_text.return_value = "React engineer"
            parser.extract_skills.return_value = ["react"]
            engine = engine_class.return_value
            engine.calculate_match_score.return_value = 91

            analyze_resume_cli.main()

        self.assertEqual(
          json.loads(stdout.getvalue()),
          {
              "matchScore": 91,
              "extractedSkills": ["react"],
              "resumeText": "React engineer",
          },
        )

    def test_main_raises_for_missing_required_fields(self):
        with patch("sys.stdin.read", return_value="{}"):
            with self.assertRaises(ValueError):
                analyze_resume_cli.main()


if __name__ == "__main__":
    unittest.main()
