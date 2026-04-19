"""Mock in-memory database for development when MongoDB is unavailable."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

# In-memory storage
_users: dict[str, dict[str, Any]] = {}
_scan_results: dict[str, dict[str, Any]] = {}


def get_db() -> dict[str, Any]:
    """Return mock database interface."""
    return {"users": _users, "scan_results": _scan_results}


def _serialize_scan_result(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(document.get("_id")),
        "email": document.get("email", ""),
        "url": document.get("url", ""),
        "result": document.get("result", {}),
        "timestamp": document.get("timestamp", ""),
    }


def _serialize_user(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(document.get("_id")),
        "email": document.get("email", ""),
        "role": document.get("role", "user"),
        "created_at": document.get("created_at", ""),
        "updated_at": document.get("updated_at", ""),
    }


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Get user by email from mock database."""
    for user in _users.values():
        if user["email"].lower() == email.lower():
            return user
    return None


def create_user(email: str, password_hash: str, role: str = "user") -> dict[str, Any]:
    """Create a new user in mock database."""
    # Check for duplicate
    if get_user_by_email(email):
        raise Exception("Email already exists")

    timestamp = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())
    
    payload = {
        "_id": user_id,
        "email": email.lower(),
        "password_hash": password_hash,
        "role": role,
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    
    _users[user_id] = payload
    return _serialize_user(payload)


def upsert_admin_user(email: str, password_hash: str) -> dict[str, Any]:
    """Create or update the admin user in mock database."""
    timestamp = datetime.now(timezone.utc).isoformat()
    normalized_email = email.lower()

    for user in _users.values():
        if user["email"].lower() == normalized_email:
            user["password_hash"] = password_hash
            user["role"] = "admin"
            user["updated_at"] = timestamp
            return _serialize_user(user)

    user_id = str(uuid.uuid4())
    payload = {
        "_id": user_id,
        "email": normalized_email,
        "password_hash": password_hash,
        "role": "admin",
        "created_at": timestamp,
        "updated_at": timestamp,
    }

    _users[user_id] = payload
    return _serialize_user(payload)


def save_scan_result(email: str, url: str, result: dict[str, Any]) -> dict[str, Any]:
    """Save scan result in mock database."""
    timestamp = datetime.now(timezone.utc).isoformat()
    scan_id = str(uuid.uuid4())
    
    payload = {
        "_id": scan_id,
        "email": email.lower(),
        "url": url,
        "result": result,
        "timestamp": timestamp,
    }
    
    _scan_results[scan_id] = payload
    return _serialize_scan_result(payload)


def fetch_scan_history(email: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    """Fetch scan history from mock database."""
    results = list(_scan_results.values())
    
    if email:
        results = [r for r in results if r["email"].lower() == email.lower()]
    
    # Sort by timestamp descending
    results.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return [_serialize_scan_result(r) for r in results[:limit]]


def fetch_users(limit: int = 50) -> list[dict[str, Any]]:
    """Fetch all users from mock database."""
    users = list(_users.values())
    return [_serialize_user(u) for u in users[:limit]]
