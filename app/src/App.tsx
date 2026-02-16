import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from "./hooks/useConfig";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Create from "./pages/Create";
import Models from "./pages/Models";
import Articles from "./pages/Articles";
import Settings from "./pages/Settings";

function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<Create />} />
            <Route path="/models" element={<Models />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

function NotFound() {
  return (
    <div className="p-6 text-center text-gray-500">
      <p className="text-lg">页面不存在</p>
    </div>
  );
}

export default App;
