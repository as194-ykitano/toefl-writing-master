"use client";

import { useEffect, useState } from "react";
import { DEFAULT_FEATURE_AVAILABILITY, FeatureAvailability, mergeFeatureAvailability } from "./feature-availability";

let cached: FeatureAvailability | null = null;

export function useFeatureAvailability() {
  const [availability, setAvailability] = useState<FeatureAvailability>(cached ?? DEFAULT_FEATURE_AVAILABILITY);
  useEffect(() => {
    let active = true;
    fetch("/api/feature-availability", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((value) => {
        cached = mergeFeatureAvailability(value);
        if (active) setAvailability(cached);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  return availability;
}
