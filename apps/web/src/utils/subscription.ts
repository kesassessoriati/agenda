import type { CompanyPlan } from "../types";

export type SubscriptionStatus =
  | { kind: "unlimited" }
  | { kind: "active"; daysRemaining: number; expiresAt: Date }
  | { kind: "expiring_soon"; daysRemaining: number; expiresAt: Date }
  | { kind: "expired"; daysOverdue: number; expiresAt: Date }
  | { kind: "no_expiry" };

const EXPIRING_SOON_THRESHOLD_DAYS = 30;

/**
 * Single source of truth for subscription status.
 * Use this everywhere instead of computing dates ad-hoc.
 */
export function getSubscriptionStatus(plan: CompanyPlan, planExpiresAt?: string | null): SubscriptionStatus {
  if (plan === "UNLIMITED") {
    return { kind: "unlimited" };
  }

  if (!planExpiresAt) {
    return { kind: "no_expiry" };
  }

  const expiresAt = new Date(planExpiresAt);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / msPerDay);

  if (daysRemaining < 0) {
    return { kind: "expired", daysOverdue: Math.abs(daysRemaining), expiresAt };
  }

  if (daysRemaining <= EXPIRING_SOON_THRESHOLD_DAYS) {
    return { kind: "expiring_soon", daysRemaining, expiresAt };
  }

  return { kind: "active", daysRemaining, expiresAt };
}

export function shouldShowExpirationWarning(status: SubscriptionStatus): boolean {
  return status.kind === "expired" || status.kind === "expiring_soon";
}
