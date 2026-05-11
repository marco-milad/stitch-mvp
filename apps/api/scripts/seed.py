"""Seed the database with prototype-matching demo data.

Run:
    uv run python -m scripts.seed

Safe to re-run: skips if any users already exist.
"""

import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.logging import configure_logging, logger
from app.models import (
    Notification,
    Post,
    Reel,
    Story,
    Unit,
    UnitMember,
    User,
    UserRole,
)

configure_logging()


POSTS_DATA: list[tuple[str, str, list[dict], timedelta]] = [
    (
        "events",
        "🌊 Summer Splash Pool Party — هذا الجمعة من الساعة ٨ مساءً عند المسبح الرئيسي. DJ، مأكولات، وألعاب للأطفال. RSVP من تطبيق Stitch.",
        [
            {
                "bg": "linear-gradient(135deg,#06B6D4,#3B82F6,#1D4ED8)",
                "emoji": "🏊",
                "title": "Summer Splash Party",
                "sub": "Friday · 8 PM · Main Pool",
            },
            {
                "bg": "linear-gradient(135deg,#0EA5E9,#06B6D4,#0891B2)",
                "emoji": "🎵",
                "title": "Live DJ Set",
                "sub": "Curated by DJ Karim",
            },
            {
                "bg": "linear-gradient(135deg,#3B82F6,#7C3AED,#A855F7)",
                "emoji": "🍹",
                "title": "Drinks & Bites",
                "sub": "On the house for residents",
            },
        ],
        timedelta(hours=2),
    ),
    (
        "announcements",
        "⚠️ صيانة دورية للمسبح الرئيسي يوم الأربعاء من ٨ صباحاً حتى ١٠ صباحاً. المسبح الصغير متاح طول اليوم. شكراً لتفهمكم.",
        [
            {
                "bg": "linear-gradient(135deg,#EF4444,#DC2626,#991B1B)",
                "emoji": "🛠",
                "title": "Pool Maintenance",
                "sub": "Wed · 8 AM – 10 AM",
            },
            {
                "bg": "linear-gradient(135deg,#F97316,#EA580C,#C2410C)",
                "emoji": "✅",
                "title": "Kids Pool Open",
                "sub": "No interruption",
            },
        ],
        timedelta(hours=5),
    ),
    (
        "news",
        "🏋️ افتتاح المعدات الجديدة في الجيم! ٢٠ ماكينة كارديو + قسم crossfit جديد. مفتوح من ٦ صباحاً لـ ١١ مساءً.",
        [
            {
                "bg": "linear-gradient(135deg,#7C3AED,#5B21B6,#3730A3)",
                "emoji": "💪",
                "title": "Gym Just Got Bigger",
                "sub": "New equipment now live",
            },
            {
                "bg": "linear-gradient(135deg,#A855F7,#7C3AED,#6366F1)",
                "emoji": "🏋️",
                "title": "CrossFit Zone",
                "sub": "Olympic plates · 6 racks",
            },
            {
                "bg": "linear-gradient(135deg,#6366F1,#4F46E5,#4338CA)",
                "emoji": "🏃",
                "title": "20 Cardio Machines",
                "sub": "Treadmills · Bikes · Rowers",
            },
        ],
        timedelta(days=1),
    ),
    (
        "community",
        "👋 رحبوا بالعائلات الجديدة في الكمبوند هذا الشهر! ٦ عائلات انضمت لمجتمعنا. كل حفلة ترحيب يوم السبت في الـ Clubhouse.",
        [
            {
                "bg": "linear-gradient(135deg,#10B981,#059669,#047857)",
                "emoji": "🤝",
                "title": "Welcome New Neighbors",
                "sub": "6 families joined this month",
            },
            {
                "bg": "linear-gradient(135deg,#34D399,#10B981,#059669)",
                "emoji": "🎉",
                "title": "Welcome Party",
                "sub": "Saturday · Clubhouse",
            },
        ],
        timedelta(days=1),
    ),
    (
        "events",
        "🧘 جلسات يوغا أسبوعية كل سبت الساعة ٧ صباحاً عند الحديقة المركزية. مع المدربة المعتمدة Yasmine. مجاناً للسكان.",
        [
            {
                "bg": "linear-gradient(135deg,#EC4899,#DB2777,#BE185D)",
                "emoji": "🧘",
                "title": "Saturday Yoga",
                "sub": "7 AM · Central Garden",
            },
            {
                "bg": "linear-gradient(135deg,#F472B6,#EC4899,#DB2777)",
                "emoji": "🌸",
                "title": "Free for Residents",
                "sub": "Just bring a mat",
            },
        ],
        timedelta(days=2),
    ),
    (
        "announcements",
        "🚗 تذكير: مواقف الزوار للضيوف فقط. الرجاء استخدام موقفك المخصص لتجنب أي مخالفات. شكراً لتعاونكم.",
        [
            {
                "bg": "linear-gradient(135deg,#F59E0B,#D97706,#B45309)",
                "emoji": "🅿️",
                "title": "Parking Reminder",
                "sub": "Visitor spots = guests only",
            },
        ],
        timedelta(days=3),
    ),
    (
        "news",
        "🌳 مشروع الحديقة المجتمعية بدأ! كل ساكن يقدر يحجز حوض زراعة خاص. التسجيل من خلال Farah — قول 'حديقة مجتمعية'.",
        [
            {
                "bg": "linear-gradient(135deg,#84CC16,#65A30D,#4D7C0F)",
                "emoji": "🌱",
                "title": "Community Garden",
                "sub": "Reserve your plot",
            },
            {
                "bg": "linear-gradient(135deg,#A3E635,#84CC16,#65A30D)",
                "emoji": "🥬",
                "title": "Grow Your Own",
                "sub": "Vegetables · Herbs · Flowers",
            },
        ],
        timedelta(days=4),
    ),
    (
        "events",
        "🎬 سينما تحت النجوم! عرض فيلم 'The Hundred-Foot Journey' يوم الخميس ٩ مساءً عند ساحة الـ Amphitheater. بطاطين ومشروبات مجانية.",
        [
            {
                "bg": "linear-gradient(135deg,#1E1B4B,#312E81,#3730A3)",
                "emoji": "🎬",
                "title": "Cinema Under the Stars",
                "sub": "Thursday · 9 PM",
            },
            {
                "bg": "linear-gradient(135deg,#312E81,#4338CA,#4F46E5)",
                "emoji": "⭐",
                "title": "Outdoor Amphitheater",
                "sub": "Free blankets & drinks",
            },
        ],
        timedelta(days=5),
    ),
    (
        "community",
        "⭐ Resident Spotlight: Hossam el Sayed، صاحب فيلا ١٤، فاز بجائزة 'أفضل جار' هذا الشهر. شكراً يا حسام على لمستك الجميلة في كل event!",
        [
            {
                "bg": "linear-gradient(135deg,#FBBF24,#F59E0B,#D97706)",
                "emoji": "⭐",
                "title": "Resident of the Month",
                "sub": "Hossam el Sayed · Villa 14",
            },
        ],
        timedelta(days=6),
    ),
    (
        "announcements",
        "📱 تحديث: ميزة الدفع التلقائي للفواتير متاحة الآن. فعّلها من Settings → Payments. ما تنساش أي فاتورة تاني!",
        [
            {
                "bg": "linear-gradient(135deg,#0EA5E9,#0284C7,#0369A1)",
                "emoji": "💳",
                "title": "Auto-Pay is Here",
                "sub": "Never miss a bill",
            },
        ],
        timedelta(days=7),
    ),
]


