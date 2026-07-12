export type FeatureAvailability = {
  courses: Record<string, boolean>;
  practiceTypes: Record<string, boolean>;
};

export const DEFAULT_FEATURE_AVAILABILITY: FeatureAvailability = {
  courses: {
    toefl: false,
    ielts: false,
    toeic: true,
    advanced: false,
    mock: true,
  },
  practiceTypes: {},
};

export function practiceTypeFeatureKey(exam: string, skill: string, type: string) {
  return `${exam}:${skill}:${type}`;
}

export function mergeFeatureAvailability(value?: Partial<FeatureAvailability> | null): FeatureAvailability {
  return {
    courses: { ...DEFAULT_FEATURE_AVAILABILITY.courses, ...(value?.courses ?? {}) },
    practiceTypes: { ...DEFAULT_FEATURE_AVAILABILITY.practiceTypes, ...(value?.practiceTypes ?? {}) },
  };
}
