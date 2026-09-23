import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { Footer, Navbar } from "./components";
import Homepage from "./pages/Homepage";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Homepage />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
