import unittest

from backend.ml.groq import build_analysis_context
from backend.ml.model import classify_risk, predict_phishing, train_and_save_model


class DetectionLogicTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        train_and_save_model()

    def test_official_github_profile_is_safe(self) -> None:
        result = predict_phishing("", "https://github.com/ni2-vsv11", input_type="url")

        self.assertEqual(result["prediction"], "Safe")
        self.assertEqual(classify_risk(float(result["risk_score"])), "Safe")
        self.assertTrue(result["trusted_domain"])
        self.assertLess(float(result["risk_score"]), 40.0)

    def test_official_microsoft_login_is_not_flagged(self) -> None:
        result = predict_phishing(
            "",
            "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            input_type="url",
        )

        self.assertEqual(classify_risk(float(result["risk_score"])), "Safe")
        self.assertTrue(result["trusted_domain"])

    def test_github_lookalike_is_flagged(self) -> None:
        result = predict_phishing("", "http://github-auth-verify-login.cc", input_type="url")

        self.assertEqual(result["prediction"], "Phishing")
        self.assertIn(classify_risk(float(result["risk_score"])), {"Suspicious", "Harmful"})
        self.assertGreaterEqual(float(result["risk_score"]), 60.0)

    def test_typo_squatted_brand_domains_are_flagged(self) -> None:
        facebok_result = predict_phishing("", "https://faceb00k.com", input_type="url")
        google_typo_result = predict_phishing("", "https://gogle.com", input_type="url")

        self.assertEqual(facebok_result["prediction"], "Phishing")
        self.assertEqual(google_typo_result["prediction"], "Phishing")
        self.assertGreaterEqual(float(facebok_result["risk_score"]), 60.0)
        self.assertGreaterEqual(float(google_typo_result["risk_score"]), 60.0)
        self.assertEqual(classify_risk(float(facebok_result["risk_score"])), "Suspicious")
        self.assertEqual(classify_risk(float(google_typo_result["risk_score"])), "Suspicious")

    def test_ip_based_verify_url_is_harmful(self) -> None:
        result = predict_phishing("", "http://192.168.12.44/verify/account", input_type="url")

        self.assertEqual(result["prediction"], "Phishing")
        self.assertEqual(classify_risk(float(result["risk_score"])), "Harmful")

    def test_safe_context_summary_mentions_official_source(self) -> None:
        result = predict_phishing("", "https://github.com/ni2-vsv11", input_type="url")
        status = classify_risk(float(result["risk_score"]))
        context = build_analysis_context(
            email="",
            url="https://github.com/ni2-vsv11",
            input_type="url",
            prediction=str(result["prediction"]),
            status=status,
            risk_score=float(result["risk_score"]),
            confidence=float(result["confidence"]),
        )

        self.assertIn("official GitHub", context["site_summary"])
        self.assertIn("official source", context["recommendation"])


if __name__ == "__main__":
    unittest.main()
