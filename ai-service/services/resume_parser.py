import pdfplumber
import docx2txt
import re
import os

class ResumeParser:
    def __init__(self):
        self.common_skills = {
            'python', 'javascript', 'java', 'c++', 'c#', 'react', 'node.js', 'express',
            'mongodb', 'sql', 'postgresql', 'mysql', 'docker', 'kubernetes', 'aws',
            'azure', 'gcp', 'machine learning', 'deep learning', 'pytorch', 'tensorflow',
            'flask', 'django', 'fastapi', 'rust', 'go', 'typescript', 'html', 'css',
            'rest', 'graphql', 'git', 'linux', 'windows', 'api', 'microservices',
            'agile', 'scrum', 'testing', 'jest', 'pytest', 'ci/cd', 'jenkins',
            'git', 'github', 'gitlab', 'bitbucket', 'npm', 'pip', 'maven', 'gradle',
            'redis', 'elasticsearch', 'rabbitmq', 'kafka', 'spark', 'hadoop',
            'tableau', 'powerbi', 'excel', 'r', 'matlab', 'scala', 'kotlin'
        }

    def extract_text(self, file_path):
        """Extract text from PDF or DOCX file"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f'File not found: {file_path}')

        try:
            if file_path.lower().endswith('.pdf'):
                return self._extract_from_pdf(file_path)
            elif file_path.lower().endswith('.docx'):
                return self._extract_from_docx(file_path)
            else:
                raise ValueError('Unsupported file format')
        except Exception as e:
            raise Exception(f'Error extracting text: {str(e)}')

    def _extract_from_pdf(self, file_path):
        """Extract text from PDF"""
        text = ''
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ''
        except Exception as e:
            raise Exception(f'Error reading PDF: {str(e)}')
        return text

    def _extract_from_docx(self, file_path):
        """Extract text from DOCX"""
        try:
            text = docx2txt.process(file_path)
            return text
        except Exception as e:
            raise Exception(f'Error reading DOCX: {str(e)}')

    def extract_skills(self, text):
        """Extract skills from resume text"""
        text_lower = text.lower()
        found_skills = []

        for skill in self.common_skills:
            pattern = rf'(?<!\w){re.escape(skill.lower())}(?!\w)'
            if re.search(pattern, text_lower):
                found_skills.append(skill)

        return list(set(found_skills))
