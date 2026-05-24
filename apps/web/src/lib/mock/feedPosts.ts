// Community feed — admin-published content only. Residents consume + react;
// they don't compose posts (architecture pivot 2026-05-18). What used to be
// resident-authored posts (lost-dog alerts, marketplace ads, recommendations,
// hobbies) now belongs in the comments thread under official posts.
//
// TODO: API — replace with GET /api/v1/posts in Week 6.

export type PostCategory =
  | 'announcements'
  | 'general'
  | 'marketplace'
  | 'lostFound'
  | 'sports'
  | 'events';

export interface PostAuthor {
  name: string;
  initials: string;
  /** Admin-only after the pivot. Kept as enum for future role expansion. */
  role: 'management';
  verified?: boolean;
  /** Avatar gradient seed — used by PostCard to color the initial badge. */
  avatarFrom: string;
  avatarTo: string;
}

export interface PostSlide {
  bg: string;
  emoji: string;
  title: string;
  sub: string;
  /** Optional Unsplash photo. When present, renders full-bleed behind the
   *  emoji + title; `bg` becomes the silent gradient fallback if the image
   *  fails to load. */
  imageUrl?: string;
}

export interface FeedPost {
  id: string;
  kind: 'post';
  cat: PostCategory;
  author: PostAuthor;
  when: string;
  caption: string;
  slides: PostSlide[];
  likes: number;
  comments: number;
  pinned?: boolean;
  isEvent?: boolean;
}

// ─── Authors (admin only) ───────────────────────────────────────────────────

const MGMT: PostAuthor = {
  name: 'Madinet Masr Management',
  initials: 'MM',
  role: 'management',
  verified: true,
  avatarFrom: '#06B6D4',
  avatarTo: '#0891B2',
};

const MGMT_SECURITY: PostAuthor = {
  name: 'Madinet Masr Security',
  initials: 'MS',
  role: 'management',
  verified: true,
  avatarFrom: '#DC2626',
  avatarTo: '#991B1B',
};

const MGMT_CONCIERGE: PostAuthor = {
  name: 'Madinet Masr Concierge',
  initials: 'MC',
  role: 'management',
  verified: true,
  avatarFrom: '#7C3AED',
  avatarTo: '#5B21B6',
};

// Kept for back-compat with any existing imports. Same defaults as MGMT.
export const FEED_SOURCE = {
  name: MGMT.name,
  initials: MGMT.initials,
  verified: MGMT.verified ?? true,
};

// ─── Posts (9 admin-published) ──────────────────────────────────────────────