REELS_DATA: list[tuple[str, str, str, str, timedelta]] = [
    (
        "events",
        "Pool Party Recap 🎉",
        "لحظات من حفلة المسبح اللي فاتت — ٤٠٠+ ساكن حضر، DJ نار، وذكريات لا تُنسى.",
        "water",
        timedelta(hours=3),
    ),
    (
        "community",
        "New Yoga Studio Tour 🧘",
        "جولة سريعة في استوديو اليوغا الجديد — مرايا، إضاءة طبيعية، وإطلالة على الحديقة.",
        "zen",
        timedelta(days=1),
    ),
    (
        "news",
        "Gym Equipment Highlights 💪",
        "شوفوا المعدات الجديدة في الجيم — ٢٠ ماكينة كارديو + crossfit zone كاملة.",
        "fire",
        timedelta(days=2),
    ),
    (
        "community",
        "Community Garden Day 🌱",
        "يوم زراعة جماعي — ٥٠ عائلة شاركت في زراعة الحديقة المجتمعية الجديدة.",
        "leaves",
        timedelta(days=4),
    ),
    (
        "events",
        "Eid Celebration ✨",
        "احتفالنا بالعيد — كحك، عيدية للأطفال، ولمسات خاصة لكل ساكن.",
        "sparkle",
        timedelta(days=5),
    ),
]


STORIES_DATA: list[tuple[str, str, str, str, str]] = [
    ("🎬", "Cinema", "Cinema Tonight", "9 PM · Amphitheater", "stars"),
    ("🏊", "Pool", "Open All Day", "Until 10 PM", "water"),
    ("🛒", "Market", "Farmers' Market", "Friday morning", "leaves"),
    ("🎉", "Party", "Welcome Party", "Saturday · Clubhouse", "sparkle"),
    ("📦", "Delivery", "Reschedule", "Use Farah to update", "fire"),
    ("☕", "Cafe", "New Cafe Opening", "Plaza · 8 AM", "zen"),
]


