import React, { useState } from 'react';
import AudioPlayer from '../components/AudioPlayer';
import { Play } from 'lucide-react';

export default function TourPage() {
  const [activeAudio, setActiveAudio] = useState(null);

  // Mock active tour for the UI
  const tour = [
    {
      id: 'm1',
      name: 'Hungarian Parliament Building',
      audioUrl: '/audio/parliament.mp3', // Note: mock url
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Budapest_-_Hungarian_Parliament_Building_-_2015.jpg/1200px-Budapest_-_Hungarian_Parliament_Building_-_2015.jpg'
    },
    {
      id: 'm6',
      name: 'Széchenyi Chain Bridge',
      audioUrl: '/audio/chain_bridge.mp3',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Chain_Bridge_in_Budapest.jpg/1200px-Chain_Bridge_in_Budapest.jpg'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-primary-dark p-4 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Aktif Tur</h2>
      
      <div className="space-y-4">
        {tour.map((stop, index) => (
          <div key={stop.id} className="bg-gray-800 rounded-xl overflow-hidden flex flex-col sm:flex-row shadow-lg">
            <img 
              src={stop.imageUrl} 
              alt={stop.name} 
              className="w-full sm:w-32 h-32 object-cover"
            />
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-primary-gold text-xs font-bold mb-1">Durak {index + 1}</p>
                <h3 className="text-white font-bold text-lg">{stop.name}</h3>
              </div>
              <button 
                onClick={() => setActiveAudio(stop)}
                className="mt-2 sm:mt-0 flex items-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg w-fit transition"
              >
                <Play size={16} fill="currentColor" /> Dinle
              </button>
            </div>
          </div>
        ))}
      </div>

      {activeAudio && (
        <AudioPlayer 
          audioUrl={activeAudio.audioUrl} 
          title={activeAudio.name}
          onClose={() => setActiveAudio(null)}
        />
      )}
    </div>
  );
}
