import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGenerate } from "../hooks/useGenerate";
import { useTemplates } from "../hooks/useTemplates";
import TemplateEditModal from "../components/TemplateEditModal";
import type { PromptTemplate } from "../data/prompt-templates";

export default function Home() {
  const navigate = useNavigate();
  const { setSelectedTemplate } = useGenerate();
  const { templates, addTemplate, updateTemplate, deleteTemplate, resetBuiltin, isOverridden } = useTemplates();
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PromptTemplate | null>(null);

  const handleCardClick = (t: PromptTemplate) => {
    setSelectedTemplate(t);
    navigate("/create");
  };

  const handleEdit = (e: React.MouseEvent, t: PromptTemplate) => {
    e.stopPropagation();
    setEditTarget(t);
    setEditOpen(true);
  };

  const handleNew = () => {
    setEditTarget(null);
    setEditOpen(true);
  };

  const handleSave = (data: Partial<PromptTemplate>) => {
    if (editTarget) {
      updateTemplate(editTarget.id, data);
    } else {
      addTemplate(data as Omit<PromptTemplate, "id">);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold" style={{ color: "oklch(0.15 0.005 265)" }}>选择模板开始创作</h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.50 0 0)" }}>点击模板卡片进入创作页，或自定义你的专属模板</p>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {templates.map((t) => (
          <div
            key={t.id}
            onClick={() => handleCardClick(t)}
            className="group relative rounded-[14px] p-4 cursor-pointer transition-all duration-150"
            style={{
              border: "1px solid oklch(0.93 0 0)",
              background: "oklch(1 0 0)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.boxShadow = `0 2px 12px oklch(0 0 0 / 6%)`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.93 0 0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div className="text-2xl mb-2" style={{ filter: `drop-shadow(0 1px 2px ${t.color})` }}>{t.icon}</div>
            <div className="text-sm font-medium mb-0.5" style={{ color: "oklch(0.15 0.005 265)" }}>{t.name}</div>
            <div className="text-xs leading-relaxed mb-3" style={{ color: "oklch(0.55 0 0)" }}>{t.description}</div>
            {/* Edit link — always visible */}
            <button
              onClick={(e) => handleEdit(e, t)}
              className="text-xs transition-opacity duration-150 hover:opacity-70"
              style={{ color: t.color }}
            >编辑提示词</button>
            {/* Accent bar */}
            <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ background: t.color }} />
          </div>
        ))}

        {/* Add new template card */}
        <div
          onClick={handleNew}
          className="rounded-[14px] p-4 cursor-pointer flex flex-col items-center justify-center transition-all duration-150"
          style={{ border: "1px dashed oklch(0.85 0 0)", background: "oklch(0.99 0 0)", minHeight: 120 }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.70 0 0)"; e.currentTarget.style.background = "oklch(0.98 0 0)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.85 0 0)"; e.currentTarget.style.background = "oklch(0.99 0 0)"; }}
        >
          <span className="text-xl mb-1" style={{ color: "oklch(0.65 0 0)" }}>+</span>
          <span className="text-sm" style={{ color: "oklch(0.55 0 0)" }}>新建模板</span>
        </div>
      </div>

      <TemplateEditModal
        open={editOpen}
        template={editTarget}
        isOverridden={editTarget ? isOverridden(editTarget.id) : false}
        onSave={handleSave}
        onDelete={editTarget ? () => deleteTemplate(editTarget.id) : undefined}
        onReset={editTarget?.builtin ? () => resetBuiltin(editTarget.id) : undefined}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}
