import React, { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import AgentChat from '../components/AgentChat';
import AmbientNotification from '../components/AmbientNotification';
import useAmbientAgent from '../hooks/useAmbientAgent';
import useLocation from '../hooks/useLocation';
import MapScreen from '../components/Map/MapScreen';
import MonumentDetailScreen from '../components/Detail/MonumentDetailScreen';

export default function MapPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const location = useLocation();
  const { ambientMonuments, dismissNotification } = useAmbientAgent(location);
  
  const [allMonuments, setAllMonuments] = useState([]);
  const [selectedMonument, setSelectedMonument] = useState(null);
  const [language, setLanguage] = useState("tr");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [monumentsLoading, setMonumentsLoading] = useState(true);

  useEffect(() => {
    // Fetch monuments from read DB endpoint
    fetch('/api/monuments')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setAllMonuments(data.monuments);
        }
      })
      .catch(console.error)
      .finally(() => setMonumentsLoading(false));
  }, []);

  const handleSelectMonument = (monument) => {
    setSelectedMonument(monument);
    setIsPanelOpen(true);
  };

  return (
    <div className="relative h-full w-full">
      <MapScreen
        language={language}
        setLanguage={setLanguage}
        allMonuments={allMonuments}
        onSelectMonument={handleSelectMonument}
        isPanelOpen={isPanelOpen}
        onClosePanel={() => setIsPanelOpen(false)}
        monumentsLoading={monumentsLoading}
      />

      {isPanelOpen && selectedMonument && (
        <div className="absolute right-0 top-0 h-full w-[400px] bg-primary-dark shadow-2xl z-[1000] overflow-y-auto" style={{ backgroundColor: '#111122' }}>
          <button 
            onClick={() => setIsPanelOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 bg-gray-800 rounded-full text-white"
          >
            ✕
          </button>
          <MonumentDetailScreen
            monument={selectedMonument}
            language={language}
            setLanguage={setLanguage}
            setPausedBySystem={() => {}}
          />
        </div>
      )}

      {/* FAB to open chat */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="absolute bottom-6 right-6 z-[1000] bg-[#D4AF37] text-[#111122] p-4 rounded-full shadow-lg flex items-center gap-2 hover:bg-opacity-90 transition"
      >
        <Bot size={24} />
        <span className="font-bold">AI ile Planla</span>
      </button>

      {/* Chat Sidebar/Overlay — harita arkada görünür, sadece blur overlay */}
      {isChatOpen && (
        <div
          className="absolute inset-0 z-[2000] flex items-end sm:items-center sm:justify-end sm:pr-6"
          style={{
            background: 'rgba(10, 10, 20, 0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          {/* Overlay'e tıklayınca kapat */}
          <div className="absolute inset-0" onClick={() => setIsChatOpen(false)} />
          <div
            className="relative w-full sm:w-96 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col border border-gray-700"
            style={{
              height: '75vh',
              background: 'rgba(17, 17, 34, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div className="bg-[#1a1a2e] p-4 flex justify-between items-center border-b border-gray-800">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Bot className="text-[#D4AF37]" />
                MonuTell Agent
              </h3>
              <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white transition">
                ✕
              </button>
            </div>
            <AgentChat location={location} />
          </div>
        </div>
      )}

      {/* Proactive Notification */}
      {ambientMonuments.length > 0 && (
        <div className="absolute top-4 left-0 w-full z-[1000] px-4 flex justify-center">
          <AmbientNotification 
            monument={ambientMonuments[0]} 
            onDismiss={() => dismissNotification(ambientMonuments[0].id)} 
          />
        </div>
      )}
    </div>
  );
}
