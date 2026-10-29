import type { Snapshot, SyncErrorKind } from "./snapshot";

const ACCESS_PROBLEMS: SyncErrorKind[] = ["no-token", "unauthorized", "insufficient-scopes", "sso-required"];

export function badgeFor(snapshot: Snapshot): { text: string; color: string } {
  if (snapshot.error && ACCESS_PROBLEMS.includes(snapshot.error.kind)) {
    return { text: "!", color: "#d1242f" };
  }
  const count = snapshot.reviews.length;
  return { text: count ? String(count) : "", color: "#6e56f0" };
}
