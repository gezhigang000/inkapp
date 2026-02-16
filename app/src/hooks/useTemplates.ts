import { useState, useCallback } from "react";
import { BUILTIN_TEMPLATES } from "../data/prompt-templates";
import type { PromptTemplate } from "../data/prompt-templates";

const STORAGE_KEY = "ink-custom-templates";
const OVERRIDE_KEY = "ink-template-overrides";

function loadCustom(): PromptTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadOverrides(): Record<string, Partial<PromptTemplate>> {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistCustom(list: PromptTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function persistOverrides(o: Record<string, Partial<PromptTemplate>>) {
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o));
}

export function useTemplates() {
  const [custom, setCustom] = useState<PromptTemplate[]>(loadCustom);
  const [overrides, setOverrides] = useState<Record<string, Partial<PromptTemplate>>>(loadOverrides);

  /** All templates: builtins (with overrides applied) + custom */
  const templates: PromptTemplate[] = [
    ...BUILTIN_TEMPLATES.map((t) => ({ ...t, ...overrides[t.id], id: t.id, builtin: true })),
    ...custom,
  ];

  const addTemplate = useCallback((t: Omit<PromptTemplate, "id">) => {
    const newT: PromptTemplate = { ...t, id: `custom-${Date.now()}` };
    setCustom((prev) => {
      const next = [...prev, newT];
      persistCustom(next);
      return next;
    });
    return newT;
  }, []);

  const updateTemplate = useCallback((id: string, patch: Partial<PromptTemplate>) => {
    const builtin = BUILTIN_TEMPLATES.find((t) => t.id === id);
    if (builtin) {
      setOverrides((prev) => {
        const next = { ...prev, [id]: { ...prev[id], ...patch } };
        persistOverrides(next);
        return next;
      });
    } else {
      setCustom((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
        persistCustom(next);
        return next;
      });
    }
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    if (BUILTIN_TEMPLATES.find((t) => t.id === id)) return;
    setCustom((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persistCustom(next);
      return next;
    });
  }, []);

  const resetBuiltin = useCallback((id: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      persistOverrides(next);
      return next;
    });
  }, []);

  const isOverridden = useCallback((id: string) => !!overrides[id], [overrides]);

  return { templates, addTemplate, updateTemplate, deleteTemplate, resetBuiltin, isOverridden };
}
