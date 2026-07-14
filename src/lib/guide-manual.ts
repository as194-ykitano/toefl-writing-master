import generatedSteps from "./generated-guide-steps.json";

export type GuideManualStep = {
  key: string;
  title: string;
  description: string;
  src?: string;
  mediaType?: "gif" | "image";
  details?: string[];
  comingSoon?: boolean;
};

const stepsByGuide = generatedSteps as Record<string, GuideManualStep[]>;

export function getGuideManualSteps(guideId: string): GuideManualStep[] {
  return stepsByGuide[guideId] ?? [];
}
