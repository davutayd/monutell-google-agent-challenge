import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import MarkerClusterGroup from "react-leaflet-cluster";

import {
  FaChessRook,
  FaLandmark,
  FaArchway,
  FaPlaceOfWorship,
  FaStar,
  FaGlobe,
  FaChevronUp,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaMonument,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { GiStoneBust } from "react-icons/gi";

import { useLocation } from "../../hooks/useLocation";
import GoToMyLocationButton from "./GoToMyLocationButton";
import LocationHandler from "./LocationHandler";
import SearchBar from "./SearchBar";
import SettingsModal from "./SettingsModal";
import styles from "./MapScreen.module.css";
import settingsStyles from "./SettingsModal.module.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const MIN_ZOOM = 8;

const userLocationIcon = L.divIcon({
  className: "",
  html: `<div class="${styles.userMarkerContainer}"><div class="${styles.userPulse}"></div><div class="${styles.userDot}"></div></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const _iconCache = new Map();

const createCustomIcon = (IconComponent, color, zoom, isSelected, isVisited = false) => {
  let size = 36;
  let fontSize = 22;
  let showIcon = true;

  if (zoom < 14) { size = 10; showIcon = false; }
  else if (zoom < 16) { size = 28; fontSize = 16; }
  else if (zoom >= 18) { size = 42; fontSize = 28; }

  const containerClass = isSelected ? styles.selectedMarkerBorder : "";
  const badgeSize = Math.max(12, size * 0.4);

  const iconHtml = renderToStaticMarkup(
    <div
      className={containerClass}
      style={{
        backgroundColor: color,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: zoom < 14 ? "none" : "0 3px 8px rgba(0,0,0,0.4)",
        position: "relative",
        color: "white",
        fontSize: `${fontSize}px`,
        paddingTop: "2px",
      }}
    >
      {showIcon && <IconComponent />}
      {showIcon && (
        <div
          style={{
            position: "absolute",
            bottom: zoom >= 18 ? "-8px" : "-6px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "0",
            height: "0",
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: `8px solid ${color}`,
          }}
        />
      )}
      {showIcon && isVisited && (
        <div
          style={{
            position: "absolute",
            bottom: "-2px",
            right: "-4px",
            width: `${badgeSize}px`,
            height: `${badgeSize}px`,
            backgroundColor: "#22c55e",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          <svg
            width={badgeSize * 0.6}
            height={badgeSize * 0.6}
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: "",
    iconSize: [size, size + (showIcon ? 10 : 0)],
    iconAnchor: [size / 2, size + (showIcon ? 10 : 0)],
    popupAnchor: [0, -size],
  });
};

const getIconForCategory = (category, zoom, isSelected, isVisited = false) => {
  const cat = category ? category.toLowerCase() : "landmark";
  const z = zoom || 14;
  const cacheKey = `${cat}-${z}-${isSelected ? 1 : 0}-${isVisited ? 1 : 0}`;
  if (_iconCache.has(cacheKey)) return _iconCache.get(cacheKey);

  let icon;
  switch (cat) {
    case "statue":      icon = createCustomIcon(GiStoneBust,      "#D4AF37", z, isSelected, isVisited); break;
    case "mini-statue": icon = createCustomIcon(GiStoneBust,      "#CD7F32", z, isSelected, isVisited); break;
    case "monument":    icon = createCustomIcon(FaMonument,       "#607D8B", z, isSelected, isVisited); break;
    case "castle":      icon = createCustomIcon(FaChessRook,      "#E63946", z, isSelected, isVisited); break;
    case "church":
    case "religious":   icon = createCustomIcon(FaPlaceOfWorship, "#2A9D8F", z, isSelected, isVisited); break;
    case "museum":      icon = createCustomIcon(FaLandmark,       "#7209B7", z, isSelected, isVisited); break;
    case "bridge":      icon = createCustomIcon(FaArchway,        "#4361EE", z, isSelected, isVisited); break;
    default:            icon = createCustomIcon(FaStar,           "#795548", z, isSelected, isVisited);
  }
  _iconCache.set(cacheKey, icon);
  return icon;
};

const defaultCenter = [47.4979, 19.0402];

const createPremiumClusterCustomIcon = function (cluster) {
  const count = cluster.getChildCount();
  let size = 40;
  if (count >= 50) size = 58;
  else if (count >= 10) size = 48;

  return L.divIcon({
    html: `<div style="
      background-color: rgba(255,255,255,0.95);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(0,0,0,0.08);
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
      color: #1e293b;
      font-weight: bold;
      font-family: 'Segoe UI','Inter',system-ui,sans-serif;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${count >= 50 ? 16 : count >= 10 ? 14 : 13}px;
    ">${count}</div>`,
    className: "custom-cluster-icon",
    iconSize: L.point(size, size, true),
  });
};

