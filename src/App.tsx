import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import TestRunner from "@/components/TestRunner";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/tests"
          element={
            <div className="min-h-screen bg-slate-950 text-slate-200 py-10 px-4">
              <TestRunner />
            </div>
          }
        />
        <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
      </Routes>
    </Router>
  );
}
