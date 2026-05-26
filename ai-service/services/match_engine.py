from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class MatchEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(lowercase=True, stop_words='english')

    def calculate_match_score(self, extracted_skills, required_skills, resume_text, job_description):
        """
        Calculate match score between resume and job description.

        Algorithm:
        1. Skill matching: 70% weight
        2. Text similarity (TF-IDF + cosine): 30% weight
        """

        # 1. Calculate skill match score
        skill_score = self._calculate_skill_match(extracted_skills, required_skills)

        # 2. Calculate text similarity score using TF-IDF
        text_score = self._calculate_text_similarity(resume_text, job_description)

        # Weighted combination
        final_score = (skill_score * 0.7) + (text_score * 0.3)

        # Ensure score is between 0 and 100
        return min(100, max(0, final_score))

    def _calculate_skill_match(self, extracted_skills, required_skills):
        """
        Calculate skill match percentage.

        Formula: (matched_skills / required_skills) * 100
        If no required skills specified, use extracted skill count for partial credit.
        """
        if not required_skills:
            return min(100, len(extracted_skills) * 10)  # Up to 100 for good skill count

        if not extracted_skills:
            return 0

        required_lower = [skill.lower() for skill in required_skills]
        extracted_lower = [skill.lower() for skill in extracted_skills]

        matched = sum(1 for req in required_lower if any(
            req in ext or ext in req for ext in extracted_lower
        ))

        return (matched / len(required_skills)) * 100

    def _calculate_text_similarity(self, resume_text, job_description):
        """
        Calculate similarity between resume and job description using TF-IDF.

        Returns score between 0 and 100.
        """
        try:
            # Clean texts
            resume_clean = ' '.join(resume_text.split())
            job_clean = ' '.join(job_description.split())

            # Create TF-IDF vectors
            documents = [resume_clean, job_clean]
            tfidf_matrix = self.vectorizer.fit_transform(documents)

            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]

            # Convert to 0-100 scale
            return similarity * 100
        except Exception as e:
            print(f'Text similarity error: {str(e)}')
            return 50  # Default middle ground on error
