import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

export default function AudioPlayer({ audioUrl, title, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log('Audio play error', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      if (duration) {
        setProgress((current / duration) * 100);
      }
    }
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = percentage * audioRef.current.duration;
      setProgress(percentage * 100);
    }
  };

  return (
    <div className="fixed bottom-16 left-0 w-full bg-gray-900 border-t border-gray-800 p-4 z-40">
      <div className="max-w-md mx-auto flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-bold text-sm truncate pr-4">{title || 'Playing Audio'}</h3>
          {onClose && (
             <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">Kapat</button>
          )}
        </div>
        
        {/* Progress bar */}
        <div 
          className="h-1 bg-gray-700 rounded-full cursor-pointer relative"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-primary-gold rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center mt-2">
          <button className="text-gray-400 hover:text-white"><Volume2 size={18} /></button>
          <div className="flex items-center gap-4">
            <button className="text-gray-300 hover:text-white"><SkipBack size={20} /></button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-primary-gold text-primary-dark p-2 rounded-full hover:bg-opacity-90"
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <button className="text-gray-300 hover:text-white"><SkipForward size={20} /></button>
          </div>
          <span className="text-gray-400 text-xs w-6"></span>
        </div>
      </div>
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        className="hidden" 
      />
    </div>
  );
}
