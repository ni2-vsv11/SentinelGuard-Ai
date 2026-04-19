from __future__ import annotations

import json
import os
from urllib import error, parse, request


def _build_fallback_explanation(prediction: str, confidence: float) -> str:
    if prediction == "Phishing":
        return (
            f"This looks risky because it matches common phishing patterns with {confidence:.1f}% confidence.\n"
            "Do not click links or share passwords until you confirm the sender and URL."
        )

    return (
        f"This appears safe based on the model score ({confidence:.1f}% confidence).\n"
        "Still verify the sender and link domain before sharing sensitive information."
    )


def _extract_gemini_text(response_json: dict) -> str:
    candidates = response_json.get("candidates", [])
    for candidate in candidates:
        content = candidate.get("content", {})
        for part in content.get("parts", []):
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                lines = [line.strip() for line in text.splitlines() if line.strip()]
                return "\n".join(lines[:3])
    return ""


def _ensure_two_to_three_lines(explanation: str, prediction: str, confidence: float) -> str:
    lines = [line.strip() for line in explanation.splitlines() if line.strip()]
    if len(lines) >= 2:
        return "\n".join(lines[:3])

    fallback_lines = [
        line.strip() for line in _build_fallback_explanation(prediction, confidence).splitlines() if line.strip()
    ]
    for fallback in fallback_lines:
        if len(lines) >= 2:
            break
        if fallback not in lines:
            lines.append(fallback)

    return "\n".join(lines[:3])


def _candidate_models() -> list[str]:
    preferred = os.getenv("GEMINI_MODEL", "").strip()
    candidates = [
        preferred,
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
    ]
    return [model for model in candidates if model]


def generate_ai_explanation(email: str, url: str, prediction: str, confidence: float) -> str:
    """Generate a short human explanation from Gemini for phishing analysis results."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return _build_fallback_explanation(prediction, confidence)

    prompt = (
        "You are a cybersecurity assistant.\n"
        "Explain in simple terms why this might be phishing or safe.\n"
        "Return only 2-3 short lines.\n\n"
        f"Email content:\n{email[:2000] if email else '(none)'}\n\n"
        f"URL:\n{url if url else '(none)'}\n\n"
        f"ML prediction result:\nPrediction: {prediction}\nConfidence: {confidence:.2f}%"
    )

    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 120,
        },
    }

    payload = json.dumps(body).encode("utf-8")

    for model_name in _candidate_models():
        endpoint = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{parse.quote(model_name)}:generateContent?key={parse.quote(api_key)}"
        )
        req = request.Request(
            endpoint,
            data=payload,
            method="POST",
            headers={"Content-Type": "application/json"},
        )

        try:
            with request.urlopen(req, timeout=8) as response:
                response_body = response.read().decode("utf-8")
            parsed = json.loads(response_body)
            explanation = _extract_gemini_text(parsed)
            if explanation:
                return _ensure_two_to_three_lines(explanation, prediction, confidence)
        except error.HTTPError as exc:
            # Skip model-not-found responses and try the next candidate.
            if exc.code == 404:
                continue
        except (error.URLError, TimeoutError, json.JSONDecodeError):
            break

    return _build_fallback_explanation(prediction, confidence)
