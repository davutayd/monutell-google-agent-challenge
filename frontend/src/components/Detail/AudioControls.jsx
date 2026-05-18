import React, { useState, useEffect, useRef } from "react";
import { useGlobalAudio } from "../../context/GlobalAudioContext";
import CustomProgressBar from "./CustomProgressBar";
import styles from "./AudioControls.module.css";

const formatTime = (time) => {
  if (isNaN(time) || time < 0) return "00:00";
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const AudioControls = ({
  monument,
  story,
  currentCharIndex,
  setCurrentCharIndex,
  isSpeaking,
  setIsSpeaking,
  volume,
  setVolume,
  langCode,
  setPausedBySystem,
}) => {
  const {
    currentTrack,
    isPlaying,
    duration,
    subscribeToTime,
    playAudio,
    togglePlay,
    stopAudio,
    seekTo,
    changeVolume,
  } = useGlobalAudio();

  const [localDuration, setLocalDuration] = useState(0);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState("");
  const sliderRef = useRef(null);

  useEffect(() => {
    if (currentTrack?.id !== monument?.id) {
      setLocalDuration(0);
      setLocalCurrentTime(0);
      setCurrentCharIndex(0);
      setIsSpeaking(false);
      return;
    }
    setLocalDuration(duration || 0);
    setIsSpeaking(Boolean(isPlaying));
  }, [
    duration, isPlaying,
    currentTrack?.id, monument?.id, setCurrentCharIndex, setIsSpeaking,
  ]);

  useEffect(() => {
    if (!subscribeToTime) return;
    return subscribeToTime((time) => {
      setLocalCurrentTime(time);
      if (story && currentTrack?.id === monument?.id) {
        const words      = story.split(/\s+/);
        const totalWords = Math.max(1, words.length);
        const timeRatio  = localDuration > 0 ? (time / localDuration) * 0.95 : 0;
        const wordIndex  = Math.floor(timeRatio * totalWords);
        setCurrentCharIndex(Math.min(totalWords - 1, Math.max(0, wordIndex)));
      }
    });
  }, [subscribeToTime, story, currentTrack?.id, monument?.id, localDuration, setCurrentCharIndex]);

  const isTurkish   = langCode && langCode.toLowerCase().startsWith("tr");
  const isHungarian = langCode && langCode.toLowerCase().startsWith("hu");

  let audioUrl   = null;
  let trackTitle = "";

  if (isTurkish)        { audioUrl = monument?.audio_tr; trackTitle = monument?.name_tr; }
  else if (isHungarian) { audioUrl = monument?.audio_hu; trackTitle = monument?.name_hu; }
  else                  { audioUrl = monument?.audio_en; trackTitle = monument?.name_en; }

  if (!audioUrl && monument?.audio) {
    if (isTurkish)        audioUrl = monument.audio.tr  || monument.audio["tr-TR"];
    else if (isHungarian) audioUrl = monument.audio.hu  || monument.audio["hu-HU"];
    else                  audioUrl = monument.audio.en  || monument.audio["en-US"];
  }

  const handlePlayPause = async () => {
    if (!audioUrl || isLoadingAudio) return;
    setAudioError("");

    if (currentTrack?.id === monument?.id) {
      togglePlay();
      if (isPlaying) setPausedBySystem(false);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const response = await fetch("/api/audio-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monumentId: monument?.id, language: langCode }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || "Audio could not be loaded");
      }

      playAudio(data.signedUrl || audioUrl, trackTitle || "MonuTell Story", monument?.id || "");
      setPausedBySystem(false);
    } catch (error) {
      console.error("Audio access failed:", error);
      setAudioError(
        isTurkish
          ? "Ses bağlantısı hazırlanamadı. Storage erişimi veya servis hesabı ayarlarını kontrol edin."
          : isHungarian
            ? "Nem sikerült előkészíteni a hangkapcsolatot. Ellenőrizze a Storage-hozzáférést vagy a service account beállításait."
            : "Audio link could not be prepared. Check Storage access or service account settings.",
      );
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleStop = () => {
    stopAudio();
    setIsSpeaking(false);
    setCurrentCharIndex(0);
    setPausedBySystem(false);
  };

  const _computeVolumeFromX = (clientX) => {
    if (!sliderRef.current) return null;
    const rect = sliderRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleVolumeChange  = (e) => { const v = parseFloat(e.target.value); setVolume(v); changeVolume(v); };
  const handleTouchStart    = (e) => { const v = _computeVolumeFromX(e.touches[0].clientX); if (v !== null) { setVolume(v); changeVolume(v); } };
  const handleTouchMove     = (e) => { const v = _computeVolumeFromX(e.touches[0].clientX); if (v !== null) { setVolume(v); changeVolume(v); } };
  const handleTouchEnd      = () => {};

  const handleProgressBarChange = (newTime) => {
    if (currentTrack?.id !== monument?.id) return;
    const seekTime = Math.min(Math.max(newTime, 0), Math.floor(localDuration || 0));
    seekTo(seekTime);
    setLocalCurrentTime(seekTime);
  };

  return (
    <div className={styles.controlsContainer}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          {isTurkish ? "Sesli Rehber" : isHungarian ? "Hangos Útmutató" : "Audio Guide"}
        </span>
      </div>

      <div className={styles.audioPlayerContainer}>
        
        <div className={styles.durationRow}>
          <span>{formatTime(localCurrentTime)} / {formatTime(localDuration)}</span>
        </div>
        
        <div className={styles.progressRow}>
          <CustomProgressBar
            duration={localDuration}
            currentTime={localCurrentTime}
            onChangeTime={handleProgressBarChange}
          />
        </div>
        
        <div className={styles.controlsRow}>
          <div className={styles.playControls}>
            <button 
              onClick={handlePlayPause} 
              className={styles.controlButton} 
              disabled={isLoadingAudio}
              style={{
                opacity: isLoadingAudio ? 0.65 : 1,
                cursor: isLoadingAudio ? "wait" : "pointer",
              }}
            >
              {isLoadingAudio ? "..." : !isSpeaking ? "▶️" : "⏸️"}
            </button>
            <button onClick={handleStop} className={styles.controlButton}>
              ⏹️
            </button>
          </div>
          
          <div className={styles.volumeControls}>
            <span className={styles.volumeIcon}>
              {volume === 0 ? "🔇" : volume < 0.4 ? "🔉" : "🔊"}
            </span>
            <input
              ref={sliderRef}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={styles.volumeSlider}
              style={{ "--vol-pct": `${Math.round((volume || 0) * 100)}%` }}
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
      {audioError && <div className={styles.audioError}>{audioError}</div>}
    </div>
  );
};

export default AudioControls;
