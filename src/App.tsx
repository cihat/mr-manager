import { Routes, Route } from "react-router";
import Layout from "@/layout";
import Docs from "@/view/Docs"
import Apps from "@/view/Apps"

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/apps" element={<Apps />} />
        <Route path="/docs" element={<Docs />} />
        {/* <Route path="/preview" element={<PreviewDocs />} /> */}
      </Routes>
    </Layout>
  );
}

export default App;
