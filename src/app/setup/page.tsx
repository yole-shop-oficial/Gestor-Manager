"use client";

import { SetupBot } from "@/features/setup/SetupBot";
import { applyTheme, applyAccentColor, ACCENT_PRESETS, type AppSettings } from "@/features/setup/settings";

export default function SetupPage() {
  const handleComplete = (settings: Partial<AppSettings>) => {
    // Apply theme and accent color
    if (settings.theme) applyTheme(settings.theme);
    if (settings.accentColor) {
      const preset = ACCENT_PRESETS.find(p => p.color === settings.accentColor);
      applyAccentColor(settings.accentColor, preset?.darkPrimary || settings.accentColor);
    }
  };

  return <SetupBot onComplete={handleComplete} />;
}
