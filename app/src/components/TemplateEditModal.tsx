import { useState, useEffect } from "react";
import type { PromptTemplate } from "../data/prompt-templates";

const ICONS = ["🔬", "📰", "🎬", "📖", "⚡", "🧠", "💡", "🎯", "📊", "🚀", "✍️", "🔍"];
const COLORS = [
  "oklch(0.55 0.15 250)", "oklch(0.55 0.15 145)", "oklch(0.55 0.15 25)",
  "oklch(0.55 0.15 300)", "oklch(0.55 0.15 80)", "oklch(0.55 0.15 200)",
];

interface Props {
  open: boolean;
  template: PromptTemplate | null; // null = new template
  isOverridden?: boolean;
  onSave: (data: Partial<PromptTemplate>) => void;
  onDelete?: () => void;
  onReset?: () => void;
  onClose: () => void;
}

const inputStyle = {
  border: "1px solid oklch(0.91 0 0)",
  background: "oklch(1 0 0)",
  color: "oklch(0.15 0.005 265)",
};

export default function TemplateEditModal({ open, template, isOverridden, onSave, onDelete, onReset, onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🔬");
  const [color, setColor] = useState(COLORS[0]);
  const [prompt, setPrompt] = useState("");
  const [inputType, setInputType] = useState<"topic" | "video">("topic");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setIcon(template.icon);
      setColor(template.color);
      setPrompt(template.prompt);
      setInputType(template.inputType);
    } else {
      setName("");
      setDescription("");
      setIcon("🔬");
      setColor(COLORS[0]);
      setPrompt("请围绕「{{TOPIC}}」撰写一篇微信公众号文章。");
      setInputType("topic");
    }
  }, [template, open]);

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), icon, color, prompt, inputType });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "oklch(0 0 0 / 30%)" }} onClick={onClose}>
      <div
        className="w-[640px] max-h-[90vh] overflow-y-auto rounded-[14px] p-6 space-y-4"
        style={{ background: "oklch(0.99 0 0)", boxShadow: "0 8px 32px oklch(0 0 0 / 12%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "oklch(0.15 0.005 265)" }}>
            {template ? "编辑模板" : "新建模板"}
          </h2>
          <button onClick={onClose} className="text-lg opacity-40 hover:opacity-70" style={{ color: "oklch(0.15 0.005 265)" }}>✕</button>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "oklch(0.30 0.005 265)" }}>名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 h-9 text-sm rounded-[10px]" style={inputStyle} placeholder="模板名称" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "oklch(0.30 0.005 265)" }}>描述</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 h-9 text-sm rounded-[10px]" style={inputStyle} placeholder="简短描述" />
        </div>

        {/* Icon + Color */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1" style={{ color: "oklch(0.30 0.005 265)" }}>图标</label>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((ic) => (
                <button key={ic} onClick={() => setIcon(ic)}
                  className="w-8 h-8 rounded-[8px] text-base flex items-center justify-center transition-all duration-150"
                  style={{ background: icon === ic ? "oklch(0.93 0 0)" : "transparent", border: icon === ic ? "1px solid oklch(0.85 0 0)" : "1px solid transparent" }}
                >{ic}</button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1" style={{ color: "oklch(0.30 0.005 265)" }}>颜色</label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-all duration-150"
                  style={{ background: c, border: color === c ? "2px solid oklch(0.15 0 0)" : "2px solid transparent", opacity: color === c ? 1 : 0.6 }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Input type */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "oklch(0.30 0.005 265)" }}>输入类型</label>
          <div className="flex gap-2">
            {(["topic", "video"] as const).map((t) => (
              <button key={t} onClick={() => setInputType(t)}
                className="px-3 h-8 text-sm rounded-[8px] transition-all duration-150"
                style={{ background: inputType === t ? "oklch(0.40 0.005 265)" : "transparent", color: inputType === t ? "oklch(0.97 0 0)" : "oklch(0.50 0 0)", border: inputType === t ? "none" : "1px solid oklch(0.91 0 0)" }}
              >{t === "topic" ? "主题输入" : "视频链接"}</button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "oklch(0.30 0.005 265)" }}>
            提示词 <span className="font-normal opacity-50">（用 {"{{TOPIC}}"} 作为主题占位符）</span>
          </label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-[10px] resize-vertical leading-relaxed"
            style={{ ...inputStyle, minHeight: 280, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 13 }}
            placeholder="请围绕「{{TOPIC}}」撰写一篇..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {template && !template.builtin && onDelete && (
            <button onClick={() => { onDelete(); onClose(); }}
              className="px-4 h-9 text-sm rounded-[10px] transition-all duration-150"
              style={{ color: "oklch(0.50 0.15 25)", border: "1px solid oklch(0.85 0.05 25)" }}
            >删除</button>
          )}
          {template?.builtin && isOverridden && onReset && (
            <button onClick={() => { onReset(); onClose(); }}
              className="px-4 h-9 text-sm rounded-[10px] transition-all duration-150"
              style={{ color: "oklch(0.50 0 0)", border: "1px solid oklch(0.91 0 0)" }}
            >恢复默认</button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 h-9 text-sm rounded-[10px]" style={{ color: "oklch(0.50 0 0)" }}>取消</button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="px-5 h-9 text-sm font-medium rounded-[10px] transition-all duration-150 disabled:opacity-40"
            style={{ background: "oklch(0.27 0.005 265)", color: "oklch(0.98 0.002 90)" }}
          >保存</button>
        </div>
      </div>
    </div>
  );
}
