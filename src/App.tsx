import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { Footer, MagneticDots, Navbar } from "./components";
import Homepage from "./pages/Homepage";
import WorkshopPage from "./pages/WorkshopPage";

function App() {
  return (
    <BrowserRouter basename="makerspaceFE">
      <MagneticDots />
      <div className="relative z-10">
        <Navbar />
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/workshop" element={<WorkshopPage />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
