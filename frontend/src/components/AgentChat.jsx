import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Loader2 } from 'lucide-react';

export default function AgentChat({ location }) {
  const [messages, setMessages] = useState([
    { type: 'agent', content: 'Merhaba! Ben MonuTell asistanın. Macaristan\'daki tarihi yerleri keşfetmene nasıl yardımcı olabilirim?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: location ? { lat: location.lat, lng: location.lng } : {}
        })
      });

      const data = await response.json();
      
      if (data.steps) {
        // Parse steps and display agent messages and tool results
        const newMessages = data.steps
          .filter(step => step.type === 'agent_message' || step.type === 'tool_result' || step.type === 'error')
          .map(step => {
            if (step.type === 'agent_message') {
              return { type: 'agent', content: step.content };
            } else if (step.type === 'tool_result') {
              return { type: 'tool', name: step.name, data: step.result };
            } else if (step.type === 'error') {
               return { type: 'error', content: step.content };
            }
            return null;
          })
          .filter(Boolean);

        setMessages(prev => [...prev, ...newMessages]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { type: 'error', content: 'Üzgünüm, sunucuya bağlanırken bir hata oluştu.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111122]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 ${
              msg.type === 'user' ? 'bg-primary-gold text-primary-dark' : 
              msg.type === 'error' ? 'bg-red-900 text-white' :
              msg.type === 'tool' ? 'bg-gray-800 border border-gray-700 w-full' :
              'bg-gray-800 text-gray-100'
            }`}>
              {msg.type === 'tool' ? (
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-gray-400 mb-2 uppercase text-xs font-bold tracking-wider">
                    <MapPin size={12} /> Tool Result: {msg.name}
                  </div>
                  {msg.name === 'find_nearby_monuments' && msg.data.monuments && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {msg.data.monuments.slice(0, 3).map(m => (
                        <div key={m.id} className="min-w-[120px] bg-primary-dark rounded p-2 text-xs">
                          <img src={m.imageUrl} alt={m.name} className="w-full h-16 object-cover rounded mb-1" />
                          <p className="font-bold truncate text-white">{m.name}</p>
                          <p className="text-primary-gold">{m.distance.toFixed(1)} km</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.name === 'get_weather_forecast' && msg.data.weather && (
                     <div>{msg.data.weather.current.temp}°C, {msg.data.weather.current.conditions}</div>
                  )}
                  {msg.name === 'optimize_tour_route' && msg.data.route && (
                     <div>Route calculated: {msg.data.summary.totalDistanceKm} km, {msg.data.summary.estimatedWalkingMinutes} mins.</div>
                  )}
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl p-3 text-gray-400 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Düşünüyor...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 bg-primary-dark border-t border-gray-800">
        <div className="flex items-center bg-gray-800 rounded-full px-4 py-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Mesaj yazın..."
            className="flex-1 bg-transparent outline-none text-white text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="text-primary-gold p-1 hover:bg-gray-700 rounded-full transition disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
