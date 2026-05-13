from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..db import (
    create_notification,
    fetch_user_notifications,
    get_unread_notification_count,
    mark_all_notifications_as_read,
    mark_notification_as_read,
)

notifications_bp = Blueprint("notifications", __name__, url_prefix="/notifications")


@notifications_bp.get("/")
@jwt_required()
def get_notifications():
    """Fetch all notifications for the authenticated user."""
    user_email = get_jwt_identity()
    limit = request.args.get("limit", 50, type=int)
    unread_only = request.args.get("unread_only", False, type=lambda x: x.lower() == "true")

    notifications = fetch_user_notifications(
        user_email=user_email,
        limit=limit,
        unread_only=unread_only,
    )

    return (
        jsonify(
            {
                "notifications": notifications,
                "total": len(notifications),
            }
        ),
        200,
    )


@notifications_bp.get("/unread-count")
@jwt_required()
def get_unread_count():
    """Get count of unread notifications for the user."""
    user_email = get_jwt_identity()
    count = get_unread_notification_count(user_email)

    return (
        jsonify(
            {
                "unread_count": count,
            }
        ),
        200,
    )


@notifications_bp.post("/<notification_id>/mark-read")
@jwt_required()
def mark_read(notification_id: str):
    """Mark a specific notification as read."""
    success = mark_notification_as_read(notification_id)

    return (
        jsonify(
            {
                "success": success,
                "message": "Notification marked as read" if success else "Notification not found",
            }
        ),
        200 if success else 404,
    )


@notifications_bp.post("/mark-all-read")
@jwt_required()
def mark_all_read():
    """Mark all notifications for the user as read."""
    user_email = get_jwt_identity()
    modified_count = mark_all_notifications_as_read(user_email)

    return (
        jsonify(
            {
                "success": True,
                "marked_count": modified_count,
                "message": f"Marked {modified_count} notifications as read",
            }
        ),
        200,
    )
