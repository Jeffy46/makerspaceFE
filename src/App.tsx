import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { Footer, Navbar } from "./components";
import Homepage from "./pages/Homepage";
import WorkshopPage from "./pages/WorkshopPage";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/workshop" element={<WorkshopPage />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
