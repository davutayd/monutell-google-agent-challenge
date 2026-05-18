import React, { useEffect, useState } from "react";
import { FaGlobe, FaCheck } from "react-icons/fa";
import styles from "./SettingsModal.module.css";
import { useGlobalAudio } from "../../context/GlobalAudioContext";

const LANGUAGES = [
  { code: "tr", label: "Türkçe", flag: "/flags/tr.svg" },
  { code: "en", label: "English", flag: "/flags/en.svg" },
  { code: "hu", label: "Magyar", flag: "/flags/hu.svg" },
];

const SettingsModal = ({ isOpen, onClose, currentLang, setLanguage }) => {
  const {
    isPlaying,
    pauseAudio,
    playAudio,
    currentTrack,
    setIsMiniplayerHidden,
    setWasPlayingBeforeModal,
  } = useGlobalAudio();

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  useEffect(() => {
    if (!isOpen) {
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const playing = isPlaying;
      if (playing) {
        setWasPlayingBeforeModal(true);
        pauseAudio();
      } else {
        setWasPlayingBeforeModal(false);
      }
      setIsMiniplayerHidden(true);
      document.body.style.overflow = "hidden";

      return () => {
        setIsMiniplayerHidden(false);
        document.body.style.overflow = "auto";
        if (playing && currentTrack) {
          playAudio(currentTrack.url, currentTrack.title, currentTrack.id);
          setWasPlayingBeforeModal(false);
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.modalOverlay} ${isClosing ? styles.fadeOut : styles.fadeIn}`}
      onClick={handleClose}
    >
      <div
        className={`${styles.modalContent} ${isClosing ? styles.slideDown : styles.slideUp}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>
            <FaGlobe style={{ color: "#4a6fa5" }} />
            {currentLang === "tr"
              ? "Dil Seçimi"
              : currentLang === "hu"
                ? "Nyelvválasztás"
                : "Language"}
          </h3>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.languageList}>
          {LANGUAGES.map((lang) => {
            const isActive = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                className={`${styles.langOption} ${
                  isActive ? styles.active : ""
                }`}
                onClick={() => {
                  setLanguage(lang.code);
                  handleClose();
                }}
              >
                <img src={lang.flag} alt={lang.label} className={styles.flag} />
                <span className={styles.langName}>{lang.label}</span>
                {isActive && <FaCheck className={styles.checkIcon} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
