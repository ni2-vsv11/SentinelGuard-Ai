from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from pymongo import DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

load_dotenv()

MONGO_URI = (
    os.getenv("MONGO_URI")
    or os.getenv("MONGODB_URI")
    or "mongodb://localhost:27017"
)
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "sentinelguard_ai")

_client: MongoClient | None = None


def _get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client


def get_db() -> Database:
    db = _get_client()[MONGO_DB_NAME]

    # Ensure core collections and useful indexes exist.
    scan_results: Collection = db["scan_results"]
    users: Collection = db["users"]
    notifications: Collection = db["notifications"]

    scan_results.create_index([("timestamp", DESCENDING)])
    scan_results.create_index([("email", DESCENDING)])
    users.create_index("email", unique=True)
    notifications.create_index([("user_email", DESCENDING)])
    notifications.create_index([("timestamp", DESCENDING)])
    notifications.create_index([("is_read", DESCENDING)])

    return db


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
    db = get_db()
    return db["users"].find_one({"email": email})


def create_user(email: str, password_hash: str, role: str = "user") -> dict[str, Any]:
    db = get_db()

    timestamp = datetime.now(timezone.utc).isoformat()
    payload = {
        "email": email,
        "password_hash": password_hash,
        "role": role,
        "created_at": timestamp,
        "updated_at": timestamp,
    }

    inserted = db["users"].insert_one(payload)
    payload["_id"] = inserted.inserted_id
    return _serialize_user(payload)


def upsert_admin_user(email: str, password_hash: str) -> dict[str, Any]:
    db = get_db()

    timestamp = datetime.now(timezone.utc).isoformat()
    db["users"].update_one(
        {"email": email},
        {
            "$set": {
                "email": email,
                "password_hash": password_hash,
                "role": "admin",
                "updated_at": timestamp,
            },
            "$setOnInsert": {
                "created_at": timestamp,
            },
        },
        upsert=True,
    )

    user = db["users"].find_one({"email": email})
    if not user:
        raise RuntimeError("Failed to upsert admin user.")

    return _serialize_user(user)


def save_scan_result(email: str, url: str, result: dict[str, Any]) -> dict[str, Any]:
    db = get_db()

    timestamp = datetime.now(timezone.utc).isoformat()
    payload = {
        "email": email,
        "url": url,
        "result": result,
        "timestamp": timestamp,
    }

    inserted = db["scan_results"].insert_one(payload)

    if email:
        db["users"].update_one(
            {"email": email},
            {
                "$set": {
                    "email": email,
                    "updated_at": timestamp,
                },
                "$setOnInsert": {
                    "created_at": timestamp,
                },
            },
            upsert=True,
        )

    payload["_id"] = inserted.inserted_id
    return _serialize_scan_result(payload)


def fetch_scan_history(email: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    db = get_db()

    safe_limit = max(1, min(limit, 200))
    query: dict[str, Any] = {}
    if email:
        query["email"] = email

    cursor = db["scan_results"].find(query).sort("timestamp", DESCENDING).limit(safe_limit)
    return [_serialize_scan_result(doc) for doc in cursor]


def fetch_users(limit: int = 100) -> list[dict[str, Any]]:
    db = get_db()

    safe_limit = max(1, min(limit, 500))
    cursor = db["users"].find({}).sort("updated_at", DESCENDING).limit(safe_limit)
    return [_serialize_user(doc) for doc in cursor]


def create_notification(
    user_email: str,
    title: str,
    message: str,
    notification_type: str,
    detection_details: dict[str, Any] | None = None,
    severity: str = "medium",
) -> dict[str, Any]:
    """Create a notification for a user detection event."""
    db = get_db()

    timestamp = datetime.now(timezone.utc).isoformat()
    payload = {
        "user_email": user_email,
        "title": title,
        "message": message,
        "notification_type": notification_type,
        "severity": severity,
        "detection_details": detection_details or {},
        "is_read": False,
        "timestamp": timestamp,
        "sent_email": False,
    }

    inserted = db["notifications"].insert_one(payload)
    payload["_id"] = str(inserted.inserted_id)
    return payload


def fetch_user_notifications(user_email: str, limit: int = 50, unread_only: bool = False) -> list[dict[str, Any]]:
    """Fetch notifications for a user."""
    db = get_db()

    query = {"user_email": user_email}
    if unread_only:
        query["is_read"] = False

    safe_limit = max(1, min(limit, 200))
    cursor = (
        db["notifications"]
        .find(query)
        .sort("timestamp", DESCENDING)
        .limit(safe_limit)
    )
    
    results = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    return results


def mark_notification_as_read(notification_id: str) -> bool:
    """Mark a notification as read."""
    db = get_db()
    from bson import ObjectId
    
    result = db["notifications"].update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}},
    )
    return result.modified_count > 0


def mark_all_notifications_as_read(user_email: str) -> int:
    """Mark all notifications for a user as read."""
    db = get_db()
    
    result = db["notifications"].update_many(
        {"user_email": user_email, "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}},
    )
    return result.modified_count


def get_unread_notification_count(user_email: str) -> int:
    """Get count of unread notifications for a user."""
    db = get_db()
    return db["notifications"].count_documents({"user_email": user_email, "is_read": False})
