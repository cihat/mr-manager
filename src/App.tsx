import { Routes, Route } from "react-router";
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
        <Route path="/bash" element={<Apps />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/history" element={<GitHistory />} />
      </Routes>
    </Layout>
  );
}

export default App;
