import React, { useEffect, useState, useRef } from "react";
import AudioControls from "./AudioControls";
import { useGlobalAudio } from "../../context/GlobalAudioContext";
import styles from "./MonumentDetailScreen.module.css";

const MonumentDetailScreen = ({
  monument,
  language,
  setLanguage,
  setPausedBySystem,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [volume, setVolume] = useState(1);
  const { stopAudio } = useGlobalAudio();
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  
  // Vision & Photo States
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionResult, setVisionResult] = useState(null);
  const fileInputRef = useRef(null);
  const addPhotoInputRef = useRef(null);

  const langCode =
    language === "tr" ? "tr-TR" : language === "hu" ? "hu-HU" : "en-US";

  const title =
    language === "tr"
      ? monument.name_tr
      : language === "hu"
      ? monument.name_hu
      : monument.name_en;

  const story =
    language === "tr"
      ? monument.story_tr
      : language === "hu"
      ? monument.story_hu
      : monument.story_en;

  const displayImage = monument.image_url || monument.image;
  const hasNoImage = !displayImage || imageLoadFailed;

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [monument?.id]);

  useEffect(() => {
    setImageLoadFailed(false);
    setVisionResult(null);
  }, [monument]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCurrentCharIndex(0);
    setIsSpeaking(false);
    stopAudio();
    setPausedBySystem(false);
  };

  const handleVisionAnalyze = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setVisionLoading(true);
    setVisionResult(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("monument_id", monument.id);

    try {
      const response = await fetch("/api/vision", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setVisionResult(data);
    } catch (err) {
      console.error(err);
      setVisionResult({ error: "Analiz sırasında bir hata oluştu." });
    } finally {
      setVisionLoading(false);
      event.target.value = null; // reset
    }
  };

  const handleAddPhoto = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setVisionLoading(true);
    setVisionResult(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("monument_id", monument.id);

    try {
      const response = await fetch("/api/vision", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      
      if (data.confidence > 0.7) {
        // Post to submit-photo
        const submitFormData = new FormData();
        submitFormData.append("image", file);
        submitFormData.append("monument_id", monument.id);
        submitFormData.append("confidence", data.confidence);
        
        await fetch("/api/submit-photo", {
          method: "POST",
          body: submitFormData,
        });
        setVisionResult({ ...data, submitted: true });
      } else {
        setVisionResult({ ...data, submitted: false });
      }

    } catch (err) {
      console.error(err);
      setVisionResult({ error: "İşlem sırasında bir hata oluştu." });
    } finally {
      setVisionLoading(false);
      event.target.value = null; // reset
    }
  };

  const renderStory = () => {
    if (!story) return null;

    const words = story.split(/\s+/);
    return (
      <div className={styles.storyContainer}>
         {words.map((word, index) => (
          <span
            key={index}
            className={
              index === currentCharIndex
                ? styles.highlightedWord
                : styles.normalWord
            }
          >
            {word + " "}
          </span>
         ))}
      </div>
    );
  };

  return (
    <div className={styles.screenContainer} ref={scrollRef}>
      <div className={styles.contentWrapper}>
        <h1 className={styles.monumentTitle}>{title}</h1>
        {monument.address && (
          <div className={styles.addressRow}>
            <span>{monument.address}</span>
          </div>
        )}
      </div>

      {displayImage && !imageLoadFailed && (
        <div className={styles.imageWrapper}>
           <img
            src={displayImage}
            alt={title}
            className={styles.monumentImage}
            loading="lazy"
            onError={() => setImageLoadFailed(true)}
           />
        </div>
      )}

      {hasNoImage && (
        <div className={styles.noImageContainer}>
          <div className={styles.placeholderEmoji}>🏛️</div>
          <button
            className={styles.addPhotoButton}
            onClick={() => addPhotoInputRef.current?.click()}
          >
            📷 Fotoğraf Ekle
          </button>
          <input 
            type="file" 
            accept="image/*" 
            ref={addPhotoInputRef} 
            style={{display: 'none'}} 
            onChange={handleAddPhoto} 
          />
        </div>
      )}

      <div className={styles.contentWrapper}>
        <AudioControls
          monument={monument}
          story={story}
          currentCharIndex={currentCharIndex}
          setCurrentCharIndex={setCurrentCharIndex}
          isSpeaking={isSpeaking}
          setIsSpeaking={setIsSpeaking}
          volume={volume}
          setVolume={setVolume}
          langCode={langCode}
          setPausedBySystem={setPausedBySystem}
        />

        <div className={styles.actionButtonsRow} style={{ marginTop: '1rem', justifyContent: 'center' }}>
           <button
            className={styles.actionButton}
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '100%' }}
           >
            📷 Fotoğraf Analiz Et
           </button>
           <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            style={{display: 'none'}} 
            onChange={handleVisionAnalyze} 
          />
        </div>

        {visionLoading && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#2c3e50', borderRadius: '8px', color: '#fff', textAlign: 'center' }}>
            🔍 Fotoğraf analiz ediliyor...
          </div>
        )}

        {visionResult && !visionLoading && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#34495e', borderRadius: '8px', color: '#fff' }}>
            {visionResult.error ? (
              <p style={{ color: '#e74c3c' }}>{visionResult.error}</p>
            ) : (
              <>
                <p><strong>Anıt:</strong> {visionResult.monument_name || title}</p>
                <p><strong>Güven:</strong> %{Math.round(visionResult.confidence * 100)}</p>
                <p><strong>Ajan:</strong> {visionResult.message}</p>
                
                {visionResult.needs_closer_look && (
                  <p style={{ color: '#f39c12', marginTop: '0.5rem' }}>⚠️ Lütfen biraz daha yaklaşın.</p>
                )}
                
                {visionResult.submitted === true && (
                  <p style={{ color: '#2ecc71', marginTop: '0.5rem', fontWeight: 'bold' }}>✅ Fotoğrafın incelemeye alındı!</p>
                )}
              </>
            )}
          </div>
        )}

        {renderStory()}
      </div>
    </div>
  );
};

export default MonumentDetailScreen;
