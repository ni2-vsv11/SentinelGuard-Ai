from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from pymongo import DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

load_dotenv()

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb://localhost:27017",
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

    scan_results.create_index([("timestamp", DESCENDING)])
    scan_results.create_index([("email", DESCENDING)])
    users.create_index("email", unique=True)

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
