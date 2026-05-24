// First-run seed data — gives the admin dashboard something to render before
// any real API calls land. Replaced by `@stitch/api-client` queries in Week 7.

import type {
  AdminFeedItem,
  ParkingPermit,
  ServiceRequest,
  Technician,
  VisitorQrScan,
} from './types';

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function daysFromNow(d: number): string {
  return new Date(Date.now() + d * 86400_000).toISOString();
}

export const SEED_FEED: AdminFeedItem[] = [
  {
    id: 'seed-post-bazaar',
    kind: 'post',
    category: 'events',
    caption: '🌙 Friday Night Bazaar — 40 vendors, live oud, kids corner.',
    slides: [
      {
        bg: '#7C3AED',
        emoji: '🌙',
        title: 'Friday Night Bazaar',
        sub: '6 PM – 11 PM · Sarai Outlets',
      },
    ],
    pinned: true,
    isEvent: true,
    status: 'live',
    publishedAt: hoursAgo(2),
    authorName: 'Madinet Masr Management',
  },
  {
    id: 'seed-reel-pool',
    kind: 'reel',
    category: 'events',
    title: 'Pool Party Recap',
    description: '400+ residents, DJ Mostafa, unforgettable night.',
    visualKind: 'water',
    status: 'live',
    publishedAt: hoursAgo(8),
    authorName: 'Madinet Masr Management',
  },
];

export const SEED_TECHS: Technician[] = [
  { id: 't-1', name: 'Mahmoud Sayed', specialty: 'ac', load: 3 },
  { id: 't-2', name: 'Sherif Helmy', specialty: 'plumbing', load: 1 },
  { id: 't-3', name: 'Hassan Adel', specialty: 'electrical', load: 2 },
  { id: 't-4', name: 'Omar Fathy', specialty: 'cleaning', load: 0 },
  { id: 't-5', name: 'Karim Nabil', specialty: 'pest', load: 1 },
  { id: 't-6', name: 'Ahmed Magdy', specialty: 'other', load: 4 },
];

export const SEED_REQUESTS: ServiceRequest[] = [
  {
    id: 'sr-001',
    residentName: 'Lina Mostafa',
    unit: 'Sarai · B7-302',
    category: 'ac',
    urgency: 'urgent',
    summary: 'AC dripping water from indoor unit. Living room ceiling stained.',
    status: 'pending',
    assigneeId: null,
    openedAt: hoursAgo(1),
  },
  {
    id: 'sr-002',
    residentName: 'Tarek Ibrahim',
    unit: 'Phase 1 · A2-104',
    category: 'plumbing',
    urgency: 'priority',
    summary: 'Kitchen sink slow drain — getting worse.',
    status: 'in_progress',
    assigneeId: 't-2',
    openedAt: hoursAgo(6),
  },
  {
    id: 'sr-003',
    residentName: 'Rana Halim',
    unit: 'Taj Sultan · T4-15',
    category: 'electrical',
    urgency: 'routine',
    summary: 'Bathroom light flickers when fan turns on.',
    status: 'in_progress',
    assigneeId: 't-3',
    openedAt: hoursAgo(20),
  },
  {
    id: 'sr-004',
    residentName: 'Yousef Abdel-Rahman',
    unit: 'Sahel · V-12',
    category: 'pest',
    urgency: 'priority',
    summary: 'Ants in pantry. Spray needed.',
    status: 'pending',
    assigneeId: null,
    openedAt: hoursAgo(3),
  },
  {
    id: 'sr-005',
    residentName: 'Mariam Saad',
    unit: 'Phase 1 · C5-208',
    category: 'cleaning',
    urgency: 'routine',
    summary: 'Hallway carpet stain — request deep clean.',
    status: 'resolved',
    assigneeId: 't-4',
    openedAt: hoursAgo(48),
  },
  {
    id: 'sr-006',
    residentName: 'Aya Lotfy',
    unit: 'Sarai · B3-101',
    category: 'ac',
    urgency: 'priority',
    summary: 'AC compressor making rattling noise.',
    status: 'pending',
    assigneeId: null,
    openedAt: hoursAgo(0.5),
  },
];

export const SEED_PERMITS: ParkingPermit[] = [
  {
    id: 'pp-001',
    residentName: 'Hossam Anwar',
    unit: 'Phase 1 · A1-205',
    vehicleMake: 'BMW 320i',
    vehiclePlate: 'مصر ع ج ل 4521',
    validFrom: daysFromNow(0),
    validTo: daysFromNow(365),
    status: 'pending',
  },
  {
    id: 'pp-002',
    residentName: 'Salma Adel',
    unit: 'Sarai · B2-110',
    vehicleMake: 'Mercedes C200',
    vehiclePlate: 'مصر س ت ن 8830',
    validFrom: daysFromNow(0),
    validTo: daysFromNow(180),
    status: 'pending',
  },
  {
    id: 'pp-003',
    residentName: 'Omar Hassan',
    unit: 'Taj Sultan · T1-08',
    vehicleMake: 'Hyundai Elantra',
    vehiclePlate: 'مصر ر و ز 2014',
    validFrom: daysFromNow(-30),
    validTo: daysFromNow(335),
    status: 'approved',
  },
  {
    id: 'pp-004',
    residentName: 'Dina Mansour',
    unit: 'Sahel · V-04',
    vehicleMake: 'Jeep Wrangler',
    vehiclePlate: 'مصر ج ح ر 9912',
    validFrom: daysFromNow(0),
    validTo: daysFromNow(90),
    status: 'pending',
  },
];

export const SEED_QR: VisitorQrScan[] = [
  {
    id: 'qr-1',
    code: 'STCH-7F2K',
    hostName: 'Karim El-Sayed',
    unit: 'Phase 1 · A2-104',
    visitorName: 'Mahmoud (Plumber)',
    kind: 'guest',
    scannedAt: hoursAgo(0.2),
  },
  {
    id: 'qr-2',
    code: 'STCH-Q9XP',
    hostName: 'Lina Mostafa',
    unit: 'Sarai · B7-302',
    visitorName: 'Aya (Sister)',
    kind: 'in',
    scannedAt: hoursAgo(1.1),
  },
  {
    id: 'qr-3',
    code: 'STCH-3RT8',
    hostName: 'Tarek Ibrahim',
    unit: 'Phase 1 · A2-104',
    visitorName: 'Crave Delivery',
    kind: 'in',
    scannedAt: hoursAgo(2.5),
  },
  {
    id: 'qr-4',
    code: 'STCH-LM41',
    hostName: 'Salma Adel',
    unit: 'Sarai · B2-110',
    visitorName: 'Visitor (Expired QR)',
    kind: 'denied',
    scannedAt: hoursAgo(3.4),
  },
  {
    id: 'qr-5',
    code: 'STCH-G7VN',
    hostName: 'Rana Halim',
    unit: 'Taj Sultan · T4-15',
    visitorName: 'Mariam (Friend)',
    kind: 'out',
    scannedAt: hoursAgo(5),
  },
];
