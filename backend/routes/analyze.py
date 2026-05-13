from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..db import create_notification
from ..ml import build_analysis_context, classify_risk, generate_ai_explanation, predict_phishing

analyze_bp = Blueprint("analyze", __name__)


@analyze_bp.post("/analyze")
@jwt_required()
def analyze_email_and_url():
    user_email = get_jwt_identity()
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

    # Determine which input type the user provided
    if email and not url:
        input_type = "email"
    elif url and not email:
        input_type = "url"
    else:
        input_type = "both"

    # For combined analysis
    result = predict_phishing(email=email, url=url, input_type=input_type)
    prediction = str(result.get("prediction", "Safe"))
    risk_score = float(result.get("risk_score", result.get("phishing_probability", 0)))
    confidence = float(result.get("confidence", 0))
    status = classify_risk(risk_score)
    analysis_context = build_analysis_context(
        email=email,
        url=url,
        input_type=input_type,
        prediction=prediction,
        status=status,
        risk_score=risk_score,
        confidence=confidence,
    )
    ai_explanation = generate_ai_explanation(
        email=email,
        url=url,
        input_type=input_type,
        prediction=prediction,
        status=status,
        risk_score=risk_score,
        confidence=confidence,
    )

    if status == "Harmful":
        message = "High-confidence phishing indicators were detected."
    elif status == "Suspicious":
        message = "Potential phishing indicators were found."
    else:
        message = "No strong phishing indicators were detected."

    response_data = {
        "input_type": input_type,
        "status": status,
        "confidence": confidence,
        "risk_score": risk_score,
        "confidentiality_score": round(max(0.0, 100.0 - risk_score), 2),
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
        "ml_probability": result.get("ml_probability"),
        "heuristic_risk": result.get("heuristic_risk"),
        "trusted_domain": result.get("trusted_domain"),
        "url_risk": result.get("url_risk"),
        "email_risk": result.get("email_risk"),
    }

    # If both email and URL were provided, add separate analyses
    if input_type == "both":
        email_result = predict_phishing(email=email, url="", input_type="email")
        url_result = predict_phishing(email="", url=url, input_type="url")

        email_risk = float(email_result.get("risk_score", 0))
        url_risk = float(url_result.get("risk_score", 0))

        email_analysis = build_analysis_context(
            email=email,
            url="",
            input_type="email",
            prediction=email_result.get("prediction", "Safe"),
            status=classify_risk(email_risk),
            risk_score=email_risk,
            confidence=email_result.get("confidence", 0),
        )

        url_analysis = build_analysis_context(
            email="",
            url=url,
            input_type="url",
            prediction=url_result.get("prediction", "Safe"),
            status=classify_risk(url_risk),
            risk_score=url_risk,
            confidence=url_result.get("confidence", 0),
        )

        response_data["separate_analysis"] = {
            "email": {
                "risk_score": email_risk,
                "status": classify_risk(email_risk),
                "confidence": email_result.get("confidence", 0),
                "email_risk": email_result.get("email_risk", 0),
                "email_summary": email_analysis["email_summary"],
                "prediction": email_result.get("prediction", "Safe"),
            },
            "url": {
                "risk_score": url_risk,
                "status": classify_risk(url_risk),
                "confidence": url_result.get("confidence", 0),
                "url_risk": url_result.get("url_risk", 0),
                "site_summary": url_analysis["site_summary"],
                "site_domain": url_analysis.get("site_domain", "(no domain)"),
                "prediction": url_result.get("prediction", "Safe"),
            }
        }

    # Create a notification for every scan so the bell reflects the full check history.
    if status == "Harmful":
        severity = "high"
        notification_title = "⚠️ Harmful Content Detected"
        notification_message = (
            f"A {input_type} scan was flagged as harmful with {risk_score:.0f}% risk score."
            if input_type != "both"
            else (
                f"Email and URL were flagged as harmful. Email risk: {response_data['separate_analysis']['email']['risk_score']:.0f}%, "
                f"URL risk: {response_data['separate_analysis']['url']['risk_score']:.0f}%"
            )
        )
    elif status == "Suspicious":
        severity = "medium"
        notification_title = "⚠️ Suspicious Content Detected"
        notification_message = (
            f"A {input_type} scan was flagged as suspicious with {risk_score:.0f}% risk score."
            if input_type != "both"
            else (
                f"Email and URL were flagged as suspicious. Email risk: {response_data['separate_analysis']['email']['risk_score']:.0f}%, "
                f"URL risk: {response_data['separate_analysis']['url']['risk_score']:.0f}%"
            )
        )
    else:
        severity = "low"
        notification_title = "✅ Safe Scan Completed"
        notification_message = (
            "The scan completed successfully and no phishing indicators were found."
            if input_type != "both"
            else "The email and URL scan completed successfully and no phishing indicators were found."
        )

    create_notification(
        user_email=user_email,
        title=notification_title,
        message=notification_message,
        notification_type="detection",
        severity=severity,
        detection_details={
            "input_type": input_type,
            "status": status,
            "risk_score": risk_score,
            "url": url[:100] if url else None,
            "email_preview": email[:200] if email else None,
            "timestamp": response_data.get("timestamp"),
        },
    )

    return jsonify(response_data), 200
