from __future__ import annotations

from typing import Any

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from db import fetch_scan_history, save_scan_result

scan_results_bp = Blueprint("scan_results", __name__)


@scan_results_bp.post("/scan-results")
@jwt_required()
def save_scan_result_handler():
    payload = request.get_json(silent=True) or {}
    identity_email = str(get_jwt_identity() or "").strip().lower()

    email = identity_email
    url = str(payload.get("url", "")).strip()
    result = payload.get("result")

    if not email and not url:
        return (
            jsonify(
                {
                    "message": "Provide at least one of email or url.",
                }
            ),
            400,
        )

    if not isinstance(result, dict):
        return (
            jsonify(
                {
                    "message": "Field 'result' must be an object.",
                }
            ),
            400,
        )

    saved = save_scan_result(email=email, url=url, result=result)
    return jsonify(saved), 201


@scan_results_bp.get("/scan-results/history")
@jwt_required()
def fetch_scan_history_handler():
    claims = get_jwt()
    role = str(claims.get("role", "user"))
    identity_email = str(get_jwt_identity() or "").strip().lower()

    requested_email = request.args.get("email", type=str)
    limit = request.args.get("limit", default=50, type=int)
    limit = max(1, min(limit, 500))

    if role == "admin":
        email = requested_email
    else:
        email = identity_email

    history = fetch_scan_history(email=email, limit=limit)

    return (
        jsonify(
            {
                "count": len(history),
                "items": history,
            }
        ),
        200,
    )
