# Stitch Web Roadmap

Tracks delivery of the original 10-week "Three Worlds" plan (from [`community-app-main/docs/COMMUNITY_APP_STRATEGY.md`](../../../community-app-main/community-app-main/docs/COMMUNITY_APP_STRATEGY.md)) against the new `apps/web` (Vite + React + Tailwind + Clerk + React Router + Zustand + TanStack Query) architecture.

Order below reflects the agreed execution sequence: finish foundation → backfill DISCOVER → complete the in-progress tabs → expand → AI brain → polish → demo.

Legend: `[x]` done · `[~]` partial · `[ ]` not started

---

## Phase 0 — Foundation (Week 1)

App shell, design system, i18n, routing.

- [x] Vite + React + TS + Tailwind scaffold (`vite.config.ts`, `tailwind.config.js`, `postcss.config.js`)
- [x] Mobile-frame chrome → [`src/components/MobileShell.tsx`](src/components/MobileShell.tsx)
- [x] Top bar → [`src/components/TopBar.tsx`](src/components/TopBar.tsx)
- [x] Tabbed layout (Home / Community / Services / Discover / Profile + FAB) → [`src/layout/TabsLayout.tsx`](src/layout/TabsLayout.tsx)
- [x] Routing + Clerk + React Query providers → [`src/App.tsx`](src/App.tsx)
- [x] Theme tokens → [`src/lib/theme.ts`](src/lib/theme.ts)
- [x] i18n bootstrap + EN/AR locales → [`src/lib/i18n.ts`](src/lib/i18n.ts), [`src/locales/en.json`](src/locales/en.json), [`src/locales/ar.json`](src/locales/ar.json)
- [x] **Verify on phone:** shell renders correctly at mobile widths, tab bar switches routes, RTL flips when locale = `ar` (verified 2026-05-18)
- [ ] API client wrapper → [`src/lib/api.ts`](src/lib/api.ts) currently stub; wire base URL + auth header pull from Clerk _(deferred — picks up when first real API call is needed in Phase 1)_
- [ ] `.env.example` reviewed: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` _(deferred — same trigger as above)_

---

## Phase 1 — DISCOVER (Weeks 2–3, backfill)

Prospect-facing real-estate flows. Currently only a placeholder shell in [`src/screens/Discover.tsx`](src/screens/Discover.tsx).

### Week 2 — DISCOVER skeleton

- [x] Discover screen role-split (`ProspectView` / `ResidentView`) driven by mocks + i18n (2026-05-18)
- [x] Landing/hero block with compound branding (Madinet Masr) + CTA (2026-05-18)
- [x] Mock data file → [`src/lib/mock/discover.ts`](src/lib/mock/discover.ts) (compound, tour stops, zones, events, other projects)
- [x] Zustand store → [`src/stores/discoverStore.ts`](src/stores/discoverStore.ts) (selected zone, tour position)
- [x] Virtual tour shell — fullscreen modal at `/discover/tour` with gradient stage, 10 hotspots, prev/next nav, ESC handling, full EN/AR (2026-05-18)
- [x] Master-plan interactivity — fullscreen modal at `/discover/master-plan` with kind filter (All/Residential/Amenity/Commercial/Future), 5 color-coded zones, legend, zone detail panel + Explore CTA (2026-05-18)

### Week 3 — DISCOVER complete

- [x] Smart EOI form — fullscreen modal at `/discover/eoi` with RHF + Zod + i18n-key error messages, Clerk prefill, localStorage draft autosave, chip pickers, custom consent checkbox, success state (2026-05-18)
- [x] Price calculator — fullscreen modal at `/discover/calculator` with unit-type chips, area slider, down-payment/years chips, live sticky 4-KPI summary, collapsible year-by-year breakdown table, EGP currency in EN/AR, register-interest CTA pre-fills EOI store (2026-05-18)
- [x] Book-a-visit flow — fullscreen modal at `/discover/book` with visit-type cards, custom locale-aware month calendar (Friday rule per visit type, ±60-day bounds), time-slot picker, 3-advisor scroller + "Any", RHF + Zod + Clerk prefill + draft autosave, EOI success cross-link (2026-05-18)
- [x] Lifestyle stories carousel — extracted generic `StoryRail` + `StoryViewer`; 6 lifestyle seeds at `/discover/story/:id`; separate `viewedStoryIds` in `discoverStore`; full-bleed Unsplash photos in viewer with frosted emoji badge (2026-05-18)
- [ ] Wire all four to `apps/api` endpoints _(deferred — user paused API work 2026-05-18 to keep building UI ahead of backend)_

---

## Phase 2 — LIVE base + CONNECT base (Weeks 4 & 6, in-progress)

### Week 4 — Services / LIVE upgrades + Resident dashboard wiring

Already scaffolded: [`src/screens/Services.tsx`](src/screens/Services.tsx), [`src/components/services/ServiceTile.tsx`](src/components/services/ServiceTile.tsx), [`src/components/services/SearchBar.tsx`](src/components/services/SearchBar.tsx), [`src/stores/servicesStore.ts`](src/stores/servicesStore.ts), [`src/lib/mock/services.ts`](src/lib/mock/services.ts).

- [x] Property data model + multi-unit switcher — Zod schema, `MOCK_PROPERTIES`, `propertyStore` with localStorage selection, bottom-sheet `UnitSwitcher`, Home pill wired, gate CTA conditionally swapped for Construction tracker on under-construction units (2026-05-18) _(net-new scope: not in the friend's original 10-week plan; added at user's request)_
- [x] Services grid + search + favorites toggle
- [x] Service detail route `/services/:tileId` — `ServiceCategory` (providers list w/ Top-rated/Fastest/Cheapest sort) for bookable tiles, info-only variant for the rest (2026-05-18)
- [x] Category screens for Cleaning / Delivery / Laundry + Home / Pet / Gardening / Security — `ServiceProvider` profile + `ServiceBook` mini-form with read-only summary widget; `ServiceRequests` history; Home gets Suggested-services row + live open-requests count + active-request card; service-requests store persisted to localStorage (2026-05-18)
- [x] Compound wayfinding map — `/services/comp-map` with stylized brochure SVG backdrop, 15 hotspots across 3 categories (Amenities/Gates/Commercial), category filter chips, slide-up `HotspotDrawer` with action-buttons row (Directions/Call/Book/Learn more) (2026-05-18) _(scope shift: original "Map view" intent was provider-locator — kept as a separate open item below)_
- [ ] Provider locator map (Mapbox or Leaflet) — original "nearby providers" intent; not yet delivered
- [ ] Replace `mock/services.ts` with API call via `lib/api.ts` _(deferred — user paused API work 2026-05-18)_

### Week 6 — Community / CONNECT base

Already scaffolded: [`src/screens/Community.tsx`](src/screens/Community.tsx), `PostCard`, `ReelCard`, `StoryBar`, `CategoryFilter`, `feedStore`, mocks under `lib/mock/feed*`.

- [x] Feed shell with category filter, stories bar, post + reel cards
- [x] **Admin-only feed pivot (2026-05-18)** — residents consume + comment, they don't compose posts. `FEED_POSTS` narrowed to 9 admin posts (Mgmt × 4, Security × 2, Concierge × 3); `PostAuthor.role` typed as `'management'`. Resident-style content reframed as comments under official posts.
- [x] Post / Reel detail + comments thread (`/community/posts/:id`) — full slide carousel, like/bookmark/RSVP, scrollable thread, sticky `Write a comment…` bottom bar, optimistic likes, localStorage-persisted comments (`stitch.comments`), Egyptian-dialect seed comments from Neighbors directory authors, EN + AR i18n incl. relative-time + plurals
- [x] Neighbors directory — `/community/neighbors` with 14 mock residents across 4 Madinet Masr zones (Phase 1, Sarai, Taj Sultan, Sahel), privacy-first card model (3 flags: `showUnit` blurs unit number, `allowDirectMessages` hides Message button, `isProfilePublic` redacts whole card to "Private resident"), search across name/unit/interest, role + interest chip filters, "Immediate" badge for same-zone residents who sort to the top, gradient entry card on Community feed, `Property.zone` field added + populated, EN + AR (2026-05-18)
- [ ] Interest groups (`/community/groups`) — list, join/leave, group feed
- [ ] Replace `mock/feedPosts.ts`, `feedReels.ts`, `feedStories.ts` with API calls

---

## Phase 3 — LIVE expansion + CONNECT advanced (Weeks 5 & 7)

### Week 5 — LIVE expansion

- [x] Smart home hub (`/services/smart-home`) — discriminated-union device model (AC/light/lock/blinds/water-heater), 11 devices for Villa 12 + 5 for Apt B-4-302 grouped by 6 rooms, 4 scenes (Welcome/Movie/Sleep/Away) with sparse-patch application, live electricity (kW) + water (L/min) meter cards with 7-bar SVG sparkline and trend chips, 3-second random-walk pulse, all state persisted to localStorage (2026-05-18)
- [x] Family accounts (`/profile/family`) — 4-role model (Co-owner / Resident / Child / Guest) with per-role default permission matrix, 6 permission flags (book services / control smart home / issue passes / make payments / view financials / manage members), inline-expandable member cards with live toggles, RHF + Zod invite modal that auto-fills permissions from role and shows a copyable mock activation link, pending vs active sections, Resend / Cancel actions, scoped per current property, localStorage-persisted, entry point repurposed from Profile's "Unit Members" row (2026-05-18)
- [x] Wellness hub (`/services/wellness`) — 3-facility hub (Gym / Spa / Classes), 13 sessions, reused `Calendar` + `ConsentRow` + `serviceRequestsStore`; entry from Services grid (`daily-wellness` tile with `to: '/services/wellness'`), Home Suggested row, and compound-map (renamed `bookTileId` → `bookHref` so Gym & Spa / Yoga Lawn / Clubhouse / Pool dots all deep-link here) (2026-05-18)
- [x] Parking (`/services/parking`) — slots scoped per current property (Villa 12, Apt B-4-302, Chalet 18 each with their own), visitor pass list (seed 2 passes), `+ New Pass` modal with RHF + Zod + custom Calendar for valid-until, active-pass `Show QR` deep-link to `/qr`, `Revoke` flow, localStorage persistence, full EN/AR with Eastern Arabic numerals (2026-05-18)

### Week 7 — CONNECT advanced

- [ ] Marketplace (`/community/marketplace`) — list + new listing + DM to seller
- [ ] Skill exchange (`/community/skills`) — offer/request board
- [ ] Polls (`/community/polls`) — create + vote + results
- [ ] Anonymous suggestions (`/community/suggestions`) — submit + management response thread

---

## Phase 4 — AI Brain / Farah (Week 8)

Voice screen exists at [`src/screens/Voice.tsx`](src/screens/Voice.tsx) but is empty UI. Backend lives in the prototype's `server.py` (Quart + Gemini Live WebSocket) and needs to be ported to `apps/api`.

- [ ] Connect web `Voice.tsx` to FastAPI WebSocket bridge for Gemini Live _(deferred — API track on pause)_
- [x] Push-to-talk UI + waveform visualizer + transcript — 4-state machine (idle/listening/processing/responding), tap-to-toggle mic with red pulse rings, 16-bar fake-audio visualizer that jitters every 90 ms in listening + 3-dot pulse in processing, typewriter-revealed Farah bubbles, ephemeral conversation cleared on screen exit (2026-05-18) _(mock STT — real Gemini bridge swaps in by replacing store actions)_
- [x] Text fallback chat — toggle below mic swaps input mode; same state machine + reply pipeline (2026-05-18)
- [ ] Vision: image upload → describe / answer
- [ ] Recommendations engine: surface Farah cards on Home tab based on recent activity
- [x] 8 context prompts (cleaning, weekend events, gate, fee, lights, spa, parking pass, pool) with scripted utterances + responses + optional in-app deep-links that fire ~400 ms after the reply finishes typing; keyword-matched free-form fallback for voice/text input (2026-05-18)

---

## Phase 5 — Polish (Week 9)

- [ ] Page transitions + micro-interactions (Framer Motion)
- [ ] Skeleton loaders for all data-fetching screens
- [ ] Persona-based onboarding flow ([`src/screens/Onboarding.tsx`](src/screens/Onboarding.tsx)) — branching by Prospect / Resident / Connector
- [ ] Empty states + error states for every screen
- [ ] Dark-mode pass (tokens already exist in [`theme.ts`](src/lib/theme.ts))
- [ ] Full RTL audit (layouts, icons, animation directions)
- [ ] Lighthouse / a11y pass on each tab

---

## Phase 6 — Demo readiness (Week 10)

- [ ] Demo script for 3 personas (Prospect, Resident, Connector) — 12–15 min walkthrough
- [ ] Seed script for Supabase with 50+ feature surfaces populated
- [ ] Presentation deck (separate doc — not in repo)
- [ ] Client walkthrough rehearsal
- [ ] Deploy to Vercel staging URL with password protection

---

## Cross-cutting workstreams (run in parallel)

- **Auth integration:** Clerk provider is wired in `App.tsx`; still need protected routes, role claims, and Clerk → API JWT forwarding
- **API client:** flesh out [`src/lib/api.ts`](src/lib/api.ts) per endpoint; add typed React Query hooks under `src/lib/hooks/`
- **Shared types:** consume `@stitch/types` package once backend models are defined
- **Design system:** extract repeated patterns (`Hero`, `Row`, `SectionTitle` from `Discover.tsx`) into `src/components/ui/`
- **Realtime:** Pusher integration for community feed + notifications (Week 6+)
