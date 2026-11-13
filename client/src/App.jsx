
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CallRoom from "./pages/CallRoom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<CallRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
