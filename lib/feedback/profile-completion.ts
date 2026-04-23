/**
 * Profile completion formula (PRD 5 §0.3).
 *
 * 40% on onboarding completion + 3% per feedback item capped at 60% = 100%
 * at 20 total feedback items. Tune after real usage data.
 */

import { prisma } from "@/lib/prisma";

const ONBOARDING_WEIGHT = 40;
const PER_FEEDBACK_WEIGHT = 3;
const FEEDBACK_CAP = 60;

export function calculateCompletion(params: {
  onboardingComplete: boolean;
  feedbackCount: number;
}): number {
  const onboarding = params.onboardingComplete ? ONBOARDING_WEIGHT : 0;
  const feedback = Math.min(
    FEEDBACK_CAP,
    Math.max(0, params.feedbackCount) * PER_FEEDBACK_WEIGHT
  );
  return Math.min(100, Math.round(onboarding + feedback));
}

/**
 * Reads the inputs from the DB and computes % in one shot. Safe for routes
 * that return the updated completion after a feedback write.
 */
export async function getProfileCompletion(userId: string): Promise<number> {
  const [user, feedbackCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingComplete: true },
    }),
    prisma.userItemStatus.count({ where: { userId } }),
  ]);
  return calculateCompletion({
    onboardingComplete: Boolean(user?.onboardingComplete),
    feedbackCount,
  });
}
