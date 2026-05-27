import unittest
from unittest.mock import patch

from services.match_engine import MatchEngine


class MatchEngineTests(unittest.TestCase):
    def setUp(self):
        self.engine = MatchEngine()

    def test_skill_match_uses_required_skills_overlap(self):
        score = self.engine._calculate_skill_match(
            ["React", "Node.js", "Docker"],
            ["React", "Node.js", "MongoDB"],
        )

        self.assertAlmostEqual(score, (2 / 3) * 100)

    def test_skill_match_without_requirements_rewards_skill_density(self):
        score = self.engine._calculate_skill_match(["Python", "React", "Docker"], [])

        self.assertEqual(score, 30)

    def test_text_similarity_falls_back_to_midpoint_on_error(self):
        with patch.object(self.engine.vectorizer, "fit_transform", side_effect=RuntimeError("boom")):
            score = self.engine._calculate_text_similarity("resume", "job")

        self.assertEqual(score, 50)

    def test_calculate_match_score_blends_skill_and_text_scores(self):
        with patch.object(self.engine, "_calculate_skill_match", return_value=80), patch.object(
            self.engine, "_calculate_text_similarity", return_value=50
        ):
            score = self.engine.calculate_match_score(["React"], ["React"], "resume", "job")

        self.assertEqual(score, 71.0)


if __name__ == "__main__":
    unittest.main()
