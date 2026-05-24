// Seed comments across the 9 admin posts + 5 reels. Authors are drawn
// from the existing Neighbors mock so names, initials, and avatar colors
// stay consistent with the directory.

import { initialsOf, pickAvatarColor } from '@/lib/schemas/family';
import type { Comment } from '@/lib/schemas/comment';

// Tiny helper — keeps comment seeds readable.
function c(
  id: string,
  postId: string,
  authorName: string,
  text: string,
  hoursAgo: number,
  likes = 0,
): Comment {
  const authorId = `n-${authorName.toLowerCase().replace(/\s+/g, '-')}`;
  return {
    id,
    postId,
    authorId,
    authorName,
    authorInitials: initialsOf(authorName),
    authorColor: pickAvatarColor(authorId),
    text,
    createdAt: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    likes,
    isLiked: false,
  };
}

export const MOCK_COMMENTS: ReadonlyArray<Comment> = [
  // ─── Friday Night Bazaar ────────────────────────────────────────────────
  c(
    'c-bazaar-1',
    'p-mgmt-bazaar',
    'Ahmed Tarek',
    'My kids loved the last one! Reserving a slot now ✨',
    2,
    12,
  ),
  c(
    'c-bazaar-2',
    'p-mgmt-bazaar',
    'Mariam Saad',
    'What time does setup start? Bringing the pottery wheel 🏺',
    3,
    4,
  ),
  c(
    'c-bazaar-3',
    'p-mgmt-bazaar',
    'Karim El-Sayed',
    'Will there be vegan options? Last time it was mostly meat-heavy',
    5,
    7,
  ),
  c(
    'c-bazaar-4',
    'p-mgmt-bazaar',
    'Tarek Ibrahim',
    'الـ live oud كان روعة آخر مرة، شكراً للـ Management 🎶',
    8,
    18,
  ),

  // ─── Pool Maintenance ──────────────────────────────────────────────────
  c(
    'c-pool-1',
    'p-mgmt-pool-maint',
    'Lina Mostafa',
    'Thanks for the heads-up — pushing my swim to Thursday',
    1,
    3,
  ),
  c('c-pool-2', 'p-mgmt-pool-maint', 'Rana Halim', 'Kids pool too? Or just the main one?', 2, 1),
  c(
    'c-pool-3',
    'p-mgmt-pool-maint',
    'Yousef Abdel-Rahman',
    'ETA on the heated lap pool? Friend is asking 🏊',
    4,
    6,
  ),

  // ─── Parking ───────────────────────────────────────────────────────────
  c(
    'c-park-1',
    'p-mgmt-parking',
    'Hossam Anwar',
    'تمام، شكراً للتنويه. كان في تخبط زمان مع موقف الزوار',
    6,
    9,
  ),
  c('c-park-2', 'p-mgmt-parking', 'Salma Adel', 'Concierge على ١٠٠؟ من تطبيق Stitch بس صح؟', 10, 2),

  // ─── Auto-pay ──────────────────────────────────────────────────────────
  c(
    'c-autopay-1',
    'p-mgmt-autopay',
    'Omar Hassan',
    'Finally! بقالنا سنين بنطلب الحاجة دي 🙌',
    24,
    22,
  ),
  c(
    'c-autopay-2',
    'p-mgmt-autopay',
    'Dina Mansour',
    'Meeza working for utility bills too or just maintenance?',
    30,
    5,
  ),
  c(
    'c-autopay-3',
    'p-mgmt-autopay',
    'Sherif Hegazi',
    'Setup took 2 minutes — recommended.',
    48,
    11,
  ),

  // ─── Lost Luna ─────────────────────────────────────────────────────────
  c(
    'c-luna-1',
    'p-sec-lost-luna',
    'Aya Lotfy',
    'I think I saw a golden near the playground 20 min ago! Will check again 🤞',
    0.5,
    18,
  ),
  c(
    'c-luna-2',
    'p-sec-lost-luna',
    'Mariam Saad',
    'Spreading the word in our WhatsApp group. ربنا يرجعها بالسلامة',
    0.7,
    24,
  ),
  c(
    'c-luna-3',
    'p-sec-lost-luna',
    'Karim El-Sayed',
    'Just walked the Yoga Lawn loop — no sign. Will check the park next.',
    0.4,
    8,
  ),
  c(
    'c-luna-4',
    'p-sec-lost-luna',
    'Lina Mostafa',
    'My retriever escaped once via Gate 3 — worth checking the staff exit too',
    0.3,
    5,
  ),

  // ─── Found Keys ────────────────────────────────────────────────────────
  c(
    'c-keys-1',
    'p-sec-found-keys',
    'Yousef Abdel-Rahman',
    'These might be mine actually — heading over to Gate 2 now 🙏',
    12,
    14,
  ),
  c(
    'c-keys-2',
    'p-sec-found-keys',
    'Hossam Anwar',
    "BMW keychain — sounds like Tarek's. Sending him a heads-up.",
    15,
    6,
  ),

  // ─── Clubhouse Café ────────────────────────────────────────────────────
  c(
    'c-cafe-1',
    'p-conc-cafe',
    'Rana Halim',
    'Tried it this morning — properly good. Beans are noticeably better.',
    4,
    32,
  ),
  c(
    'c-cafe-2',
    'p-conc-cafe',
    'Mariam Saad',
    'Pediatrician question — anyone in Phase 1 has a recommendation for a same-day visit? Sorry to thread-jack 🙏',
    6,
    8,
  ),
  c(
    'c-cafe-3',
    'p-conc-cafe',
    'Salma Adel',
    'Croissants out by 11 is criminal 😭 — make more please!',
    7,
    41,
  ),
  c('c-cafe-4', 'p-conc-cafe', 'Tarek Ibrahim', 'لو بقى في batch 4 PM هيبقى cinema 🎬', 8, 15),

  // ─── Crave delivery ────────────────────────────────────────────────────
  c(
    'c-crave-1',
    'p-conc-crave',
    'Dina Mansour',
    'Tried the arrabbiata last night — confirmed خرافة. Packaging premium too.',
    30,
    19,
  ),
  c(
    'c-crave-2',
    'p-conc-crave',
    'Aya Lotfy',
    'Anyone formed a weekend cycling group btw? Looking for 4–6 riders, intermediate level 🚴',
    48,
    12,
  ),
  c(
    'c-crave-3',
    'p-conc-crave',
    'Sherif Hegazi',
    "+1 to cycling group. Also looking for tennis partners if anyone's playing Sat mornings 🎾",
    50,
    7,
  ),

  // ─── Farah from Concierge ──────────────────────────────────────────────
  c(
    'c-farah-1',
    'p-mgmt-concierge',
    'Karim El-Sayed',
    'بصراحة Farah بتفهم اللهجة المصرية بشكل مدهش 🤖',
    60,
    28,
  ),
  c(
    'c-farah-2',
    'p-mgmt-concierge',
    'Lina Mostafa',
    'Tried "احجزلي صيدلية" yesterday — done in 30 seconds. ❤️',
    70,
    22,
  ),
  c(
    'c-farah-3',
    'p-mgmt-concierge',
    'Hossam Anwar',
    'Wishlist: handyman recommendations via voice. Need someone trustworthy for a kitchen hood fix 🔧',
    90,
    9,
  ),
];

/** Group seed comments by postId — used to hydrate the store on first load. */
export function commentsByPost(): Record<string, Comment[]> {
  const out: Record<string, Comment[]> = {};
  for (const c of MOCK_COMMENTS) {
    if (!out[c.postId]) out[c.postId] = [];
    out[c.postId]!.push(c);
  }
  return out;
}
