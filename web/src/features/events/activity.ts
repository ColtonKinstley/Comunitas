/**
 * Activity types are free-form slugs from the API (`walking`, `swimming`,
 * `gardening`, …). Each gets a familiar icon so the list scans without reading.
 */
import {
  Bike,
  Coffee,
  Dumbbell,
  Flower2,
  Footprints,
  HandHeart,
  HeartPulse,
  Music,
  PersonStanding,
  Sprout,
  Trees,
  Users,
  WavesLadder,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  walking: Footprints,
  walk: Footprints,
  rambling: Trees,
  hiking: Trees,
  swimming: WavesLadder,
  swim: WavesLadder,
  cycling: Bike,
  cycle: Bike,
  gardening: Sprout,
  allotment: Flower2,
  dancing: Music,
  dance: Music,
  yoga: PersonStanding,
  tai_chi: PersonStanding,
  stretching: PersonStanding,
  strength: Dumbbell,
  gym: Dumbbell,
  exercise: HeartPulse,
  social: Coffee,
  cafe: Coffee,
  crafts: HandHeart,
  volunteering: HandHeart,
};

/** Icon for an activity slug; falls back to a group icon for anything unknown. */
export function activityIcon(activityType: string): LucideIcon {
  return ICONS[activityType] ?? Users;
}

/** `tai_chi` → `Tai chi`. */
export function activityLabel(activityType: string): string {
  const spaced = activityType.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
