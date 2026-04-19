"""Database module with fallback to mock database."""
import os

# Try to use MongoDB, fallback to mock if unavailable
USE_MOCK_DB = os.getenv("USE_MOCK_DB", "false").lower() == "true"

if USE_MOCK_DB:
    from .mock_db import (
        create_user,
        fetch_scan_history,
        fetch_users,
        get_db,
        get_user_by_email,
        save_scan_result,
        upsert_admin_user,
    )
else:
    try:
        from .mongo import (
            create_user,
            fetch_scan_history,
            fetch_users,
            get_db,
            get_user_by_email,
            save_scan_result,
            upsert_admin_user,
        )
    except Exception as e:
        print(f"MongoDB unavailable: {e}. Falling back to mock database.")
        from .mock_db import (
            create_user,
            fetch_scan_history,
            fetch_users,
            get_db,
            get_user_by_email,
            save_scan_result,
            upsert_admin_user,
        )

__all__ = [
    "get_db",
    "save_scan_result",
    "fetch_scan_history",
    "fetch_users",
    "get_user_by_email",
    "create_user",
    "upsert_admin_user",
]
