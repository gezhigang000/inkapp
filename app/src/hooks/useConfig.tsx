import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

const CONFIG_KEY = "ink-config";

function loadConfig(): Record<string, string> {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

interface ConfigContextValue {
  config: Record<string, string>;
  updateConfig: (key: string, value: string) => void;
  getConfig: (key: string) => string;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Record<string, string>>(loadConfig);

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  const updateConfig = useCallback((key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const getConfig = useCallback(
    (key: string) => config[key] || "",
    [config]
  );

  return (
    <ConfigContext value={{ config, updateConfig, getConfig }}>
      {children}
    </ConfigContext>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
