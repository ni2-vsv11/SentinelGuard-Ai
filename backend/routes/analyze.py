from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ml import generate_ai_explanation, predict_phishing

analyze_bp = Blueprint("analyze", __name__)


@analyze_bp.post("/analyze")
@jwt_required()
def analyze_email_and_url():
    payload = request.get_json(silent=True) or {}

    email = str(payload.get("email", "")).strip()
    url = str(payload.get("url", "")).strip()

    if not email and not url:
        return (
            jsonify(
                {
                    "status": "Suspicious",
                    "confidence": 0,
                    "message": "Provide email text or URL for analysis.",
                }
            ),
            400,
        )

    result = predict_phishing(email=email, url=url)
    prediction = str(result.get("prediction", "Safe"))
    confidence = float(result.get("confidence", 0))
    ai_explanation = generate_ai_explanation(
        email=email,
        url=url,
        prediction=prediction,
        confidence=confidence,
    )

    if prediction == "Phishing" and confidence >= 75:
        status = "Phishing"
        message = "High-confidence phishing indicators were detected."
    elif prediction == "Phishing":
        status = "Suspicious"
        message = "Some phishing indicators were detected."
    elif prediction == "Safe" and confidence < 60:
        status = "Suspicious"
        message = "Confidence is moderate. Review this content manually."
    else:
        status = "Safe"
        message = "No strong phishing indicators were detected."

    return (
        jsonify(
            {
                "status": status,
                "confidence": confidence,
                "message": message,
                "prediction": prediction,
                "ai_explanation": ai_explanation,
            }
        ),
        200,
    )
