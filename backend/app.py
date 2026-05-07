import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.middleware.proxy_fix import ProxyFix

from .auth import hash_password
from .db import get_db, upsert_admin_user
from .extensions import limiter

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

from .routes import analyze_bp, auth_bp, scan_results_bp, users_bp


DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_DEFAULT_EMAIL", "").strip().lower()
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_DEFAULT_PASSWORD", "")


def _parse_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    frontend_url = os.getenv("FRONTEND_URL", "").strip()
    if frontend_url:
        return [frontend_url]

    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def create_app() -> Flask:
    app = Flask(__name__)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    jwt_secret = os.getenv("JWT_SECRET_KEY")
    if not jwt_secret:
        jwt_secret = os.urandom(32).hex()

    app.config["JWT_SECRET_KEY"] = jwt_secret
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_HEADER_NAME"] = "Authorization"
    app.config["JWT_HEADER_TYPE"] = "Bearer"
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
    app.config["JSON_SORT_KEYS"] = False

    JWTManager(app)
    limiter.init_app(app)

    CORS(
        app,
        resources={r"/*": {"origins": _parse_cors_origins()}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    app.register_blueprint(analyze_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(scan_results_bp)
    app.register_blueprint(users_bp)

    @app.after_request
    def add_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        )
        if request.is_secure:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response

    # Only seed admin credentials when explicitly configured via environment.
    if DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD:
        upsert_admin_user(
            email=DEFAULT_ADMIN_EMAIL,
            password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
        )

    @app.get("/health")
    def health_check() -> tuple[dict[str, str], int]:
        return {"status": "ok"}, 200

    @app.get("/ready")
    def readiness_check() -> tuple[dict[str, str], int]:
        try:
            get_db().command("ping")
        except Exception as exc:
            return {"status": "not_ready", "error": str(exc)}, 503
        return {"status": "ready"}, 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_ENV", "development") != "production",
    )
