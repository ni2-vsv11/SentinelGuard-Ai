from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..ml import build_analysis_context, generate_ai_explanation, predict_phishing

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

    # Determine which input type the user provided so we only focus analysis there
    if email and not url:
        input_type = "email"
    elif url and not email:
        input_type = "url"
    else:
        input_type = "both"

    result = predict_phishing(email=email, url=url, input_type=input_type)
    prediction = str(result.get("prediction", "Safe"))
    confidence = float(result.get("confidence", 0))
    analysis_context = build_analysis_context(
        email=email,
        url=url,
        input_type=input_type,
        prediction=prediction,
        confidence=confidence,
    )
    ai_explanation = generate_ai_explanation(
        email=email,
        url=url,
        input_type=input_type,
        prediction=prediction,
        confidence=confidence,
    )

    if prediction == "Phishing" and confidence >= 75:
        status = "Harmful"
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
                "input_type": input_type,
                "status": status,
                "confidence": confidence,
                "confidentiality_score": confidence,
                "message": message,
                "prediction": prediction,
                "ai_explanation": ai_explanation,
                "site_summary": analysis_context["site_summary"],
                "harm_summary": analysis_context["harm_summary"],
                "email_summary": analysis_context["email_summary"],
                "recommendation": analysis_context["recommendation"],
                "prediction_summary": analysis_context["prediction_summary"],
                "identified_sender": analysis_context.get("identified_sender", "(unknown)"),
                "site_domain": analysis_context.get("site_domain", "(no domain)"),
            }
        ),
        200,
    )