const ctxI18n = {
  en: "Suggest a Place",
  tr: "Bir Yer Öner",
  hu: "Hely Javaslata",
};


const ZoomWatcher = ({ onZoomChange }) => {
  const map = useMap();
  useEffect(() => {
    const update = () => onZoomChange(map.getZoom());
    map.on("zoomend", update);
    update();
    return () => { map.off("zoomend", update); };
  }, [map, onZoomChange]);
  return null;
};

const MapCenterTracker = ({ onCenterChange }) => {
  const map = useMap();
  useEffect(() => {
    const update = () => {
      const c = map.getCenter();
      onCenterChange({ lat: c.lat, lng: c.lng });
    };
    map.on("moveend", update);
    update();
    return () => map.off("moveend", update);
  }, [map, onCenterChange]);
  return null;
};

const FlyToHandler = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 18, { animate: true, duration: 1.5 });
  }, [target, map]);
  return null;
};


const ContextMenuHandler = ({ onRightClick, onDismiss }) => {
  const map = useMap();
  useEffect(() => {
    const handleContext = (e) => {
      onRightClick({
        x: e.containerPoint.x,
        y: e.containerPoint.y,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    };
    const handleClick = () => onDismiss();

    map.on("contextmenu", handleContext);
    map.on("click", handleClick);
    map.on("dragstart", handleClick);
    return () => {
      map.off("contextmenu", handleContext);
      map.off("click", handleClick);
      map.off("dragstart", handleClick);
    };
  }, [map, onRightClick, onDismiss]);
  return null;
};


const MapScreen = ({
  language = "tr",
  onSelectMonument = () => {},
  isPanelOpen = false,
  isMobile = false,
  setLanguage,
  onClosePanel,
  panelHeight = 0,
  mobilePanelSize = "peek",
  visitedIds = [],
  onLegendToggle,
  flyToMonumentId,
  flyToTrigger,
  selectedMonumentId,
  allMonuments = [],
  monumentsLoading = false,
  monumentsError = null,
  isCollectionOpen = false,
  onOpenCollection,
  onCloseCollection,
  onSelectMonumentFromCollection,
  onNavigateHome,
  onOpenDesktopProfile,
}) => {
  const handleOpenSettings = () => {
    if (isPanelOpen && onClosePanel) onClosePanel();
    setIsSettingsOpen(true);
  };
  const { position, accuracy, updateLocation } = useLocation();
  const [userPosition, setUserPosition] = useState(null);
  const [shouldFly, setShouldFly] = useState(false);
  const isFirstLoad = useRef(true);
  const [zoomLevel, setZoomLevel] = useState(14);
  const [flyToPosition, setFlyToPosition] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);


  const [contextMenu, setContextMenu] = useState(null);
  const mapWrapperRef = useRef(null);

  const isBelowMinZoom = zoomLevel < MIN_ZOOM;

  useEffect(() => {
    if (position) setUserPosition(position);
  }, [position]);

  useEffect(() => {
    setSelectedId(selectedMonumentId || null);
  }, [selectedMonumentId]);

  useEffect(() => {
    if (flyToTrigger > 0 && flyToMonumentId && allMonuments) {
      const monument = allMonuments.find((m) => m.id === flyToMonumentId);
      if (monument) {
        setFlyToPosition([monument.latitude, monument.longitude]);
        setSelectedId(monument.id);
        onSelectMonument(monument);
      }
    }
  }, [flyToTrigger]);

  const handleLegendToggle = () => {
    const newState = !isLegendOpen;
    setIsLegendOpen(newState);
    if (onLegendToggle) onLegendToggle(newState ? 60 : 0);
  };

  useEffect(() => {
    if (userPosition && isFirstLoad.current) {
      setShouldFly(true);
      isFirstLoad.current = false;
    }
  }, [userPosition]);

  const handleSearchSelect = (monument) => {
    setSelectedId(monument.id);
    setFlyToPosition([monument.latitude, monument.longitude]);
    onSelectMonument(monument, true);
  };

  const handleManualSelect = useCallback((monument) => {
    setSelectedId(monument.id);
    onSelectMonument(monument, false);
  }, [onSelectMonument]);



  const handleMapRightClick = useCallback(({ x, y, lat, lng }) => {
    // Disabled suggest place context menu
  }, []);

  const handleDismissContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleMapCenterChange = useCallback((center) => {
    setMapCenter(center);
  }, []);

  const handleLocationUpdate = useCallback((newPosition, newAccuracy) => {
    setUserPosition(newPosition);
    updateLocation(newPosition, newAccuracy);
  }, [updateLocation]);

  const handleZoomChange = useCallback((zoom) => {
    setZoomLevel(zoom);
  }, []);

  const isAnyModalOpen = isSettingsOpen;

  const showMarker = accuracy != null && accuracy <= 100;
  const buttonBottom = isMobile ? (isPanelOpen ? panelHeight + 80 : 80) : 90;
  const shouldHideButtons = isMobile && isPanelOpen && mobilePanelSize !== "peek";
  const buttonVisibilityStyle = shouldHideButtons
    ? { opacity: 0, pointerEvents: "none" }
    : { opacity: 1, pointerEvents: "auto" };

  const zoomPrompt =
    language === "tr"
      ? "Tarihi yerleri keşfetmek için yakınlaştırın"
      : language === "hu"
      ? "Közelítsen rá a történelmi helyek felfedezéséhez"
      : "Zoom in to explore historical sites";

  const MENU_W = 200;
  const MENU_H = 56;
  const computedMenuStyle = contextMenu
    ? {
        left: contextMenu.x + MENU_W + 16 > window.innerWidth
          ? contextMenu.x - MENU_W
          : contextMenu.x + 4,
        top: contextMenu.y + MENU_H + 16 > window.innerHeight
          ? contextMenu.y - MENU_H
          : contextMenu.y + 4,
      }
    : {};

  return (
    <div className={styles.mapWrapper} ref={mapWrapperRef}>
      {monumentsLoading && (() => {
        const loadingText =
          language === "tr"
            ? "Macaristan Rehberi Hazırlanıyor..."
            : language === "hu"
            ? "Magyarország Útikalauz Készül..."
            : "Preparing Hungary Guide...";
        return (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <div className={styles.loadingText}>{loadingText}</div>
          </div>
        );
      })()}

      {monumentsError && (() => {
        const texts = {
          tr: { title: "Bir Hata Oluştu", message: "Veriler yüklenemedi. Lütfen internet bağlantınızı kontrol edin.", button: "Tekrar Dene" },
          hu: { title: "Hiba történt", message: "Nem sikerült betölteni az adatokat. Kérjük, ellenőrizze az internetkapcsolatot.", button: "Próbáld újra" },
          en: { title: "Something Went Wrong", message: "Could not load data. Please check your internet connection.", button: "Try Again" },
        };
        const content = texts[language] || texts.en;
        return (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <div className={styles.errorTitle}>{content.title}</div>
            <div className={styles.errorMessage}>{content.message}</div>
            <button className={styles.retryButton} onClick={() => window.location.reload()}>
              {content.button}
            </button>
          </div>
        );
      })()}

      {isBelowMinZoom && (
        <div className={styles.zoomBadge}>
          <span className={styles.zoomBadgeIcon}>🔍</span>
          {zoomPrompt}
        </div>
      )}

      <SearchBar
        monuments={allMonuments}
        onSelectResult={handleSearchSelect}
        language={language}
      />



      {/* Context menu disabled */}

      <MapContainer
        center={userPosition || defaultCenter}
        zoom={14}
        className={styles.mapContainer}
        minZoom={3}
        maxZoom={22}
        preferCanvas={true}
        zoomControl={false}
        bounceAtZoomLimits={true}
        worldCopyJump={true}
      >
        <TileLayer
          maxZoom={22}
          maxNativeZoom={18}
          attribution="&copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <ZoomWatcher onZoomChange={handleZoomChange} />
        <FlyToHandler target={flyToPosition} />
        <MapCenterTracker onCenterChange={handleMapCenterChange} />

        <ContextMenuHandler
          onRightClick={handleMapRightClick}
          onDismiss={handleDismissContextMenu}
        />

        {userPosition && (
          <>
            {showMarker ? (
              <Marker position={userPosition} icon={userLocationIcon} />
            ) : (
              <Circle
                center={userPosition}
                radius={Math.min(accuracy || 1000, 1000)}
                pathOptions={{ color: "#2a7", fillColor: "#2a7", fillOpacity: 0.1 }}
              />
            )}
          </>
        )}

        <LocationHandler
          position={userPosition}
          shouldFly={shouldFly}
          setShouldFly={setShouldFly}
        />

        {!isBelowMinZoom && allMonuments.length > 0 && (
          <MarkerClusterGroup
            animate={false}
            animateAddingMarkers={false}
            chunkedLoading={true}
            showCoverageOnHover={false}
            spiderfyOnMaxZoom={false}
            zoomToBoundsOnClick={true}
            maxClusterRadius={60}
            disableClusteringAtZoom={16}
            iconCreateFunction={createPremiumClusterCustomIcon}
          >
            {allMonuments
              .filter((m) => m.latitude && m.longitude)
              .map((monument) => {
                const isSelected = monument.id === selectedId;
                const isVisited  = visitedIds.includes(monument.id);
                const clickHandler = { click: () => handleManualSelect(monument) };
                return (
                  <Marker
                    key={monument.id}
                    position={[monument.latitude, monument.longitude]}
                    icon={getIconForCategory(monument.category, zoomLevel, isSelected, isVisited)}
                    zIndexOffset={isSelected ? 1000 : 0}
                    eventHandlers={clickHandler}
                  />
                );
              })}
          </MarkerClusterGroup>
        )}

        <GoToMyLocationButton
          position={userPosition}
          panelHeight={panelHeight}
          isMobile={isMobile}
          navBarH={isMobile ? 70 : 0}
          shouldHide={shouldHideButtons}
          language={language}
          onLocationUpdate={handleLocationUpdate}
        />

        <div className={styles.legendWrapper} style={buttonVisibilityStyle}>
          <button
            className={styles.legendToggleButton}
            onClick={handleLegendToggle}
            aria-label={isLegendOpen ? "Hide legend" : "Show legend"}
          >
            {isLegendOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
          </button>
          <div className={`${styles.legendContainer} ${isLegendOpen ? styles.legendOpen : styles.legendClosed}`}>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: "#D4AF37" }} /><span>{language === "tr" ? "Heykel" : language === "hu" ? "Szobor" : "Statue"}</span></div>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: "#CD7F32" }} /><span>{language === "tr" ? "Mini Heykel" : language === "hu" ? "Miniszobor" : "Mini Statue"}</span></div>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: "#607D8B" }} /><span>{language === "tr" ? "Anıt" : language === "hu" ? "Emlékmű" : "Monument"}</span></div>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: "#E63946" }} /><span>{language === "tr" ? "Kale" : language === "hu" ? "Vár" : "Castle"}</span></div>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: "#7209B7" }} /><span>{language === "tr" ? "Müze" : language === "hu" ? "Múzeum" : "Museum"}</span></div>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: "#4361EE" }} /><span>{language === "tr" ? "Köprü" : language === "hu" ? "Híd" : "Bridge"}</span></div>
            <div className={styles.legendItem}><span className={styles.dot} style={{ background: "#795548" }} /><span>{language === "tr" ? "Simgesel Yapı" : language === "hu" ? "Látnivaló" : "Landmark"}</span></div>
          </div>
        </div>

        {!isCollectionOpen && !isPanelOpen && !isLegendOpen && (
          <a
            href="https://www.linkedin.com/in/davut-aydemir/"
            className={styles.brandingFooter}
            style={buttonVisibilityStyle}
          >
            Made by Davut Aydemir
          </a>
        )}
      </MapContainer>

      {!isMobile && (
        <button
          className={settingsStyles.settingsButton}
          onClick={handleOpenSettings}
          style={{ ...buttonVisibilityStyle, position: 'absolute', bottom: '100px', right: '16px', zIndex: 1000 }}
          aria-label="Language settings"
        >
          <FaGlobe size={22} color="#4a6fa5" />
        </button>
      )}

      {isAnyModalOpen && <div className={styles.focusBackdrop} />}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentLang={language}
        setLanguage={setLanguage}
      />
    </div>
  );
};

export default MapScreen;
