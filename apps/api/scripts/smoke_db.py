"""Smoke test the SQL-backed requests_hub against whatever DATABASE_URL is set.

Run:  uv run python scripts/smoke_db.py

Exercises: seed, list (all), list (filtered), create, dispatch, resolve.
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.ops import MaintenanceRequest
from app.models.user import User
from app.schemas.requests import RequestCreateInput
from app.services import requests_hub


async def main() -> int:
    async with AsyncSessionLocal() as session:
        # 1. seed (idempotent)
        await requests_hub.seed_demo_data(session)

        # 2. list all
        all_tickets = await requests_hub.list_requests(session)
        print(f"all tickets: {len(all_tickets)}")
        assert len(all_tickets) >= 6, "expected at least 6 seeded tickets"

        # 3. list filtered to lina
        lina = await session.scalar(select(User).where(User.clerk_id == "seed_lina_mostafa"))
        assert lina is not None, "seed user lina missing"
        lina_tickets = await requests_hub.list_requests(session, user_id=lina.id)
        print(f"lina tickets: {len(lina_tickets)} (residentName={lina_tickets[0].residentName!r})")
        assert lina_tickets, "lina should have at least 1 ticket"
        assert all(t.residentName == "Lina Mostafa" for t in lina_tickets), "filter leaked"

        # 4. create a new ticket for lina
        from app.models.unit import Unit

        unit = await session.scalar(select(Unit).where(Unit.name == "Sarai · B7-302"))
        assert unit is not None
        created = await requests_hub.create_request(
            session,
            user_id=lina.id,
            unit_id=unit.id,
            payload=RequestCreateInput(
                category="plumbing",
                title="Smoke test ticket",
                description="Created by scripts/smoke_db.py",
                urgency="routine",
            ),
        )
        print(f"created: id={created.id} status={created.status}")
        assert created.status == "pending"
        assert created.residentName == "Lina Mostafa"

        # 5. dispatch
        dispatched = await requests_hub.dispatch(session, created.id, "t-2")
        print(f"dispatched: status={dispatched.status} assignee={dispatched.assigneeId}")
        assert dispatched.status == "in_progress"
        assert dispatched.assigneeId == "t-2"

        # 6. resolve
        resolved = await requests_hub.resolve(session, created.id)
        print(f"resolved: status={resolved.status}")
        assert resolved.status == "resolved"

        # 7. cleanup the smoke-test ticket
        from uuid import UUID

        await session.execute(
            MaintenanceRequest.__table__.delete().where(MaintenanceRequest.id == UUID(created.id))
        )
        await session.commit()
        print("OK — all smoke assertions passed")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
