import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { Footer, MagneticDots, Navbar, MatrixBackground } from "./components";
import Homepage from "./pages/Homepage";
import WorkshopPage from "./pages/WorkshopPage";
import useIsMobile from "./hooks/useIsMobile";

function App() {
  const isMobile = useIsMobile();

  return (
    <BrowserRouter>
      {isMobile ? <MatrixBackground /> : <MagneticDots />}
      <div className="relative z-10" id="top">
        <Navbar />
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/workshops" element={<WorkshopPage />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
