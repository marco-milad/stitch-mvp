// Mock community posts. Mirrors public/index.html FEED_POSTS.
// TODO: API — replace with GET /api/v1/posts in Week 2.

export type PostCategory = 'events' | 'news' | 'announcements' | 'community';

export interface PostSlide {
  bg: string;
  emoji: string;
  title: string;
  sub: string;
}

export interface FeedPost {
  id: string;
  kind: 'post';
  cat: PostCategory;
  when: string;
  caption: string;
  slides: PostSlide[];
  pinned?: boolean;
  isEvent?: boolean;
}

export const FEED_SOURCE = { name: 'Madinet Masr Management', initials: 'MM', verified: true };

export const FEED_POSTS: FeedPost[] = [
  {
    id: 'p1',
    kind: 'post',
    cat: 'events',
    when: '2h ago',
    pinned: true,
    isEvent: true,
    caption:
      '🌊 Summer Splash Pool Party — هذا الجمعة من الساعة ٨ مساءً عند المسبح الرئيسي. DJ، مأكولات، وألعاب للأطفال. RSVP من تطبيق Stitch.',
    slides: [
      {
        bg: '#1D4ED8',
        emoji: '🏊',
        title: 'Summer Splash Party',
        sub: 'Friday · 8 PM · Main Pool',
      },
      { bg: '#0891B2', emoji: '🎵', title: 'Live DJ Set', sub: 'Curated by DJ Karim' },
      { bg: '#A855F7', emoji: '🍹', title: 'Drinks & Bites', sub: 'On the house for residents' },
    ],
  },
  {
    id: 'p2',
    kind: 'post',
    cat: 'announcements',
    when: '5h ago',
    caption:
      '⚠️ صيانة دورية للمسبح الرئيسي يوم الأربعاء من ٨ صباحاً حتى ١٠ صباحاً. المسبح الصغير متاح طول اليوم. شكراً لتفهمكم.',
    slides: [
      { bg: '#DC2626', emoji: '🛠', title: 'Pool Maintenance', sub: 'Wed · 8 AM – 10 AM' },
      { bg: '#EA580C', emoji: '✅', title: 'Kids Pool Open', sub: 'No interruption' },
    ],
  },
  {
    id: 'p3',
    kind: 'post',
    cat: 'news',
    when: '1d ago',
    caption:
      '🏋️ افتتاح المعدات الجديدة في الجيم! ٢٠ ماكينة كارديو + قسم crossfit جديد. مفتوح من ٦ صباحاً لـ ١١ مساءً.',
    slides: [
      { bg: '#5B21B6', emoji: '💪', title: 'Gym Just Got Bigger', sub: 'New equipment now live' },
      { bg: '#7C3AED', emoji: '🏋️', title: 'CrossFit Zone', sub: 'Olympic plates · 6 racks' },
      {
        bg: '#4F46E5',
        emoji: '🏃',
        title: '20 Cardio Machines',
        sub: 'Treadmills · Bikes · Rowers',
      },
      { bg: '#2563EB', emoji: '⏰', title: 'Open Daily', sub: '6 AM – 11 PM' },
    ],
  },
  {
    id: 'p4',
    kind: 'post',
    cat: 'community',
    when: '1d ago',
    caption:
      '👋 رحبوا بالعائلات الجديدة في الكمبوند هذا الشهر! ٦ عائلات انضمت لمجتمعنا. كل حفلة ترحيب يوم السبت في الـ Clubhouse.',
    slides: [
      {
        bg: '#059669',
        emoji: '🤝',
        title: 'Welcome New Neighbors',
        sub: '6 families joined this month',
      },
      { bg: '#10B981', emoji: '🎉', title: 'Welcome Party', sub: 'Saturday · Clubhouse' },
    ],
  },
  {
    id: 'p5',
    kind: 'post',
    cat: 'events',
    when: '2d ago',
    isEvent: true,
    caption:
      '🧘 جلسات يوغا أسبوعية كل سبت الساعة ٧ صباحاً عند الحديقة المركزية. مع المدربة المعتمدة Yasmine. مجاناً للسكان.',
    slides: [
      { bg: '#DB2777', emoji: '🧘', title: 'Saturday Yoga', sub: '7 AM · Central Garden' },
      { bg: '#EC4899', emoji: '🌸', title: 'Free for Residents', sub: 'Just bring a mat' },
    ],
  },
  {
    id: 'p6',
    kind: 'post',
    cat: 'announcements',
    when: '3d ago',
    caption:
      '🚗 تذكير: مواقف الزوار للضيوف فقط. الرجاء استخدام موقفك المخصص لتجنب أي مخالفات. شكراً لتعاونكم.',
    slides: [
      { bg: '#D97706', emoji: '🅿️', title: 'Parking Reminder', sub: 'Visitor spots = guests only' },
    ],
  },
  {
    id: 'p7',
    kind: 'post',
    cat: 'news',
    when: '4d ago',
    caption:
      '🌳 مشروع الحديقة المجتمعية بدأ! كل ساكن يقدر يحجز حوض زراعة خاص. التسجيل من خلال Farah — قول "حديقة مجتمعية".',
    slides: [
      { bg: '#65A30D', emoji: '🌱', title: 'Community Garden', sub: 'Reserve your plot' },
      { bg: '#84CC16', emoji: '🥬', title: 'Grow Your Own', sub: 'Vegetables · Herbs · Flowers' },
    ],
  },
  {
    id: 'p8',
    kind: 'post',
    cat: 'events',
    when: '5d ago',
    isEvent: true,
    caption:
      '🎬 سينما تحت النجوم! عرض فيلم "The Hundred-Foot Journey" يوم الخميس ٩ مساءً عند ساحة الـ Amphitheater. بطاطين ومشروبات مجانية.',
    slides: [
      { bg: '#312E81', emoji: '🎬', title: 'Cinema Under the Stars', sub: 'Thursday · 9 PM' },
      { bg: '#4338CA', emoji: '⭐', title: 'Outdoor Amphitheater', sub: 'Free blankets & drinks' },
    ],
  },
  {
    id: 'p9',
    kind: 'post',
    cat: 'community',
    when: '6d ago',
    caption:
      '⭐ Resident Spotlight: Hossam el Sayed، صاحب فيلا ١٤، فاز بجائزة "أفضل جار" هذا الشهر. شكراً يا حسام على لمستك الجميلة في كل event!',
    slides: [
      {
        bg: '#F59E0B',
        emoji: '⭐',
        title: 'Resident of the Month',
        sub: 'Hossam el Sayed · Villa 14',
      },
    ],
  },
  {
    id: 'p10',
    kind: 'post',
    cat: 'announcements',
    when: '1w ago',
    caption:
      '📱 تحديث: ميزة الدفع التلقائي للفواتير متاحة الآن. فعّلها من Settings → Payments. ما تنساش أي فاتورة تاني!',
    slides: [{ bg: '#0284C7', emoji: '💳', title: 'Auto-Pay is Here', sub: 'Never miss a bill' }],
  },
];

export const POST_CATEGORIES: Array<{ id: PostCategory | 'all' | 'saved'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'events', label: 'Events' },
  { id: 'news', label: 'News' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'community', label: 'Community' },
  { id: 'saved', label: 'Saved' },
];
