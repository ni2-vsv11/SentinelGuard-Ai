from __future__ import annotations

import os
import re
from datetime import timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from pymongo.errors import DuplicateKeyError

from auth import hash_password, verify_password
from db import create_user, get_user_by_email

auth_bp = Blueprint("auth", __name__)

email_pattern = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
ADMIN_EMAILS = {
    value.strip().lower()
    for value in os.getenv("ADMIN_EMAILS", "ni2@gmail.com").split(",")
    if value.strip()
}


@auth_bp.post("/auth/signup")
def signup_handler():
    payload = request.get_json(silent=True) or {}

    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email_pattern.match(email):
        return jsonify({"message": "Enter a valid email address."}), 400

    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters."}), 400

    if get_user_by_email(email):
        return jsonify({"message": "Email is already registered."}), 409

    role = "admin" if email in ADMIN_EMAILS else "user"
    password_hash = hash_password(password)

    try:
        user = create_user(email=email, password_hash=password_hash, role=role)
    except DuplicateKeyError:
        return jsonify({"message": "Email is already registered."}), 409

    return (
        jsonify(
            {
                "message": "Signup successful.",
                "user": user,
            }
        ),
        201,
    )


@auth_bp.post("/auth/login")
def login_handler():
    payload = request.get_json(silent=True) or {}

    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or not password:
        return jsonify({"message": "Email and password are required."}), 400

    user = get_user_by_email(email)
    if not user:
        return jsonify({"message": "Invalid credentials."}), 401

    password_hash = str(user.get("password_hash", ""))
    if not password_hash or not verify_password(password, password_hash):
        return jsonify({"message": "Invalid credentials."}), 401

    role = str(user.get("role", "user"))
    expires = timedelta(hours=24)
    token = create_access_token(
        identity=email,
        additional_claims={"role": role},
        expires_delta=expires,
    )

    return (
        jsonify(
            {
                "token": token,
                "user": {
                    "email": email,
                    "role": role,
                },
            }
        ),
        200,
    )
