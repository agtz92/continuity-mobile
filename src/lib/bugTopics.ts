// Source of truth for the bug-report topic list (mobile).
//
// IMPORTANT: this MUST mirror the web list at
// `continuity/frontend/src/lib/bugTopics.ts` — same `value`s, same order. The
// backend stores `topic` as plain text (one of these values, or a user's
// free-typed text), so values must match across platforms for consistent
// admin filtering/reading.
//
// Labels are resolved via i18n: key `bugTopics.<value>`.

export const BUG_TOPIC_VALUES = [
  "crash",
  "performance",
  "ui",
  "sync",
  "notifications",
  "account",
  "billing",
  "other",
] as const;

export type BugTopicValue = (typeof BUG_TOPIC_VALUES)[number];
