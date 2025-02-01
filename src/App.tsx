import { Routes, Route, Navigate } from "react-router";
import Layout from "@/layout";
import Docs from "@/view/Docs"
import Apps from "@/view/Apps"
import GitHistory from "@/view/GitHistory"
import { useFolderLoader } from "./hooks/useFolderWithType";

function App() {
  const init = () => {
    useFolderLoader();
  }
  init();

  return (
    <Layout>
      <Routes>
        {/* Redirect from root to /bash */}
        <Route path="/" element={<Navigate to="/bash" replace />} />

        {/* Main routes */}
        <Route path="/bash" element={<Apps />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/history" element={<GitHistory />} />

        {/* Catch all route - redirects to /bash for any unknown paths */}
        <Route path="*" element={<Navigate to="/bash" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
