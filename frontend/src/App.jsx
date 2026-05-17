import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MapPage from './pages/MapPage';
import AdminWrapper from './components/Admin/AdminWrapper';
import { GlobalAudioProvider } from './context/GlobalAudioContext';
import './index.css';

function App() {
  return (
    <GlobalAudioProvider>
      <Router>
        <div className="flex flex-col h-screen overflow-hidden">
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/admin/*" element={<AdminWrapper />} />
          </Routes>
        </div>
      </Router>
    </GlobalAudioProvider>
  );
}

export default App;
