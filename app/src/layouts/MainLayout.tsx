import { NavLink, Outlet } from "react-router-dom";
import { useGenerate } from "../hooks/useGenerate";

const navItems = [
  { path: "/", label: "创作", icon: "✏️" },
  { path: "/articles", label: "文章", icon: "📄" },
  { path: "/settings", label: "设置", icon: "⚙️" },
  { path: "/models", label: "模型", icon: "🤖" },
];

export default function MainLayout() {
  const { isRunning } = useGenerate();

  return (
    <div className="flex h-screen" style={{ background: "oklch(0.99 0 0)" }}>
      <aside
        className="w-[160px] flex flex-col shrink-0"
        style={{ background: "oklch(0.985 0 0)", borderRight: "1px solid oklch(0.93 0 0)" }}
      >
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid oklch(0.93 0 0)" }}>
          <img src="/logo.png" alt="Ink" className="w-7 h-7 rounded-[10px]" />
          <span className="text-[15px] font-semibold" style={{ color: "oklch(0.18 0.005 265)" }}>
            Ink
          </span>
        </div>
        <nav className="flex-1 px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 h-9 rounded-[10px] mb-0.5 text-sm transition-[background-color,opacity] duration-150 ${
                  isActive ? "font-medium" : ""
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? "oklch(0.40 0.005 265)" : "transparent",
                color: isActive ? "oklch(0.97 0 0)" : "oklch(0.50 0 0)",
              })}
            >
              <span className="text-sm">{item.icon}</span>
              <span>{item.label}</span>
              {item.path === "/" && isRunning && (
                <span
                  className="ml-auto w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "oklch(0.27 0.005 265)" }}
                />
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
