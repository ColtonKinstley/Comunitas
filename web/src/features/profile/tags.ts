/**
 * Conditions, goals and interests are full-array replaces on the API, so the
 * editor works on a local `Tag[]` draft. Notes are remembered while editing:
 * un-ticking "Type 2 diabetes" and ticking it again shouldn't quietly bin the
 * sentence the patient dictated during induction.
 */
import type { Tag } from "../../lib/types";

export const slugsOf = (tags: Tag[]): string[] => tags.map((tag) => tag.slug);

export function noteMap(tags: Tag[]): Map<string, string | null> {
  return new Map(tags.map((tag) => [tag.slug, tag.note ?? null]));
}

/** Adds or removes `slug`, restoring any note we've seen for it before. */
export function toggleTag(
  tags: Tag[],
  slug: string,
  notes: Map<string, string | null>,
): Tag[] {
  return tags.some((tag) => tag.slug === slug)
    ? tags.filter((tag) => tag.slug !== slug)
    : [...tags, { slug, note: notes.get(slug) ?? null }];
}
