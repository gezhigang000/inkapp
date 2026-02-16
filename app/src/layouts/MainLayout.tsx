import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { path: "/", label: "首页", icon: "🏠" },
  { path: "/create", label: "创作", icon: "✏️" },
  { path: "/models", label: "模型", icon: "🤖" },
  { path: "/articles", label: "文章", icon: "📄" },
  { path: "/settings", label: "设置", icon: "⚙️" },
];

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b border-gray-700">
          <img src="/logo.png" alt="质取AI" className="w-8 h-8 rounded" />
          <span className="text-xl font-bold">质取AI</span>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
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
