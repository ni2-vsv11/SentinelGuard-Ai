"""Mock in-memory database for development when MongoDB is unavailable."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

# In-memory storage
_users: dict[str, dict[str, Any]] = {}
_scan_results: dict[str, dict[str, Any]] = {}
_notifications: dict[str, dict[str, Any]] = {}


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


def create_notification(
    user_email: str,
    title: str,
    message: str,
    notification_type: str,
    detection_details: dict[str, Any] | None = None,
    severity: str = "medium",
) -> dict[str, Any]:
    """Create a notification for a user detection event."""
    timestamp = datetime.now(timezone.utc).isoformat()
    notification_id = str(uuid.uuid4())
    
    payload = {
        "_id": notification_id,
        "user_email": user_email.lower(),
        "title": title,
        "message": message,
        "notification_type": notification_type,
        "severity": severity,
        "detection_details": detection_details or {},
        "is_read": False,
        "timestamp": timestamp,
        "sent_email": False,
    }
    
    _notifications[notification_id] = payload
    return payload


def fetch_user_notifications(user_email: str, limit: int = 50, unread_only: bool = False) -> list[dict[str, Any]]:
    """Fetch notifications for a user."""
    notifications = list(_notifications.values())
    
    # Filter by user email
    notifications = [n for n in notifications if n["user_email"].lower() == user_email.lower()]
    
    # Filter unread only if requested
    if unread_only:
        notifications = [n for n in notifications if not n["is_read"]]
    
    # Sort by timestamp descending
    notifications.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return notifications[:limit]


def mark_notification_as_read(notification_id: str) -> bool:
    """Mark a notification as read."""
    if notification_id in _notifications:
        _notifications[notification_id]["is_read"] = True
        _notifications[notification_id]["read_at"] = datetime.now(timezone.utc).isoformat()
        return True
    return False


def mark_all_notifications_as_read(user_email: str) -> int:
    """Mark all notifications for a user as read."""
    count = 0
    for notif in _notifications.values():
        if notif["user_email"].lower() == user_email.lower() and not notif["is_read"]:
            notif["is_read"] = True
            notif["read_at"] = datetime.now(timezone.utc).isoformat()
            count += 1
    return count


def get_unread_notification_count(user_email: str) -> int:
    """Get count of unread notifications for a user."""
    return len([
        n for n in _notifications.values()
        if n["user_email"].lower() == user_email.lower() and not n["is_read"]
    ])
