import { useState, useEffect } from "react";

const CONFIG_KEY = "zhiqu-config";

export function useConfig() {
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  const updateConfig = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const getConfig = (key: string) => config[key] || "";

  return { config, updateConfig, getConfig };
}