NOTIFICATIONS_DATA: list[tuple[str, str, str]] = [
    (
        "maintenance",
        "AC technician scheduled",
        "Visit confirmed for Wednesday between 10 AM and noon.",
    ),
    ("payment", "Invoice paid", "Maintenance fees for May posted successfully."),
    ("guest", "Guest arrived", "Karim Hassan checked in at the main gate at 7:42 PM."),
    ("social", "New community post", "Madinet Masr Management announced the pool party."),
    ("security", "Gate notification", "Delivery from Talabat at gate B — please confirm receipt."),
    ("booking", "Booking confirmed", "Tennis court reserved for Friday at 6 PM."),
    ("maintenance", "Request resolved", "Plumbing issue in Villa 14 marked as resolved."),
    ("social", "Yoga reminder", "Saturday yoga session starts at 7 AM at the central garden."),
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(User).limit(1))
        if existing.scalar_one_or_none() is not None:
            logger.warning("seed.skipped", reason="users_already_exist")
            return

        now = datetime.now(UTC)

        # ── Users ────────────────────────────────────────────
        super_admin = User(
            clerk_id="seed-super-admin",
            email="admin@stitch.app",
            first_name="System",
            last_name="Admin",
            role=UserRole.super_admin,
            language="en",
        )
        admin = User(
            clerk_id="seed-admin",
            email="manager@stitch.app",
            first_name="Compound",
            last_name="Manager",
            role=UserRole.admin,
            language="ar",
        )
        residents = [
            User(
                clerk_id=f"seed-resident-{i}",
                email=f"resident{i}@stitch.app",
                first_name=fn,
                last_name=ln,
                role=UserRole.resident,
                language="ar",
            )
            for i, (fn, ln) in enumerate(
                [
                    ("Sara", "Ahmed"),
                    ("Hossam", "el Sayed"),
                    ("Nadia", "Mansour"),
                    ("Karim", "Hassan"),
                    ("Yasmine", "Farouk"),
                ],
                start=1,
            )
        ]
        all_users = [super_admin, admin, *residents]
        session.add_all(all_users)
        await session.flush()

        # ── Units ────────────────────────────────────────────
        villa_14 = Unit(
            name="Villa 14",
            project="Madinet Masr",
            type="villa",
            beds=4,
            baths=3,
            area_sqm=320,
            floor=0,
            status="occupied",
            value_egp=18_000_000,
        )
        apt_502 = Unit(
            name="Apt 502",
            project="Madinet Masr",
            type="apartment",
            beds=3,
            baths=2,
            area_sqm=180,
            floor=5,
            status="occupied",
            value_egp=8_500_000,
        )
        villa_7 = Unit(
            name="Villa 7",
            project="Madinet Masr",
            type="villa",
            beds=5,
            baths=4,
            area_sqm=420,
            floor=0,
            status="occupied",
            value_egp=25_000_000,
        )
        units = [villa_14, apt_502, villa_7]
        session.add_all(units)
        await session.flush()

        # ── Unit members ─────────────────────────────────────
        session.add_all(
            [
                UnitMember(
                    user_id=residents[0].id, unit_id=apt_502.id, role="owner", is_primary=True
                ),
                UnitMember(
                    user_id=residents[1].id, unit_id=villa_14.id, role="owner", is_primary=True
                ),
                UnitMember(
                    user_id=residents[2].id, unit_id=villa_14.id, role="family", is_primary=False
                ),
                UnitMember(
                    user_id=residents[3].id, unit_id=apt_502.id, role="tenant", is_primary=False
                ),
                UnitMember(
                    user_id=residents[4].id, unit_id=villa_7.id, role="owner", is_primary=True
                ),
            ]
        )

        # ── Posts (10) ───────────────────────────────────────
        for category, caption, slides, age in POSTS_DATA:
            session.add(
                Post(
                    category=category,
                    caption=caption,
                    slides=slides,
                    is_pinned=False,
                    author_id=admin.id,
                    published_at=now - age,
                )
            )

        # ── Reels (5) ────────────────────────────────────────
        for category, title, desc, visual, age in REELS_DATA:
            session.add(
                Reel(
                    category=category,
                    title=title,
                    description=desc,
                    visual_kind=visual,
                    author_id=admin.id,
                    published_at=now - age,
                )
            )

        # ── Stories (6) ──────────────────────────────────────
        for emoji, label, title, sub, visual in STORIES_DATA:
            session.add(
                Story(
                    emoji=emoji,
                    label=label,
                    title=title,
                    subtitle=sub,
                    visual=visual,
                    author_id=admin.id,
                    expires_at=now + timedelta(days=1),
                )
            )

        # ── Notifications (8) — all addressed to Sara ───────
        for type_, title, body in NOTIFICATIONS_DATA:
            session.add(
                Notification(
                    user_id=residents[0].id,
                    type=type_,
                    title=title,
                    body=body,
                )
            )

        await session.commit()
        logger.info(
            "seed.complete",
            users=len(all_users),
            units=len(units),
            posts=len(POSTS_DATA),
            reels=len(REELS_DATA),
            stories=len(STORIES_DATA),
            notifications=len(NOTIFICATIONS_DATA),
        )


if __name__ == "__main__":
    asyncio.run(seed())
