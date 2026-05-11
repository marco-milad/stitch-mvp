import uuid
from datetime import date

from sqlalchemy import BigInteger, Boolean, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UuidPk


class Unit(UuidPk, CreatedAt, Base):
    __tablename__ = "units"

    name: Mapped[str] = mapped_column(String, nullable=False)
    project: Mapped[str | None] = mapped_column(String, nullable=True)
    type: Mapped[str | None] = mapped_column(String, nullable=True)
    beds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    baths: Mapped[int | None] = mapped_column(Integer, nullable=True)
    area_sqm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    floor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str | None] = mapped_column(String, nullable=True)
    value_egp: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    # `metadata` is reserved on DeclarativeBase, so the Python attribute is `meta`
    # while the SQL column keeps the name from the spec.
    meta: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)


class UnitMember(UuidPk, Base):
    __tablename__ = "unit_members"
    __table_args__ = (UniqueConstraint("user_id", "unit_id", name="uq_unit_members_user_unit"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("units.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String, nullable=False)
    since: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
