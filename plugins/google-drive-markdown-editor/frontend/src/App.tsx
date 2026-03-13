import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.tsx";
import EditorPage from "./pages/EditorPage.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor/:fileId" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