export const FEED_POSTS: FeedPost[] = [
  // ───────── Management — Events ─────────
  {
    id: 'p-mgmt-bazaar',
    kind: 'post',
    cat: 'events',
    author: MGMT,
    when: '2h ago',
    pinned: true,
    isEvent: true,
    likes: 312,
    comments: 47,
    caption:
      '🌙 Friday Night Bazaar this week! ٤٠ تاجر، street food من كل حتة، live oud من الـ ٧، وركن خاص للأطفال. الدخول من البوابة الرئيسية و الـ layout مرفق في الـ slides. شوفوكم هناك ✨',
    slides: [
      {
        bg: '#7C3AED',
        emoji: '🌙',
        title: 'Friday Night Bazaar',
        sub: 'This Friday · 6 PM – 11 PM · Sarai Outlets',
        imageUrl:
          'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=600&q=80',
      },
      {
        bg: '#9333EA',
        emoji: '🗺',
        title: 'Layout & Map',
        sub: '40 vendors · Food court · Kids corner',
      },
      { bg: '#A21CAF', emoji: '🎶', title: 'Live Oud Set', sub: 'From 7 PM · Central Stage' },
      { bg: '#C026D3', emoji: '🍢', title: 'Street Food', sub: 'Koshary · Hawawshi · Kunafa' },
    ],
  },

  // ───────── Management — Announcements ─────────
  {
    id: 'p-mgmt-pool-maint',
    kind: 'post',
    cat: 'announcements',
    author: MGMT,
    when: '5h ago',
    likes: 28,
    comments: 11,
    caption:
      '⚠️ Scheduled pool maintenance: المسبح الرئيسي مغلق الأربعاء من ٨ ص لـ ١٠ ص للصيانة الدورية. Kids pool ومسبح النادي شغالين زي ما هما. آسفين على أي إزعاج وشكراً لتفهمكم.',
    slides: [
      {
        bg: '#DC2626',
        emoji: '🛠',
        title: 'Pool Maintenance',
        sub: 'Wed · 8 AM – 10 AM',
        imageUrl:
          'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
      },
      { bg: '#EA580C', emoji: '✅', title: 'Kids Pool Open', sub: 'Clubhouse pool also open' },
    ],
  },
  {
    id: 'p-mgmt-parking',
    kind: 'post',
    cat: 'announcements',
    author: MGMT_SECURITY,
    when: 'Yesterday',
    likes: 45,
    comments: 19,
    caption:
      '🚗 Friendly reminder: مواقف الزوار للضيوف بس. لو محتاجين موقف إضافي للعائلة، كلموا الـ Concierge على ١٠٠ من تطبيق Stitch. ولاد عائلتنا أهم من أي مخالفة 🙏',
    slides: [
      {
        bg: '#D97706',
        emoji: '🅿️',
        title: 'Visitor Spots = Guests',
        sub: 'Family plates → call concierge',
      },
    ],
  },
  {
    id: 'p-mgmt-autopay',
    kind: 'post',
    cat: 'announcements',
    author: MGMT,
    when: '3 days ago',
    likes: 87,
    comments: 23,
    caption:
      '💳 Auto-pay is live! ما تنساش فاتورة الصيانة تاني. Settings → Payments → Enable auto-pay. Visa / Mastercard / Meeza كلهم مقبولين.',
    slides: [
      { bg: '#0284C7', emoji: '💳', title: 'Auto-Pay is Here', sub: 'Visa · Mastercard · Meeza' },
    ],
  },

  // ───────── Security — Lost & Found ─────────
  {
    id: 'p-sec-lost-luna',
    kind: 'post',
    cat: 'lostFound',
    author: MGMT_SECURITY,
    when: '45m ago',
    likes: 134,
    comments: 62,
    caption:
      '🐕 Lost & Found Notice — Luna, a 3-year-old Golden Retriever, was last seen near the Yoga Lawn around 12:30 PM. The owner has been notified and patrols have been alerted. لو حد شافها يكلم الأمن فوراً على extension ١٠٠ — red collar with a phone tag. شكراً لتعاونكم 🙏',
    slides: [
      {
        bg: '#F59E0B',
        emoji: '🐕',
        title: 'Have you seen Luna?',
        sub: 'Golden Retriever · 3y · Red collar',
      },
      { bg: '#D97706', emoji: '📍', title: 'Last seen', sub: 'Yoga Lawn · ~12:30 PM' },
    ],
  },
  {
    id: 'p-sec-found-keys',
    kind: 'post',
    cat: 'lostFound',
    author: MGMT_SECURITY,
    when: 'Yesterday',
    likes: 53,
    comments: 14,
    caption:
      '🔑 Found at Gate 2 — keychain with a BMW fob, 3 keys, and a gate remote. Handed in to the night-shift security desk. لو ضيعت مفاتيحك عدّي على البوابة باسمك ووصف المفاتيح للاسترداد.',
    slides: [
      {
        bg: '#22C55E',
        emoji: '🔑',
        title: 'Keys found · Gate 2',
        sub: 'BMW keychain · with security',
      },
    ],
  },

  // ───────── Concierge — General ─────────
  {
    id: 'p-conc-cafe',
    kind: 'post',
    cat: 'general',
    author: MGMT_CONCIERGE,
    when: '8h ago',
    likes: 198,
    comments: 53,
    caption:
      '☕ New at the Clubhouse Café — the new espresso program is live. EGP 55 for a double, beans roasted by our Sahel specialty-coffee partner. Café opens 7 AM daily, kitchen until 11 PM. Croissants tend to sell out by 11 AM — اللي بدري بياخد 🥐',
    slides: [
      {
        bg: '#8B5CF6',
        emoji: '☕',
        title: 'Clubhouse Café',
        sub: 'New espresso menu · EGP 55 double',
        imageUrl:
          'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
      },
      { bg: '#7C3AED', emoji: '🥐', title: 'Heads up', sub: 'Croissants out by 11 AM' },
    ],
  },
  {
    id: 'p-conc-crave',
    kind: 'post',
    cat: 'general',
    author: MGMT_CONCIERGE,
    when: '3 days ago',
    likes: 84,
    comments: 39,
    caption:
      '🍝 Now delivering inside the compound — Crave (Outlets Plaza) joins our in-compound delivery roster. Standard 25-min ETA, premium packaging, residents pay through Stitch. اطلبوا من Services tab → Delivery. الـ pasta arrabbiata recommended by the team 🤌',
    slides: [
      {
        bg: '#EAB308',
        emoji: '🍝',
        title: 'Crave · Outlets Plaza',
        sub: 'Now in-compound delivery',
      },
      {
        bg: '#CA8A04',
        emoji: '🤌',
        title: 'Order via Stitch',
        sub: 'Services → Delivery · 25-min ETA',
      },
    ],
  },
  {
    id: 'p-mgmt-concierge',
    kind: 'post',
    cat: 'general',
    author: MGMT_CONCIERGE,
    when: '4 days ago',
    likes: 73,
    comments: 31,
    caption:
      '🌟 من الكونسيرج: تذكير صغير أن خدمة Farah (الـ AI) متاحة ٢٤/٧ لأي طلب. "احجزلي سبا"، "اطلبلي صيدلية"، "ابعتلي عامل نظافة بكره ٩ ص" — كل دا بصوتك. جربوها وقولولنا رأيكم.',
    slides: [
      { bg: '#7C3AED', emoji: '🤖', title: 'Farah · 24/7', sub: 'Voice requests · Bilingual' },
    ],
  },
];

// ─── Category metadata (i18n keys) ──────────────────────────────────────────

export const POST_CATEGORIES: Array<{
  id: PostCategory | 'all' | 'saved';
  labelKey: string;
}> = [
  { id: 'all', labelKey: 'community.filters.all' },
  { id: 'announcements', labelKey: 'community.filters.announcements' },
  { id: 'general', labelKey: 'community.filters.general' },
  { id: 'marketplace', labelKey: 'community.filters.marketplace' },
  { id: 'lostFound', labelKey: 'community.filters.lostFound' },
  { id: 'sports', labelKey: 'community.filters.sports' },
  { id: 'events', labelKey: 'community.filters.events' },
  { id: 'saved', labelKey: 'community.filters.saved' },
];
