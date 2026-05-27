from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from services.resume_parser import ResumeParser
from services.match_engine import MatchEngine

load_dotenv()

app = Flask(__name__)
CORS(app)

resume_parser = ResumeParser()
match_engine = MatchEngine()

@app.route('/api/analyze-resume', methods=['POST'])
def analyze_resume():
    try:
        data = request.json
        resume_path = data.get('resumePath')
        job_description = data.get('jobDescription')
        required_skills = data.get('requiredSkills', [])

        if not resume_path or not job_description:
            return jsonify({'error': 'Missing required fields'}), 400

        resume_text = resume_parser.extract_text(resume_path)
        extracted_skills = resume_parser.extract_skills(resume_text)

        match_score = match_engine.calculate_match_score(
            extracted_skills,
            required_skills,
            resume_text,
            job_description
        )

        return jsonify({
            'matchScore': int(match_score),
            'extractedSkills': extracted_skills,
            'resumeText': resume_text,
        }), 200

    except Exception as e:
        print(f'Error: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    app.run(debug=True, port=port)
