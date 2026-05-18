import React, { useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import { MdMyLocation } from "react-icons/md";
import styles from "./GoToMyLocationButton.module.css";

const translations = {
  permissionDenied: {
    tr: "Konum izni reddedildi. Lütfen tarayıcı ayarlarınızdan konum iznini etkinleştirin.",
    en: "Location permission denied. Please enable location access in your browser settings.",
    de: "Standortberechtigung verweigert. Bitte aktivieren Sie den Standortzugriff in Ihren Browsereinstellungen.",
    hu: "Helymeghatározási engedély elutasítva. Kérjük, engedélyezze a helyhozzáférést a böngésző beállításaiban.",
  },
  locationUnavailable: {
    tr: "Konum belirlenemedi. Lütfen tekrar deneyin.",
    en: "Unable to determine location. Please try again.",
    de: "Standort konnte nicht ermittelt werden. Bitte versuchen Sie es erneut.",
    hu: "Nem sikerült meghatározni a helyzetet. Kérjük, próbálja újra.",
  },
};

const GoToMyLocationButton = ({
  position,
  panelHeight,
  isMobile,
  shouldHide = false,
  language = "en",
  navBarH = 0,
  onLocationUpdate,
  alignLeft = false,
}) => {
  const map = useMap();
  const [isLoading, setIsLoading] = useState(false);

  const getTranslation = useCallback(
    (key) => {
      const browserLang = (navigator.language || navigator.userLanguage).split(
        "-",
      )[0];
      const activeLang = language || browserLang;
      const langKey = translations[key][activeLang] ? activeLang : "en";
      return translations[key][langKey];
    },
    [language],
  );

  const handleClick = useCallback(() => {
    if (position) {
      map.flyTo(position, 16, { duration: 1.2 });
      return;
    }

    if (!navigator.geolocation) {
      alert(getTranslation("locationUnavailable"));
      return;
    }

    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPosition = [pos.coords.latitude, pos.coords.longitude];
        setIsLoading(false);
        if (onLocationUpdate) {
          onLocationUpdate(newPosition, pos.coords.accuracy);
        }

        map.flyTo(newPosition, 16, { duration: 1.2 });
      },
      (error) => {
        setIsLoading(false);

        if (error.code === error.PERMISSION_DENIED) {
          alert(getTranslation("permissionDenied"));
        } else {
          alert(getTranslation("locationUnavailable"));
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
    );
  }, [position, map, getTranslation, onLocationUpdate]);

  const dynamicStyles = {
    bottom: '24px',
    ...(alignLeft ? { left: '16px' } : { right: '16px' }),
    transition: "all 0.3s ease-in-out",
    opacity: shouldHide ? 0 : 1,
    pointerEvents: shouldHide ? "none" : "auto",
  };

  return (
    <button
      onClick={handleClick}
      className={`${styles.locationButton} ${isLoading ? styles.loading : ""}`}
      style={dynamicStyles}
      disabled={isLoading}
      aria-label="Go to my location"
    >
      {isLoading ? (
        <div className={styles.spinner} />
      ) : (
        <MdMyLocation size={28} color="#333" />
      )}
    </button>
  );
};

export default GoToMyLocationButton;
