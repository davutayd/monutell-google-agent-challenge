import React from "react";
import { useGlobalAudio } from "../../context/GlobalAudioContext";
import { useMonuments } from "../../hooks/useMonuments";
import styles from "./MiniPlayer.module.css";

const MiniPlayer = ({ isPanelOpen, onFocus, language = "tr" }) => {
  const { currentTrack, isPlaying, togglePlay, isMiniplayerHidden } = useGlobalAudio();
  const { monuments } = useMonuments();

  
  if (!currentTrack || isPanelOpen || isMiniplayerHidden) {
    return null;
  }

  const handleToggle = (e) => {
    e.stopPropagation();
    togglePlay();
  };

  const handleContainerClick = () => {
    if (onFocus) onFocus();
  };

  const activeMonument = monuments?.find(m => m.id === currentTrack?.id);
  const displayTitle = activeMonument
    ? (language === "tr" ? activeMonument.name_tr
       : language === "hu" ? activeMonument.name_hu
       : activeMonument.name_en)
    : currentTrack.title;

  return (
    <div
      className={styles.playerContainer}
      onClick={handleContainerClick}
    >
      <strong className={styles.trackTitle}>{displayTitle}</strong>
      <button onClick={handleToggle} className={styles.toggleButton}>
        {isPlaying ? "⏸️" : "▶️"}
      </button>
    </div>
  );
};

export default MiniPlayer;
