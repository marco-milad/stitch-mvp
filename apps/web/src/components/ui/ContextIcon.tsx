// Emoji → premium Lucide icon mapper. Mock data (feedPosts, feedReels,
// feedStories, comments, smartHome, discoverStories, voicePrompts) ships
// with an `emoji` field used as the visual identifier. This component
// translates that emoji string into a contextual Lucide icon so the UI
// reads as a real luxury app, not a chat thread.
//
// Coverage: every emoji currently in the mock catalog as of the
// pitch-demo audit. Unknown values fall back to `Sparkles` — visible
// enough during dev to be noticed, classy enough in production.
//
// If the team migrates the data schema to carry icon names directly,
// this component becomes the canonical lookup table.

import {
  AlertTriangle,
  type LucideIcon,
  BedDouble,
  Bot,
  Building2,
  Car,
  CheckCircle2,
  Coffee,
  CreditCard,
  Croissant,
  Dog,
  Dumbbell,
  Film,
  Flower2,
  Home,
  KeyRound,
  Leaf,
  Lightbulb,
  Map,
  MapPin,
  Megaphone,
  Moon,
  Music,
  ParkingCircle,
  Plane,
  Soup,
  Sparkles,
  Star,
  Sun,
  Sunset,
  Users,
  Utensils,
  Waves,
  Wrench,
} from 'lucide-react';

// Strip variation selectors / ZWJ from incoming string so '☀️' === '☀'.
function normalize(emoji: string): string {
  return emoji
    .replace(/️/g, '') // VS-16 emoji-presentation selector
    .replace(/‍/g, '') // ZWJ
    .trim();
}

const MAP: Record<string, LucideIcon> = {
  '📢': Megaphone,
  '🌙': Moon,
  '🗺': Map,
  '🎶': Music,
  '🍢': Soup,
  '⚠': AlertTriangle,
  '🛠': Wrench,
  '✅': CheckCircle2,
  '🚗': Car,
  '🅿': ParkingCircle,
  '💳': CreditCard,
  '🐕': Dog,
  '📍': MapPin,
  '☀': Sun,
  '🌇': Sunset,
  '☕': Coffee,
  '✈': Plane,
  '⭐': Star,
  '🌱': Leaf,
  '🍝': Utensils,
  '🎬': Film,
  '🏊': Waves,
  '🏠': Home,
  '👨‍👩‍👧': Users,
  '👨👩👧': Users, // post-ZWJ-strip
  '💡': Lightbulb,
  '💪': Dumbbell,
  '😴': BedDouble,
  '🤌': Sparkles,
  '🤖': Bot,
  '🥐': Croissant,
  '🧘': Flower2,
  '🧹': Sparkles,
  '🔑': KeyRound,
  '🏢': Building2,
};

interface ContextIconProps {
  emoji: string;
  size?: number;
  className?: string;
  /** Override the colour. Defaults to inherit. */
  color?: string;
  'aria-hidden'?: boolean;
}

export function resolveIcon(emoji: string): LucideIcon {
  return MAP[normalize(emoji)] ?? Sparkles;
}

export function ContextIcon({
  emoji,
  size = 18,
  className,
  color,
  'aria-hidden': ariaHidden = true,
}: ContextIconProps) {
  const Icon = resolveIcon(emoji);
  return <Icon size={size} className={className} color={color} aria-hidden={ariaHidden} />;
}
