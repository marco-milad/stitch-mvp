// Mock QR access log + profile activity timeline.
// TODO: API — replace with GET /api/v1/qr-logs and /api/v1/audit-logs in Week 2.

import type { LucideIcon } from 'lucide-react-native';
import {
  Bookmark,
  CalendarCheck,
  CreditCard,
  KeyRound,
  ShieldCheck,
  UserPlus,
  Wrench,
} from 'lucide-react-native';

export interface QrLogEntry {
  id: string;
  kind: 'in' | 'out' | 'guest' | 'denied';
  gate: string;
  who: string;
  when: string;
  method: 'qr' | 'face' | 'manual';
}

export const QR_LOGS: QrLogEntry[] = [
  { id: 'q1', kind: 'in', gate: 'Main Gate', who: 'You', when: 'Today · 9:14 AM', method: 'qr' },
  {
    id: 'q2',
    kind: 'guest',
    gate: 'Main Gate',
    who: 'Karim Hassan',
    when: 'Today · 7:42 PM',
    method: 'qr',
  },
  {
    id: 'q3',
    kind: 'out',
    gate: 'Side Gate',
    who: 'You',
    when: 'Yesterday · 8 PM',
    method: 'face',
  },
  {
    id: 'q4',
    kind: 'guest',
    gate: 'Main Gate',
    who: 'Delivery · Talabat',
    when: '2 days ago',
    method: 'manual',
  },
  {
    id: 'q5',
    kind: 'denied',
    gate: 'Main Gate',
    who: 'Unknown · 2 attempts',
    when: '3 days ago',
    method: 'qr',
  },
];

export interface ProfileActivity {
  id: string;
  icon: LucideIcon;
  tone: 'cyan' | 'amber' | 'purple' | 'green' | 'red' | 'blue';
  title: string;
  when: string;
}

export const PROFILE_ACTIVITY: ProfileActivity[] = [
  { id: 'a1', icon: CalendarCheck, tone: 'cyan', title: 'Booked tennis court', when: '2h ago' },
  { id: 'a2', icon: CreditCard, tone: 'green', title: 'Paid May maintenance', when: '1 day ago' },
  { id: 'a3', icon: Wrench, tone: 'amber', title: 'Submitted AC repair', when: '2 days ago' },
  { id: 'a4', icon: UserPlus, tone: 'blue', title: 'Logged guest visit', when: '3 days ago' },
  { id: 'a5', icon: Bookmark, tone: 'purple', title: 'Saved Pool Party post', when: '1 week ago' },
];

export const ACTIVITY_TONE: Record<ProfileActivity['tone'], { bg: string; fg: string }> = {
  cyan: { bg: '#CFFAFE', fg: '#0891B2' },
  amber: { bg: '#FEF3C7', fg: '#D97706' },
  purple: { bg: '#EDE9FE', fg: '#7C3AED' },
  green: { bg: '#D1FAE5', fg: '#059669' },
  red: { bg: '#FEE2E2', fg: '#DC2626' },
  blue: { bg: '#DBEAFE', fg: '#2563EB' },
};

export const QR_LOG_ICON: Record<QrLogEntry['kind'], LucideIcon> = {
  in: KeyRound,
  out: KeyRound,
  guest: UserPlus,
  denied: ShieldCheck,
};

export const QR_LOG_TONE: Record<QrLogEntry['kind'], { bg: string; fg: string; label: string }> = {
  in: { bg: '#D1FAE5', fg: '#059669', label: 'You entered' },
  out: { bg: '#DBEAFE', fg: '#2563EB', label: 'You exited' },
  guest: { bg: '#EDE9FE', fg: '#7C3AED', label: 'Guest arrived' },
  denied: { bg: '#FEE2E2', fg: '#DC2626', label: 'Access denied' },
};
