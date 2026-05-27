import unittest
from unittest.mock import MagicMock, patch

from services.resume_parser import ResumeParser


class ResumeParserTests(unittest.TestCase):
    def setUp(self):
        self.parser = ResumeParser()

    def test_extract_text_raises_for_missing_files(self):
        with self.assertRaises(FileNotFoundError):
            self.parser.extract_text("missing.pdf")

    def test_extract_text_reads_pdf_files(self):
        page_one = MagicMock()
        page_one.extract_text.return_value = "React"
        page_two = MagicMock()
        page_two.extract_text.return_value = "Node.js"
        pdf = MagicMock()
        pdf.pages = [page_one, page_two]

        with patch("services.resume_parser.os.path.exists", return_value=True), patch(
            "services.resume_parser.pdfplumber.open"
        ) as mock_open:
            mock_open.return_value.__enter__.return_value = pdf
            text = self.parser.extract_text("resume.pdf")

        self.assertEqual(text, "ReactNode.js")

    def test_extract_text_reads_docx_files(self):
        with patch("services.resume_parser.os.path.exists", return_value=True), patch(
            "services.resume_parser.docx2txt.process", return_value="Python engineer"
        ):
            text = self.parser.extract_text("resume.docx")

        self.assertEqual(text, "Python engineer")

    def test_extract_skills_returns_unique_skill_matches(self):
        skills = self.parser.extract_skills("Experienced in React, Python, React, Docker, and Git.")

        self.assertEqual(set(skills), {"react", "python", "docker", "git"})


if __name__ == "__main__":
    unittest.main()
