import json
import sys

from services.resume_parser import ResumeParser
from services.match_engine import MatchEngine


def main():
    payload = json.loads(sys.stdin.read() or "{}")
    resume_path = payload.get("resumePath")
    job_description = payload.get("jobDescription")
    required_skills = payload.get("requiredSkills", [])

    if not resume_path or not job_description:
        raise ValueError("Missing required fields")

    resume_parser = ResumeParser()
    match_engine = MatchEngine()

    resume_text = resume_parser.extract_text(resume_path)
    extracted_skills = resume_parser.extract_skills(resume_text)
    match_score = match_engine.calculate_match_score(
        extracted_skills,
        required_skills,
        resume_text,
        job_description,
    )

    print(
        json.dumps(
            {
                "matchScore": int(match_score),
                "extractedSkills": extracted_skills,
                "resumeText": resume_text[:500],
            }
        )
    )


if __name__ == "__main__":
    main()
