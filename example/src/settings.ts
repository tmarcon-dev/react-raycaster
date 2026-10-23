import { useState } from "react";

// Render settings shared by both demos
export type Settings = {
  shading: boolean;
  bobbing: boolean;
  showFPS: boolean;
  showPosition: boolean;
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>({
    shading: true,
    bobbing: true,
    showFPS: false,
    showPosition: true,
  });
  const set = (name: keyof Settings) => (value: boolean) =>
    setSettings((s) => ({ ...s, [name]: value }));
  return [settings, set] as const;
};
