"""SQLAlchemy models. Importing this module registers every model with
`Base.metadata`, which is what Alembic's autogenerate compares against.
"""

from app.models.ai import AiSession, Conversation, Message
from app.models.audit import AuditLog
from app.models.base import Base
from app.models.notifications import DeviceToken, Notification
from app.models.ops import (
    Amenity,
    AmenityBooking,
    Booking,
    FamilyMember,
    Guest,
    Invoice,
    MaintenanceRequest,
    QrLog,
    ServiceBooking,
)
from app.models.social import Comment, Post, Reel, Story
from app.models.unit import Unit, UnitMember
from app.models.user import User, UserRole

__all__ = [
    "AiSession",
    "Amenity",
    "AmenityBooking",
    "AuditLog",
    "Base",
    "Booking",
    "Comment",
    "Conversation",
    "DeviceToken",
    "FamilyMember",
    "Guest",
    "Invoice",
    "MaintenanceRequest",
    "Message",
    "Notification",
    "Post",
    "QrLog",
    "Reel",
    "ServiceBooking",
    "Story",
    "Unit",
    "UnitMember",
    "User",
    "UserRole",
]
