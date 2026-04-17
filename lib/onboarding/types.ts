import type { ContextSegment, SocialStyleType, PlanningStyle, BudgetTier } from "@prisma/client";

export type VibeSelection = "A" | "B";

export interface VibePair {
  pair: number;
  selected: VibeSelection;
}

export interface OnboardingState {
  contextSegment: ContextSegment | null;
  socialStyle: SocialStyleType | null;
  vibePreferences: VibePair[];
  planningStyle: PlanningStyle | null;
  budgetTier: BudgetTier | null;
  sparkResponse: string;
}

export interface OnboardingPayload {
  contextSegment: ContextSegment;
  socialStyle: SocialStyleType;
  vibePreferences: VibePair[];
  planningStyle: PlanningStyle;
  budgetTier: BudgetTier;
  sparkResponse?: string;
}

export interface DerivedScores {
  opennessScore: number;
  extraversionScore: number;
  noveltyScore: number;
}

export const INITIAL_STATE: OnboardingState = {
  contextSegment: null,
  socialStyle: null,
  vibePreferences: [],
  planningStyle: null,
  budgetTier: null,
  sparkResponse: "",
};

export const TOTAL_STEPS = 6;
